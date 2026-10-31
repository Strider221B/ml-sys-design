import { AiGatewayConstants } from '@/core/ai_gateway/ai_gateway_constants';
import { DirectGeminiClient } from '@/core/ai_gateway/direct_gemini_client';
import { PromptEnvelopeFactory } from '@/core/ai_gateway/prompt_envelope_factory';
import { ResponseValidator } from '@/core/ai_gateway/response_validator';
import { LLMExchangeEnvelope, SupportedModuleId } from '@/schemas/exchange_envelope_schema';

export type ExecutionMode = 'DIRECT_API' | 'MANUAL_IMPORT_EXPORT';

export interface ExecutionOptions {
  mode?: ExecutionMode;
  useCaseId?: string;
  systemInstruction?: string;
  targetSchema?: Record<string, unknown>;
}

export interface OrchestratorResult<T = unknown> {
  status: 'SUCCESS' | 'MANUAL_FALLBACK_REQUIRED' | 'FAILED';
  data: T | null;
  envelope: LLMExchangeEnvelope;
  error?: string | undefined;
  repairPrompt?: string | undefined;
}

/**
 * Unified orchestrator routing inference through Direct Gemini API or Air-Gap Manual Fallback.
 */
export class LlmOrchestrator {
  private static readonly _DEFAULT_SYSTEM_INSTRUCTION =
    'You are an expert Machine Learning Systems Architect evaluating architecture specifications.';

  public constructor(
    private readonly _directClient: DirectGeminiClient,
    private readonly _envelopeFactory: PromptEnvelopeFactory,
    private readonly _responseValidator: ResponseValidator
  ) {}

  /**
   * Executes inference request either via direct API or by generating an air-gap fallback package.
   */
  public async execute<T>(
    moduleId: SupportedModuleId,
    context: Record<string, unknown>,
    options?: ExecutionOptions
  ): Promise<OrchestratorResult<T>> {
    const mode = options?.mode ?? AiGatewayConstants.MODE_DIRECT_API;
    const systemInstruction =
      options?.systemInstruction ?? LlmOrchestrator._DEFAULT_SYSTEM_INSTRUCTION;
    const targetSchema = options?.targetSchema ?? {};

    const envelope = this._envelopeFactory.createEnvelope(
      moduleId,
      context,
      systemInstruction,
      targetSchema,
      options?.useCaseId
    );

    if (mode === AiGatewayConstants.MODE_MANUAL_IMPORT_EXPORT) {
      return this._createFallbackResult(envelope);
    }
    return this._executeDirectWithFallback<T>(moduleId, envelope);
  }

  /**
   * Validates and imports a raw external response into an existing exchange envelope.
   */
  public importManualResponse<T>(
    envelope: LLMExchangeEnvelope,
    rawResponseText: string
  ): OrchestratorResult<T> {
    const validation = this._responseValidator.validateResponse<T>(
      envelope.moduleId,
      rawResponseText
    );

    if (validation.success && validation.data) {
      return this._applyValidImport(envelope, validation.data);
    }
    return this._handleFailedImport(envelope, rawResponseText, validation.error);
  }

  private async _executeDirectWithFallback<T>(
    moduleId: SupportedModuleId,
    envelope: LLMExchangeEnvelope
  ): Promise<OrchestratorResult<T>> {
    try {
      const rawText = await this._directClient.executeDirect(
        envelope.promptPayload.userPrompt,
        envelope.promptPayload.systemInstruction
      );
      return this._handleDirectResponse<T>(moduleId, envelope, rawText);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      envelope.metadata.validationErrors.push(errMsg);
      return this._createFallbackResult(envelope, errMsg);
    }
  }

  private _handleDirectResponse<T>(
    moduleId: SupportedModuleId,
    envelope: LLMExchangeEnvelope,
    rawText: string
  ): OrchestratorResult<T> {
    const validation = this._responseValidator.validateResponse<T>(moduleId, rawText);
    if (validation.success && validation.data) {
      envelope.llmResponse = validation.data as Record<string, unknown>;
      envelope.metadata.source = 'DIRECT_GEMINI_API';
      return {
        status: AiGatewayConstants.STATUS_SUCCESS,
        data: validation.data,
        envelope,
      };
    }
    const errMsg = validation.error ?? AiGatewayConstants.ERROR_SCHEMA_VALIDATION_FAILED;
    envelope.metadata.validationErrors.push(errMsg);
    return this._createFallbackResult(envelope, errMsg);
  }

  private _createFallbackResult<T>(
    envelope: LLMExchangeEnvelope,
    error?: string
  ): OrchestratorResult<T> {
    return {
      status: AiGatewayConstants.STATUS_MANUAL_FALLBACK_REQUIRED,
      data: null,
      envelope,
      error,
    };
  }

  private _applyValidImport<T>(
    envelope: LLMExchangeEnvelope,
    data: T
  ): OrchestratorResult<T> {
    envelope.llmResponse = data as Record<string, unknown>;
    envelope.metadata.source = 'MANUAL_IMPORT';
    envelope.metadata.validationErrors = [];
    return {
      status: AiGatewayConstants.STATUS_SUCCESS,
      data,
      envelope,
    };
  }

  private _handleFailedImport<T>(
    envelope: LLMExchangeEnvelope,
    rawText: string,
    validationError?: string
  ): OrchestratorResult<T> {
    const err = validationError ?? AiGatewayConstants.ERROR_SCHEMA_VALIDATION_FAILED;
    const repairPrompt = this._responseValidator.buildRepairPrompt(
      envelope.moduleId,
      rawText,
      err
    );
    envelope.metadata.validationErrors.push(err);
    return {
      status: AiGatewayConstants.STATUS_FAILED,
      data: null,
      envelope,
      error: err,
      repairPrompt,
    };
  }
}

export type LLMOrchestrator = LlmOrchestrator;
