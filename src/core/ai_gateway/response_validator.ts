import { jsonrepair } from 'jsonrepair';
import { ModuleExchangeSchemas } from '@/schemas/module_exchange_schemas';

export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T | undefined;
  error?: string | undefined;
  repairedText?: string | undefined;
}

/**
 * Strips code fences, repairs malformed JSON syntax, validates Zod schemas, and generates repair prompts.
 */
export class ResponseValidator {
  private static readonly _FENCE_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  private static readonly _OBJECT_EXTRACT_REGEX = /(\{[\s\S]*\}|\[[\s\S]*\])/;
  private static readonly _MAX_SNIPPET_LENGTH = 300;
  private static readonly _ERR_EMPTY_RESPONSE = 'Received empty response string from LLM';
  private static readonly _ERR_PARSE_FAILURE = 'Failed to parse JSON string: ';

  public constructor(schemas?: ModuleExchangeSchemas) {
    this._schemas = schemas ?? new ModuleExchangeSchemas();
  }

  /**
   * Validates raw text response against a target module's schema.
   */
  public validateResponse<T>(moduleId: string, rawText: string): ValidationResult<T> {
    if (!rawText || rawText.trim().length === 0) {
      return { success: false, error: ResponseValidator._ERR_EMPTY_RESPONSE };
    }
    const stripped = this._stripFences(rawText);
    const repaired = this._attemptRepair(stripped);
    return this._parseAndValidateSchema<T>(moduleId, repaired);
  }

  /**
   * Generates a 1-click schema repair prompt for the user to paste back into an LLM.
   */
  public buildRepairPrompt(
    moduleId: string,
    rawText: string,
    errorDescription: string
  ): string {
    const snippet = rawText.slice(0, ResponseValidator._MAX_SNIPPET_LENGTH);
    return (
      `CRITICAL JSON SCHEMA ERROR for module: ${moduleId}\n\n` +
      `Your previous response failed validation:\n${errorDescription}\n\n` +
      `Original output snippet:\n${snippet}\n\n` +
      `CRITICAL INSTRUCTION:\n` +
      `Regenerate the JSON object so that it strictly adheres to the requested module schema.\n` +
      `Output ONLY the raw valid JSON object inside a \`\`\`json markdown block with zero conversational commentary.`
    );
  }

  private readonly _schemas: ModuleExchangeSchemas;

  private _stripFences(text: string): string {
    const trimmed = text.trim();
    const fenceMatch = ResponseValidator._FENCE_REGEX.exec(trimmed);
    if (fenceMatch && fenceMatch[1]) {
      return fenceMatch[1].trim();
    }
    const objMatch = ResponseValidator._OBJECT_EXTRACT_REGEX.exec(trimmed);
    if (objMatch && objMatch[1]) {
      return objMatch[1].trim();
    }
    return trimmed;
  }

  private _attemptRepair(text: string): string {
    try {
      return jsonrepair(text);
    } catch {
      return text;
    }
  }

  private _parseAndValidateSchema<T>(moduleId: string, jsonStr: string): ValidationResult<T> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `${ResponseValidator._ERR_PARSE_FAILURE}${msg}`,
        repairedText: jsonStr,
      };
    }
    return this._runZodCheck<T>(moduleId, parsed, jsonStr);
  }

  private _runZodCheck<T>(
    moduleId: string,
    parsed: unknown,
    repairedText: string
  ): ValidationResult<T> {
    try {
      const schema = this._schemas.getSchemaForModule(moduleId);
      const validated = schema.parse(parsed) as T;
      return { success: true, data: validated, repairedText };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg, repairedText };
    }
  }
}
