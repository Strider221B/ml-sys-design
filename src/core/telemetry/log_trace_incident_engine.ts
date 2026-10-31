import { IncidentType, LogLevel, TelemetryConstants } from '@/core/telemetry/telemetry_constants';

export interface LogEntry {
  timestamp: string;
  service: string;
  level: LogLevel;
  message: string;
  raw: string;
}

export interface IncidentTraceOptions {
  includeNoise?: boolean;
  noiseCount?: number;
  startTimeIso?: string;
}

export interface IncidentLogTrace {
  incidentId: string;
  scenario: IncidentType;
  rootCauseNodeId: string;
  targetRootCause: string;
  expectedRemediation: string;
  logs: LogEntry[];
}

export interface DiagnosisResult {
  correct: boolean;
  score: number;
  explanation: string;
  actualRootCause: string;
  suggestedFix: string;
}

export interface LogFilterOptions {
  level?: LogLevel;
  service?: string;
  query?: string;
}

export interface IncidentCatalogItem {
  scenario: IncidentType;
  rootCauseNodeId: string;
  targetRootCause: string;
  expectedRemediation: string;
  description: string;
}

/**
 * Generates synthetic multi-tier log traces and validates incident root cause diagnoses.
 */
export class LogTraceIncidentEngine {
  private static readonly _DEFAULT_NOISE_COUNT = 6;
  private static readonly _SCORE_PERFECT = 100;
  private static readonly _SCORE_PARTIAL = 50;
  private static readonly _SCORE_FAIL = 0;
  private static readonly _ERR_INCIDENT_NOT_FOUND = 'Incident trace not found: ';
  private static readonly _NOISE_SERVICES = ['gateway-ingress', 'redis-feature-store', 'eval-proxy'];

  private static readonly _CATALOG: readonly IncidentCatalogItem[] = [
    {
      scenario: TelemetryConstants.INCIDENT_CUDA_OOM,
      rootCauseNodeId: 'vllm-worker-gpu-03',
      targetRootCause: 'CUDA Out-of-Memory during large batch tensor allocation',
      expectedRemediation: 'Enable Chunked Prefill & PagedAttention v2',
      description: 'PyTorch worker ran out of VRAM attempting 4.2 GiB allocation.',
    },
    {
      scenario: TelemetryConstants.INCIDENT_NCCL_RING_DEADLOCK,
      rootCauseNodeId: 'vllm-worker-gpu-02',
      targetRootCause: 'NCCL All-Reduce ring communication hang across ranks',
      expectedRemediation: 'Set NCCL_ASYNC_ERROR_HANDLING=1 and check NIC MTU',
      description: 'Distributed collective all-reduce timed out across TP ranks.',
    },
    {
      scenario: TelemetryConstants.INCIDENT_KV_CACHE_STARVATION,
      rootCauseNodeId: 'vllm-worker-gpu-01',
      targetRootCause: 'KV cache allocation exhaustion causing sequence preemption',
      expectedRemediation: 'Increase gpu_memory_utilization or configure CPU swap space',
      description: 'Zero free KV blocks remaining under burst concurrency.',
    },
    {
      scenario: TelemetryConstants.INCIDENT_STALE_EMBEDDING_INDEX,
      rootCauseNodeId: 'vector-db-qdrant-01',
      targetRootCause: 'Uncompacted HNSW index degradation and shard desync',
      expectedRemediation: 'Trigger HNSW graph vacuum reindexing and snapshot restore',
      description: 'High search latency and inconsistent recall after large ingestion.',
    },
    {
      scenario: TelemetryConstants.INCIDENT_NETWORK_PARTITION,
      rootCauseNodeId: 'ingress-gateway-01',
      targetRootCause: 'Network packet drop between Envoy gateway and model worker pool',
      expectedRemediation: 'Verify VPC route tables and security group ingress rules',
      description: 'Connection reset by peer and 503 UNAVAILABLE responses.',
    },
    {
      scenario: TelemetryConstants.INCIDENT_GRPC_TIMEOUT,
      rootCauseNodeId: 'feature-store-redis-01',
      targetRootCause: 'Feature retrieval latency spike exceeding gRPC deadline',
      expectedRemediation: 'Increase client deadline and shard Redis cluster keys',
      description: 'Upstream deadline exceeded during online feature fetch.',
    },
  ];

  public constructor(
    private readonly _activeTraces: Map<string, IncidentLogTrace> = new Map()
  ) {}

  /**
   * Generates a realistic synthetic incident log trace with multi-tier service logs.
   */
  public generateIncidentTrace(
    scenario: IncidentType,
    options?: IncidentTraceOptions
  ): IncidentLogTrace {
    const incidentId = `inc_${scenario.toLowerCase()}_${Date.now()}`;
    const catalogItem = this._findCatalogItem(scenario);
    const baseIso = options?.startTimeIso ?? new Date().toISOString();
    const logs = this._assembleLogs(catalogItem, baseIso, options);

    const trace: IncidentLogTrace = {
      incidentId,
      scenario,
      rootCauseNodeId: catalogItem.rootCauseNodeId,
      targetRootCause: catalogItem.targetRootCause,
      expectedRemediation: catalogItem.expectedRemediation,
      logs,
    };
    this._activeTraces.set(incidentId, trace);
    return trace;
  }

