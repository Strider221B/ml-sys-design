import { describe, expect, it } from 'vitest';
import {
  CreateEnvelopeOptions,
  ExchangeEnvelopeSchema,
} from '@/schemas/exchange_envelope_schema';

describe('ExchangeEnvelopeSchema', () => {
  const schema = new ExchangeEnvelopeSchema();

  const validOptions: CreateEnvelopeOptions = {
    moduleId: 'SANDBOX_BUILDER',
    useCaseId: 'use_case_001',
    systemInstruction: 'You are an ML Architect.',
    userPrompt: 'Design a fraud detection pipeline.',
    serializedContext: { framework: 'vLLM', budgetUSD: 1000 },
    copyPasteReadyMarkdown: '# Instructions',
    expectedResponseSchema: { type: 'object' },
  };

  it('test_schemaVersion_returnsExpectedVersion', () => {
    expect(schema.schemaVersion).toBe('2026.1.0');
  });

  it('test_createEnvelope_withDefaultOptions_createsValidEnvelope', () => {
    const envelope = schema.createEnvelope(validOptions);

    expect(envelope.envelopeVersion).toBe('2026.1.0');
    expect(envelope.moduleId).toBe('SANDBOX_BUILDER');
    expect(envelope.useCaseId).toBe('use_case_001');
    expect(envelope.metadata.source).toBe('MANUAL_IMPORT');
    expect(envelope.metadata.modelIdentifier).toBe('gemini-1.5-flash');
    expect(envelope.metadata.executionLatencyMs).toBe(0);
    expect(envelope.promptPayload.systemInstruction).toBe('You are an ML Architect.');
    expect(envelope.promptPayload.serializedContext).toEqual({
      framework: 'vLLM',
      budgetUSD: 1000,
    });
    expect(envelope.llmResponse).toBeNull();
  });

  it('test_createEnvelope_withCustomSourceAndModel_createsValidEnvelope', () => {
    const customOptions: CreateEnvelopeOptions = {
      ...validOptions,
      executionSource: 'DIRECT_GEMINI_API',
      modelIdentifier: 'gemini-1.5-pro',
    };
    const envelope = schema.createEnvelope(customOptions);

    expect(envelope.metadata.source).toBe('DIRECT_GEMINI_API');
    expect(envelope.metadata.modelIdentifier).toBe('gemini-1.5-pro');
  });

  it('test_createEmptyEnvelope_createsBaselineStructure', () => {
    const emptyEnvelope = schema.createEmptyEnvelope('FINOPS_CALCULATOR', 'finops_01');

    expect(emptyEnvelope.moduleId).toBe('FINOPS_CALCULATOR');
    expect(emptyEnvelope.useCaseId).toBe('finops_01');
    expect(emptyEnvelope.promptPayload.systemInstruction).toBe('');
    expect(emptyEnvelope.promptPayload.userPrompt).toBe('');
    expect(emptyEnvelope.promptPayload.serializedContext).toEqual({});
  });

  it('test_validateEnvelope_withValidInput_succeeds', () => {
    const envelope = schema.createEnvelope(validOptions);
    const validated = schema.validateEnvelope(envelope);

    expect(validated.envelopeId).toBe(envelope.envelopeId);
    expect(validated.moduleId).toBe('SANDBOX_BUILDER');
  });

  it('test_validateEnvelope_withInvalidVersion_throwsError', () => {
    const envelope = schema.createEnvelope(validOptions) as unknown as Record<string, unknown>;
    envelope.envelopeVersion = '1999.0.0';

    expect(() => schema.validateEnvelope(envelope)).toThrow();
  });

  it('test_validateEnvelope_withInvalidModuleId_throwsError', () => {
    const envelope = schema.createEnvelope(validOptions) as unknown as Record<string, unknown>;
    envelope.moduleId = 'NON_EXISTENT_MODULE';

    expect(() => schema.validateEnvelope(envelope)).toThrow();
  });

  it('test_safeValidateEnvelope_withValidInput_returnsSuccess', () => {
    const envelope = schema.createEnvelope(validOptions);
    const result = schema.safeValidateEnvelope(envelope);

    expect(result.success).toBe(true);
    expect(result.data?.envelopeId).toBe(envelope.envelopeId);
    expect(result.errors).toBeUndefined();
  });

  it('test_safeValidateEnvelope_withInvalidInput_returnsFailureAndErrors', () => {
    const invalidEnvelope = {
      envelopeVersion: 'invalid_version',
      moduleId: 'INVALID',
    };
    const result = schema.safeValidateEnvelope(invalidEnvelope);

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});
