import { GDriveConstants } from '@/core/gdrive/gdrive_constants';

export interface GisTokenResponse {
  access_token?: string;
  error?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export interface GisTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

interface GisOauth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GisTokenResponse) => void;
    error_callback?: (error: unknown) => void;
  }) => GisTokenClient;
  revoke: (token: string, done: () => void) => void;
}

interface GisWindow extends Window {
  google?: {
    accounts?: {
      oauth2?: GisOauth2;
    };
  };
}

/**
 * Client-side Google Identity Services (GIS) OAuth 2.0 token client for volatile RAM auth.
 */
export class GoogleAuthClient {
  private static readonly _GIS_SCRIPT_URL = GDriveConstants.GIS_SCRIPT_URL;
  private static readonly _OAUTH_SCOPE = GDriveConstants.OAUTH_SCOPE_DRIVE_FILE;
  private static readonly _ERR_INIT_REQUIRED =
    'GoogleAuthClient has not been initialized with a client ID';
  private static readonly _ERR_NO_TOKEN =
    'OAuth token request failed or returned empty token';
  private static readonly _ERR_WINDOW_UNDEFINED =
    'Window object is undefined in current runtime';

  public constructor(windowObj?: Window) {
    this._window = (windowObj ?? (typeof window !== 'undefined' ? window : null)) as GisWindow | null;
  }

  /**
   * Initializes the GIS OAuth 2.0 token client without client secrets.
   */
  public async initialize(clientId: string): Promise<void> {
    if (!this._window) {
      throw new Error(GoogleAuthClient._ERR_WINDOW_UNDEFINED);
    }
    this._clientId = clientId;
    await this._loadGisScript();
    this._initTokenClient();
  }

  /**
   * Triggers the Google consent popup and captures ephemeral access_token in volatile RAM.
   */
  public async requestAccessToken(): Promise<string> {
    if (!this._tokenClient) {
      throw new Error(GoogleAuthClient._ERR_INIT_REQUIRED);
    }
    return new Promise<string>((resolve, reject) => {
      this._pendingResolve = resolve;
      this._pendingReject = reject;
      this._tokenClient?.requestAccessToken();
    });
  }

  /**
   * Revokes existing OAuth token access and purges memory reference.
   */
  public async revokeToken(token: string): Promise<void> {
    const oauth2 = this._window?.google?.accounts?.oauth2;
    if (oauth2 && token) {
      await new Promise<void>((resolve) => {
        oauth2.revoke(token, () => resolve());
      });
    }
    if (this._accessToken === token) {
      this._accessToken = null;
    }
  }

  /**
   * Returns current in-memory ephemeral access token, if any.
   */
  public getAccessToken(): string | null {
    return this._accessToken;
  }

  /**
   * Returns whether a valid token currently exists in memory.
   */
  public isAuthenticated(): boolean {
    return this._accessToken !== null && this._accessToken.length > 0;
  }

  /**
   * Purges ephemeral token from memory.
   */
  public clearToken(): void {
    this._accessToken = null;
  }

  private readonly _window: GisWindow | null;
  private _clientId: string | null = null;
  private _tokenClient: GisTokenClient | null = null;
  private _accessToken: string | null = null;
  private _pendingResolve: ((token: string) => void) | null = null;
  private _pendingReject: ((error: Error) => void) | null = null;

  private async _loadGisScript(): Promise<void> {
    if (this._window?.google?.accounts?.oauth2) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const script = this._window?.document.createElement('script');
      if (!script) {
        reject(new Error(GoogleAuthClient._ERR_WINDOW_UNDEFINED));
        return;
      }
      script.src = GoogleAuthClient._GIS_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = (): void => resolve();
      script.onerror = (): void => reject(new Error('Failed to load Google Identity Services SDK'));
      this._window?.document.head.appendChild(script);
    });
  }

  private _initTokenClient(): void {
    const oauth2 = this._window?.google?.accounts?.oauth2;
    if (!oauth2 || !this._clientId) {
      throw new Error('Google Identity Services SDK is unavailable');
    }
    this._tokenClient = oauth2.initTokenClient({
      client_id: this._clientId,
      scope: GoogleAuthClient._OAUTH_SCOPE,
      callback: (res: GisTokenResponse) => this._handleTokenResponse(res),
      error_callback: (err: unknown) => this._handleTokenError(err),
    });
  }

  private _handleTokenResponse(response: GisTokenResponse): void {
    if (response.access_token) {
      this._accessToken = response.access_token;
      this._pendingResolve?.(response.access_token);
    } else {
      const msg = response.error ?? GoogleAuthClient._ERR_NO_TOKEN;
      this._pendingReject?.(new Error(msg));
    }
    this._pendingResolve = null;
    this._pendingReject = null;
  }

  private _handleTokenError(error: unknown): void {
    const msg = error instanceof Error ? error.message : GoogleAuthClient._ERR_NO_TOKEN;
    this._pendingReject?.(new Error(msg));
    this._pendingResolve = null;
    this._pendingReject = null;
  }
}

