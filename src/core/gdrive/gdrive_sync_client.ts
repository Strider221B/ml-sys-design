import { GDriveConflictError } from '@/core/gdrive/gdrive_conflict_error';
import { GDriveConstants } from '@/core/gdrive/gdrive_constants';
import { GDriveSyncError } from '@/core/gdrive/gdrive_sync_error';
import { WorkspaceDocument } from '@/core/state/workspace_types';

export interface GDriveSaveResult {
  fileId: string;
  etag: string;
  modifiedTime: string;
}

export interface GDriveFileResource {
  id: string;
  name: string;
  etag?: string;
  modifiedTime?: string;
}

/**
 * Google Drive REST API v3 client managing SSOT folder hierarchy, manifest, and workspace sync.
 */
export class GDriveSyncClient {
  private static readonly _BOUNDARY = '-------adspire_gdrive_boundary';
  private static readonly _DEFAULT_MANIFEST_VERSION = '2026.1.0';

  public constructor(
    private readonly _accessToken: string,
    private readonly _fetchFn: typeof fetch = fetch
  ) {}

  /**
   * Ensures root application folder exists on Google Drive SSOT.
   */
  public async ensureRootFolder(): Promise<string> {
    const q = `name = '${GDriveConstants.ROOT_FOLDER_NAME}' and mimeType = '${GDriveConstants.FOLDER_MIME_TYPE}' and trashed = false`;
    const files = await this._searchFiles(q);
    if (files.length > 0 && files[0]?.id) {
      return files[0].id;
    }
    return this._createFolder(GDriveConstants.ROOT_FOLDER_NAME);
  }

  /**
   * Fetches or initializes platform manifest.json from root directory.
   */
  public async fetchManifest(folderId: string): Promise<Record<string, unknown>> {
    const q = `'${folderId}' in parents and name = '${GDriveConstants.MANIFEST_FILE_NAME}' and trashed = false`;
    const files = await this._searchFiles(q);
    if (files.length > 0 && files[0]?.id) {
      return this.fetchJsonFile<Record<string, unknown>>(files[0].id);
    }
    return this._initializeDefaultManifest(folderId);
  }

  /**
   * Hydrates a workspace document and its current ETag from Drive.
   */
  public async fetchWorkspace(
    fileId: string
  ): Promise<{ document: WorkspaceDocument; etag: string }> {
    const metaUrl = `${GDriveConstants.DRIVE_BASE_URL}/files/${fileId}?fields=id,etag,modifiedTime`;
    const metaRes = await this._fetchFn(metaUrl, {
      method: 'GET',
      headers: this._buildHeaders(),
    });
    if (!metaRes.ok) {
      await this._handleError(metaRes, fileId);
    }
    const metaJson = (await metaRes.json()) as GDriveFileResource;
    const document = await this.fetchJsonFile<WorkspaceDocument>(fileId);
    return {
      document,
      etag: metaJson.etag ?? '',
    };
  }

  /**
   * Downloads parsed JSON payload of given Google Drive file.
   */
  public async fetchJsonFile<T>(fileId: string): Promise<T> {
    const contentUrl = `${GDriveConstants.DRIVE_BASE_URL}/files/${fileId}?alt=media`;
    const res = await this._fetchFn(contentUrl, {
      method: 'GET',
      headers: this._buildHeaders(),
    });
    if (!res.ok) {
      await this._handleError(res, fileId);
    }
    return (await res.json()) as T;
  }

  /**
   * Lists non-trashed file resources located in the given parent folder.
   */
  public async listFilesInFolder(folderId: string): Promise<GDriveFileResource[]> {
    const query = `'${folderId}' in parents and trashed = false`;
    return this._searchFiles(query);
  }

  /**
   * Downloads raw text (YAML or unparsed JSON) payload of given Google Drive file.
   */
  public async fetchRawTextFile(fileId: string): Promise<string> {
    const contentUrl = `${GDriveConstants.DRIVE_BASE_URL}/files/${fileId}?alt=media`;
    const res = await this._fetchFn(contentUrl, {
      method: 'GET',
      headers: this._buildHeaders(),
    });
    if (!res.ok) {
      await this._handleError(res, fileId);
    }
    return res.text();
  }

  /**
   * Commits workspace document changes conditionally or creates a new file.
   */
  public async saveWorkspace(
    fileId: string | null,
    doc: WorkspaceDocument,
    etag?: string | null,
    parentFolderId?: string
  ): Promise<GDriveSaveResult> {
    if (fileId) {
      return this._updateWorkspace(fileId, doc, etag);
    }
    return this._createWorkspace(doc, parentFolderId);
  }

