import yaml from 'js-yaml';
import { z } from 'zod';

export type ModuleCategory =
  | 'MODULE_1_MLOPS'
  | 'MODULE_2_GENAI'
  | 'MODULE_3_PRODUCTION_METRICS';

export type ScenarioDifficulty =
  | 'JUNIOR'
  | 'MID_LEVEL'
  | 'SENIOR'
  | 'STAFF_ENGINEER'
  | 'PRINCIPAL';

export type ComplianceRegime = 'EU_AI_ACT' | 'GDPR_RTBF' | 'HIPAA' | 'SOC2';

export type EdgeProtocol = 'GRPC' | 'REST' | 'KAFKA' | 'REDIS_PUBSUB';

export interface ScenarioNode {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

export interface ScenarioEdge {
  source: string;
  target: string;
  protocol: EdgeProtocol;
}

export interface ChaosTrigger {
  triggerId: string;
  type: string;
  description: string;
  injectedMetricsDelta: Record<string, unknown>;
}

export interface EvaluationCriteria {
  requiredNodes: string[];
  prohibitedNodes: string[];
  maxAllowedP99Ms: number;
  minRubricScore: number;
}

export interface ScenarioConstraints {
  targetQPS: number;
  maxP99LatencyMs: number;
  maxMonthlyBudgetUSD: number;
  complianceRegimes: ComplianceRegime[];
}

export interface ScenarioMetadata {
  title: string;
  moduleCategory: ModuleCategory;
  difficulty: ScenarioDifficulty;
  summary: string;
  author: string;
}

export interface ScenarioCanvasState {
  nodes: ScenarioNode[];
  edges: ScenarioEdge[];
}

export interface ScenarioPlugin {
  scenarioVersion: string;
  scenarioId: string;
  metadata: ScenarioMetadata;
  constraints: ScenarioConstraints;
  initialCanvasState: ScenarioCanvasState;
  chaosTriggers: ChaosTrigger[];
  evaluationCriteria: EvaluationCriteria;
}

/**
 * Validates, parses, and constructs plug-and-play scenario blueprints.
 */
export class ScenarioPluginSchema {
  private static readonly _SCHEMA_VERSION = '2026.1';
  private static readonly _DEFAULT_CATEGORY: ModuleCategory = 'MODULE_1_MLOPS';
  private static readonly _DEFAULT_DIFFICULTY: ScenarioDifficulty = 'MID_LEVEL';
  private static readonly _DEFAULT_AUTHOR = 'System';
  private static readonly _DEFAULT_SUMMARY = 'Scenario blueprint template';
  private static readonly _DEFAULT_QPS = 1000;
  private static readonly _DEFAULT_LATENCY_MS = 150;
  private static readonly _DEFAULT_BUDGET_USD = 5000;
  private static readonly _DEFAULT_RUBRIC_SCORE = 80;

  private static readonly _METADATA_SCHEMA = z.object({
    title: z.string().min(1),
    moduleCategory: z.enum([
      'MODULE_1_MLOPS',
      'MODULE_2_GENAI',
      'MODULE_3_PRODUCTION_METRICS',
    ]),
    difficulty: z.enum([
      'JUNIOR',
      'MID_LEVEL',
      'SENIOR',
      'STAFF_ENGINEER',
      'PRINCIPAL',
    ]),
    summary: z.string().min(1),
    author: z.string().min(1),
  });

  private static readonly _CONSTRAINTS_SCHEMA = z.object({
    targetQPS: z.number().positive(),
    maxP99LatencyMs: z.number().positive(),
    maxMonthlyBudgetUSD: z.number().nonnegative(),
    complianceRegimes: z.array(
      z.enum(['EU_AI_ACT', 'GDPR_RTBF', 'HIPAA', 'SOC2'])
    ),
  });

  private static readonly _CANVAS_STATE_SCHEMA = z.object({
    nodes: z.array(
      z.object({
        id: z.string().min(1),
        type: z.string().min(1),
        config: z.record(z.unknown()),
      })
    ),
    edges: z.array(
      z.object({
        source: z.string().min(1),
        target: z.string().min(1),
        protocol: z.enum(['GRPC', 'REST', 'KAFKA', 'REDIS_PUBSUB']),
      })
    ),
  });

