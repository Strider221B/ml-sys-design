import { describe, expect, it } from 'vitest';
import { ScenarioConstants } from '@/core/scenarios/scenario_constants';

describe('ScenarioConstants', () => {
  it('test_constants_values_matchSchemaRequirements', () => {
    expect(ScenarioConstants.SCHEMA_VERSION).toBe('2026.1');
    expect(ScenarioConstants.MODULE_1_MLOPS).toBe('MODULE_1_MLOPS');
    expect(ScenarioConstants.MODULE_2_GENAI).toBe('MODULE_2_GENAI');
    expect(ScenarioConstants.MODULE_3_PRODUCTION_METRICS).toBe('MODULE_3_PRODUCTION_METRICS');

    expect(ScenarioConstants.DIFFICULTY_JUNIOR).toBe('JUNIOR');
    expect(ScenarioConstants.DIFFICULTY_MID_LEVEL).toBe('MID_LEVEL');
    expect(ScenarioConstants.DIFFICULTY_SENIOR).toBe('SENIOR');
    expect(ScenarioConstants.DIFFICULTY_STAFF).toBe('STAFF_ENGINEER');
    expect(ScenarioConstants.DIFFICULTY_PRINCIPAL).toBe('PRINCIPAL');

    expect(ScenarioConstants.BLUEPRINT_ECOM_ID).toBe('ecom-fashion-ranking-2026');
    expect(ScenarioConstants.BLUEPRINT_STREAMING_FRAUD_ID).toBe('streaming-fraud-detection-2026');
    expect(ScenarioConstants.BLUEPRINT_ENTERPRISE_RAG_ID).toBe('enterprise-vector-rag-2026');

    expect(ScenarioConstants.MIN_PASSING_RUBRIC_SCORE).toBe(80);
    expect(ScenarioConstants.MAX_RUBRIC_SCORE).toBe(100);
    expect(ScenarioConstants.MASTERY_THRESHOLD_PROFICIENT).toBe(85);
    expect(ScenarioConstants.MASTERY_THRESHOLD_EXPERT).toBe(95);
  });

  it('test_constructor_canBeInstantiated', () => {
    const instance = new ScenarioConstants();
    expect(instance).toBeDefined();
  });
});

