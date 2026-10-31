import { AiGatewayConstants } from '@/core/ai_gateway/ai_gateway_constants';

export interface TokenBucketOptions {
  capacity?: number;
  refillRatePerSec?: number;
  clock?: () => number;
}

/**
 * Token bucket rate limiter matching Gemini Free Tier quotas (15 RPM).
 */
export class TokenBucketLimiter {
  private static readonly _DEFAULT_ACQUIRE_COUNT = 1;
  private static readonly _MIN_TOKENS_AVAILABLE = 0;

  public constructor(options?: TokenBucketOptions) {
    this._capacity = options?.capacity ?? AiGatewayConstants.DEFAULT_CAPACITY;
    this._refillRatePerSec =
      options?.refillRatePerSec ?? AiGatewayConstants.DEFAULT_REFILL_RATE_PER_SEC;
    this._clock = options?.clock ?? (() => Date.now());
    this._tokens = this._capacity;
    this._lastRefillTimestampMs = this._clock();
  }

  /**
   * Returns current number of tokens available in the bucket.
   */
  public get availableTokens(): number {
    this._refill();
    return this._tokens;
  }

  /**
   * Returns maximum capacity of the bucket.
   */
  public get capacity(): number {
    return this._capacity;
  }

  /**
   * Attempts to synchronously acquire tokens without waiting.
   */
  public tryAcquire(tokens: number = TokenBucketLimiter._DEFAULT_ACQUIRE_COUNT): boolean {
    this._refill();
    if (this._tokens >= tokens) {
      this._tokens -= tokens;
      return true;
    }
    return false;
  }

  /**
   * Asynchronously acquires a token if available within the rate limit.
   */
  public async acquireToken(
    tokens: number = TokenBucketLimiter._DEFAULT_ACQUIRE_COUNT
  ): Promise<boolean> {
    return this.tryAcquire(tokens);
  }

  /**
   * Resets bucket to full capacity and resets clock reference.
   */
  public reset(): void {
    this._tokens = this._capacity;
    this._lastRefillTimestampMs = this._clock();
  }

  private readonly _capacity: number;
  private readonly _refillRatePerSec: number;
  private readonly _clock: () => number;
  private _tokens: number;
  private _lastRefillTimestampMs: number;

  private _refill(): void {
    const now = this._clock();
    const elapsedSeconds =
      (now - this._lastRefillTimestampMs) / AiGatewayConstants.MILLIS_PER_SECOND;
    if (elapsedSeconds <= TokenBucketLimiter._MIN_TOKENS_AVAILABLE) {
      return;
    }
    const addedTokens = elapsedSeconds * this._refillRatePerSec;
    this._tokens = Math.min(this._capacity, this._tokens + addedTokens);
    this._lastRefillTimestampMs = now;
  }
}
