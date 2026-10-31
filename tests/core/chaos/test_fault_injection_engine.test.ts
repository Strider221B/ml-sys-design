import { describe, expect, it } from 'vitest';
import { ChaosConstants } from '@/core/chaos/chaos_constants';
import { CanvasGraph, FaultDescriptor, FaultInjectionEngine } from '@/core/chaos/fault_injection_engine';
import { WorkspaceEdge, WorkspaceNode } from '@/core/state/workspace_types';

describe('FaultInjectionEngine', () => {
  const createSampleGraph = (): CanvasGraph => {
    const nodes: WorkspaceNode[] = [
      {
        id: 'node_gw',
        type: 'INGRESS_GATEWAY',
        position: { x: 0, y: 0 },
        data: { label: 'Gateway' },
      },
      {
        id: 'node_vllm',
        type: 'VLLM_INFERENCE_ENGINE',
        position: { x: 200, y: 0 },
        data: {
          label: 'vLLM',
          metrics: {
            qps: 1000,
            p50LatencyMs: 20,
            p99LatencyMs: 40,
            gpuMemoryMb: 8000,
            costPerHourUsd: 2.5,
          },
        },
      },
    ];

    const edges: WorkspaceEdge[] = [
      {
        id: 'edge_gw_vllm',
        source: 'node_gw',
        target: 'node_vllm',
        protocol: 'GRPC',
        data: {
          p99LatencyMs: 2,
          qps: 500,
        },
      },
    ];

    return { nodes, edges };
  };

  it('test_injectFault_onEdgePartition_spikesLatencyAndDropsQps', () => {
    const engine = new FaultInjectionEngine();
    const graph = createSampleGraph();
    const fault: FaultDescriptor = {
      faultType: ChaosConstants.FAULT_NETWORK_PARTITION,
      targetId: 'edge_gw_vllm',
      targetType: 'EDGE',
      intensity: 600,
    };

    const perturbed = engine.injectFault(graph, fault);

    expect(perturbed.activeFaults).toHaveLength(1);
    expect(perturbed.blastRadiusScore).toBeGreaterThan(0);
    expect(perturbed.logs[0]).toContain('Injected network partition on edge edge_gw_vllm');

    const perturbedEdge = perturbed.edges.find((e) => e.id === 'edge_gw_vllm');
    expect(perturbedEdge?.data?.p99LatencyMs).toBe(602);
    expect(perturbedEdge?.data?.qps).toBe(0);
  });

  it('test_injectFault_onMissingEdge_logsNotFoundError', () => {
    const engine = new FaultInjectionEngine();
    const graph = createSampleGraph();
    const fault: FaultDescriptor = {
      faultType: ChaosConstants.FAULT_NETWORK_PARTITION,
      targetId: 'non_existent_edge',
      targetType: 'EDGE',
    };

    const perturbed = engine.injectFault(graph, fault);
    expect(perturbed.logs[0]).toContain('Target element not found: non_existent_edge');
  });

  it('test_injectFault_onNodeTokenOverflow_scalesLatencyAndMemory', () => {
    const engine = new FaultInjectionEngine();
    const graph = createSampleGraph();
    const fault: FaultDescriptor = {
      faultType: ChaosConstants.FAULT_TOKEN_OVERFLOW,
      targetId: 'node_vllm',
      targetType: 'NODE',
      intensity: 3.0,
    };

    const perturbed = engine.injectFault(graph, fault);
    const perturbedNode = perturbed.nodes.find((n) => n.id === 'node_vllm');

    expect(perturbedNode?.data.metrics?.p99LatencyMs).toBe(120);
    expect(perturbedNode?.data.metrics?.gpuMemoryMb).toBe(24000);
    expect(perturbed.logs[0]).toContain('Injected token context overflow on node node_vllm');
  });

  it('test_injectFault_onNodeClockSkewAndRaceCondition_logsCorrectDescriptions', () => {
    const engine = new FaultInjectionEngine();
    const graph = createSampleGraph();

    const clockFault: FaultDescriptor = {
      faultType: ChaosConstants.FAULT_CLOCK_SKEW,
      targetId: 'node_vllm',
      targetType: 'NODE',
    };
    const clockResult = engine.injectFault(graph, clockFault);
    expect(clockResult.logs[0]).toContain('Injected clock desync skew on node node_vllm');

    const raceFault: FaultDescriptor = {
      faultType: ChaosConstants.FAULT_RACE_CONDITION,
      targetId: 'node_vllm',
      targetType: 'NODE',
    };
    const raceResult = engine.injectFault(graph, raceFault);
    expect(raceResult.logs[0]).toContain('Injected race condition jitter on target node_vllm');
  });

  it('test_injectFault_onMissingNode_logsNotFoundError', () => {
    const engine = new FaultInjectionEngine();
    const graph = createSampleGraph();
    const fault: FaultDescriptor = {
      faultType: ChaosConstants.FAULT_TOKEN_OVERFLOW,
      targetId: 'non_existent_node',
      targetType: 'NODE',
    };

    const perturbed = engine.injectFault(graph, fault);
    expect(perturbed.logs[0]).toContain('Target element not found: non_existent_node');
  });

  it('test_calculateBlastRadius_whenNoFaultsOrEmptyGraph_returnsZero', () => {
    const engine = new FaultInjectionEngine();
    expect(engine.calculateBlastRadius({ nodes: [], edges: [] }, [])).toBe(0);
    expect(engine.calculateBlastRadius(createSampleGraph(), [])).toBe(0);
  });

  it('test_clearFaults_restoresNodesAndEdgesToNominalThresholds', () => {
    const engine = new FaultInjectionEngine();
    const graph = createSampleGraph();

    const fault: FaultDescriptor = {
      faultType: ChaosConstants.FAULT_NETWORK_PARTITION,
      targetId: 'edge_gw_vllm',
      targetType: 'EDGE',
      intensity: 1000,
    };
    const perturbed = engine.injectFault(graph, fault);

    const cleared = engine.clearFaults({ nodes: perturbed.nodes, edges: perturbed.edges });
    const clearedEdge = cleared.edges.find((e) => e.id === 'edge_gw_vllm');
    expect(clearedEdge?.data?.p99LatencyMs).toBeLessThanOrEqual(5);

    const clearedNode = cleared.nodes.find((n) => n.id === 'node_vllm');
    expect(clearedNode?.data.metrics?.p99LatencyMs).toBeLessThanOrEqual(50);
  });
});

