import { describe, expect, it, vi } from 'vitest';
import { GDriveSyncClient } from '@/core/gdrive/gdrive_sync_client';
import { ScenarioConstants } from '@/core/scenarios/scenario_constants';
import { ScenarioLoader } from '@/core/scenarios/scenario_loader';
import { ScenarioPluginSchema } from '@/schemas/scenario_plugin_schema';

describe('ScenarioLoader', () => {
  const schemaValidator = new ScenarioPluginSchema();

  const validYaml = `
scenarioVersion: "2026.1"
scenarioId: "test-scenario-001"
metadata:
  title: "Test Architecture Drill"
  moduleCategory: "MODULE_1_MLOPS"
  difficulty: "SENIOR"
  summary: "A test drill scenario"
  author: "Tester"
constraints:
  targetQPS: 1000
  maxP99LatencyMs: 100
  maxMonthlyBudgetUSD: 5000
  complianceRegimes: ["GDPR_RTBF"]
initialCanvasState:
  nodes:
    - id: "node-1"
      type: "INFERENCE_GATEWAY"
      config: { timeoutMs: 100 }
  edges: []
chaosTriggers: []
evaluationCriteria:
  requiredNodes: ["node-1"]
  prohibitedNodes: []
  maxAllowedP99Ms: 100
  minRubricScore: 80
`;

  it('test_listBuiltinScenarios_returnsExpectedThreeIds', () => {
    const loader = new ScenarioLoader(schemaValidator);
    const list = loader.listBuiltinScenarios();

    expect(list).toContain(ScenarioConstants.BLUEPRINT_ECOM_ID);
    expect(list).toContain(ScenarioConstants.BLUEPRINT_STREAMING_FRAUD_ID);
    expect(list).toContain(ScenarioConstants.BLUEPRINT_ENTERPRISE_RAG_ID);
  });

  it('test_validateScenario_parsesYamlCorrectly', () => {
    const loader = new ScenarioLoader(schemaValidator);
    const scenario = loader.validateScenario(validYaml, 'yaml');

    expect(scenario.scenarioId).toBe('test-scenario-001');
    expect(scenario.metadata.difficulty).toBe('SENIOR');
    expect(scenario.constraints.targetQPS).toBe(1000);
  });

  it('test_validateScenario_parsesJsonCorrectly', () => {
    const loader = new ScenarioLoader(schemaValidator);
    const validJsonObj = {
      scenarioVersion: '2026.1',
      scenarioId: 'test-json-002',
      metadata: {
        title: 'JSON Scenario',
        moduleCategory: 'MODULE_2_GENAI',
        difficulty: 'MID_LEVEL',
        summary: 'Test summary',
        author: 'Staff',
      },
      constraints: {
        targetQPS: 500,
        maxP99LatencyMs: 80,
        maxMonthlyBudgetUSD: 2000,
        complianceRegimes: ['SOC2'],
      },
      initialCanvasState: { nodes: [], edges: [] },
      chaosTriggers: [],
      evaluationCriteria: {
        requiredNodes: [],
        prohibitedNodes: [],
        maxAllowedP99Ms: 80,
        minRubricScore: 85,
      },
    };

    const scenario = loader.validateScenario(JSON.stringify(validJsonObj), 'json');
    expect(scenario.scenarioId).toBe('test-json-002');
    expect(scenario.metadata.moduleCategory).toBe('MODULE_2_GENAI');
  });

  it('test_validateScenario_whenUnsupportedFormat_throwsError', () => {
    const loader = new ScenarioLoader(schemaValidator);
    expect(() => loader.validateScenario(validYaml, 'xml' as 'yaml')).toThrow(
      'Unsupported scenario format: xml'
    );
  });

  it('test_parseAndValidate_whenSchemaInvalid_throwsError', () => {
    const loader = new ScenarioLoader(schemaValidator);
    const invalidYaml = 'invalid: payload\nnumber: 123';
    expect(() => loader.parseAndValidate(invalidYaml)).toThrow();
  });

  it('test_loadBuiltinScenario_loadsFromLocalDiskDirectly', async () => {
    const loader = new ScenarioLoader(schemaValidator);
    const scenario = await loader.loadBuiltinScenario(ScenarioConstants.BLUEPRINT_ECOM_ID);

    expect(scenario.scenarioId).toBe(ScenarioConstants.BLUEPRINT_ECOM_ID);
    expect(scenario.constraints.targetQPS).toBe(20000);
    expect(scenario.initialCanvasState.nodes.length).toBeGreaterThan(0);
  });

  it('test_loadBuiltinScenario_withCustomFetch_resolvesCorrectly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => validYaml,
    });

    const loader = new ScenarioLoader(schemaValidator, null, mockFetch as unknown as typeof fetch);
    const scenario = await loader.loadBuiltinScenario('custom_mock_scenario.yaml');

    expect(scenario.scenarioId).toBe('test-scenario-001');
    expect(mockFetch).toHaveBeenCalledWith('/scenarios/custom_mock_scenario.yaml');
  });

  it('test_loadBuiltinScenario_whenFetchFails_throwsDescriptiveError', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    // Provide fetch to test the failure branch
    const loader = new ScenarioLoader(schemaValidator, null, mockFetch as unknown as typeof fetch);
    await expect(loader.loadBuiltinScenario('non_existent_blueprint.yaml')).rejects.toThrow(
      'Failed to load scenario file'
    );
  });

  it('test_loadDriveScenarios_whenNoClient_returnsEmptyArray', async () => {
    const loader = new ScenarioLoader(schemaValidator, null);
    const result = await loader.loadDriveScenarios('folder_123');

    expect(result).toEqual([]);
  });

  it('test_loadDriveScenarios_withDriveClient_discoversAndParsesFiles', async () => {
    const mockClient = {
      listFilesInFolder: vi.fn().mockResolvedValue([
        { id: 'f1', name: 'user_scenario.yaml' },
        { id: 'f2', name: 'invalid.yaml' },
        { id: 'f3', name: 'readme.txt' },
      ]),
      fetchRawTextFile: vi.fn().mockImplementation(async (id: string) => {
        if (id === 'f1') return validYaml;
        return 'broken_yaml: true';
      }),
    } as unknown as GDriveSyncClient;

    const loader = new ScenarioLoader(schemaValidator, mockClient);
    const results = await loader.loadDriveScenarios('schemas_folder_id');

    expect(mockClient.listFilesInFolder).toHaveBeenCalledWith('schemas_folder_id');
    expect(results).toHaveLength(1);
    expect(results[0]?.scenarioId).toBe('test-scenario-001');
  });

  it('test_loadDriveScenarios_handlesJsonFilesFromDrive', async () => {
    const validJsonObj = {
      scenarioVersion: '2026.1',
      scenarioId: 'drive-json-003',
      metadata: {
        title: 'Drive JSON',
        moduleCategory: 'MODULE_3_PRODUCTION_METRICS',
        difficulty: 'PRINCIPAL',
        summary: 'Drive summary',
        author: 'Drive Team',
      },
      constraints: {
        targetQPS: 2000,
        maxP99LatencyMs: 15,
        maxMonthlyBudgetUSD: 10000,
        complianceRegimes: ['EU_AI_ACT'],
      },
      initialCanvasState: { nodes: [], edges: [] },
      chaosTriggers: [],
      evaluationCriteria: {
        requiredNodes: [],
        prohibitedNodes: [],
        maxAllowedP99Ms: 15,
        minRubricScore: 90,
      },
    };

    const mockClient = {
      listFilesInFolder: vi.fn().mockResolvedValue([
        { id: 'json_file_id', name: 'drive_scenario.json' },
      ]),
      fetchRawTextFile: vi.fn().mockResolvedValue(JSON.stringify(validJsonObj)),
    } as unknown as GDriveSyncClient;

    const loader = new ScenarioLoader(schemaValidator, mockClient);
    const results = await loader.loadDriveScenarios('schemas_folder_id');

    expect(results).toHaveLength(1);
    expect(results[0]?.scenarioId).toBe('drive-json-003');
  });

  it('test_loadBuiltinScenario_resolvesAllAliases', async () => {
    const loader = new ScenarioLoader(schemaValidator);

    const s1 = await loader.loadBuiltinScenario('blueprint_ecommerce_ranking');
    expect(s1.scenarioId).toBe(ScenarioConstants.BLUEPRINT_ECOM_ID);

    const s2 = await loader.loadBuiltinScenario('blueprint_streaming_fraud');
    expect(s2.scenarioId).toBe(ScenarioConstants.BLUEPRINT_STREAMING_FRAUD_ID);

    const s3 = await loader.loadBuiltinScenario('blueprint_enterprise_vector_rag');
    expect(s3.scenarioId).toBe(ScenarioConstants.BLUEPRINT_ENTERPRISE_RAG_ID);
  });

  it('test_loadDriveScenarios_handlesYmlExtension', async () => {
    const mockClient = {
      listFilesInFolder: vi.fn().mockResolvedValue([
        { id: 'yml_id', name: 'custom.yml' },
      ]),
      fetchRawTextFile: vi.fn().mockResolvedValue(validYaml),
    } as unknown as GDriveSyncClient;

    const loader = new ScenarioLoader(schemaValidator, mockClient);
    const results = await loader.loadDriveScenarios('folder_schemas');

    expect(results).toHaveLength(1);
  });
});
