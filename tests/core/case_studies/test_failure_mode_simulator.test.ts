import { describe, expect, it } from 'vitest';
import { FailureModeSimulator, FailureType } from '@/core/case_studies/failure_mode_simulator';
import { InterviewConstants } from '@/core/interview/interview_constants';
import { NodeMetrics } from '@/core/state/workspace_types';

describe('FailureModeSimulator', () => {
  const baseMetrics: NodeMetrics = {
    qps: 10000,
    p50LatencyMs: 10,
    p99LatencyMs: 40,
    gpuMemoryMb: 8000,
    costPerHourUsd: 2.5,
  };

  it('test_injectFailure_dataDrift_returnsValidScenario', () => {
    const simulator = new FailureModeSimulator();
    const scenario = simulator.injectFailure(
      InterviewConstants.CASE_STUDY_FRAUD,
      InterviewConstants.FAILURE_DATA_DRIFT as FailureType
    );

    expect(scenario.scenarioId).toContain('STREAMING_FRAUD_data_drift');
    expect(scenario.title).toContain('Covariate Drift');
    expect(scenario.impact.affectedNodeIds).toContain('node_velocity_store');
    expect(scenario.impact.psiMetricValue).toBeGreaterThan(0.35);
    expect(scenario.recommendedMitigations.length).toBeGreaterThan(0);
  });

  it('test_injectFailure_trainServeSkew_returnsValidScenario', () => {
    const simulator = new FailureModeSimulator();
    const scenario = simulator.injectFailure(
      InterviewConstants.CASE_STUDY_ECOMMERCE,
      InterviewConstants.FAILURE_TRAIN_SERVE_SKEW as FailureType
    );

    expect(scenario.scenarioId).toContain('train_serve_skew');
    expect(scenario.impact.latencyDeltaMs).toBe(45);
    expect(scenario.impact.affectedNodeIds).toContain('node_feature_store');
  });

  it('test_injectFailure_hallucinationSpike_returnsValidScenario', () => {
    const simulator = new FailureModeSimulator();
    const scenario = simulator.injectFailure(
      InterviewConstants.CASE_STUDY_GENAI,
      InterviewConstants.FAILURE_HALLUCINATION_SPIKE as FailureType
    );

    expect(scenario.scenarioId).toContain('hallucination_spike');
    expect(scenario.impact.latencyDeltaMs).toBe(80);
    expect(scenario.impact.affectedNodeIds).toContain('node_vdb');
  });

  it('test_injectFailure_unsupportedType_throwsError', () => {
    const simulator = new FailureModeSimulator();
    expect(() =>
      simulator.injectFailure(InterviewConstants.CASE_STUDY_FRAUD, 'UNKNOWN_TYPE' as FailureType)
    ).toThrow('Unsupported failure type');
  });

  it('test_getAvailableFailureTypes_returnsExpectedPerBlueprint', () => {
    const simulator = new FailureModeSimulator();

    const ecomTypes = simulator.getAvailableFailureTypes(InterviewConstants.CASE_STUDY_ECOMMERCE);
    expect(ecomTypes).toContain(InterviewConstants.FAILURE_TRAIN_SERVE_SKEW);

    const fraudTypes = simulator.getAvailableFailureTypes(InterviewConstants.CASE_STUDY_FRAUD);
    expect(fraudTypes).toContain(InterviewConstants.FAILURE_DATA_DRIFT);

    const genAiTypes = simulator.getAvailableFailureTypes(InterviewConstants.CASE_STUDY_GENAI);
    expect(genAiTypes).toContain(InterviewConstants.FAILURE_HALLUCINATION_SPIKE);
  });

  it('test_simulateImpactOnMetrics_calculatesAdjustedMetrics', () => {
    const simulator = new FailureModeSimulator();
    const scenario = simulator.injectFailure(
      InterviewConstants.CASE_STUDY_FRAUD,
      InterviewConstants.FAILURE_DATA_DRIFT as FailureType
    );

    const projected = simulator.simulateImpactOnMetrics(baseMetrics, scenario.impact);

    expect(projected.p50LatencyMs).toBeGreaterThan(baseMetrics.p50LatencyMs);
    expect(projected.p99LatencyMs).toBeGreaterThan(baseMetrics.p99LatencyMs);
    expect(projected.qps).toBeLessThan(baseMetrics.qps);
    expect(projected.gpuMemoryMb).toBe(baseMetrics.gpuMemoryMb);
  });
});
