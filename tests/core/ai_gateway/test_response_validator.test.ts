import { describe, expect, it } from 'vitest';
import { ResponseValidator } from '@/core/ai_gateway/response_validator';
import { ModuleExchangeSchemas } from '@/schemas/module_exchange_schemas';

describe('ResponseValidator', () => {
  const validator = new ResponseValidator();

  it('test_validateResponse_stripsFencesAndParsesValidJson', () => {
    const rawWithFences =
      'Here is the response:\n```json\n' +
      JSON.stringify({
        overallHealthScore: 85,
        identifiedBottlenecks: [],
        suggestedOptimizations: [],
        tradeOffAssessment: 'Healthy balance',
      }) +
      '\n```\nHope this helps!';

    const result = validator.validateResponse<{ overallHealthScore: number }>(
      'SANDBOX_BUILDER',
      rawWithFences
    );

    expect(result.success).toBe(true);
    expect(result.data?.overallHealthScore).toBe(85);
  });

  it('test_validateResponse_repairsMalformedJsonWithTrailingCommasAndUnquotedKeys', () => {
    // Malformed JSON with trailing commas and unquoted keys
    const malformed =
      '```\n' +
      '{\n' +
      '  overallHealthScore: 90,\n' +
      '  identifiedBottlenecks: [],\n' +
      '  suggestedOptimizations: [],\n' +
      '  tradeOffAssessment: "Repaired successfully",\n' +
      '}\n' +
      '```';

    const result = validator.validateResponse<{ overallHealthScore: number }>(
      'SANDBOX_BUILDER',
      malformed
    );

    expect(result.success).toBe(true);
    expect(result.data?.overallHealthScore).toBe(90);
  });

  it('test_validateResponse_extractsOutermostJsonObjectWithoutFences', () => {
    const rawNoFences =
      'Some preamble before object: {"overallHealthScore": 77, "identifiedBottlenecks": [], "suggestedOptimizations": [], "tradeOffAssessment": "OK"} and some trailing words.';
    const result = validator.validateResponse<{ overallHealthScore: number }>(
      'SANDBOX_BUILDER',
      rawNoFences
    );

    expect(result.success).toBe(true);
    expect(result.data?.overallHealthScore).toBe(77);
  });

  it('test_constructor_acceptsCustomModuleExchangeSchemas', () => {
    const customSchemas = new ModuleExchangeSchemas();
    const customValidator = new ResponseValidator(customSchemas);
    const result = customValidator.validateResponse<{ overallHealthScore: number }>(
      'SANDBOX_BUILDER',
      '{"overallHealthScore": 82, "identifiedBottlenecks": [], "suggestedOptimizations": [], "tradeOffAssessment": "OK"}'
    );
    expect(result.success).toBe(true);
    expect(result.data?.overallHealthScore).toBe(82);
  });

  it('test_validateResponse_whenEmptyOrWhitespace_returnsFailure', () => {
    const emptyResult = validator.validateResponse('SANDBOX_BUILDER', '');
    const spaceResult = validator.validateResponse('SANDBOX_BUILDER', '   \n  ');

    expect(emptyResult.success).toBe(false);
    expect(emptyResult.error).toContain('Received empty response');
    expect(spaceResult.success).toBe(false);
  });

  it('test_validateResponse_whenUnrepairableSyntax_returnsParseFailure', () => {
    const unrepairable = '{ : completely invalid json syntax : }';
    const result = validator.validateResponse('SANDBOX_BUILDER', unrepairable);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to parse JSON string');
  });

  it('test_validateResponse_whenSchemaFails_returnsSchemaValidationError', () => {
    const invalidSchemaJson = JSON.stringify({
      overallHealthScore: 'NOT_A_NUMBER', // schema expects number
      identifiedBottlenecks: [],
      suggestedOptimizations: [],
      tradeOffAssessment: 'Test',
    });

    const result = validator.validateResponse('SANDBOX_BUILDER', invalidSchemaJson);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('test_validateResponse_whenNoFencesAndNoObject_returnsFailure', () => {
    const rawNoObject = 'Plain scalar string without braces';
    const result = validator.validateResponse('SANDBOX_BUILDER', rawNoObject);
    expect(result.success).toBe(false);
  });

  it('test_buildRepairPrompt_formatsComprehensiveCorrectionPrompt', () => {
    const rawSnippet = '{"overallHealthScore": "bad"}';
    const errorDescription = 'Expected number, received string';

    const repairPrompt = validator.buildRepairPrompt(
      'SANDBOX_BUILDER',
      rawSnippet,
      errorDescription
    );

    expect(repairPrompt).toContain('CRITICAL JSON SCHEMA ERROR for module: SANDBOX_BUILDER');
    expect(repairPrompt).toContain('Expected number, received string');
    expect(repairPrompt).toContain(rawSnippet);
    expect(repairPrompt).toContain('Output ONLY the raw valid JSON object');
  });
});
