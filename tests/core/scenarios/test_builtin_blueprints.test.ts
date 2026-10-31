import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ScenarioConstants } from '@/core/scenarios/scenario_constants';
import { ScenarioLoader } from '@/core/scenarios/scenario_loader';
import { ScenarioPluginSchema } from '@/schemas/scenario_plugin_schema';

describe('BuiltinBlueprints', () => {
  const schemaValidator = new ScenarioPluginSchema();
  const loader = new ScenarioLoader(schemaValidator);

  it('test_blueprint_ecommerce_ranking_isValidAndMeetsSpecs', async () => {
    const scenario = await loader.loadBuiltinScenario(ScenarioConstants.BLUEPRINT_ECOM_ID);

    expect(scenario.scenarioVersion).toBe('2026.1');
    expect(scenario.scenarioId).toBe(ScenarioConstants.BLUEPRINT_ECOM_ID);
    expect(scenario.metadata.moduleCategory).toBe('MODULE_1_MLOPS');
    expect(scenario.metadata.difficulty).toBe('STAFF_ENGINEER');
    expect(scenario.constraints.targetQPS).toBe(20000);
    expect(scenario.constraints.maxP99LatencyMs).toBe(65);
    expect(scenario.constraints.maxMonthlyBudgetUSD).toBe(18000);
    expect(scenario.constraints.complianceRegimes).toContain('GDPR_RTBF');

    expect(scenario.initialCanvasState.nodes.length).toBeGreaterThanOrEqual(6);
    expect(scenario.initialCanvasState.edges.length).toBeGreaterThanOrEqual(5);

    expect(scenario.chaosTriggers).toHaveLength(1);
    expect(scenario.chaosTriggers[0]?.type).toBe('TRAINING_SERVING_SKEW');

    expect(scenario.evaluationCriteria.minRubricScore).toBe(85);
    expect(scenario.evaluationCriteria.requiredNodes).toContain('DIVERSITY_RERANKER');
    expect(scenario.evaluationCriteria.prohibitedNodes).toContain('BATCH_ONLY_WAREHOUSE_LOOKUP');
  });

  it('test_blueprint_streaming_fraud_isValidAndMeetsSpecs', async () => {
    const scenario = await loader.loadBuiltinScenario(ScenarioConstants.BLUEPRINT_STREAMING_FRAUD_ID);

    expect(scenario.scenarioVersion).toBe('2026.1');
    expect(scenario.scenarioId).toBe(ScenarioConstants.BLUEPRINT_STREAMING_FRAUD_ID);
    expect(scenario.metadata.moduleCategory).toBe('MODULE_3_PRODUCTION_METRICS');
    expect(scenario.metadata.difficulty).toBe('PRINCIPAL');
    expect(scenario.constraints.targetQPS).toBe(50000);
    expect(scenario.constraints.maxP99LatencyMs).toBe(20);
    expect(scenario.constraints.maxMonthlyBudgetUSD).toBe(30000);
    expect(scenario.constraints.complianceRegimes).toContain('EU_AI_ACT');
    expect(scenario.constraints.complianceRegimes).toContain('SOC2');

    expect(scenario.initialCanvasState.nodes.length).toBeGreaterThanOrEqual(3);
    expect(scenario.initialCanvasState.edges.length).toBeGreaterThanOrEqual(2);

    expect(scenario.chaosTriggers[0]?.type).toBe('COVARIATE_DRIFT');
    expect(scenario.evaluationCriteria.minRubricScore).toBe(90);
    expect(scenario.evaluationCriteria.requiredNodes).toContain('PSI_DRIFT_DETECTOR');
    expect(scenario.evaluationCriteria.prohibitedNodes).toContain('SYNCHRONOUS_COLD_DATABASE_QUERY');
  });

  it('test_blueprint_enterprise_vector_rag_isValidAndMeetsSpecs', async () => {
    const scenario = await loader.loadBuiltinScenario(ScenarioConstants.BLUEPRINT_ENTERPRISE_RAG_ID);

    expect(scenario.scenarioVersion).toBe('2026.1');
    expect(scenario.scenarioId).toBe(ScenarioConstants.BLUEPRINT_ENTERPRISE_RAG_ID);
    expect(scenario.metadata.moduleCategory).toBe('MODULE_2_GENAI');
    expect(scenario.metadata.difficulty).toBe('STAFF_ENGINEER');
    expect(scenario.constraints.targetQPS).toBe(5000);
    expect(scenario.constraints.maxP99LatencyMs).toBe(220);
    expect(scenario.constraints.maxMonthlyBudgetUSD).toBe(24000);

    expect(scenario.initialCanvasState.nodes.length).toBeGreaterThanOrEqual(5);
    expect(scenario.initialCanvasState.edges.length).toBeGreaterThanOrEqual(4);

    expect(scenario.chaosTriggers[0]?.type).toBe('CACHE_STAMPEDE');
    expect(scenario.evaluationCriteria.minRubricScore).toBe(90);
    expect(scenario.evaluationCriteria.requiredNodes).toContain('PROMPT_CACHE_LAYER');
    expect(scenario.evaluationCriteria.requiredNodes).toContain('CROSS_ENCODER_RERANKER');
    expect(scenario.evaluationCriteria.prohibitedNodes).toContain('UNINDEXED_FULL_TEXT_SCAN');
  });

  it('test_allYamlFilesExistInPublicScenariosFolder', () => {
    const dir = path.join(process.cwd(), 'public', 'scenarios');
    const files = fs.readdirSync(dir);

    expect(files).toContain(ScenarioConstants.FILE_ECOM_YAML);
    expect(files).toContain(ScenarioConstants.FILE_FRAUD_YAML);
    expect(files).toContain(ScenarioConstants.FILE_RAG_YAML);
  });
});