  /**
   * Validates a candidate's diagnosis of an incident against target ground truth.
   */
  public validateDiagnosis(
    incidentId: string,
    candidateRootCause: string,
    candidateRemediation?: string
  ): DiagnosisResult {
    const trace = this._activeTraces.get(incidentId);
    if (!trace) {
      throw new Error(`${LogTraceIncidentEngine._ERR_INCIDENT_NOT_FOUND}${incidentId}`);
    }

    const causeMatch = this._checkCauseMatch(candidateRootCause, trace.scenario);
    const remediationMatch = candidateRemediation
      ? this._checkRemediationMatch(candidateRemediation, trace.expectedRemediation)
      : false;

    return this._buildDiagnosisResult(trace, causeMatch, remediationMatch);
  }

  /**
   * Filters log entries by level, service name, or text query.
   */
  public filterLogs(logs: LogEntry[], filter: LogFilterOptions): LogEntry[] {
    return logs.filter((entry) => {
      if (filter.level && entry.level !== filter.level) return false;
      if (filter.service && entry.service !== filter.service) return false;
      if (filter.query) {
        const queryLower = filter.query.toLowerCase();
        const matchesMsg = entry.message.toLowerCase().includes(queryLower);
        const matchesRaw = entry.raw.toLowerCase().includes(queryLower);
        if (!matchesMsg && !matchesRaw) return false;
      }
      return true;
    });
  }

  /**
   * Returns catalog of available failure scenarios.
   */
  public getIncidentCatalog(): readonly IncidentCatalogItem[] {
    return LogTraceIncidentEngine._CATALOG;
  }

  private _findCatalogItem(scenario: IncidentType): IncidentCatalogItem {
    const catalog = this.getIncidentCatalog();
    const match = catalog.find((item) => item.scenario === scenario);
    return (
      match ?? {
        scenario,
        rootCauseNodeId: 'node-unknown',
        targetRootCause: 'Unknown production anomaly',
        expectedRemediation: 'Inspect logs and scale resources',
        description: 'Unspecified failure scenario.',
      }
    );
  }

  private _assembleLogs(
    item: IncidentCatalogItem,
    baseIso: string,
    options?: IncidentTraceOptions
  ): LogEntry[] {
    const entries: LogEntry[] = [];
    const count = options?.includeNoise ? (options.noiseCount ?? LogTraceIncidentEngine._DEFAULT_NOISE_COUNT) : 2;

    for (let i = 0; i < count; i++) {
      entries.push(this._createNoiseEntry(i, baseIso));
    }
    entries.push(this._createFailureEntry(item, baseIso));
    entries.push(this._createIngressErrorEntry(item, baseIso));
    return entries;
  }

  private _createNoiseEntry(index: number, baseIso: string): LogEntry {
    const service = LogTraceIncidentEngine._NOISE_SERVICES[index % LogTraceIncidentEngine._NOISE_SERVICES.length] ?? 'gateway';
    const message = `Health check probe status 200 OK (heartbeat cycle ${index})`;
    return {
      timestamp: baseIso,
      service,
      level: TelemetryConstants.LOG_LEVEL_INFO,
      message,
      raw: `${baseIso} [${service}] INFO ${message}`,
    };
  }

  private _createFailureEntry(item: IncidentCatalogItem, baseIso: string): LogEntry {
    const message = `CRITICAL FAILURE on ${item.rootCauseNodeId}: ${item.targetRootCause}`;
    return {
      timestamp: baseIso,
      service: item.rootCauseNodeId,
      level: TelemetryConstants.LOG_LEVEL_ERROR,
      message,
      raw: `${baseIso} [${item.rootCauseNodeId}] ERROR ${message}`,
    };
  }

  private _createIngressErrorEntry(item: IncidentCatalogItem, baseIso: string): LogEntry {
    const message = `Upstream call to ${item.rootCauseNodeId} failed. gRPC status: UNAVAILABLE (code: 14)`;
    return {
      timestamp: baseIso,
      service: 'ingress-gateway-01',
      level: TelemetryConstants.LOG_LEVEL_FATAL,
      message,
      raw: `${baseIso} [ingress-gateway-01] FATAL ${message}`,
    };
  }

  private _checkCauseMatch(candidate: string, scenario: IncidentType): boolean {
    const candidateNorm = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
    const scenarioNorm = scenario.toLowerCase().replace(/[^a-z0-9]/g, '');
    return candidateNorm.includes(scenarioNorm) || scenarioNorm.includes(candidateNorm);
  }

  private _checkRemediationMatch(candidate: string, expected: string): boolean {
    const candWords = candidate.toLowerCase().split(/\s+/);
    const expWords = expected.toLowerCase().split(/\s+/);
    const overlap = candWords.filter((w) => expWords.includes(w) && w.length > 3);
    return overlap.length >= 2;
  }

  private _buildDiagnosisResult(
    trace: IncidentLogTrace,
    causeMatch: boolean,
    remediationMatch: boolean
  ): DiagnosisResult {
    let score = LogTraceIncidentEngine._SCORE_FAIL;
    if (causeMatch && remediationMatch) {
      score = LogTraceIncidentEngine._SCORE_PERFECT;
    } else if (causeMatch) {
      score = LogTraceIncidentEngine._SCORE_PARTIAL;
    }

    const explanation = causeMatch
      ? `Accurately identified failure: ${trace.targetRootCause}`
      : `Diagnosis mismatch. Expected root cause: ${trace.targetRootCause}`;

    return {
      correct: causeMatch,
      score,
      explanation,
      actualRootCause: trace.targetRootCause,
      suggestedFix: trace.expectedRemediation,
    };
  }
}
