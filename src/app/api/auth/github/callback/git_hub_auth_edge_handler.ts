import { NextRequest, NextResponse } from 'next/server';

export interface GitHubAuthEdgeHandlerOptions {
  clientId?: string | undefined;
  clientSecret?: string | undefined;
  fetchFn?: typeof fetch | undefined;
}

interface GitHubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * Stateless Edge route handler exchanging GitHub OAuth codes for access tokens.
 */
export class GitHubAuthEdgeHandler {
  private static readonly _GITHUB_TOKEN_URL =
    'https://github.com/login/oauth/access_token';
  private static readonly _HEADER_ACCEPT = 'Accept';
  private static readonly _HEADER_CONTENT_TYPE = 'Content-Type';
  private static readonly _MIME_JSON = 'application/json';
  private static readonly _METHOD_POST = 'POST';
  private static readonly _ERR_MISSING_CODE = 'Missing OAuth authorization code';
  private static readonly _ERR_EXCHANGE_FAILED = 'GitHub OAuth exchange failed';
  private static readonly _ERR_INTERNAL =
    'Internal edge error during GitHub auth';
  private static readonly _STATUS_BAD_REQUEST = 400;
  private static readonly _STATUS_INTERNAL_ERROR = 500;
  private static readonly _EMPTY_STRING = '';

  public constructor(options?: GitHubAuthEdgeHandlerOptions) {
    this._clientId = options?.clientId;
    this._clientSecret = options?.clientSecret;
    this._fetchFn = options?.fetchFn ?? fetch.bind(globalThis);
  }

  /**
   * Processes POST request exchanging authorization code for GitHub token.
   */
  public async handlePost(req: NextRequest): Promise<NextResponse> {
    try {
      const payload = (await req.json()) as { code?: string; state?: string };
      if (!payload.code) {
        return this._buildErrorResponse(
          GitHubAuthEdgeHandler._ERR_MISSING_CODE,
          GitHubAuthEdgeHandler._STATUS_BAD_REQUEST
        );
      }
      return await this._exchangeToken(payload.code, payload.state);
    } catch {
      return this._buildErrorResponse(
        GitHubAuthEdgeHandler._ERR_INTERNAL,
        GitHubAuthEdgeHandler._STATUS_INTERNAL_ERROR
      );
    }
  }

  private readonly _clientId: string | undefined;
  private readonly _clientSecret: string | undefined;
  private readonly _fetchFn: typeof fetch;

  private _resolveClientId(): string {
    return (
      this._clientId ??
      process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ??
      process.env.GITHUB_CLIENT_ID ??
      GitHubAuthEdgeHandler._EMPTY_STRING
    );
  }

  private _resolveClientSecret(): string {
    return (
      this._clientSecret ??
      process.env.GITHUB_CLIENT_SECRET ??
      GitHubAuthEdgeHandler._EMPTY_STRING
    );
  }

  private async _fetchToken(code: string, state?: string): Promise<Response> {
    return this._fetchFn(GitHubAuthEdgeHandler._GITHUB_TOKEN_URL, {
      method: GitHubAuthEdgeHandler._METHOD_POST,
      headers: {
        [GitHubAuthEdgeHandler._HEADER_ACCEPT]:
          GitHubAuthEdgeHandler._MIME_JSON,
        [GitHubAuthEdgeHandler._HEADER_CONTENT_TYPE]:
          GitHubAuthEdgeHandler._MIME_JSON,
      },
      body: JSON.stringify({
        client_id: this._resolveClientId(),
        client_secret: this._resolveClientSecret(),
        code,
        state,
      }),
    });
  }

  private async _exchangeToken(
    code: string,
    state?: string
  ): Promise<NextResponse> {
    const res = await this._fetchToken(code, state);
    const data = (await res.json()) as GitHubTokenResponse;
    if (!res.ok || data.error) {
      const msg = data.error_description ?? GitHubAuthEdgeHandler._ERR_EXCHANGE_FAILED;
      return this._buildErrorResponse(msg, GitHubAuthEdgeHandler._STATUS_BAD_REQUEST);
    }
    return NextResponse.json({
      accessToken: data.access_token,
      tokenType: data.token_type,
      scope: data.scope,
    });
  }

  private _buildErrorResponse(message: string, status: number): NextResponse {
    return NextResponse.json({ error: message }, { status });
  }
}

