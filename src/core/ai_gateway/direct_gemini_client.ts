import { AiGatewayConstants } from '@/core/ai_gateway/ai_gateway_constants';
import { TokenBucketLimiter } from '@/core/ai_gateway/token_bucket_limiter';

export interface DirectGeminiClientOptions {
  model?: string;
  baseUrl?: string;
  proxyUrl?: string;
  retryDelaysMs?: readonly number[];
  fetchFn?: typeof fetch;
}

interface GeminiCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message?: string; code?: number };
}

/**
 * Direct Gemini Free Tier client with rate-limiting and exponential backoff retry.
 */
export class DirectGeminiClient {
  private static readonly _METHOD_POST = 'POST';
  private static readonly _GENERATE_CONTENT_ACTION = ':generateContent';
  private static readonly _EMPTY_STRING = '';
  private static readonly _RESPONSE_ERROR_PREFIX = 'Gemini API Error: ';

  public constructor(
    private readonly _apiKey: string,
    private readonly _rateLimiter: TokenBucketLimiter,
    options?: DirectGeminiClientOptions
  ) {
    this._model = options?.model ?? AiGatewayConstants.DEFAULT_MODEL;
    this._baseUrl = options?.baseUrl ?? AiGatewayConstants.GEMINI_API_BASE_URL;
    this._proxyUrl = options?.proxyUrl;
    this._retryDelaysMs = options?.retryDelaysMs ?? AiGatewayConstants.RETRY_DELAYS_MS;
    this._fetchFn = options?.fetchFn ?? fetch.bind(globalThis);
  }

  /**
   * Executes inference directly against the Gemini Free Tier API.
   */
  public async executeDirect(prompt: string, systemInstruction: string): Promise<string> {
    const tokenAcquired = await this._rateLimiter.acquireToken();
    if (!tokenAcquired) {
      throw new Error(AiGatewayConstants.ERROR_RATE_LIMIT_EXCEEDED);
    }
    const url = this._buildRequestUrl();
    const body = this._buildRequestBody(prompt, systemInstruction);
    return this._executeWithRetry(url, body);
  }

  private readonly _model: string;
  private readonly _baseUrl: string;
  private readonly _proxyUrl: string | undefined;
  private readonly _retryDelaysMs: readonly number[];
  private readonly _fetchFn: typeof fetch;

  private _buildRequestUrl(): string {
    if (this._proxyUrl) {
      return this._proxyUrl;
    }
    return `${this._baseUrl}/${this._model}${DirectGeminiClient._GENERATE_CONTENT_ACTION}`;
  }

  private _buildRequestBody(prompt: string, systemInstruction: string): string {
    return JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      systemInstruction: systemInstruction
        ? {
            parts: [{ text: systemInstruction }],
          }
        : undefined,
      generationConfig: {
        responseMimeType: AiGatewayConstants.MIME_APPLICATION_JSON,
      },
    });
  }

  private async _executeWithRetry(url: string, body: string): Promise<string> {
    let lastError: Error = new Error(AiGatewayConstants.ERROR_DIRECT_CALL_FAILED);

    for (let attempt = 0; attempt <= this._retryDelaysMs.length; attempt++) {
      try {
        const response = await this._sendHttpRequest(url, body);
        if (response.ok) {
          const json = (await response.json()) as GeminiResponse;
          return this._extractTextFromResponse(json);
        }
        await this._handleFailedResponse(response, attempt);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (!this._isRetryableError(lastError, attempt)) {
          throw lastError;
        }
        await this._delay(this._retryDelaysMs[attempt] ?? 0);
      }
    }
    throw lastError;
  }

  private async _sendHttpRequest(url: string, body: string): Promise<Response> {
    const headers: Record<string, string> = {
      [AiGatewayConstants.HEADER_CONTENT_TYPE]: AiGatewayConstants.MIME_APPLICATION_JSON,
    };
    if (!this._proxyUrl && this._apiKey) {
      headers[AiGatewayConstants.HEADER_API_KEY] = this._apiKey;
    }
    return this._fetchFn(url, {
      method: DirectGeminiClient._METHOD_POST,
      headers,
      body,
    });
  }

  private async _handleFailedResponse(response: Response, attempt: number): Promise<void> {
    const status = response.status;
    const isRateLimited = status === AiGatewayConstants.HTTP_STATUS_TOO_MANY_REQUESTS;
    const isUnavailable = status === AiGatewayConstants.HTTP_STATUS_SERVICE_UNAVAILABLE;

    if ((isRateLimited || isUnavailable) && attempt < this._retryDelaysMs.length) {
      const delayMs = this._retryDelaysMs[attempt] ?? 0;
      await this._delay(delayMs);
      return;
    }
    const errText = await response.text();
    throw new Error(`${DirectGeminiClient._RESPONSE_ERROR_PREFIX}${status} ${errText}`);
  }

  private _isRetryableError(error: Error, attempt: number): boolean {
    if (attempt >= this._retryDelaysMs.length) {
      return false;
    }
    const msg = error.message.toLowerCase();
    return msg.includes('429') || msg.includes('503') || msg.includes('network');
  }

  private _extractTextFromResponse(data: GeminiResponse): string {
    if (data.error?.message) {
      throw new Error(`${DirectGeminiClient._RESPONSE_ERROR_PREFIX}${data.error.message}`);
    }
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error(AiGatewayConstants.ERROR_INVALID_JSON);
    }
    return text;
  }

  private async _delay(ms: number): Promise<void> {
    if (ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
