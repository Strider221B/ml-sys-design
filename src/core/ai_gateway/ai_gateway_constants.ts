/**
 * Central constants for the Dual-Mode AI Gateway and Exchange engine.
 * Eliminates magic strings and numbers across the AI gateway modules.
 */
export class AiGatewayConstants {
  public static readonly DEFAULT_CAPACITY = 15;
  public static readonly DEFAULT_REFILL_RATE_PER_SEC = 0.25;
  public static readonly MILLIS_PER_SECOND = 1000;

  public static readonly MAX_RETRIES = 3;
  public static readonly RETRY_DELAYS_MS: readonly number[] = [1000, 2000, 4000];

  public static readonly HTTP_STATUS_OK = 200;
  public static readonly HTTP_STATUS_TOO_MANY_REQUESTS = 429;
  public static readonly HTTP_STATUS_SERVICE_UNAVAILABLE = 503;

  public static readonly DEFAULT_MODEL = 'gemini-2.5-flash';
  public static readonly DEFAULT_PROXY_ENDPOINT = '/api/gemini/proxy';
  public static readonly GEMINI_API_BASE_URL =
    'https://generativelanguage.googleapis.com/v1beta/models';

  public static readonly MODE_DIRECT_API = 'DIRECT_API';
  public static readonly MODE_MANUAL_IMPORT_EXPORT = 'MANUAL_IMPORT_EXPORT';

  public static readonly STATUS_SUCCESS = 'SUCCESS';
  public static readonly STATUS_MANUAL_FALLBACK_REQUIRED = 'MANUAL_FALLBACK_REQUIRED';
  public static readonly STATUS_FAILED = 'FAILED';

  public static readonly ERROR_RATE_LIMIT_EXCEEDED =
    'Gemini Free Tier rate limit exceeded (15 RPM quota exhausted)';
  public static readonly ERROR_API_UNAVAILABLE = 'Gemini service is currently unavailable';
  public static readonly ERROR_DIRECT_CALL_FAILED = 'Direct Gemini API invocation failed';
  public static readonly ERROR_INVALID_JSON = 'Failed to parse LLM output as valid JSON';
  public static readonly ERROR_SCHEMA_VALIDATION_FAILED =
    'LLM output does not match expected module schema';
  public static readonly ERROR_MISSING_API_KEY = 'Gemini API key is missing';
  public static readonly ERROR_UNSUPPORTED_MODULE = 'Unsupported module specified';

  public static readonly HEADER_CONTENT_TYPE = 'Content-Type';
  public static readonly HEADER_API_KEY = 'x-goog-api-key';
  public static readonly MIME_APPLICATION_JSON = 'application/json';

  public constructor() {}
}

