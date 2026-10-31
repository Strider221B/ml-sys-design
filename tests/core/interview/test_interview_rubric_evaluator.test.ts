import { describe, expect, it, vi } from 'vitest';
import { LlmOrchestrator } from '@/core/ai_gateway/llm_orchestrator';
import { InterviewRubricEvaluator, RubricEvaluationData } from '@/core/interview/interview_rubric_evaluator';
import { MultimodalEvaluationPayload } from '@/core/interview/multimodal_input_processor';
import { LLMExchangeEnvelope } from '@/schemas/exchange_envelope_schema';

describe('InterviewRubricEvaluator', () => {
  const samplePayload: MultimodalEvaluationPayload = {
    stepNumber: 1,
    stepName: 'CLARIFYING_REQUIREMENTS',
    stepTitle: 'Clarifying Requirements & Scale Estimation',
    spokenTranscript: 'DAU is 50 million, QPS is 10k, latency p99 SLA is 50ms',
    canvasTopologySummary: 'Nodes: 1, Edges: 0',
    rawGraph: { nodes: [], edges: [] },
  };

  const sampleRubricData: RubricEvaluationData = {
    stepNumber: 1,
    stepCompleted: true,
    stepScore: 85,
    interviewerSpeech: 'Solid scale breakdown.',
    feedback: {
      strengths: ['Clear QPS estimation'],
      missingConsiderations: ['Peak storage growth'],
      bottlenecksIdentified: [],
    },
    dimensionScores: {
      scaleAwareness: 4,
      componentSelection: 4,
      failureHandling: 4,
      businessAlignment: 4,
    },
    suggestedNextQuestions: ['How do features get ingested?'],
  };

  const mockEnvelope: LLMExchangeEnvelope = {
    envelopeVersion: '2026.1.0',
    envelopeId: 'env_123',
    moduleId: 'AI_INTERVIEW_SIMULATOR',
    useCaseId: 'interview_step_1',
    timestamp: new Date().toISOString(),
    promptPayload: {
      systemInstruction: 'sys',
      userPrompt: 'user',
      serializedContext: {},
      copyPasteReadyMarkdown: 'markdown',
    },
    expectedResponseSchema: {},
    llmResponse: null,
    metadata: {
      source: 'DIRECT_GEMINI_API',
      modelIdentifier: 'gemini-2.5-flash',
      executionLatencyMs: 120,
      validationErrors: [],
    },
  };

  it('test_evaluateStep_whenOrchestratorSucceeds_returnsSuccessWithData', async () => {
    const mockOrchestrator = {
      execute: vi.fn().mockResolvedValue({
        status: 'SUCCESS',
        data: sampleRubricData,
        envelope: mockEnvelope,
      }),
      importManualResponse: vi.fn(),
    } as unknown as LlmOrchestrator;

    const evaluator = new InterviewRubricEvaluator(mockOrchestrator);
    const result = await evaluator.evaluateStep(samplePayload);

    expect(result.status).toBe('SUCCESS');
    expect(result.data).toEqual(sampleRubricData);
    expect(result.envelope).toEqual(mockEnvelope);
    expect(mockOrchestrator.execute).toHaveBeenCalledWith(
      'AI_INTERVIEW_SIMULATOR',
      expect.objectContaining({ stepNumber: 1 }),
      expect.objectContaining({ useCaseId: 'interview_step_1' })
    );
  });

  it('test_evaluateStep_withExplicitMode_passesModeOption', async () => {
    const mockOrchestrator = {
      execute: vi.fn().mockResolvedValue({
        status: 'MANUAL_FALLBACK_REQUIRED',
        data: null,
        envelope: mockEnvelope,
        error: 'Quota exceeded',
      }),
      importManualResponse: vi.fn(),
    } as unknown as LlmOrchestrator;

    const evaluator = new InterviewRubricEvaluator(mockOrchestrator);
    const result = await evaluator.evaluateStep(samplePayload, { mode: 'MANUAL_IMPORT_EXPORT' });

    expect(result.status).toBe('MANUAL_FALLBACK_REQUIRED');
    expect(result.data).toBeNull();
    expect(result.error).toBe('Quota exceeded');
    expect(mockOrchestrator.execute).toHaveBeenCalledWith(
      'AI_INTERVIEW_SIMULATOR',
      expect.any(Object),
      expect.objectContaining({ mode: 'MANUAL_IMPORT_EXPORT' })
    );
  });

  it('test_importExternalEvaluation_delegatesToOrchestrator', () => {
    const mockOrchestrator = {
      execute: vi.fn(),
      importManualResponse: vi.fn().mockReturnValue({
        status: 'SUCCESS',
        data: sampleRubricData,
        envelope: mockEnvelope,
      }),
    } as unknown as LlmOrchestrator;

    const evaluator = new InterviewRubricEvaluator(mockOrchestrator);
    const result = evaluator.importExternalEvaluation(mockEnvelope, '{"stepScore": 85}');

    expect(result.status).toBe('SUCCESS');
    expect(result.data).toEqual(sampleRubricData);
    expect(mockOrchestrator.importManualResponse).toHaveBeenCalledWith(mockEnvelope, '{"stepScore": 85}');
  });

  it('test_calculatePassing_evaluatesScoreAndDimensions', () => {
    const mockOrchestrator = {} as LlmOrchestrator;
    const evaluator = new InterviewRubricEvaluator(mockOrchestrator);

    expect(evaluator.calculatePassing(sampleRubricData)).toBe(true);

    const lowScoreData: RubricEvaluationData = {
      ...sampleRubricData,
      stepScore: 68,
    };
    expect(evaluator.calculatePassing(lowScoreData)).toBe(false);

    const lowDimData: RubricEvaluationData = {
      ...sampleRubricData,
      stepScore: 85,
      dimensionScores: {
        ...sampleRubricData.dimensionScores,
        scaleAwareness: 2,
      },
    };
    expect(evaluator.calculatePassing(lowDimData)).toBe(false);
  });
});
