import { describe, expect, it } from 'vitest';
import { AiGatewayConstants } from '@/core/ai_gateway/ai_gateway_constants';

describe('AiGatewayConstants', () => {
  it('test_constants_instantiatesAndHasExpectedValues', () => {
    const constants = new AiGatewayConstants();
    expect(constants).toBeDefined();
    expect(AiGatewayConstants.DEFAULT_CAPACITY).toBe(15);
    expect(AiGatewayConstants.DEFAULT_REFILL_RATE_PER_SEC).toBe(0.25);
    expect(AiGatewayConstants.MILLIS_PER_SECOND).toBe(1000);
    expect(AiGatewayConstants.MAX_RETRIES).toBe(3);
    expect(AiGatewayConstants.RETRY_DELAYS_MS).toEqual([1000, 2000, 4000]);
    expect(AiGatewayConstants.HTTP_STATUS_OK).toBe(200);
    expect(AiGatewayConstants.HTTP_STATUS_TOO_MANY_REQUESTS).toBe(429);
    expect(AiGatewayConstants.HTTP_STATUS_SERVICE_UNAVAILABLE).toBe(503);
    expect(AiGatewayConstants.DEFAULT_MODEL).toBe('gemini-2.5-flash');
    expect(AiGatewayConstants.DEFAULT_PROXY_ENDPOINT).toBe('/api/gemini/proxy');
    expect(AiGatewayConstants.MODE_DIRECT_API).toBe('DIRECT_API');
    expect(AiGatewayConstants.MODE_MANUAL_IMPORT_EXPORT).toBe('MANUAL_IMPORT_EXPORT');
    expect(AiGatewayConstants.STATUS_SUCCESS).toBe('SUCCESS');
    expect(AiGatewayConstants.STATUS_MANUAL_FALLBACK_REQUIRED).toBe('MANUAL_FALLBACK_REQUIRED');
    expect(AiGatewayConstants.STATUS_FAILED).toBe('FAILED');
    expect(AiGatewayConstants.HEADER_CONTENT_TYPE).toBe('Content-Type');
    expect(AiGatewayConstants.HEADER_API_KEY).toBe('x-goog-api-key');
    expect(AiGatewayConstants.MIME_APPLICATION_JSON).toBe('application/json');
  });
});

