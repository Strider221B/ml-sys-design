import { NextRequest, NextResponse } from 'next/server';
import { TokenBucketLimiter } from '@/core/ai_gateway/token_bucket_limiter';
import { ExchangeEnvelopeSchema, LLMExchangeEnvelope } from '@/schemas/exchange_envelope_schema';

export interface GeminiProxyEdgeHandlerOptions {
  apiKey?: string | undefined;
  rateLimiter?: TokenBucketLimiter | undefined;
  schemaValidator?: ExchangeEnvelopeSchema | undefined;
  fetchFn?: typeof fetch | undefined;
  baseUrl?: string | undefined;
  defaultModel?: string | undefined;
}

interface GeminiRequestBody {
  contents: Array<{
    role: string;
    parts: Array<{ text: string }>;
  }>;
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
}

/**
 * Edge proxy route enforcing token-bucket rate limits and forwarding inference requests.
 */
export class GeminiProxyEdgeHandler {
  private static readonly _DEFAULT_BASE_URL =
    'https://generativelanguage.googleapis.com/v1beta/models';
  private static readonly _DEFAULT_MODEL = 'gemini-1.5-flash';
  private static readonly _ACTION_GENERATE = ':generateContent';
  private static readonly _HEADER_CONTENT_TYPE = 'Content-Type';
  private static readonly _MIME_JSON = 'application/json';
  private static readonly _METHOD_POST = 'POST';
  private static readonly _ROLE_USER = 'user';

  private static readonly _ERR_RATE_LIMIT = 'Rate limit exceeded';
  private static readonly _ERR_MISSING_KEY =
    'Gemini API key not configured on edge';
  private static readonly _ERR_INVALID_PAYLOAD =
    'Invalid exchange envelope payload';
  private static readonly _ERR_UNSUPPORTED_FORMAT =
    'Unsupported request payload format';
  private static readonly _ERR_UPSTREAM = 'Gemini upstream API error';
  private static readonly _ERR_INTERNAL =
    'Internal edge error during Gemini proxy execution';

  private static readonly _STATUS_BAD_REQUEST = 400;
  private static readonly _STATUS_TOO_MANY_REQUESTS = 429;
  private static readonly _STATUS_INTERNAL_ERROR = 500;
  private static readonly _STATUS_BAD_GATEWAY = 502;
  private static readonly _DEFAULT_ACQUIRE_TOKENS = 1;

  public constructor(options?: GeminiProxyEdgeHandlerOptions) {
    this._apiKey = options?.apiKey;
    this._rateLimiter = options?.rateLimiter ?? new TokenBucketLimiter();
    this._schemaValidator = options?.schemaValidator ?? new ExchangeEnvelopeSchema();
    this._fetchFn = options?.fetchFn ?? fetch.bind(globalThis);
    this._baseUrl = options?.baseUrl ?? GeminiProxyEdgeHandler._DEFAULT_BASE_URL;
    this._defaultModel = options?.defaultModel ?? GeminiProxyEdgeHandler._DEFAULT_MODEL;
  }

  /**
   * Processes POST request, validates payload, and proxies to Google Gemini.
   */
  public async handlePost(req: NextRequest): Promise<NextResponse> {
    try {
      const rateLimitRes = this._checkRateLimit();
      if (rateLimitRes) return rateLimitRes;

      const apiKey = this._resolveApiKey();
      if (!apiKey) {
        return this._buildErrorResponse(
          GeminiProxyEdgeHandler._ERR_MISSING_KEY,
          GeminiProxyEdgeHandler._STATUS_INTERNAL_ERROR
        );
      }

      const body = (await req.json()) as Record<string, unknown>;
      return await this._processPayload(body, apiKey);
    } catch {
      return this._buildErrorResponse(
        GeminiProxyEdgeHandler._ERR_INTERNAL,
        GeminiProxyEdgeHandler._STATUS_INTERNAL_ERROR
      );
    }
  }

