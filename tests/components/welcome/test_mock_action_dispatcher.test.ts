import { beforeEach, describe, expect, it } from 'vitest';
import { MockActionDispatcher } from '@/components/welcome/mock_action_dispatcher';
import { WorkspaceStore } from '@/core/state/workspace_store';

describe('MockActionDispatcher', () => {
  let dispatcher: MockActionDispatcher;
  let store: WorkspaceStore;

  beforeEach(() => {
    dispatcher = new MockActionDispatcher();
    store = new WorkspaceStore();
  });

  it('test_dispatchMockAction_loadCanvasRag_populatesTopologyNodesAndEdges', async () => {
    await dispatcher.dispatchMockAction({ actionType: 'LOAD_CANVAS_RAG' }, store);

    const doc = store.getState().currentWorkspace;
    expect(doc.nodes.length).toBeGreaterThanOrEqual(4);
    expect(doc.edges.length).toBeGreaterThanOrEqual(3);
    expect(store.getState().syncState).toBe('DIRTY');
  });

  it('test_dispatchMockAction_loadInterviewYoutube_configuresInterviewRubricAndScenario', async () => {
    await dispatcher.dispatchMockAction({ actionType: 'LOAD_INTERVIEW_YOUTUBE' }, store);

    const state = store.getState();
    expect(state.interviewStep).toBe(1);
    expect(state.rubricScores['correctness']).toBe(5);
    expect(state.rubricScores['scale']).toBe(4.5);
    expect(state.currentWorkspace.activeScenarioId).toBe('youtube_recommendation_v1');
    expect(state.syncState).toBe('DIRTY');
  });

  it('test_dispatchMockAction_simulateChaosBurst_pushesBurstTelemetryAndSetsScenario', async () => {
    await dispatcher.dispatchMockAction({ actionType: 'SIMULATE_CHAOS_BURST' }, store);

    const state = store.getState();
    expect(state.currentWorkspace.activeScenarioId).toBe('chaos_poisson_burst_10x');
    expect(state.telemetryRingBuffer.length).toBeGreaterThan(0);
    const lastPoint = state.telemetryRingBuffer[state.telemetryRingBuffer.length - 1];
    expect(lastPoint?.aggregateQPS).toBe(12000);
    expect(lastPoint?.aggregateP99Ms).toBe(1850);
  });

  it('test_dispatchMockAction_loadCurriculumFraud_setsCurriculumIndexAndScenario', async () => {
    await dispatcher.dispatchMockAction({ actionType: 'LOAD_CURRICULUM_FRAUD' }, store);

    const state = store.getState();
    expect(state.activeCurriculumIndex).toBe(2);
    expect(state.currentWorkspace.activeScenarioId).toBe('challenge_03_streaming_fraud');
  });

  it('test_dispatchMockAction_simulateTelemetrySpike_pushesTimeSeriesSamples', async () => {
    await dispatcher.dispatchMockAction({ actionType: 'SIMULATE_TELEMETRY_SPIKE' }, store);

    const buffer = store.getState().telemetryRingBuffer;
    expect(buffer.length).toBe(5);
    expect(buffer[4]?.aggregateP99Ms).toBeGreaterThan(buffer[0]?.aggregateP99Ms ?? 0);
  });

  it('test_dispatchMockAction_loadFinopsLlama_updatesHardwareSizingAndBudget', async () => {
    await dispatcher.dispatchMockAction({ actionType: 'LOAD_FINOPS_LLAMA' }, store);

    const config = store.getState().finOpsConfig;
    expect(config.targetQps).toBe(50000);
    expect(config.monthlyBudgetUsd).toBe(22400);
    expect(config.hardwareAllocation).toContain('NVIDIA H100');
  });

  it('test_dispatchMockAction_withUnknownAction_doesNotThrow', async () => {
    await expect(
      dispatcher.dispatchMockAction({ actionType: 'UNKNOWN_ACTION' as any }, store)
    ).resolves.toBeUndefined();
  });
});

