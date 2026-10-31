import { GDriveSyncError } from '@/core/gdrive/gdrive_sync_error';

/**
 * Error thrown when Google Drive returns HTTP 412 Precondition Failed.
 */
export class GDriveConflictError extends GDriveSyncError {
  public constructor(
    message: string,
    fileId?: string,
    public readonly localEtag?: string,
    public readonly remoteEtag?: string
  ) {
    super(message, 412, fileId);
    this.name = 'GDriveConflictError';
    Object.setPrototypeOf(this, GDriveConflictError.prototype);
  }
}
