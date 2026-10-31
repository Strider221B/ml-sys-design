import {
  ExchangeEnvelopeSchema,
  LLMExchangeEnvelope,
  SupportedModuleId,
} from '@/schemas/exchange_envelope_schema';

export interface PromptEnvelopeFactoryOptions {
  schemaHandler?: ExchangeEnvelopeSchema;
}

/**
 * Packages system prompts, schemas, and context into JSON envelopes and copyable Markdown bundles.
 */
export class PromptEnvelopeFactory {
  private static readonly _DEFAULT_USE_CASE_PREFIX = 'default_use_case_';
  private static readonly _MD_HEADER_TITLE = '# Machine Learning System Design Exchange Prompt\n\n';
  private static readonly _MD_SYSTEM_HEADER = '### SYSTEM INSTRUCTIONS\n';
  private static readonly _MD_CONTEXT_HEADER = '\n### SERIALIZED EXECUTION CONTEXT\n```json\n';
  private static readonly _MD_SCHEMA_HEADER = '\n```\n\n### EXPECTED JSON SCHEMA\n```json\n';
  private static readonly _MD_FOOTER =
    '\n```\n\n### CRITICAL INSTRUCTIONS\n' +
    '1. Generate a structured JSON response conforming STRICTLY to the Expected JSON Schema above.\n' +
    '2. Output ONLY the valid raw JSON object inside a ```json ``` code fence.\n' +
    '3. Do NOT include conversational preamble, greetings, apologies, or trailing explanations.\n';

  public constructor(options?: PromptEnvelopeFactoryOptions) {
    this._schemaHandler = options?.schemaHandler ?? new ExchangeEnvelopeSchema();
  }

  /**
   * Generates a fully populated LLM exchange envelope with formatted markdown instructions.
   */
  public createEnvelope<T extends Record<string, unknown>>(
    moduleId: SupportedModuleId,
    context: T,
    systemInstruction: string,
    targetSchema: Record<string, unknown>,
    useCaseId?: string
  ): LLMExchangeEnvelope {
    const finalUseCaseId = useCaseId ?? `${PromptEnvelopeFactory._DEFAULT_USE_CASE_PREFIX}${moduleId}`;
    const userPrompt = this._formatUserPromptSummary(context);
    const markdown = this._buildMarkdownBundle(systemInstruction, context, targetSchema);

    return this._schemaHandler.createEnvelope({
      moduleId,
      useCaseId: finalUseCaseId,
      systemInstruction,
      userPrompt,
      serializedContext: context,
      copyPasteReadyMarkdown: markdown,
      expectedResponseSchema: targetSchema,
    });
  }

  /**
   * Formats an existing envelope into a human-readable, copy-paste-ready Markdown prompt string.
   */
  public formatMarkdownInstructions(envelope: LLMExchangeEnvelope): string {
    return this._buildMarkdownBundle(
      envelope.promptPayload.systemInstruction,
      envelope.promptPayload.serializedContext,
      envelope.expectedResponseSchema
    );
  }

  private readonly _schemaHandler: ExchangeEnvelopeSchema;

  private _formatUserPromptSummary(context: Record<string, unknown>): string {
    const keys = Object.keys(context);
    return `Evaluate and process architectural context containing keys: [${keys.join(', ')}]`;
  }

  private _buildMarkdownBundle(
    systemInstruction: string,
    context: Record<string, unknown>,
    schema: Record<string, unknown>
  ): string {
    const contextJson = JSON.stringify(context, null, 2);
    const schemaJson = JSON.stringify(schema, null, 2);

    return (
      PromptEnvelopeFactory._MD_HEADER_TITLE +
      PromptEnvelopeFactory._MD_SYSTEM_HEADER +
      systemInstruction +
      PromptEnvelopeFactory._MD_CONTEXT_HEADER +
      contextJson +
      PromptEnvelopeFactory._MD_SCHEMA_HEADER +
      schemaJson +
      PromptEnvelopeFactory._MD_FOOTER
    );
  }
}

