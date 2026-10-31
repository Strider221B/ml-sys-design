import { InterviewConstants } from '@/core/interview/interview_constants';
import { NodeMetrics } from '@/core/state/workspace_types';

export type FailureType = 'DATA_DRIFT' | 'TRAIN_SERVE_SKEW' | 'HALLUCINATION_SPIKE';

export interface FailureImpact {
  affectedNodeIds: string[];
  latencyDeltaMs: number;
  errorRateDeltaPct: number;
  psiMetricValue?: number;
  description: string;
}

export interface FailureScenario {
  scenarioId: string;
  blueprintId: string;
  failureType: FailureType;
  title: string;
  description: string;
  impact: FailureImpact;
  recommendedMitigations: string[];
}

/**
 * Simulates real-time production failure modes (drift, skew, hallucination) against system blueprints.
 */
export class FailureModeSimulator {
  private static readonly _ERR_UNSUPPORTED_TYPE = 'Unsupported failure type: ';
  private static readonly _SCENARIO_PREFIX = 'scenario_';
  private static readonly _DEFAULT_PERCENT_MULTIPLIER = 0.01;
  private static readonly _MIN_METRIC_VALUE = 0;

  public constructor() {}

  /**
   * Generates a realistic failure scenario for the specified blueprint and failure type.
   */
  public injectFailure(blueprintId: string, failureType: FailureType): FailureScenario {
    const scenarioId = `${FailureModeSimulator._SCENARIO_PREFIX}${blueprintId}_${failureType.toLowerCase()}`;

    switch (failureType) {
      case InterviewConstants.FAILURE_DATA_DRIFT:
        return this._createDataDriftScenario(scenarioId, blueprintId);
      case InterviewConstants.FAILURE_TRAIN_SERVE_SKEW:
        return this._createTrainServeSkewScenario(scenarioId, blueprintId);
      case InterviewConstants.FAILURE_HALLUCINATION_SPIKE:
        return this._createHallucinationScenario(scenarioId, blueprintId);
      default:
        throw new Error(`${FailureModeSimulator._ERR_UNSUPPORTED_TYPE}${failureType}`);
    }
  }

  /**
   * Returns list of supported failure modes for a given blueprint.
   */
  public getAvailableFailureTypes(blueprintId: string): FailureType[] {
    if (blueprintId === InterviewConstants.CASE_STUDY_ECOMMERCE) {
      return [InterviewConstants.FAILURE_TRAIN_SERVE_SKEW, InterviewConstants.FAILURE_DATA_DRIFT];
    }
    if (blueprintId === InterviewConstants.CASE_STUDY_FRAUD) {
      return [InterviewConstants.FAILURE_DATA_DRIFT, InterviewConstants.FAILURE_TRAIN_SERVE_SKEW];
    }
    return [InterviewConstants.FAILURE_HALLUCINATION_SPIKE, InterviewConstants.FAILURE_DATA_DRIFT];
  }

  /**
   * Projects adjusted telemetry metrics when failure impact is applied to nominal node metrics.
   */
  public simulateImpactOnMetrics(baseMetrics: NodeMetrics, impact: FailureImpact): NodeMetrics {
    const adjustedP50 = baseMetrics.p50LatencyMs + impact.latencyDeltaMs * 0.5;
    const adjustedP99 = baseMetrics.p99LatencyMs + impact.latencyDeltaMs;
    const dropFactor = Math.max(0, 1.0 - impact.errorRateDeltaPct * FailureModeSimulator._DEFAULT_PERCENT_MULTIPLIER);
    const adjustedQps = Math.round(baseMetrics.qps * dropFactor);

    return {
      qps: Math.max(FailureModeSimulator._MIN_METRIC_VALUE, adjustedQps),
      p50LatencyMs: Math.max(FailureModeSimulator._MIN_METRIC_VALUE, adjustedP50),
      p99LatencyMs: Math.max(FailureModeSimulator._MIN_METRIC_VALUE, adjustedP99),
      gpuMemoryMb: baseMetrics.gpuMemoryMb,
      costPerHourUsd: baseMetrics.costPerHourUsd,
    };
  }

  private _createDataDriftScenario(scenarioId: string, blueprintId: string): FailureScenario {
    return {
      scenarioId,
      blueprintId,
      failureType: InterviewConstants.FAILURE_DATA_DRIFT,
      title: 'Covariate Drift Attack on Velocity Aggregates',
      description: 'Distributed micro-transactions under $2.00 bypass velocity rules. PSI spikes above 0.35.',
      impact: {
        affectedNodeIds: ['node_velocity_store', 'node_fraud_model'],
        latencyDeltaMs: 15,
        errorRateDeltaPct: 28.5,
        psiMetricValue: 0.38,
        description: 'Significant population distribution shift causing false negative authorization spike.',
      },
      recommendedMitigations: [
        'Trigger automated PSI drift alert in telemetry',
        'Retrain model with recency-weighted loss formulation',
        'Activate heuristic rule circuit breaker for low-value bursts',
      ],
    };
  }

  private _createTrainServeSkewScenario(scenarioId: string, blueprintId: string): FailureScenario {
    return {
      scenarioId,
      blueprintId,
      failureType: InterviewConstants.FAILURE_TRAIN_SERVE_SKEW,
      title: 'Training-Serving Feature Skew in Candidate Generation',
      description: 'Batch impression window lagged behind real-time clicks, resulting in serving out-of-stock items.',
      impact: {
        affectedNodeIds: ['node_feature_store', 'node_retrieval'],
        latencyDeltaMs: 45,
        errorRateDeltaPct: 18.0,
        psiMetricValue: 0.15,
        description: 'Point-in-time feature mismatch degrading candidate relevance and inflating latency.',
      },
      recommendedMitigations: [
        'Align offline ETL transforms with streaming Flink definitions',
        'Implement automated point-in-time unit tests on feature joins',
        'Deploy Redis TTL expiration validation guardrail',
      ],
    };
  }

  private _createHallucinationScenario(scenarioId: string, blueprintId: string): FailureScenario {
    return {
      scenarioId,
      blueprintId,
      failureType: InterviewConstants.FAILURE_HALLUCINATION_SPIKE,
      title: 'Stale Vector Index & Chunk Boundary Hallucination',
      description: 'Vector database shards lagged behind updated documents, causing LLM to synthesize ungrounded answers.',
      impact: {
        affectedNodeIds: ['node_vdb', 'node_hallucination'],
        latencyDeltaMs: 80,
        errorRateDeltaPct: 42.0,
        psiMetricValue: 0.29,
        description: 'Context degradation triggering groundedness guardrail rejections and retries.',
      },
      recommendedMitigations: [
        'Enforce transactional index invalidation upon document ingestion',
        'Elevate cross-encoder relevance threshold cutoff',
        'Enable speculative groundedness retry loop with fallback search',
      ],
    };
  }
}

