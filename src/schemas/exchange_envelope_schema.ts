import { z } from 'zod';

export type SupportedModuleId =
  | 'SANDBOX_BUILDER'
  | 'CASE_STUDY_LIBRARY'
  | 'AI_INTERVIEW_SIMULATOR'
  | 'CHAOS_ADVERSARIAL_PLAYGROUND'
  | 'FINOPS_CALCULATOR'
  | 'DATA_ALIGNMENT_ENGINE'
  | 'CHAOS_MONKEY_ARGON'
  | 'TELEMETRY_LOG_GAME'
  | 'REGULATORY_COMPLIANCE_SIM'
  | 'RESUME_PORTFOLIO_EXPORTER'
  | 'MATH_REWARD_WORKSPACE'
  | 'DATA_ARCHAEOLOGY_SUITE'
  | 'CAUSAL_INFERENCE_LAB';

export type ExecutionSource = 'DIRECT_GEMINI_API' | 'MANUAL_IMPORT';

export interface EnvelopeMetadata {
  source: ExecutionSource;
  modelIdentifier: string;
  executionLatencyMs: number;
  validationErrors: string[];
}

export interface PromptPayload {
  systemInstruction: string;
  userPrompt: string;
  serializedContext: Record<string, unknown>;
  copyPasteReadyMarkdown: string;
}

export interface LLMExchangeEnvelope {
  envelopeVersion: string;
  envelopeId: string;
  moduleId: SupportedModuleId;
  useCaseId: string;
  timestamp: string;
  promptPayload: PromptPayload;
  expectedResponseSchema: Record<string, unknown>;
  llmResponse: Record<string, unknown> | null;
  metadata: EnvelopeMetadata;
}

export interface CreateEnvelopeOptions {
  moduleId: SupportedModuleId;
  useCaseId: string;
  systemInstruction: string;
  userPrompt: string;
  serializedContext: Record<string, unknown>;
  copyPasteReadyMarkdown: string;
  expectedResponseSchema: Record<string, unknown>;
  executionSource?: ExecutionSource;
  modelIdentifier?: string;
}

/**
 * Validates and constructs LLM exchange envelopes for direct and air-gapped modes.
 */
export class ExchangeEnvelopeSchema {
  private static readonly _SCHEMA_VERSION = '2026.1.0';
  private static readonly _DEFAULT_SOURCE: ExecutionSource = 'MANUAL_IMPORT';
  private static readonly _DEFAULT_MODEL = 'gemini-1.5-flash';
  private static readonly _DEFAULT_LATENCY_MS = 0;
  private static readonly _EMPTY_STRING = '';

  private static readonly _SUPPORTED_MODULES = [
    'SANDBOX_BUILDER',
    'CASE_STUDY_LIBRARY',
    'AI_INTERVIEW_SIMULATOR',
    'CHAOS_ADVERSARIAL_PLAYGROUND',
    'FINOPS_CALCULATOR',
    'DATA_ALIGNMENT_ENGINE',
    'CHAOS_MONKEY_ARGON',
    'TELEMETRY_LOG_GAME',
    'REGULATORY_COMPLIANCE_SIM',
    'RESUME_PORTFOLIO_EXPORTER',
    'MATH_REWARD_WORKSPACE',
    'DATA_ARCHAEOLOGY_SUITE',
    'CAUSAL_INFERENCE_LAB',
  ] as const;

  private static readonly _PROMPT_PAYLOAD_SCHEMA = z.object({
    systemInstruction: z.string(),
    userPrompt: z.string(),
    serializedContext: z.record(z.unknown()),
    copyPasteReadyMarkdown: z.string(),
  });

  private static readonly _METADATA_SCHEMA = z.object({
    source: z.enum(['DIRECT_GEMINI_API', 'MANUAL_IMPORT']),
    modelIdentifier: z.string(),
    executionLatencyMs: z.number().nonnegative(),
    validationErrors: z.array(z.string()),
  });

  private static readonly _ENVELOPE_SCHEMA = z.object({
    envelopeVersion: z.literal(ExchangeEnvelopeSchema._SCHEMA_VERSION),
    envelopeId: z.string().uuid(),
    moduleId: z.enum(ExchangeEnvelopeSchema._SUPPORTED_MODULES),
    useCaseId: z.string().min(1),
    timestamp: z.string().datetime(),
    promptPayload: ExchangeEnvelopeSchema._PROMPT_PAYLOAD_SCHEMA,
    expectedResponseSchema: z.record(z.unknown()),
    llmResponse: z.record(z.unknown()).nullable(),
    metadata: ExchangeEnvelopeSchema._METADATA_SCHEMA,
  });

  public constructor() {}

  /**
   * Returns current active schema version constant.
   */
  public get schemaVersion(): string {
    return ExchangeEnvelopeSchema._SCHEMA_VERSION;
  }

  /**
   * Validates raw input against the envelope schema.
   */
  public validateEnvelope(input: unknown): LLMExchangeEnvelope {
    return ExchangeEnvelopeSchema._ENVELOPE_SCHEMA.parse(input) as LLMExchangeEnvelope;
  }

  /**
   * Safely parses raw input and returns boolean and issues.
   */
  public safeValidateEnvelope(input: unknown): {
    success: boolean;
    data?: LLMExchangeEnvelope;
    errors?: string[];
  } {
    const result = ExchangeEnvelopeSchema._ENVELOPE_SCHEMA.safeParse(input);
    if (result.success) {
      return { success: true, data: result.data as LLMExchangeEnvelope };
    }
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return { success: false, errors };
  }

  /**
   * Creates a populated exchange envelope.
   */
  public createEnvelope(options: CreateEnvelopeOptions): LLMExchangeEnvelope {
    const envelopeId = this._generateUuid();
    const timestamp = new Date().toISOString();
    const metadata = this._buildMetadata(options.executionSource, options.modelIdentifier);

    return {
      envelopeVersion: ExchangeEnvelopeSchema._SCHEMA_VERSION,
      envelopeId,
      moduleId: options.moduleId,
      useCaseId: options.useCaseId,
      timestamp,
      promptPayload: {
        systemInstruction: options.systemInstruction,
        userPrompt: options.userPrompt,
        serializedContext: options.serializedContext,
        copyPasteReadyMarkdown: options.copyPasteReadyMarkdown,
      },
      expectedResponseSchema: options.expectedResponseSchema,
      llmResponse: null,
      metadata,
    };
  }

  /**
   * Creates an empty baseline envelope for air-gapped initialization.
   */
  public createEmptyEnvelope(
    moduleId: SupportedModuleId,
    useCaseId: string
  ): LLMExchangeEnvelope {
    return this.createEnvelope({
      moduleId,
      useCaseId,
      systemInstruction: ExchangeEnvelopeSchema._EMPTY_STRING,
      userPrompt: ExchangeEnvelopeSchema._EMPTY_STRING,
      serializedContext: {},
      copyPasteReadyMarkdown: ExchangeEnvelopeSchema._EMPTY_STRING,
      expectedResponseSchema: {},
    });
  }

  private _buildMetadata(
    source?: ExecutionSource,
    model?: string
  ): EnvelopeMetadata {
    return {
      source: source ?? ExchangeEnvelopeSchema._DEFAULT_SOURCE,
      modelIdentifier: model ?? ExchangeEnvelopeSchema._DEFAULT_MODEL,
      executionLatencyMs: ExchangeEnvelopeSchema._DEFAULT_LATENCY_MS,
      validationErrors: [],
    };
  }

  private _generateUuid(): string {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => {
      const num = Number(c);
      return (
        num ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (num / 4)))
      ).toString(16);
    });
  }
}

