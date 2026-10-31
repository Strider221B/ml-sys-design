import { describe, expect, it } from 'vitest';
import { PromptEnvelopeFactory } from '@/core/ai_gateway/prompt_envelope_factory';
import { ExchangeEnvelopeSchema } from '@/schemas/exchange_envelope_schema';

describe('PromptEnvelopeFactory', () => {
  const factory = new PromptEnvelopeFactory();

  it('test_createEnvelope_generatesPopulatedEnvelopeStructure', () => {
    const context = { qps: 15000, model: 'llama-3.3-70b', p99TargetMs: 50 };
    const targetSchema = { type: 'object', properties: { score: { type: 'number' } } };

    const envelope = factory.createEnvelope(
      'SANDBOX_BUILDER',
      context,
      'You are a high-scale architect.',
      targetSchema,
      'custom_use_case_42'
    );

    expect(envelope.moduleId).toBe('SANDBOX_BUILDER');
    expect(envelope.useCaseId).toBe('custom_use_case_42');
    expect(envelope.envelopeVersion).toBe('2026.1.0');
    expect(envelope.promptPayload.systemInstruction).toBe('You are a high-scale architect.');
    expect(envelope.promptPayload.serializedContext).toEqual(context);
    expect(envelope.promptPayload.copyPasteReadyMarkdown).toContain('### SYSTEM INSTRUCTIONS');
    expect(envelope.promptPayload.copyPasteReadyMarkdown).toContain('llama-3.3-70b');
    expect(envelope.promptPayload.copyPasteReadyMarkdown).toContain('### EXPECTED JSON SCHEMA');
    expect(envelope.expectedResponseSchema).toEqual(targetSchema);
  });

  it('test_createEnvelope_whenUseCaseIdOmitted_usesDefaultPrefix', () => {
    const envelope = factory.createEnvelope(
      'FINOPS_CALCULATOR',
      { budget: 5000 },
      'Evaluate cost',
      {}
    );

    expect(envelope.useCaseId).toBe('default_use_case_FINOPS_CALCULATOR');
    expect(envelope.promptPayload.userPrompt).toContain('budget');
  });

  it('test_constructor_acceptsCustomSchemaHandler', () => {
    const handler = new ExchangeEnvelopeSchema();
    const customFactory = new PromptEnvelopeFactory({ schemaHandler: handler });
    const envelope = customFactory.createEnvelope('SANDBOX_BUILDER', {}, 'sys', {});
    expect(envelope).toBeDefined();
  });

  it('test_formatMarkdownInstructions_producesConsistentMarkdown', () => {
    const envelope = factory.createEnvelope(
      'CHAOS_MONKEY_ARGON',
      { failureScenario: 'partition' },
      'Find exploit',
      { type: 'object' }
    );

    const formatted = factory.formatMarkdownInstructions(envelope);
    expect(formatted).toBe(envelope.promptPayload.copyPasteReadyMarkdown);
    expect(formatted).toContain('### CRITICAL INSTRUCTIONS');
    expect(formatted).toContain('partition');
  });
});