  private static readonly _CHAOS_TRIGGER_SCHEMA = z.object({
    triggerId: z.string().min(1),
    type: z.string().min(1),
    description: z.string(),
    injectedMetricsDelta: z.record(z.unknown()),
  });

  private static readonly _EVALUATION_SCHEMA = z.object({
    requiredNodes: z.array(z.string()),
    prohibitedNodes: z.array(z.string()),
    maxAllowedP99Ms: z.number().positive(),
    minRubricScore: z.number().min(0).max(100),
  });

  private static readonly _SCENARIO_SCHEMA = z.object({
    scenarioVersion: z.literal(ScenarioPluginSchema._SCHEMA_VERSION),
    scenarioId: z.string().min(1),
    metadata: ScenarioPluginSchema._METADATA_SCHEMA,
    constraints: ScenarioPluginSchema._CONSTRAINTS_SCHEMA,
    initialCanvasState: ScenarioPluginSchema._CANVAS_STATE_SCHEMA,
    chaosTriggers: z.array(ScenarioPluginSchema._CHAOS_TRIGGER_SCHEMA),
    evaluationCriteria: ScenarioPluginSchema._EVALUATION_SCHEMA,
  });

  public constructor() {}

  /**
   * Version of the scenario plugin schema.
   */
  public get schemaVersion(): string {
    return ScenarioPluginSchema._SCHEMA_VERSION;
  }

  /**
   * Validates a raw scenario plugin object against the schema.
   */
  public validateScenario(input: unknown): ScenarioPlugin {
    return ScenarioPluginSchema._SCENARIO_SCHEMA.parse(input) as ScenarioPlugin;
  }

  /**
   * Safely validates a scenario plugin without throwing.
   */
  public safeValidateScenario(input: unknown): {
    success: boolean;
    data?: ScenarioPlugin;
    errors?: string[];
  } {
    const result = ScenarioPluginSchema._SCENARIO_SCHEMA.safeParse(input);
    if (result.success) {
      return { success: true, data: result.data as ScenarioPlugin };
    }
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return { success: false, errors };
  }

  /**
   * Parses and validates raw YAML or JSON string.
   */
  public parseYamlOrJson(rawText: string): ScenarioPlugin {
    const parsed = yaml.load(rawText);
    return this.validateScenario(parsed);
  }

  /**
   * Creates a default boilerplate scenario object.
   */
  public createDefaultScenario(scenarioId: string, title: string): ScenarioPlugin {
    return {
      scenarioVersion: ScenarioPluginSchema._SCHEMA_VERSION,
      scenarioId,
      metadata: this._buildDefaultMetadata(title),
      constraints: this._buildDefaultConstraints(),
      initialCanvasState: { nodes: [], edges: [] },
      chaosTriggers: [],
      evaluationCriteria: this._buildDefaultEvaluation(),
    };
  }

  private _buildDefaultMetadata(title: string): ScenarioMetadata {
    return {
      title,
      moduleCategory: ScenarioPluginSchema._DEFAULT_CATEGORY,
      difficulty: ScenarioPluginSchema._DEFAULT_DIFFICULTY,
      summary: ScenarioPluginSchema._DEFAULT_SUMMARY,
      author: ScenarioPluginSchema._DEFAULT_AUTHOR,
    };
  }

  private _buildDefaultConstraints(): ScenarioConstraints {
    return {
      targetQPS: ScenarioPluginSchema._DEFAULT_QPS,
      maxP99LatencyMs: ScenarioPluginSchema._DEFAULT_LATENCY_MS,
      maxMonthlyBudgetUSD: ScenarioPluginSchema._DEFAULT_BUDGET_USD,
      complianceRegimes: [],
    };
  }

  private _buildDefaultEvaluation(): EvaluationCriteria {
    return {
      requiredNodes: [],
      prohibitedNodes: [],
      maxAllowedP99Ms: ScenarioPluginSchema._DEFAULT_LATENCY_MS,
      minRubricScore: ScenarioPluginSchema._DEFAULT_RUBRIC_SCORE,
    };
  }
}

