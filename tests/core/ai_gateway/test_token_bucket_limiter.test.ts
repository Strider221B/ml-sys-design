import { describe, expect, it } from 'vitest';
import { TokenBucketLimiter } from '@/core/ai_gateway/token_bucket_limiter';

describe('TokenBucketLimiter', () => {
  it('test_initialize_defaultsToFifteenCapacityAndPointTwentyFiveRefill', () => {
    const limiter = new TokenBucketLimiter();
    expect(limiter.capacity).toBe(15);
    expect(limiter.availableTokens).toBe(15);
  });

  it('test_tryAcquire_decrementsTokensCorrectly', () => {
    const now = 100000;
    const limiter = new TokenBucketLimiter({
      capacity: 5,
      refillRatePerSec: 1,
      clock: () => now,
    });

    expect(limiter.tryAcquire(2)).toBe(true);
    expect(limiter.availableTokens).toBe(3);
    expect(limiter.tryAcquire(3)).toBe(true);
    expect(limiter.availableTokens).toBe(0);
    expect(limiter.tryAcquire(1)).toBe(false);
  });

  it('test_acquireToken_asyncWrapperOperatesConsistently', async () => {
    const limiter = new TokenBucketLimiter({ capacity: 2 });
    const first = await limiter.acquireToken(1);
    const second = await limiter.acquireToken(1);
    const third = await limiter.acquireToken(1);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(third).toBe(false);
  });

  it('test_refill_addsTokensOverTimeAndCapsAtCapacity', () => {
    let currentTime = 1000000;
    const limiter = new TokenBucketLimiter({
      capacity: 10,
      refillRatePerSec: 2,
      clock: () => currentTime,
    });

    // Exhaust all 10 tokens
    expect(limiter.tryAcquire(10)).toBe(true);
    expect(limiter.availableTokens).toBe(0);

    // Advance by 2 seconds (refill rate 2 -> 4 tokens)
    currentTime += 2000;
    expect(limiter.availableTokens).toBeCloseTo(4, 1);

    // Advance by 10 more seconds (should cap at 10)
    currentTime += 10000;
    expect(limiter.availableTokens).toBe(10);
  });

  it('test_reset_restoresFullCapacityImmediately', () => {
    const currentTime = 500000;
    const limiter = new TokenBucketLimiter({
      capacity: 15,
      clock: () => currentTime,
    });

    limiter.tryAcquire(15);
    expect(limiter.availableTokens).toBe(0);

    limiter.reset();
    expect(limiter.availableTokens).toBe(15);
  });

  it('test_refill_whenNoTimeElapsed_returnsImmediately', () => {
    const now = 2000000;
    const limiter = new TokenBucketLimiter({
      capacity: 5,
      clock: () => now,
    });
    limiter.tryAcquire(2);
    expect(limiter.availableTokens).toBe(3);
  });
});