  private readonly _apiKey: string | undefined;
  private readonly _rateLimiter: TokenBucketLimiter;
  private readonly _schemaValidator: ExchangeEnvelopeSchema;
  private readonly _fetchFn: typeof fetch;
  private readonly _baseUrl: string;
  private readonly _defaultModel: string;

  private _checkRateLimit(): NextResponse | null {
    if (!this._rateLimiter.tryAcquire(GeminiProxyEdgeHandler._DEFAULT_ACQUIRE_TOKENS)) {
      return this._buildErrorResponse(
        GeminiProxyEdgeHandler._ERR_RATE_LIMIT,
        GeminiProxyEdgeHandler._STATUS_TOO_MANY_REQUESTS
      );
    }
    return null;
  }

  private _resolveApiKey(): string | undefined {
    return this._apiKey ?? process.env.GEMINI_API_KEY;
  }

  private async _processPayload(
    body: Record<string, unknown>,
    apiKey: string
  ): Promise<NextResponse> {
    if (this._isEnvelopeShape(body)) {
      return this._handleEnvelopePayload(body, apiKey);
    }
    if (Array.isArray(body['contents'])) {
      return this._forwardToGemini(this._defaultModel, apiKey, body);
    }
    return this._buildErrorResponse(
      GeminiProxyEdgeHandler._ERR_UNSUPPORTED_FORMAT,
      GeminiProxyEdgeHandler._STATUS_BAD_REQUEST
    );
  }

  private async _handleEnvelopePayload(
    body: Record<string, unknown>,
    apiKey: string
  ): Promise<NextResponse> {
    const validation = this._schemaValidator.safeValidateEnvelope(body);
    if (!validation.success || !validation.data) {
      return NextResponse.json(
        {
          error: GeminiProxyEdgeHandler._ERR_INVALID_PAYLOAD,
          details: validation.errors,
        },
        { status: GeminiProxyEdgeHandler._STATUS_BAD_REQUEST }
      );
    }
    const model = validation.data.metadata.modelIdentifier || this._defaultModel;
    const geminiBody = this._buildGeminiBodyFromEnvelope(validation.data);
    return this._forwardToGemini(model, apiKey, geminiBody);
  }

  private _isEnvelopeShape(body: Record<string, unknown>): boolean {
    return 'envelopeVersion' in body || 'moduleId' in body;
  }

  private _buildGeminiBodyFromEnvelope(
    envelope: LLMExchangeEnvelope
  ): GeminiRequestBody {
    const payload: GeminiRequestBody = {
      contents: [
        {
          role: GeminiProxyEdgeHandler._ROLE_USER,
          parts: [{ text: envelope.promptPayload.userPrompt }],
        },
      ],
    };

    if (envelope.promptPayload.systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: envelope.promptPayload.systemInstruction }],
      };
    }

    return payload;
  }

  private async _forwardToGemini(
    model: string,
    apiKey: string,
    payload: unknown
  ): Promise<NextResponse> {
    const url = `${this._baseUrl}/${model}${GeminiProxyEdgeHandler._ACTION_GENERATE}?key=${apiKey}`;
    const res = await this._fetchFn(url, {
      method: GeminiProxyEdgeHandler._METHOD_POST,
      headers: {
        [GeminiProxyEdgeHandler._HEADER_CONTENT_TYPE]:
          GeminiProxyEdgeHandler._MIME_JSON,
      },
      body: JSON.stringify(payload),
    });
    return this._parseUpstreamResponse(res);
  }

  private async _parseUpstreamResponse(res: Response): Promise<NextResponse> {
    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        {
          error: GeminiProxyEdgeHandler._ERR_UPSTREAM,
          details: errorText,
        },
        { status: res.status || GeminiProxyEdgeHandler._STATUS_BAD_GATEWAY }
      );
    }
    const data = (await res.json()) as Record<string, unknown>;
    return NextResponse.json(data);
  }

  private _buildErrorResponse(message: string, status: number): NextResponse {
    return NextResponse.json({ error: message }, { status });
  }
}
