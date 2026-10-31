import { ExecutionMode, LlmOrchestrator } from '@/core/ai_gateway/llm_orchestrator';
import { InterviewConstants } from '@/core/interview/interview_constants';
import { MultimodalEvaluationPayload } from '@/core/interview/multimodal_input_processor';
import { LLMExchangeEnvelope, SupportedModuleId } from '@/schemas/exchange_envelope_schema';

export interface RubricDimensionScores {
  scaleAwareness: number;
  componentSelection: number;
  failureHandling: number;
  businessAlignment: number;
}

export interface RubricEvaluationFeedback {
  strengths: string[];
  missingConsiderations: string[];
  bottlenecksIdentified: string[];
}

export interface RubricEvaluationData {
  stepNumber: number;
  stepCompleted: boolean;
  stepScore: number;
  interviewerSpeech: string;
  feedback: RubricEvaluationFeedback;
  dimensionScores: RubricDimensionScores;
  suggestedNextQuestions: string[];
}

export interface RubricEvaluationResult {
  status: 'SUCCESS' | 'MANUAL_FALLBACK_REQUIRED' | 'FAILED';
  data: RubricEvaluationData | null;
  envelope?: LLMExchangeEnvelope | undefined;
  error?: string | undefined;
}

/**
 * Evaluates candidate responses against 2026 Machine Learning System Design Interview rubrics via Dual-Mode AI Gateway.
 */
export class InterviewRubricEvaluator {
  private static readonly _MODULE_ID: SupportedModuleId = 'AI_INTERVIEW_SIMULATOR';
  private static readonly _USE_CASE_PREFIX = 'interview_step_';
  private static readonly _SYS_INSTRUCTION =
    'You are a Principal ML Systems Architect conducting a rigorous FAANG-level system design interview. Evaluate candidate response and whiteboard canvas according to the 6-step lifecycle rubric.';

  public constructor(private readonly _orchestrator: LlmOrchestrator) {}

  /**
   * Evaluates step submission through LLM Orchestrator, falling back to manual envelope if rate-limited.
   */
  public async evaluateStep(
    payload: MultimodalEvaluationPayload,
    options?: { mode?: ExecutionMode }
  ): Promise<RubricEvaluationResult> {
    const context = this._buildEvaluationContext(payload);
    const execOptions: { mode?: ExecutionMode; useCaseId: string; systemInstruction: string } = {
      useCaseId: `${InterviewRubricEvaluator._USE_CASE_PREFIX}${payload.stepNumber}`,
      systemInstruction: InterviewRubricEvaluator._SYS_INSTRUCTION,
    };
    if (options?.mode) {
      execOptions.mode = options.mode;
    }
    const res = await this._orchestrator.execute<RubricEvaluationData>(
      InterviewRubricEvaluator._MODULE_ID,
      context,
      execOptions
    );
    return { status: res.status, data: res.data, envelope: res.envelope, error: res.error };
  }

  /**
   * Imports and validates external manual response text into an existing exchange envelope.
   */
  public importExternalEvaluation(
    envelope: LLMExchangeEnvelope,
    rawResponseText: string
  ): RubricEvaluationResult {
    const result = this._orchestrator.importManualResponse<RubricEvaluationData>(
      envelope,
      rawResponseText
    );
    return {
      status: result.status,
      data: result.data,
      envelope: result.envelope,
      error: result.error,
    };
  }

  /**
   * Computes whether evaluation meets minimum passing score and dimension threshold.
   */
  public calculatePassing(data: RubricEvaluationData): boolean {
    const isPassingScore = data.stepScore >= InterviewConstants.MIN_PASSING_SCORE;
    const dims = data.dimensionScores;
    const isPassingDimensions =
      dims.scaleAwareness >= InterviewConstants.PASSING_DIMENSION_THRESHOLD &&
      dims.componentSelection >= InterviewConstants.PASSING_DIMENSION_THRESHOLD &&
      dims.failureHandling >= InterviewConstants.PASSING_DIMENSION_THRESHOLD &&
      dims.businessAlignment >= InterviewConstants.PASSING_DIMENSION_THRESHOLD;

    return isPassingScore && isPassingDimensions;
  }

  private _buildEvaluationContext(payload: MultimodalEvaluationPayload): Record<string, unknown> {
    return {
      stepNumber: payload.stepNumber,
      stepName: payload.stepName,
      stepTitle: payload.stepTitle,
      candidateSpokenExplanation: payload.spokenTranscript,
      canvasTopologySummary: payload.canvasTopologySummary,
      whiteboardGraph: payload.rawGraph,
      additionalContext: payload.additionalContext ?? {},
    };
  }
}
