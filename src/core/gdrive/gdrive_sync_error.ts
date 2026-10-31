/**
 * General error thrown during Google Drive REST API synchronization operations.
 */
export class GDriveSyncError extends Error {
  public constructor(
    message: string,
    public readonly status: number = 500,
    public readonly fileId?: string
  ) {
    super(message);
    this.name = 'GDriveSyncError';
    Object.setPrototypeOf(this, GDriveSyncError.prototype);
  }
}
