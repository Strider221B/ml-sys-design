/**
 * Central constants repository for Google Drive SSOT integrations.
 * Adheres strictly to Zero Magic Strings/Numbers standards.
 */
export class GDriveConstants {
  public static readonly ROOT_FOLDER_NAME = 'ML_System_Design_2026_SSOT';
  public static readonly FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
  public static readonly JSON_MIME_TYPE = 'application/json';
  public static readonly DRIVE_BASE_URL = 'https://www.googleapis.com/drive/v3';
  public static readonly DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';
  public static readonly GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
  public static readonly OAUTH_SCOPE_DRIVE_FILE = 'https://www.googleapis.com/auth/drive.file';

  public static readonly DEFAULT_DEBOUNCE_MS = 1500;
  public static readonly MAX_RETRIES = 3;
  public static readonly BASE_BACKOFF_MS = 1000;

  public static readonly HTTP_STATUS_OK = 200;
  public static readonly HTTP_STATUS_BAD_REQUEST = 400;
  public static readonly HTTP_STATUS_UNAUTHORIZED = 401;
  public static readonly HTTP_STATUS_FORBIDDEN = 403;
  public static readonly HTTP_STATUS_NOT_FOUND = 404;
  public static readonly HTTP_STATUS_PRECONDITION_FAILED = 412;

  public static readonly MANIFEST_FILE_NAME = 'manifest.json';
  public static readonly WORKSPACES_FOLDER_NAME = 'workspaces';
  public static readonly INTERVIEWS_FOLDER_NAME = 'interviews';
  public static readonly CHAOS_FOLDER_NAME = 'chaos_telemetry';
  public static readonly LLM_VAULT_FOLDER_NAME = 'llm_exchange_vault';

  public static readonly HEADER_AUTHORIZATION = 'Authorization';
  public static readonly HEADER_CONTENT_TYPE = 'Content-Type';
  public static readonly HEADER_IF_MATCH = 'If-Match';
  public static readonly HEADER_ETAG = 'ETag';
  public static readonly BEARER_PREFIX = 'Bearer ';

  public constructor() {}
}

