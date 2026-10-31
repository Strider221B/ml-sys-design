/**
 * Constants for Plug-and-Play scenarios, curriculum matrix, and blueprint schemas.
 * Adheres strictly to Zero Magic Strings/Numbers standards.
 */
export class ScenarioConstants {
  public static readonly SCHEMA_VERSION = '2026.1';

  // Module Category Keys
  public static readonly MODULE_1_MLOPS = 'MODULE_1_MLOPS';
  public static readonly MODULE_2_GENAI = 'MODULE_2_GENAI';
  public static readonly MODULE_3_PRODUCTION_METRICS = 'MODULE_3_PRODUCTION_METRICS';

  // Module Titles
  public static readonly MODULE_1_TITLE = 'Classical Data & MLOps Infrastructure';
  public static readonly MODULE_2_TITLE = 'Generative AI & Foundation Models';
  public static readonly MODULE_3_TITLE = 'Production Engineering & System Metrics';

  // Difficulty Tiers
  public static readonly DIFFICULTY_JUNIOR = 'JUNIOR';
  public static readonly DIFFICULTY_MID_LEVEL = 'MID_LEVEL';
  public static readonly DIFFICULTY_SENIOR = 'SENIOR';
  public static readonly DIFFICULTY_STAFF = 'STAFF_ENGINEER';
  public static readonly DIFFICULTY_PRINCIPAL = 'PRINCIPAL';

  // Production Blueprint IDs
  public static readonly BLUEPRINT_ECOM_ID = 'ecom-fashion-ranking-2026';
  public static readonly BLUEPRINT_STREAMING_FRAUD_ID = 'streaming-fraud-detection-2026';
  public static readonly BLUEPRINT_ENTERPRISE_RAG_ID = 'enterprise-vector-rag-2026';

  // File Names
  public static readonly FILE_ECOM_YAML = 'blueprint_ecommerce_ranking.yaml';
  public static readonly FILE_FRAUD_YAML = 'blueprint_streaming_fraud.yaml';
  public static readonly FILE_RAG_YAML = 'blueprint_enterprise_vector_rag.yaml';

  // Paths and Folders
  public static readonly BUILTIN_SCENARIOS_DIR = '/scenarios/';
  public static readonly GDRIVE_SCHEMAS_FOLDER = 'schemas';
  public static readonly EXT_YAML = '.yaml';
  public static readonly EXT_YML = '.yml';
  public static readonly EXT_JSON = '.json';

  // Scoring and Rubric Thresholds
  public static readonly MIN_PASSING_RUBRIC_SCORE = 80;
  public static readonly MAX_RUBRIC_SCORE = 100;
  public static readonly MASTERY_THRESHOLD_PROFICIENT = 85;
  public static readonly MASTERY_THRESHOLD_EXPERT = 95;

  // Badges
  public static readonly BADGE_MLOPS_PIONEER = 'BADGE_MLOPS_PIONEER';
  public static readonly BADGE_GENAI_ARCHITECT = 'BADGE_GENAI_ARCHITECT';
  public static readonly BADGE_METRICS_GUARDIAN = 'BADGE_METRICS_GUARDIAN';
  public static readonly BADGE_FULL_SPECTRUM_STAFF = 'BADGE_FULL_SPECTRUM_STAFF';

  public constructor() {}
}

