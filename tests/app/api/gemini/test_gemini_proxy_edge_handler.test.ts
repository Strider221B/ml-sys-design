import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GeminiProxyEdgeHandler } from '@/app/api/gemini/proxy/gemini_proxy_edge_handler';
import { Route } from '@/app/api/gemini/proxy/route';
import { TokenBucketLimiter } from '@/core/ai_gateway/token_bucket_limiter';
import { ExchangeEnvelopeSchema } from '@/schemas/exchange_envelope_schema';

describe('GeminiProxyEdgeHandler', () => {
  const originalEnv = process.env;
  const envelopeFactory = new ExchangeEnvelopeSchema();

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it('test_handlePost_whenRateLimiterRejects_returns429TooManyRequests', async () => {
    const rateLimiter = new TokenBucketLimiter({ capacity: 0 });
    const handler = new GeminiProxyEdgeHandler({
      apiKey: 'test_api_key',
      rateLimiter,
    });

    const req = new NextRequest('http://localhost:3000/api/gemini/proxy', {
      method: 'POST',
      body: JSON.stringify({ contents: [] }),
    });

    const res = await handler.handlePost(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toBe('Rate limit exceeded');
  });

  it('test_handlePost_whenApiKeyMissing_returns500InternalError', async () => {
    delete process.env.GEMINI_API_KEY;
    const handler = new GeminiProxyEdgeHandler();

    const req = new NextRequest('http://localhost:3000/api/gemini/proxy', {
      method: 'POST',
      body: JSON.stringify({ contents: [] }),
    });

    const res = await handler.handlePost(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Gemini API key not configured on edge');
  });

  it('test_handlePost_whenEnvelopeInvalid_returns400WithValidationErrors', async () => {
    const handler = new GeminiProxyEdgeHandler({
      apiKey: 'test_api_key',
    });

    const invalidEnvelope = {
      envelopeVersion: '9999.0.0',
      moduleId: 'INVALID_MODULE',
    };

    const req = new NextRequest('http://localhost:3000/api/gemini/proxy', {
      method: 'POST',
      body: JSON.stringify(invalidEnvelope),
    });

    const res = await handler.handlePost(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid exchange envelope payload');
    expect(Array.isArray(data.details)).toBe(true);
  });

  it('test_handlePost_whenValidEnvelope_proxiesToGeminiAndReturns200', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Calculated Roofline model.' }] } }],
      }),
    });

    const handler = new GeminiProxyEdgeHandler({
      apiKey: 'test_api_key_valid',
      fetchFn: mockFetch,
    });

    const envelope = envelopeFactory.createEnvelope({
      moduleId: 'SANDBOX_BUILDER',
      useCaseId: 'gpu_roofline_audit',
      systemInstruction: 'Act as HPC profiler.',
      userPrompt: 'Compute ridge point.',
      serializedContext: { gpu: 'H100' },
      copyPasteReadyMarkdown: '# Markdown',
      expectedResponseSchema: {},
      modelIdentifier: 'gemini-1.5-pro',
    });

    const req = new NextRequest('http://localhost:3000/api/gemini/proxy', {
      method: 'POST',
      body: JSON.stringify(envelope),
    });

    const res = await handler.handlePost(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.candidates[0].content.parts[0].text).toBe('Calculated Roofline model.');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const targetUrl = mockFetch.mock.calls[0][0] as string;
    expect(targetUrl).toContain('gemini-1.5-pro:generateContent?key=test_api_key_valid');

    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.contents[0].parts[0].text).toBe('Compute ridge point.');
    expect(sentBody.systemInstruction.parts[0].text).toBe('Act as HPC profiler.');
  });

  it('test_handlePost_whenDirectContentsPayload_proxiesToGemini', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Direct response' }] } }],
      }),
    });

    const handler = new GeminiProxyEdgeHandler({
      apiKey: 'test_api_key',
      fetchFn: mockFetch,
    });

    const req = new NextRequest('http://localhost:3000/api/gemini/proxy', {
      method: 'POST',
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      }),
    });

    const res = await handler.handlePost(req);
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('test_handlePost_whenPayloadFormatUnsupported_returns400', async () => {
    const handler = new GeminiProxyEdgeHandler({
      apiKey: 'test_api_key',
    });

    const req = new NextRequest('http://localhost:3000/api/gemini/proxy', {
      method: 'POST',
      body: JSON.stringify({ unexpectedKey: 'arbitrary_data' }),
    });

    const res = await handler.handlePost(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Unsupported request payload format');
  });

  it('test_handlePost_whenGeminiUpstreamFails_returnsUpstreamStatusAndError', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable: Overloaded upstream',
    });

    const handler = new GeminiProxyEdgeHandler({
      apiKey: 'test_api_key',
      fetchFn: mockFetch,
    });

    const req = new NextRequest('http://localhost:3000/api/gemini/proxy', {
      method: 'POST',
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Prompt' }] }],
      }),
    });

    const res = await handler.handlePost(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.error).toBe('Gemini upstream API error');
    expect(data.details).toBe('Service Unavailable: Overloaded upstream');
  });

  it('test_handlePost_whenUpstreamStatusIsZero_defaultsTo502', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 0,
      text: async () => 'Gateway timeout',
    });

    const handler = new GeminiProxyEdgeHandler({
      apiKey: 'test_api_key',
      fetchFn: mockFetch,
    });

    const req = new NextRequest('http://localhost:3000/api/gemini/proxy', {
      method: 'POST',
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Prompt' }] }],
      }),
    });

    const res = await handler.handlePost(req);
    expect(res.status).toBe(502);
  });

  it('test_handlePost_whenFetchThrows_returns500InternalError', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Fatal connection reset'));
    const handler = new GeminiProxyEdgeHandler({
      apiKey: 'test_api_key',
      fetchFn: mockFetch,
    });

    const req = new NextRequest('http://localhost:3000/api/gemini/proxy', {
      method: 'POST',
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Prompt' }] }],
      }),
    });

    const res = await handler.handlePost(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal edge error during Gemini proxy execution');
  });

  it('test_Route_POST_delegatesToHandlerInstance', async () => {
    delete process.env.GEMINI_API_KEY;
    const req = new NextRequest('http://localhost:3000/api/gemini/proxy', {
      method: 'POST',
      body: JSON.stringify({ contents: [] }),
    });

    const res = await Route.POST(req);
    expect(res.status).toBe(500);
  });
});

