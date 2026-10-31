import { describe, expect, it, vi } from 'vitest';
import { GDriveConflictError } from '@/core/gdrive/gdrive_conflict_error';
import { GDriveSyncClient } from '@/core/gdrive/gdrive_sync_client';
import { GDriveSyncError } from '@/core/gdrive/gdrive_sync_error';
import { WorkspaceDocument } from '@/core/state/workspace_types';

describe('GDriveSyncClient', () => {
  const dummyDoc: WorkspaceDocument = {
    workspaceId: 'ws_test_001',
    title: 'Test ML System',
    lastModifiedIso: '2026-10-31T06:00:00.000Z',
    etag: 'etag_001',
    activeModuleId: 'SANDBOX_BUILDER',
    activeScenarioId: null,
    nodes: [],
    edges: [],
  };

  it('test_ensureRootFolder_whenFolderExists_returnsExistingId', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ files: [{ id: 'root_folder_123', name: 'ML_System_Design_2026_SSOT' }] }),
    });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    const folderId = await client.ensureRootFolder();

    expect(folderId).toBe('root_folder_123');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]?.[0]).toContain('/files?q=');
  });

  it('test_ensureRootFolder_whenFolderNotFound_createsAndReturnsId', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new_root_folder_999' }),
      });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    const folderId = await client.ensureRootFolder();

    expect(folderId).toBe('new_root_folder_999');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1]?.[1]?.method).toBe('POST');
  });

  it('test_ensureRootFolder_whenFirstFileHasNoId_createsNewFolder', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [{ name: 'ML_System_Design_2026_SSOT' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'fallback_folder_id' }),
      });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    const folderId = await client.ensureRootFolder();

    expect(folderId).toBe('fallback_folder_id');
  });

  it('test_ensureRootFolder_whenSearchFails_throwsSyncError', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Error',
      json: async () => ({}),
    });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    await expect(client.ensureRootFolder()).rejects.toThrow(GDriveSyncError);
  });

  it('test_ensureRootFolder_whenCreateFails_throwsSyncError', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: { message: 'Quota exceeded' } }),
      });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    await expect(client.ensureRootFolder()).rejects.toThrow('Quota exceeded');
  });

  it('test_fetchManifest_whenManifestExists_returnsParsedJson', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [{ id: 'manifest_file_id', name: 'manifest.json' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: '2026.1.0', workspaces: [] }),
      });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    const manifest = await client.fetchManifest('root_folder_123');

    expect(manifest['version']).toBe('2026.1.0');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('test_fetchManifest_whenManifestMissing_createsDefaultAndReturns', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'created_manifest_id' }),
      });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    const manifest = await client.fetchManifest('root_folder_123');

    expect(manifest['version']).toBe('2026.1.0');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('test_fetchManifest_whenCreationFails_throwsSyncError', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Write failed',
        json: async () => ({}),
      });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    await expect(client.fetchManifest('root_folder_123')).rejects.toThrow(GDriveSyncError);
  });

  it('test_fetchWorkspace_fetchesMetadataAndMedia', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'file_1', etag: 'etag_remote_55', modifiedTime: '2026-10-31' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => dummyDoc,
      });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    const res = await client.fetchWorkspace('file_1');

    expect(res.document.workspaceId).toBe('ws_test_001');
    expect(res.etag).toBe('etag_remote_55');
  });

  it('test_fetchWorkspace_whenMetadataHasNoEtag_defaultsToEmptyString', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'file_1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => dummyDoc,
      });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    const res = await client.fetchWorkspace('file_1');

    expect(res.etag).toBe('');
  });

  it('test_fetchWorkspace_whenMetadataFails_throwsSyncError', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ error: { message: 'File not found' } }),
    });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);

    await expect(client.fetchWorkspace('missing_file')).rejects.toThrow(GDriveSyncError);
  });

  it('test_saveWorkspace_newFile_createsFileViaMultipart', async () => {
    const mockHeaders = new Headers();
    mockHeaders.set('ETag', 'etag_new_111');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: mockHeaders,
      json: async () => ({ id: 'file_created_111', etag: 'etag_new_111', modifiedTime: '2026-10-31' }),
    });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    const result = await client.saveWorkspace(null, dummyDoc, null, 'parent_folder_id');

    expect(result.fileId).toBe('file_created_111');
    expect(result.etag).toBe('etag_new_111');
    expect(mockFetch.mock.calls[0]?.[1]?.method).toBe('POST');
  });

  it('test_saveWorkspace_newFile_whenCreateFails_throwsSyncError', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Multipart failure',
      json: async () => ({}),
    });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    await expect(client.saveWorkspace(null, dummyDoc)).rejects.toThrow(GDriveSyncError);
  });

  it('test_saveWorkspace_existingFile_updatesViaPatch', async () => {
    const mockHeaders = new Headers();
    mockHeaders.set('ETag', 'etag_updated_222');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: mockHeaders,
      json: async () => ({ id: 'existing_file_222', modifiedTime: '2026-10-31' }),
    });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    const result = await client.saveWorkspace('existing_file_222', dummyDoc, 'etag_old_001');

    expect(result.fileId).toBe('existing_file_222');
    expect(result.etag).toBe('etag_updated_222');
    expect(mockFetch.mock.calls[0]?.[1]?.method).toBe('PATCH');
    expect(mockFetch.mock.calls[0]?.[1]?.headers?.['If-Match']).toBe('etag_old_001');
  });

  it('test_saveWorkspace_existingFile_withoutEtag_patchesWithoutIfMatch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => ({ id: 'file_no_etag', etag: 'json_etag', modifiedTime: '2026-10-31' }),
    });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    const result = await client.saveWorkspace('file_no_etag', dummyDoc, null);

    expect(result.etag).toBe('json_etag');
    expect(mockFetch.mock.calls[0]?.[1]?.headers?.['If-Match']).toBeUndefined();
  });

  it('test_saveWorkspace_existingFile_whenPatchFailsGeneric_throwsSyncError', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Patch Failed',
      json: async () => ({ error: { message: 'Database error' } }),
    });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    await expect(
      client.saveWorkspace('file_existing', dummyDoc, 'etag_1')
    ).rejects.toThrow('Database error');
  });

  it('test_saveWorkspace_on412Conflict_throwsGDriveConflictError', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 412,
      statusText: 'Precondition Failed',
      json: async () => ({ error: { message: 'ETag mismatch' } }),
    });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);

    await expect(
      client.saveWorkspace('file_conflict_id', dummyDoc, 'stale_etag')
    ).rejects.toThrow(GDriveConflictError);
  });

  it('test_handleError_whenResponseJsonFails_usesStatusText', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('Not JSON');
      },
    });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);

    await expect(client.fetchJsonFile('file_corrupt')).rejects.toThrow(
      'Drive API error (500): Internal Server Error'
    );
  });

  it('test_searchFiles_whenFilesListUndefined_returnsEmptyArray', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'created_folder_id' }),
      });

    const client = new GDriveSyncClient('dummy_token', mockFetch as unknown as typeof fetch);
    const folderId = await client.ensureRootFolder();

    expect(folderId).toBe('created_folder_id');
  });
});
