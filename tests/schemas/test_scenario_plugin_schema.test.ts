import { describe, expect, it } from 'vitest';
import {
  ScenarioPluginSchema,
} from '@/schemas/scenario_plugin_schema';

describe('ScenarioPluginSchema', () => {
  const schema = new ScenarioPluginSchema();

  const validYaml = `
scenarioVersion: "2026.1"
scenarioId: "recsys_churn_01"
metadata:
  title: "Real-time RecSys Churn Guard"
  moduleCategory: "MODULE_1_MLOPS"
  difficulty: "STAFF_ENGINEER"
  summary: "Design an edge ranking fallback system under extreme latency spikes."
  author: "Adspire Core Team"
constraints:
  targetQPS: 15000
  maxP99LatencyMs: 45
  maxMonthlyBudgetUSD: 12000
  complianceRegimes:
    - "EU_AI_ACT"
    - "GDPR_RTBF"
initialCanvasState:
  nodes:
    - id: "gateway_1"
      type: "INGRESS_GATEWAY"
      config:
        rateLimit: 20000
  edges:
    - source: "gateway_1"
      target: "feature_store_1"
      protocol: "GRPC"
chaosTriggers:
  - triggerId: "chaos_latency_spike"
    type: "NETWORK_PARTITION"
    description: "Simulate Redis feature cache connection timeout"
    injectedMetricsDelta:
      p99DeltaMs: 120
evaluationCriteria:
  requiredNodes:
    - "gateway_1"
  prohibitedNodes: []
  maxAllowedP99Ms: 60
  minRubricScore: 85
`;

  it('test_schemaVersion_returnsExpectedVersion', () => {
    expect(schema.schemaVersion).toBe('2026.1');
  });

  it('test_createDefaultScenario_returnsValidStructure', () => {
    const scenario = schema.createDefaultScenario('default_01', 'Default Blueprint');

    expect(scenario.scenarioVersion).toBe('2026.1');
    expect(scenario.scenarioId).toBe('default_01');
    expect(scenario.metadata.title).toBe('Default Blueprint');
    expect(scenario.metadata.moduleCategory).toBe('MODULE_1_MLOPS');
    expect(scenario.constraints.targetQPS).toBe(1000);
    expect(scenario.initialCanvasState.nodes).toEqual([]);
    expect(scenario.evaluationCriteria.minRubricScore).toBe(80);
  });

  it('test_validateScenario_withValidScenario_succeeds', () => {
    const scenario = schema.createDefaultScenario('valid_01', 'Valid Scenario');
    const validated = schema.validateScenario(scenario);

    expect(validated.scenarioId).toBe('valid_01');
    expect(validated.metadata.title).toBe('Valid Scenario');
  });

  it('test_validateScenario_withInvalidCategory_throwsError', () => {
    const scenario = schema.createDefaultScenario('test_01', 'Test') as unknown as Record<string, unknown>;
    (scenario.metadata as Record<string, unknown>).moduleCategory = 'INVALID_CATEGORY';

    expect(() => schema.validateScenario(scenario)).toThrow();
  });

  it('test_validateScenario_withNegativeBudget_throwsError', () => {
    const scenario = schema.createDefaultScenario('test_02', 'Test') as unknown as Record<string, unknown>;
    (scenario.constraints as Record<string, unknown>).maxMonthlyBudgetUSD = -500;

    expect(() => schema.validateScenario(scenario)).toThrow();
  });

  it('test_safeValidateScenario_withValidInput_returnsSuccess', () => {
    const scenario = schema.createDefaultScenario('safe_01', 'Safe Scenario');
    const result = schema.safeValidateScenario(scenario);

    expect(result.success).toBe(true);
    expect(result.data?.scenarioId).toBe('safe_01');
    expect(result.errors).toBeUndefined();
  });

  it('test_safeValidateScenario_withInvalidInput_returnsErrors', () => {
    const invalidScenario = { scenarioVersion: '1.0' };
    const result = schema.safeValidateScenario(invalidScenario);

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('test_parseYamlOrJson_withValidYaml_parsesAndValidates', () => {
    const parsed = schema.parseYamlOrJson(validYaml);

    expect(parsed.scenarioId).toBe('recsys_churn_01');
    expect(parsed.metadata.difficulty).toBe('STAFF_ENGINEER');
    expect(parsed.constraints.complianceRegimes).toContain('EU_AI_ACT');
    expect(parsed.initialCanvasState.edges[0]?.protocol).toBe('GRPC');
  });

  it('test_parseYamlOrJson_withValidJson_parsesAndValidates', () => {
    const scenario = schema.createDefaultScenario('json_01', 'Json Scenario');
    const jsonString = JSON.stringify(scenario);
    const parsed = schema.parseYamlOrJson(jsonString);

    expect(parsed.scenarioId).toBe('json_01');
  });

  it('test_parseYamlOrJson_withInvalidFormat_throwsError', () => {
    const invalidYaml = `
scenarioVersion: "2026.1"
constraints:
  invalid: [unclosed list
`;
    expect(() => schema.parseYamlOrJson(invalidYaml)).toThrow();
  });
});