  private _buildHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      [GDriveConstants.HEADER_AUTHORIZATION]: `${GDriveConstants.BEARER_PREFIX}${this._accessToken}`,
      ...extra,
    };
  }

  private async _searchFiles(query: string): Promise<GDriveFileResource[]> {
    const encoded = encodeURIComponent(query);
    const url = `${GDriveConstants.DRIVE_BASE_URL}/files?q=${encoded}&fields=files(id,name,etag,modifiedTime)`;
    const res = await this._fetchFn(url, {
      method: 'GET',
      headers: this._buildHeaders(),
    });
    if (!res.ok) {
      await this._handleError(res);
    }
    const data = (await res.json()) as { files?: GDriveFileResource[] };
    return data.files ?? [];
  }

  private async _createFolder(name: string, parentFolderId?: string): Promise<string> {
    const url = `${GDriveConstants.DRIVE_BASE_URL}/files`;
    const body: Record<string, unknown> = {
      name,
      mimeType: GDriveConstants.FOLDER_MIME_TYPE,
    };
    if (parentFolderId) {
      body['parents'] = [parentFolderId];
    }
    const res = await this._fetchFn(url, {
      method: 'POST',
      headers: this._buildHeaders({
        [GDriveConstants.HEADER_CONTENT_TYPE]: GDriveConstants.JSON_MIME_TYPE,
      }),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      await this._handleError(res);
    }
    const json = (await res.json()) as { id: string };
    return json.id;
  }

  private async _createWorkspace(
    doc: WorkspaceDocument,
    parentFolderId?: string
  ): Promise<GDriveSaveResult> {
    const url = `${GDriveConstants.DRIVE_UPLOAD_URL}/files?uploadType=multipart&fields=id,etag,modifiedTime`;
    const metadata: Record<string, unknown> = {
      name: `${doc.workspaceId}.json`,
      mimeType: GDriveConstants.JSON_MIME_TYPE,
    };
    if (parentFolderId) {
      metadata['parents'] = [parentFolderId];
    }
    const body = this._buildMultipartBody(metadata, JSON.stringify(doc, null, 2));
    const res = await this._fetchFn(url, {
      method: 'POST',
      headers: this._buildHeaders({
        [GDriveConstants.HEADER_CONTENT_TYPE]: `multipart/related; boundary=${GDriveSyncClient._BOUNDARY}`,
      }),
      body,
    });
    if (!res.ok) {
      await this._handleError(res);
    }
    return this._parseSaveResponse(res);
  }

  private async _updateWorkspace(
    fileId: string,
    doc: WorkspaceDocument,
    etag?: string | null
  ): Promise<GDriveSaveResult> {
    const url = `${GDriveConstants.DRIVE_UPLOAD_URL}/files/${fileId}?uploadType=media&fields=id,etag,modifiedTime`;
    const headers = this._buildUpdateHeaders(etag);
    const res = await this._fetchFn(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(doc, null, 2),
    });
    this._checkPatchPrecondition(res, fileId, etag);
    if (!res.ok) {
      await this._handleError(res, fileId);
    }
    return this._parseSaveResponse(res, fileId);
  }

  private _buildUpdateHeaders(etag?: string | null): Record<string, string> {
    const headers = this._buildHeaders({
      [GDriveConstants.HEADER_CONTENT_TYPE]: GDriveConstants.JSON_MIME_TYPE,
    });
    if (etag) {
      headers[GDriveConstants.HEADER_IF_MATCH] = etag;
    }
    return headers;
  }

  private _checkPatchPrecondition(
    res: Response,
    fileId: string,
    etag?: string | null
  ): void {
    if (res.status === GDriveConstants.HTTP_STATUS_PRECONDITION_FAILED) {
      throw new GDriveConflictError(
        `Precondition failed for file ${fileId}`,
        fileId,
        etag ?? undefined
      );
    }
  }

  private async _parseSaveResponse(
    res: Response,
    fallbackId?: string
  ): Promise<GDriveSaveResult> {
    const json = (await res.json()) as GDriveFileResource;
    const headerEtag = res.headers.get(GDriveConstants.HEADER_ETAG);
    return {
      fileId: json.id || fallbackId || '',
      etag: headerEtag || json.etag || '',
      modifiedTime: json.modifiedTime || new Date().toISOString(),
    };
  }

  private _buildMultipartBody(metadata: Record<string, unknown>, content: string): string {
    const b = GDriveSyncClient._BOUNDARY;
    return (
      `--${b}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${b}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${content}\r\n` +
      `--${b}--`
    );
  }

  private _buildDefaultManifest(): Record<string, unknown> {
    return {
      version: GDriveSyncClient._DEFAULT_MANIFEST_VERSION,
      updatedAt: new Date().toISOString(),
      activeWorkspaceId: null,
      userPreferences: {
        highContrastMode: false,
        telemetryFpsCap: 60,
        autoSaveDebounceMs: GDriveConstants.DEFAULT_DEBOUNCE_MS,
      },
      workspaces: [],
    };
  }

  private async _initializeDefaultManifest(
    folderId: string
  ): Promise<Record<string, unknown>> {
    const defaultManifest = this._buildDefaultManifest();
    const url = `${GDriveConstants.DRIVE_UPLOAD_URL}/files?uploadType=multipart`;
    const metadata = {
      name: GDriveConstants.MANIFEST_FILE_NAME,
      mimeType: GDriveConstants.JSON_MIME_TYPE,
      parents: [folderId],
    };
    const body = this._buildMultipartBody(metadata, JSON.stringify(defaultManifest, null, 2));
    const res = await this._fetchFn(url, {
      method: 'POST',
      headers: this._buildHeaders({
        [GDriveConstants.HEADER_CONTENT_TYPE]: `multipart/related; boundary=${GDriveSyncClient._BOUNDARY}`,
      }),
      body,
    });
    if (!res.ok) {
      await this._handleError(res);
    }
    return defaultManifest;
  }

  private async _handleError(res: Response, fileId?: string): Promise<never> {
    let errorDetail = res.statusText;
    try {
      const errJson = (await res.json()) as { error?: { message?: string } };
      if (errJson.error?.message) {
        errorDetail = errJson.error.message;
      }
    } catch {
      // Ignored if response is not JSON
    }
    throw new GDriveSyncError(
      `Drive API error (${res.status}): ${errorDetail}`,
      res.status,
      fileId
    );
  }
}
