import { describe, expect, it, vi } from 'vitest';
import { ConflictResolver } from '@/core/gdrive/conflict_resolver';
import { GDriveConflictError } from '@/core/gdrive/gdrive_conflict_error';
import { GDriveSyncClient } from '@/core/gdrive/gdrive_sync_client';
import { GDriveSyncError } from '@/core/gdrive/gdrive_sync_error';
import { SyncManager } from '@/core/gdrive/sync_manager';
import { WorkspaceStore } from '@/core/state/workspace_store';
import { WorkspaceDocument } from '@/core/state/workspace_types';

describe('SyncManager', () => {
  const createDoc = (title = 'Architecture 1'): WorkspaceDocument => ({
    workspaceId: 'ws_test_sync',
    title,
    lastModifiedIso: '2026-10-31T00:00:00.000Z',
    etag: 'etag_initial',
    activeModuleId: 'SANDBOX_BUILDER',
    activeScenarioId: null,
    nodes: [],
    edges: [],
  });

  const setupManager = (clientOverrides: Partial<GDriveSyncClient> = {}) => {
    const store = new WorkspaceStore(createDoc());
    const resolver = new ConflictResolver();
    const mockClient = {
      saveWorkspace: vi.fn().mockResolvedValue({
        fileId: 'file_mock_1',
        etag: 'etag_mock_new',
        modifiedTime: '2026-10-31T01:00:00.000Z',
      }),
      fetchWorkspace: vi.fn().mockResolvedValue({
        document: createDoc('Remote Doc'),
        etag: 'etag_remote_412',
      }),
      ...clientOverrides,
    } as unknown as GDriveSyncClient;

    const manager = new SyncManager(mockClient, store, resolver, {
      debounceMs: 50,
      maxRetries: 2,
      baseBackoffMs: 10,
    });

    return { manager, store, mockClient, resolver };
  };

  it('test_enqueueSync_setsTimerAndMarksDirty', async () => {
    const { manager, store } = setupManager();
    const doc = createDoc('Mutated Title');

    manager.enqueueSync(doc);

    expect(store.getState().syncState).toBe('DIRTY');
    expect(manager.getPendingDoc()).toBe(doc);

    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(store.getState().syncState).toBe('CLEAN');
    expect(manager.getPendingDoc()).toBeNull();
  });

  it('test_flushSync_whenNoPendingDoc_returnsImmediately', async () => {
    const { manager, mockClient } = setupManager();
    await manager.flushSync();

    expect(mockClient.saveWorkspace).not.toHaveBeenCalled();
  });

  it('test_flushSync_whenAlreadySyncing_returnsEarly', async () => {
    const { manager, mockClient } = setupManager();
    const doc = createDoc();
    manager.enqueueSync(doc);

    // Trigger flush twice concurrently
    const p1 = manager.flushSync();
    const p2 = manager.flushSync();
    await Promise.all([p1, p2]);

    expect(mockClient.saveWorkspace).toHaveBeenCalledTimes(1);
  });

  it('test_cancelPending_clearsTimerAndPendingDoc', async () => {
    const { manager } = setupManager();
    manager.enqueueSync(createDoc());
    manager.cancelPending();

    expect(manager.getPendingDoc()).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 70));
    expect(manager.isSyncing()).toBe(false);
  });

  it('test_flushSync_retriesOnTransientErrorWithBackoff', async () => {
    let callCount = 0;
    const { manager, store } = setupManager({
      saveWorkspace: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new GDriveSyncError('Transient 503 error', 503);
        }
        return {
          fileId: 'file_retried',
          etag: 'etag_success',
          modifiedTime: '2026-10-31',
        };
      }),
    });

    manager.enqueueSync(createDoc());
    await manager.flushSync();

    expect(callCount).toBe(2);
    expect(store.getState().syncState).toBe('CLEAN');
  });

  it('test_flushSync_whenRetriesExhausted_marksDirty', async () => {
    const { manager, store } = setupManager({
      saveWorkspace: vi.fn().mockRejectedValue(new GDriveSyncError('Permanent 500 error', 500)),
    });

    manager.enqueueSync(createDoc());
    await manager.flushSync();

    expect(store.getState().syncState).toBe('DIRTY');
  });

  it('test_flushSync_on412Conflict_whenAutoMergePossible_savesMergedDoc', async () => {
    const { manager, store } = setupManager({
      saveWorkspace: vi
        .fn()
        .mockRejectedValueOnce(new GDriveConflictError('Conflict', 'file_1', 'etag_1'))
        .mockResolvedValueOnce({
          fileId: 'file_1',
          etag: 'etag_auto_merged',
          modifiedTime: '2026-10-31',
        }),
      fetchWorkspace: vi.fn().mockResolvedValue({
        document: createDoc('Remote Non-Conflicting'),
        etag: 'etag_remote_new',
      }),
    });

    store.setActiveFile('file_1', 'etag_old');
    manager.enqueueSync(createDoc('Local Doc'));
    await manager.flushSync();

    expect(store.getState().syncState).toBe('CLEAN');
    expect(store.getState().activeEtag).toBe('etag_auto_merged');
  });

  it('test_flushSync_on412Conflict_whenManualRequired_setsConflictState', async () => {
    const localDoc: WorkspaceDocument = {
      ...createDoc('Local Doc'),
      nodes: [
        {
          id: 'node_conflicting',
          type: 'EMBEDDING_MODEL',
          position: { x: 10, y: 10 },
          data: { label: 'Local Model' },
        },
      ],
    };

    const remoteDoc: WorkspaceDocument = {
      ...createDoc('Remote Doc'),
      nodes: [
        {
          id: 'node_conflicting',
          type: 'EMBEDDING_MODEL',
          position: { x: 50, y: 50 },
          data: { label: 'Remote Model' },
        },
      ],
    };

    const { manager, store } = setupManager({
      saveWorkspace: vi
        .fn()
        .mockRejectedValue(new GDriveConflictError('Conflict', 'file_1', 'etag_1')),
      fetchWorkspace: vi.fn().mockResolvedValue({
        document: remoteDoc,
        etag: 'etag_remote_new',
      }),
    });

    store.setActiveFile('file_1', 'etag_old');
    manager.enqueueSync(localDoc);
    await manager.flushSync();

    expect(store.getState().syncState).toBe('CONFLICT');
  });

  it('test_flushSync_on412Conflict_whenNoActiveFileId_setsConflictState', async () => {
    const { manager, store } = setupManager({
      saveWorkspace: vi
        .fn()
        .mockRejectedValue(new GDriveConflictError('Conflict', 'file_1', 'etag_1')),
    });

    manager.enqueueSync(createDoc('Local Doc'));
    await manager.flushSync();

    expect(store.getState().syncState).toBe('CONFLICT');
  });

  it('test_resolveConflict_overwriteRemote_forcesLocalAndFlushes', async () => {
    const { manager, store, mockClient } = setupManager();
    store.setActiveFile('file_1', 'etag_old');
    manager.enqueueSync(createDoc('Forced Local'));

    await manager.resolveConflict('OVERWRITE_REMOTE');

    expect(mockClient.saveWorkspace).toHaveBeenCalled();
  });

  it('test_resolveConflict_reloadRemote_adoptsRemoteAndCleans', async () => {
    const { manager, store } = setupManager({
      fetchWorkspace: vi.fn().mockResolvedValue({
        document: createDoc('Remote Reloaded'),
        etag: 'etag_remote_reloaded',
      }),
    });

    store.setActiveFile('file_1', 'etag_old');
    manager.enqueueSync(createDoc('Discard Me'));

    await manager.resolveConflict('RELOAD_REMOTE');

    expect(store.getState().syncState).toBe('CLEAN');
    expect(store.getState().activeEtag).toBe('etag_remote_reloaded');
  });

  it('test_resolveConflict_merge_savesMergedDoc', async () => {
    const { manager, store, mockClient } = setupManager();
    store.setActiveFile('file_1', 'etag_old');
    const merged = createDoc('Merged Manual');

    await manager.resolveConflict('MERGE', merged);

    expect(mockClient.saveWorkspace).toHaveBeenCalled();
  });

  it('test_resolveConflict_whenNoFileId_returnsEarly', async () => {
    const { manager, mockClient } = setupManager();
    await manager.resolveConflict('OVERWRITE_REMOTE');

    expect(mockClient.fetchWorkspace).not.toHaveBeenCalled();
  });
});
