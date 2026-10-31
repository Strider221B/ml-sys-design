import { describe, expect, it, vi } from 'vitest';
import { WorkspaceStore } from '@/core/state/workspace_store';
import {
  TelemetryMetricPoint,
  WorkspaceDocument,
  WorkspaceEdge,
  WorkspaceNode,
} from '@/core/state/workspace_types';

describe('WorkspaceStore', () => {
  const createSampleDoc = (): WorkspaceDocument => ({
    workspaceId: 'ws_custom_001',
    title: 'Custom Architecture',
    lastModifiedIso: '2026-10-31T00:00:00.000Z',
    etag: 'etag_123',
    activeModuleId: 'SANDBOX_BUILDER',
    activeScenarioId: 'scen_001',
    nodes: [],
    edges: [],
  });

  it('test_constructor_withDefaultDoc_initializesGuestState', () => {
    const store = new WorkspaceStore();
    const state = store.getState();

    expect(state.currentWorkspace.workspaceId).toBe('ws_guest_default');
    expect(state.syncState).toBe('CLEAN');
    expect(state.dirtyCount).toBe(0);
    expect(state.interviewStep).toBe(1);
    expect(state.finOpsConfig.monthlyBudgetUsd).toBe(5000);
  });

  it('test_constructor_withCustomDoc_initializesWithProvidedDoc', () => {
    const doc = createSampleDoc();
    const store = new WorkspaceStore(doc);
    const state = store.getState();

    expect(state.currentWorkspace.workspaceId).toBe('ws_custom_001');
    expect(state.currentWorkspace.title).toBe('Custom Architecture');
  });

  it('test_getStore_returnsStoreApiWithSubscribers', () => {
    const store = new WorkspaceStore();
    const storeApi = store.getStore();

    expect(typeof storeApi.getState).toBe('function');
    expect(typeof storeApi.setState).toBe('function');
    expect(typeof storeApi.subscribe).toBe('function');
  });

  it('test_updateCanvas_updatesNodesEdgesAndMarksDirty', () => {
    const store = new WorkspaceStore();
    const node: WorkspaceNode = {
      id: 'node_1',
      type: 'INGRESS_GATEWAY',
      position: { x: 100, y: 100 },
      data: { label: 'API Gateway' },
    };
    const edge: WorkspaceEdge = {
      id: 'edge_1',
      source: 'node_1',
      target: 'node_2',
      protocol: 'GRPC',
    };

    store.updateCanvas([node], [edge]);
    const state = store.getState();

    expect(state.currentWorkspace.nodes).toHaveLength(1);
    expect(state.currentWorkspace.edges).toHaveLength(1);
    expect(state.syncState).toBe('DIRTY');
    expect(state.dirtyCount).toBe(1);
  });

  it('test_markDirty_incrementsDirtyCount', () => {
    const store = new WorkspaceStore();
    store.markDirty();
    store.markDirty();

    const state = store.getState();
    expect(state.syncState).toBe('DIRTY');
    expect(state.dirtyCount).toBe(2);
  });

  it('test_markClean_resetsDirtyCountAndSetsSyncState', () => {
    const store = new WorkspaceStore();
    store.markDirty();
    const timestamp = '2026-10-31T05:00:00.000Z';
    store.markClean('new_etag_456', timestamp);

    const state = store.getState();
    expect(state.syncState).toBe('CLEAN');
    expect(state.dirtyCount).toBe(0);
    expect(state.activeEtag).toBe('new_etag_456');
    expect(state.lastSyncedIso).toBe(timestamp);
    expect(state.currentWorkspace.etag).toBe('new_etag_456');
  });

  it('test_setSyncState_updatesSyncStateFlag', () => {
    const store = new WorkspaceStore();
    store.setSyncState('SYNCING');
    expect(store.getState().syncState).toBe('SYNCING');

    store.setSyncState('CONFLICT');
    expect(store.getState().syncState).toBe('CONFLICT');
  });

  it('test_setActiveFile_updatesFileIdAndEtag', () => {
    const store = new WorkspaceStore();
    store.setActiveFile('drive_file_99', 'etag_99');

    const state = store.getState();
    expect(state.activeFileId).toBe('drive_file_99');
    expect(state.activeEtag).toBe('etag_99');
    expect(state.currentWorkspace.etag).toBe('etag_99');
  });

  it('test_setInterviewStep_updatesStepMachine', () => {
    const store = new WorkspaceStore();
    store.setInterviewStep(4);
    expect(store.getState().interviewStep).toBe(4);
  });

  it('test_setRubricScore_updatesCriterionScore', () => {
    const store = new WorkspaceStore();
    store.setRubricScore('scalability', 95);
    store.setRubricScore('fault_tolerance', 90);

    const scores = store.getState().rubricScores;
    expect(scores['scalability']).toBe(95);
    expect(scores['fault_tolerance']).toBe(90);
  });

  it('test_updateFinOps_updatesAllocationAndBudget', () => {
    const store = new WorkspaceStore();
    store.updateFinOps({
      monthlyBudgetUsd: 12000,
      hardwareAllocation: 'GOOGLE_TPU_V5E',
    });

    const finOps = store.getState().finOpsConfig;
    expect(finOps.monthlyBudgetUsd).toBe(12000);
    expect(finOps.hardwareAllocation).toBe('GOOGLE_TPU_V5E');
    expect(finOps.targetQps).toBe(10000);
  });

  it('test_pushTelemetry_appendsAndEvictsWhenMaxExceeded', () => {
    const store = new WorkspaceStore();

    for (let i = 0; i < 65; i++) {
      const metric: TelemetryMetricPoint = {
        timestamp: 1000 + i,
        aggregateQPS: 500 + i,
        aggregateP99Ms: 12.5,
        totalCostMonthlyUsd: 4500,
        gpuMemoryUtilizationPct: 78,
      };
      store.pushTelemetry(metric);
    }

    const buffer = store.getState().telemetryRingBuffer;
    expect(buffer).toHaveLength(60);
    expect(buffer[0]?.timestamp).toBe(1005);
    expect(buffer[59]?.timestamp).toBe(1064);
  });

  it('test_subscribeTelemetry_callsListenerDirectly', () => {
    const store = new WorkspaceStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribeTelemetry(listener);

    const metric: TelemetryMetricPoint = {
      timestamp: 2000,
      aggregateQPS: 1000,
      aggregateP99Ms: 15.0,
      totalCostMonthlyUsd: 4800,
      gpuMemoryUtilizationPct: 82,
    };
    store.pushTelemetry(metric);

    expect(listener).toHaveBeenCalledWith([metric]);
    unsubscribe();
  });

  it('test_resetToGuest_reinitializesToGuestDefaults', () => {
    const store = new WorkspaceStore();
    store.markDirty();
    store.setInterviewStep(5);
    store.resetToGuest();

    const state = store.getState();
    expect(state.currentWorkspace.workspaceId).toBe('ws_guest_default');
    expect(state.dirtyCount).toBe(0);
    expect(state.interviewStep).toBe(1);
    expect(state.syncState).toBe('CLEAN');
  });
});

