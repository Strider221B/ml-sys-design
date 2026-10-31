import { describe, expect, it, vi } from 'vitest';
import { DirectGeminiClient } from '@/core/ai_gateway/direct_gemini_client';
import { TokenBucketLimiter } from '@/core/ai_gateway/token_bucket_limiter';

describe('DirectGeminiClient', () => {
  const mockValidResponse = (text: string) => {
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text }],
            },
          },
        ],
      }),
      { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json' } }
    );
  };

  it('test_executeDirect_whenRateLimitAvailable_returnsExtractedText', async () => {
    const limiter = new TokenBucketLimiter({ capacity: 5 });
    const mockFetch = vi.fn().mockResolvedValue(mockValidResponse('{"overallHealthScore": 90}'));
    const client = new DirectGeminiClient('test_api_key_123', limiter, {
      fetchFn: mockFetch as unknown as typeof fetch,
      retryDelaysMs: [1, 2],
    });

    const result = await client.executeDirect('user prompt', 'system instructions');
    expect(result).toBe('{"overallHealthScore": 90}');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toContain('gemini-2.5-flash:generateContent');
    expect(calledInit.headers).toHaveProperty('x-goog-api-key', 'test_api_key_123');
  });

  it('test_executeDirect_whenRateLimiterExhausted_throwsWithoutCallingFetch', async () => {
    const limiter = new TokenBucketLimiter({ capacity: 1 });
    await limiter.acquireToken(1); // exhaust
    const mockFetch = vi.fn();
    const client = new DirectGeminiClient('test_key', limiter, {
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.executeDirect('p', 's')).rejects.toThrow(
      'Gemini Free Tier rate limit exceeded'
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('test_executeDirect_retriesOn429AndSucceedsOnNextAttempt', async () => {
    const limiter = new TokenBucketLimiter({ capacity: 5 });
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('Quota Exceeded', { status: 429, statusText: 'Too Many Requests' }))
      .mockResolvedValueOnce(mockValidResponse('{"success": true}'));

    const client = new DirectGeminiClient('test_key', limiter, {
      fetchFn: mockFetch as unknown as typeof fetch,
      retryDelaysMs: [10, 20],
    });

    const result = await client.executeDirect('prompt', 'system');
    expect(result).toBe('{"success": true}');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('test_executeDirect_whenRetriesExhaustedOn429_throwsError', async () => {
    const limiter = new TokenBucketLimiter({ capacity: 5 });
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response('Rate limited', { status: 429, statusText: 'Too Many Requests' }));

    const client = new DirectGeminiClient('test_key', limiter, {
      fetchFn: mockFetch as unknown as typeof fetch,
      retryDelaysMs: [5, 5],
    });

    await expect(client.executeDirect('prompt', 'sys')).rejects.toThrow(
      'Gemini API Error: 429'
    );
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('test_executeDirect_onNonRetryableError_throwsImmediately', async () => {
    const limiter = new TokenBucketLimiter({ capacity: 5 });
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('Bad Request', { status: 400, statusText: 'Bad Request' }));

    const client = new DirectGeminiClient('test_key', limiter, {
      fetchFn: mockFetch as unknown as typeof fetch,
      retryDelaysMs: [10, 20],
    });

    await expect(client.executeDirect('prompt', 'sys')).rejects.toThrow(
      'Gemini API Error: 400 Bad Request'
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('test_executeDirect_withProxyUrl_usesProxyEndpointWithoutApiKeyHeader', async () => {
    const limiter = new TokenBucketLimiter({ capacity: 5 });
    const mockFetch = vi.fn().mockResolvedValue(mockValidResponse('{"proxied": true}'));
    const client = new DirectGeminiClient('test_key', limiter, {
      proxyUrl: '/api/gemini/proxy',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const result = await client.executeDirect('prompt', '');
    expect(result).toBe('{"proxied": true}');
    const [calledUrl, calledInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe('/api/gemini/proxy');
    expect(calledInit.headers).not.toHaveProperty('x-goog-api-key');
  });

  it('test_executeDirect_whenApiResponseContainsErrorMessage_throwsGeminiError', async () => {
    const limiter = new TokenBucketLimiter({ capacity: 5 });
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: 'Invalid API key provided', code: 400 },
        }),
        { status: 200 }
      )
    );
    const client = new DirectGeminiClient('test_key', limiter, {
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.executeDirect('p', 's')).rejects.toThrow(
      'Gemini API Error: Invalid API key provided'
    );
  });

  it('test_executeDirect_whenResponseHasNoCandidatesOrText_throwsInvalidJson', async () => {
    const limiter = new TokenBucketLimiter({ capacity: 5 });
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ candidates: [] }), { status: 200 })
    );
    const client = new DirectGeminiClient('test_key', limiter, {
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.executeDirect('p', 's')).rejects.toThrow(
      'Failed to parse LLM output as valid JSON'
    );
  });

  it('test_executeDirect_whenFetchThrowsNetworkError_retriesAndThrows', async () => {
    const limiter = new TokenBucketLimiter({ capacity: 5 });
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network connection timeout'));
    const client = new DirectGeminiClient('test_key', limiter, {
      fetchFn: mockFetch as unknown as typeof fetch,
      retryDelaysMs: [5, 5],
    });

    await expect(client.executeDirect('p', 's')).rejects.toThrow(
      'Network connection timeout'
    );
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

