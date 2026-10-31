import { describe, expect, it } from 'vitest';
import { GDriveConflictError } from '@/core/gdrive/gdrive_conflict_error';
import { GDriveSyncError } from '@/core/gdrive/gdrive_sync_error';

describe('GDriveErrors', () => {
  it('test_gdriveSyncError_initializesWithDefaults', () => {
    const error = new GDriveSyncError('Network failure');
    expect(error.message).toBe('Network failure');
    expect(error.status).toBe(500);
    expect(error.fileId).toBeUndefined();
    expect(error.name).toBe('GDriveSyncError');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof GDriveSyncError).toBe(true);
  });

  it('test_gdriveSyncError_initializesWithExplicitValues', () => {
    const error = new GDriveSyncError('File not found', 404, 'file_123');
    expect(error.message).toBe('File not found');
    expect(error.status).toBe(404);
    expect(error.fileId).toBe('file_123');
  });

  it('test_gdriveConflictError_initializesWithEtags', () => {
    const conflict = new GDriveConflictError(
      'ETag mismatch',
      'file_456',
      'etag_local',
      'etag_remote'
    );
    expect(conflict.message).toBe('ETag mismatch');
    expect(conflict.status).toBe(412);
    expect(conflict.fileId).toBe('file_456');
    expect(conflict.localEtag).toBe('etag_local');
    expect(conflict.remoteEtag).toBe('etag_remote');
    expect(conflict.name).toBe('GDriveConflictError');
    expect(conflict instanceof GDriveSyncError).toBe(true);
  });
});

