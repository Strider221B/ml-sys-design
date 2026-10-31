import { describe, expect, it } from 'vitest';
import { LogTraceIncidentEngine } from '@/core/telemetry/log_trace_incident_engine';
import { TelemetryConstants } from '@/core/telemetry/telemetry_constants';

describe('LogTraceIncidentEngine', () => {
  it('test_getIncidentCatalog_returnsSixStandardProductionScenarios', () => {
    const engine = new LogTraceIncidentEngine();
    const catalog = engine.getIncidentCatalog();
    expect(catalog.length).toBe(6);
    expect(catalog.map((c) => c.scenario)).toContain(TelemetryConstants.INCIDENT_CUDA_OOM);
    expect(catalog.map((c) => c.scenario)).toContain(TelemetryConstants.INCIDENT_NCCL_RING_DEADLOCK);
  });

  it('test_generateIncidentTrace_withNoise_producesMultiTierLogs', () => {
    const engine = new LogTraceIncidentEngine();
    const trace = engine.generateIncidentTrace(TelemetryConstants.INCIDENT_CUDA_OOM, {
      includeNoise: true,
      noiseCount: 4,
    });

    expect(trace.incidentId).toContain('inc_cuda_oom');
    expect(trace.scenario).toBe(TelemetryConstants.INCIDENT_CUDA_OOM);
    expect(trace.rootCauseNodeId).toBe('vllm-worker-gpu-03');
    expect(trace.logs.length).toBe(6); // 4 noise + 1 failure + 1 ingress error

    const errorLogs = trace.logs.filter((l) => l.level === TelemetryConstants.LOG_LEVEL_ERROR);
    expect(errorLogs.length).toBe(1);
    expect(errorLogs[0]?.message).toContain('CUDA Out-of-Memory');
  });

  it('test_validateDiagnosis_whenCorrectRootCauseAndRemediation_returnsPerfectScore', () => {
    const engine = new LogTraceIncidentEngine();
    const trace = engine.generateIncidentTrace(TelemetryConstants.INCIDENT_CUDA_OOM);

    const result = engine.validateDiagnosis(
      trace.incidentId,
      'CUDA_OOM out of memory',
      'Enable Chunked Prefill & PagedAttention v2'
    );

    expect(result.correct).toBe(true);
    expect(result.score).toBe(100);
    expect(result.explanation).toContain('Accurately identified failure');
    expect(result.actualRootCause).toBe(trace.targetRootCause);
  });

  it('test_validateDiagnosis_whenOnlyCauseMatches_returnsPartialScore', () => {
    const engine = new LogTraceIncidentEngine();
    const trace = engine.generateIncidentTrace(TelemetryConstants.INCIDENT_NCCL_RING_DEADLOCK);

    const result = engine.validateDiagnosis(
      trace.incidentId,
      'NCCL_RING_DEADLOCK',
      'Restart the cluster randomly'
    );

    expect(result.correct).toBe(true);
    expect(result.score).toBe(50);
  });

  it('test_validateDiagnosis_whenMismatch_returnsZeroScore', () => {
    const engine = new LogTraceIncidentEngine();
    const trace = engine.generateIncidentTrace(TelemetryConstants.INCIDENT_STALE_EMBEDDING_INDEX);

    const result = engine.validateDiagnosis(
      trace.incidentId,
      'CUDA_OOM',
      'None'
    );

    expect(result.correct).toBe(false);
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('Diagnosis mismatch');
  });

  it('test_validateDiagnosis_whenUnknownIncident_throwsError', () => {
    const engine = new LogTraceIncidentEngine();
    expect(() => engine.validateDiagnosis('invalid_id', 'CUDA_OOM')).toThrow(
      'Incident trace not found: invalid_id'
    );
  });

  it('test_filterLogs_filtersByLevelServiceAndQuery', () => {
    const engine = new LogTraceIncidentEngine();
    const trace = engine.generateIncidentTrace(TelemetryConstants.INCIDENT_NETWORK_PARTITION, {
      includeNoise: true,
      noiseCount: 5,
    });

    const fatalOnly = engine.filterLogs(trace.logs, { level: TelemetryConstants.LOG_LEVEL_FATAL });
    expect(fatalOnly.length).toBe(1);

    const gatewayOnly = engine.filterLogs(trace.logs, { service: 'ingress-gateway-01' });
    expect(gatewayOnly.length).toBeGreaterThan(0);

    const queryLogs = engine.filterLogs(trace.logs, { query: 'CRITICAL FAILURE' });
    expect(queryLogs.length).toBe(1);

    const noFilter = engine.filterLogs(trace.logs, {});
    expect(noFilter.length).toBe(trace.logs.length);
  });
});

