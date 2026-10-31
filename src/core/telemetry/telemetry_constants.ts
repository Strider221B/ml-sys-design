export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export type IncidentType =
  | 'CUDA_OOM'
  | 'NCCL_RING_DEADLOCK'
  | 'KV_CACHE_STARVATION'
  | 'STALE_EMBEDDING_INDEX'
  | 'NETWORK_PARTITION'
  | 'GRPC_TIMEOUT';

export type ComplianceRiskCategory =
  | 'PROHIBITED'
  | 'HIGH_RISK_NON_COMPLIANT'
  | 'COMPLIANT';

/**
 * Canonical telemetry, compliance, and export constants, defaults, and definitions.
 */
export class TelemetryConstants {
  public static readonly DEFAULT_BUFFER_CAPACITY = 300;
  public static readonly HIGH_RES_BUFFER_CAPACITY = 3600;
  public static readonly TARGET_FPS = 60;
  public static readonly TARGET_FRAME_BUDGET_MS = 16.666;

  public static readonly METRIC_P99_LATENCY = 'p99LatencyMs';
  public static readonly METRIC_TTFT = 'ttftMs';
  public static readonly METRIC_GPU_MEMORY = 'gpuMemoryFragmentationPct';
  public static readonly METRIC_QUEUE_LAG = 'queueLagMs';
  public static readonly METRIC_QPS = 'qps';

  public static readonly INCIDENT_CUDA_OOM: IncidentType = 'CUDA_OOM';
  public static readonly INCIDENT_NCCL_RING_DEADLOCK: IncidentType = 'NCCL_RING_DEADLOCK';
  public static readonly INCIDENT_KV_CACHE_STARVATION: IncidentType = 'KV_CACHE_STARVATION';
  public static readonly INCIDENT_STALE_EMBEDDING_INDEX: IncidentType = 'STALE_EMBEDDING_INDEX';
  public static readonly INCIDENT_NETWORK_PARTITION: IncidentType = 'NETWORK_PARTITION';
  public static readonly INCIDENT_GRPC_TIMEOUT: IncidentType = 'GRPC_TIMEOUT';

  public static readonly LOG_LEVEL_DEBUG: LogLevel = 'DEBUG';
  public static readonly LOG_LEVEL_INFO: LogLevel = 'INFO';
  public static readonly LOG_LEVEL_WARN: LogLevel = 'WARN';
  public static readonly LOG_LEVEL_ERROR: LogLevel = 'ERROR';
  public static readonly LOG_LEVEL_FATAL: LogLevel = 'FATAL';

  public static readonly RISK_PROHIBITED: ComplianceRiskCategory = 'PROHIBITED';
  public static readonly RISK_HIGH_NON_COMPLIANT: ComplianceRiskCategory = 'HIGH_RISK_NON_COMPLIANT';
  public static readonly RISK_COMPLIANT: ComplianceRiskCategory = 'COMPLIANT';

  public static readonly ARTICLE_9_RISK_MGMT = 'Article 9: Risk Management System';
  public static readonly ARTICLE_10_DATA_GOV = 'Article 10: Data and Data Governance';
  public static readonly ARTICLE_11_TECH_DOCS = 'Article 11: Technical Documentation';
  public static readonly ARTICLE_12_RECORD_KEEPING = 'Article 12: Record-Keeping and Automatic Logging';
  public static readonly ARTICLE_13_TRANSPARENCY = 'Article 13: Transparency and Information to Deployers';
  public static readonly ARTICLE_14_HUMAN_OVERSIGHT = 'Article 14: Human Oversight';
  public static readonly ARTICLE_15_CYBERSECURITY = 'Article 15: Accuracy, Robustness and Cybersecurity';

  public static readonly DEFAULT_SISA_SHARDS = 10;
  public static readonly DEFAULT_SISA_SLICES = 10;
  public static readonly SISA_COMPUTE_SAVINGS_MULTIPLIER = 0.55;

  public static readonly MODULE_TELEMETRY_LOG_GAME = 'TELEMETRY_LOG_GAME';
  public static readonly MODULE_REGULATORY_COMPLIANCE = 'REGULATORY_COMPLIANCE_SIM';
  public static readonly MODULE_RESUME_PORTFOLIO_EXPORTER = 'RESUME_PORTFOLIO_EXPORTER';

  public static readonly DEFAULT_TERRAFORM_VERSION = '>= 1.8.0';
  public static readonly DEFAULT_K8S_API_VERSION = 'apps/v1';
  public static readonly GITHUB_API_BASE_URL = 'https://api.github.com';
  public static readonly GITHUB_PAGES_BRANCH = 'gh-pages';

  public constructor() {}

  /**
   * Retrieves list of all supported incident types for the log trace game.
   */
  public getSupportedIncidentTypes(): readonly IncidentType[] {
    return [
      TelemetryConstants.INCIDENT_CUDA_OOM,
      TelemetryConstants.INCIDENT_NCCL_RING_DEADLOCK,
      TelemetryConstants.INCIDENT_KV_CACHE_STARVATION,
      TelemetryConstants.INCIDENT_STALE_EMBEDDING_INDEX,
      TelemetryConstants.INCIDENT_NETWORK_PARTITION,
      TelemetryConstants.INCIDENT_GRPC_TIMEOUT,
    ];
  }

  /**
   * Retrieves list of mandatory EU AI Act articles for high-risk audits.
   */
  public getEuAiActArticles(): readonly string[] {
    return [
      TelemetryConstants.ARTICLE_9_RISK_MGMT,
      TelemetryConstants.ARTICLE_10_DATA_GOV,
      TelemetryConstants.ARTICLE_11_TECH_DOCS,
      TelemetryConstants.ARTICLE_12_RECORD_KEEPING,
      TelemetryConstants.ARTICLE_13_TRANSPARENCY,
      TelemetryConstants.ARTICLE_14_HUMAN_OVERSIGHT,
      TelemetryConstants.ARTICLE_15_CYBERSECURITY,
    ];
  }
}

