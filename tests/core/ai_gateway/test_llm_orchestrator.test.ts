import { describe, expect, it, vi } from 'vitest';
import { DirectGeminiClient } from '@/core/ai_gateway/direct_gemini_client';
import { LlmOrchestrator } from '@/core/ai_gateway/llm_orchestrator';
import { PromptEnvelopeFactory } from '@/core/ai_gateway/prompt_envelope_factory';
import { ResponseValidator } from '@/core/ai_gateway/response_validator';
import { TokenBucketLimiter } from '@/core/ai_gateway/token_bucket_limiter';

describe('LlmOrchestrator', () => {
  const setupOrchestrator = (mockDirectResult?: string, mockDirectError?: Error) => {
    const limiter = new TokenBucketLimiter({ capacity: 5 });
    const directClient = new DirectGeminiClient('dummy_key', limiter);
    if (mockDirectError) {
      vi.spyOn(directClient, 'executeDirect').mockRejectedValue(mockDirectError);
    } else if (mockDirectResult !== undefined) {
      vi.spyOn(directClient, 'executeDirect').mockResolvedValue(mockDirectResult);
    }

    const envelopeFactory = new PromptEnvelopeFactory();
    const responseValidator = new ResponseValidator();
    const orchestrator = new LlmOrchestrator(directClient, envelopeFactory, responseValidator);

    return { orchestrator, directClient, envelopeFactory, responseValidator };
  };

  const validSandboxResponse = JSON.stringify({
    overallHealthScore: 88,
    identifiedBottlenecks: [],
    suggestedOptimizations: [],
    tradeOffAssessment: 'Balanced',
  });

  it('test_execute_directMode_whenApiSucceeds_returnsSuccessWithParsedData', async () => {
    const { orchestrator } = setupOrchestrator(validSandboxResponse);
    const result = await orchestrator.execute<{ overallHealthScore: number }>(
      'SANDBOX_BUILDER',
      { qps: 1000 },
      { mode: 'DIRECT_API' }
    );

    expect(result.status).toBe('SUCCESS');
    expect(result.data?.overallHealthScore).toBe(88);
    expect(result.envelope.metadata.source).toBe('DIRECT_GEMINI_API');
    expect(result.envelope.llmResponse).toBeDefined();
  });

  it('test_execute_directMode_whenApiFailsWith429_triggersAutomaticFallback', async () => {
    const error429 = new Error('Gemini API Error: 429 Too Many Requests');
    const { orchestrator } = setupOrchestrator(undefined, error429);

    const result = await orchestrator.execute('SANDBOX_BUILDER', { qps: 1000 });

    expect(result.status).toBe('MANUAL_FALLBACK_REQUIRED');
    expect(result.data).toBeNull();
    expect(result.error).toContain('429 Too Many Requests');
    expect(result.envelope.metadata.validationErrors).toContain(
      'Gemini API Error: 429 Too Many Requests'
    );
    expect(result.envelope.promptPayload.copyPasteReadyMarkdown).toBeDefined();
  });

  it('test_execute_directMode_whenResponseFailsSchema_triggersFallback', async () => {
    const invalidSchemaResponse = JSON.stringify({
      overallHealthScore: 'NOT_A_NUMBER',
    });
    const { orchestrator } = setupOrchestrator(invalidSchemaResponse);

    const result = await orchestrator.execute('SANDBOX_BUILDER', { qps: 1000 });

    expect(result.status).toBe('MANUAL_FALLBACK_REQUIRED');
    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.envelope.metadata.validationErrors.length).toBeGreaterThan(0);
  });

  it('test_execute_manualMode_immediatelyReturnsAirGapEnvelope', async () => {
    const { orchestrator } = setupOrchestrator();

    const result = await orchestrator.execute(
      'SANDBOX_BUILDER',
      { nodes: ['gpu1'] },
      { mode: 'MANUAL_IMPORT_EXPORT', useCaseId: 'air_gap_test' }
    );

    expect(result.status).toBe('MANUAL_FALLBACK_REQUIRED');
    expect(result.data).toBeNull();
    expect(result.envelope.useCaseId).toBe('air_gap_test');
  });

  it('test_execute_withNoOptionsProvided_usesAllDefaults', async () => {
    const { orchestrator } = setupOrchestrator(validSandboxResponse);
    const result = await orchestrator.execute<{ overallHealthScore: number }>(
      'SANDBOX_BUILDER',
      { qps: 500 }
    );
    expect(result.status).toBe('SUCCESS');
    expect(result.data?.overallHealthScore).toBe(88);
  });

  it('test_execute_whenDirectCallThrowsNonErrorObject_handlesGracefully', async () => {
    const { orchestrator, directClient } = setupOrchestrator();
    vi.spyOn(directClient, 'executeDirect').mockRejectedValue('Raw string network exception');

    const result = await orchestrator.execute('SANDBOX_BUILDER', { qps: 500 });
    expect(result.status).toBe('MANUAL_FALLBACK_REQUIRED');
    expect(result.error).toBe('Raw string network exception');
  });

  it('test_importManualResponse_whenValid_updatesEnvelopeAndReturnsSuccess', () => {
    const { orchestrator, envelopeFactory } = setupOrchestrator();
    const envelope = envelopeFactory.createEnvelope('SANDBOX_BUILDER', {}, 'sys', {});

    const result = orchestrator.importManualResponse<{ overallHealthScore: number }>(
      envelope,
      validSandboxResponse
    );

    expect(result.status).toBe('SUCCESS');
    expect(result.data?.overallHealthScore).toBe(88);
    expect(envelope.metadata.source).toBe('MANUAL_IMPORT');
    expect(envelope.metadata.validationErrors).toEqual([]);
    expect(envelope.llmResponse).toBeDefined();
  });

  it('test_importManualResponse_whenInvalid_returnsFailedWithRepairPrompt', () => {
    const { orchestrator, envelopeFactory } = setupOrchestrator();
    const envelope = envelopeFactory.createEnvelope('SANDBOX_BUILDER', {}, 'sys', {});
    const invalidText = '{"overallHealthScore": "bad"}';

    const result = orchestrator.importManualResponse(envelope, invalidText);

    expect(result.status).toBe('FAILED');
    expect(result.data).toBeNull();
    expect(result.repairPrompt).toContain('CRITICAL JSON SCHEMA ERROR');
    expect(envelope.metadata.validationErrors.length).toBeGreaterThan(0);
  });
});
