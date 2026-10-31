import { ConflictResolver } from '@/core/gdrive/conflict_resolver';
import { GDriveConflictError } from '@/core/gdrive/gdrive_conflict_error';
import { GDriveConstants } from '@/core/gdrive/gdrive_constants';
import { GDriveSaveResult, GDriveSyncClient } from '@/core/gdrive/gdrive_sync_client';
import { WorkspaceStore } from '@/core/state/workspace_store';
import { WorkspaceDocument } from '@/core/state/workspace_types';

export interface SyncManagerOptions {
  debounceMs?: number;
  maxRetries?: number;
  baseBackoffMs?: number;
}

/**
 * Debounced auto-sync coordinator managing volatile RAM retry queue and Drive persistence.
 */
export class SyncManager {
  private static readonly _DEBOUNCE_MS = GDriveConstants.DEFAULT_DEBOUNCE_MS;
  private static readonly _MAX_RETRIES = GDriveConstants.MAX_RETRIES;
  private static readonly _BASE_BACKOFF_MS = GDriveConstants.BASE_BACKOFF_MS;

  public constructor(
    private readonly _client: GDriveSyncClient,
    private readonly _store: WorkspaceStore,
    private readonly _conflictResolver: ConflictResolver,
    options?: SyncManagerOptions
  ) {
    this._debounceMs = options?.debounceMs ?? SyncManager._DEBOUNCE_MS;
    this._maxRetries = options?.maxRetries ?? SyncManager._MAX_RETRIES;
    this._baseBackoffMs = options?.baseBackoffMs ?? SyncManager._BASE_BACKOFF_MS;
  }

  /**
   * Enqueues document for debounced persistence to Google Drive SSOT.
   */
  public enqueueSync(doc: WorkspaceDocument): void {
    this._pendingDoc = doc;
    this._store.markDirty();
    this._clearTimer();
    this._timerId = setTimeout(() => {
      void this.flushSync();
    }, this._debounceMs);
  }

  /**
   * Immediately dispatches pending changes to Google Drive with retry and conflict resolution.
   */
  public async flushSync(): Promise<void> {
    this._clearTimer();
    if (!this._pendingDoc || this._isSyncing) {
      return;
    }
    const docToSync = this._pendingDoc;
    this._isSyncing = true;
    this._store.setSyncState('SYNCING');
    try {
      const result = await this._executeSyncWithRetry(docToSync);
      this._onSyncSuccess(docToSync, result);
    } catch (err: unknown) {
      await this._onSyncError(docToSync, err);
    } finally {
      this._isSyncing = false;
    }
  }

  /**
   * Cancels scheduled debounce timer and pending document in RAM.
   */
  public cancelPending(): void {
    this._clearTimer();
    this._pendingDoc = null;
  }

  /**
   * Returns whether a network synchronization operation is currently active.
   */
  public isSyncing(): boolean {
    return this._isSyncing;
  }

  /**
   * Returns current volatile document waiting in RAM for cloud synchronization.
   */
  public getPendingDoc(): WorkspaceDocument | null {
    return this._pendingDoc;
  }

  /**
   * Resolves detected 412 conflict according to user or automated strategy.
   */
  public async resolveConflict(
    strategy: 'OVERWRITE_REMOTE' | 'RELOAD_REMOTE' | 'MERGE',
    mergedDoc?: WorkspaceDocument
  ): Promise<void> {
    const fileId = this._store.getState().activeFileId;
    if (!fileId) return;
    const remote = await this._client.fetchWorkspace(fileId);
    if (strategy === 'OVERWRITE_REMOTE' && this._pendingDoc) {
      const forced = this._conflictResolver.forceLocal(this._pendingDoc, remote.etag);
      this.enqueueSync(forced);
      await this.flushSync();
    } else if (strategy === 'RELOAD_REMOTE') {
      const accepted = this._conflictResolver.acceptRemote(remote.document);
      this._pendingDoc = null;
      this._store.markClean(remote.etag, accepted.lastModifiedIso);
    } else if (strategy === 'MERGE' && mergedDoc) {
      this.enqueueSync(mergedDoc);
      await this.flushSync();
    }
  }

  private readonly _debounceMs: number;
  private readonly _maxRetries: number;
  private readonly _baseBackoffMs: number;
  private _pendingDoc: WorkspaceDocument | null = null;
  private _isSyncing = false;
  private _timerId: ReturnType<typeof setTimeout> | null = null;

  private _clearTimer(): void {
    if (this._timerId !== null) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }
  }

  private async _executeSyncWithRetry(doc: WorkspaceDocument): Promise<GDriveSaveResult> {
    const state = this._store.getState();
    let lastError: unknown;
    for (let attempt = 0; attempt < this._maxRetries; attempt++) {
      try {
        return await this._client.saveWorkspace(state.activeFileId, doc, state.activeEtag);
      } catch (err: unknown) {
        lastError = err;
        if (err instanceof GDriveConflictError) {
          throw err;
        }
        await this._waitBackoff(attempt);
      }
    }
    throw lastError;
  }

  private async _waitBackoff(attempt: number): Promise<void> {
    const delay = this._baseBackoffMs * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private _onSyncSuccess(doc: WorkspaceDocument, result: GDriveSaveResult): void {
    this._store.setActiveFile(result.fileId, result.etag);
    this._store.markClean(result.etag, result.modifiedTime);
    if (this._pendingDoc?.workspaceId === doc.workspaceId) {
      this._pendingDoc = null;
    }
  }

  private async _onSyncError(doc: WorkspaceDocument, err: unknown): Promise<void> {
    if (err instanceof GDriveConflictError) {
      await this._handleConflictError(doc);
      return;
    }
    this._store.setSyncState('DIRTY');
  }

  private async _handleConflictError(doc: WorkspaceDocument): Promise<void> {
    const fileId = this._store.getState().activeFileId;
    if (!fileId) {
      this._store.setSyncState('CONFLICT');
      return;
    }
    const remote = await this._client.fetchWorkspace(fileId);
    const merge = this._conflictResolver.resolve(doc, remote.document);
    if (!merge.hasConflict) {
      const saved = await this._client.saveWorkspace(fileId, merge.mergedDocument, remote.etag);
      this._onSyncSuccess(merge.mergedDocument, saved);
    } else {
      this._store.setSyncState('CONFLICT');
    }
  }
}

