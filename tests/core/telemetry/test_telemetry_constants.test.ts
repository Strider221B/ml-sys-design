import { describe, expect, it } from 'vitest';
import { TelemetryConstants } from '@/core/telemetry/telemetry_constants';

describe('TelemetryConstants', () => {
  it('test_constants_values_definedAndValid', () => {
    const constants = new TelemetryConstants();
    expect(constants).toBeDefined();
    expect(TelemetryConstants.DEFAULT_BUFFER_CAPACITY).toBe(300);
    expect(TelemetryConstants.HIGH_RES_BUFFER_CAPACITY).toBe(3600);
    expect(TelemetryConstants.TARGET_FPS).toBe(60);
    expect(TelemetryConstants.TARGET_FRAME_BUDGET_MS).toBeCloseTo(16.666, 2);

    expect(TelemetryConstants.METRIC_P99_LATENCY).toBe('p99LatencyMs');
    expect(TelemetryConstants.METRIC_TTFT).toBe('ttftMs');
    expect(TelemetryConstants.METRIC_GPU_MEMORY).toBe('gpuMemoryFragmentationPct');
    expect(TelemetryConstants.METRIC_QUEUE_LAG).toBe('queueLagMs');
    expect(TelemetryConstants.METRIC_QPS).toBe('qps');
  });

  it('test_getSupportedIncidentTypes_returnsAllExpectedIncidents', () => {
    const constants = new TelemetryConstants();
    const incidents = constants.getSupportedIncidentTypes();
    expect(incidents).toContain(TelemetryConstants.INCIDENT_CUDA_OOM);
    expect(incidents).toContain(TelemetryConstants.INCIDENT_NCCL_RING_DEADLOCK);
    expect(incidents).toContain(TelemetryConstants.INCIDENT_KV_CACHE_STARVATION);
    expect(incidents).toContain(TelemetryConstants.INCIDENT_STALE_EMBEDDING_INDEX);
    expect(incidents).toContain(TelemetryConstants.INCIDENT_NETWORK_PARTITION);
    expect(incidents).toContain(TelemetryConstants.INCIDENT_GRPC_TIMEOUT);
    expect(incidents.length).toBe(6);
  });

  it('test_getEuAiActArticles_returnsMandatoryArticles9Through15', () => {
    const constants = new TelemetryConstants();
    const articles = constants.getEuAiActArticles();
    expect(articles).toContain(TelemetryConstants.ARTICLE_9_RISK_MGMT);
    expect(articles).toContain(TelemetryConstants.ARTICLE_10_DATA_GOV);
    expect(articles).toContain(TelemetryConstants.ARTICLE_11_TECH_DOCS);
    expect(articles).toContain(TelemetryConstants.ARTICLE_12_RECORD_KEEPING);
    expect(articles).toContain(TelemetryConstants.ARTICLE_13_TRANSPARENCY);
    expect(articles).toContain(TelemetryConstants.ARTICLE_14_HUMAN_OVERSIGHT);
    expect(articles).toContain(TelemetryConstants.ARTICLE_15_CYBERSECURITY);
    expect(articles.length).toBe(7);
  });
});
