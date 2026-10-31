import { describe, expect, it } from 'vitest';
import { GraphTopologyValidator } from '@/components/canvas/graph_topology_validator';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

describe('GraphTopologyValidator', () => {
  const validator = new GraphTopologyValidator();

  it('test_validateGraph_whenGraphEmpty_returnsValidEmptyOrder', () => {
    const result = validator.validateGraph([], []);
    expect(result.isValid).toBe(true);
    expect(result.hasCycle).toBe(false);
    expect(result.topologicalOrder).toEqual([]);
  });

  it('test_validateGraph_whenSelfConnectionPresent_returnsError', () => {
    const result = validator.validateGraph(['n1'], [{ source: 'n1', target: 'n1' }]);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Self-connections are prohibited');
  });

  it('test_validateGraph_whenAcyclicDag_returnsTopologicalOrder', () => {
    const nodes = ['gateway', 'guardrail', 'worker'];
    const edges = [
      { source: 'gateway', target: 'guardrail' },
      { source: 'guardrail', target: 'worker' },
    ];
    const result = validator.validateGraph(nodes, edges);
    expect(result.isValid).toBe(true);
    expect(result.hasCycle).toBe(false);
    expect(result.topologicalOrder).toEqual(['gateway', 'guardrail', 'worker']);
  });

  it('test_validateGraph_whenCycleDetected_returnsCycleError', () => {
    const nodes = ['n1', 'n2', 'n3'];
    const edges = [
      { source: 'n1', target: 'n2' },
      { source: 'n2', target: 'n3' },
      { source: 'n3', target: 'n1' },
    ];
    const result = validator.validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.hasCycle).toBe(true);
    expect(result.error).toContain('Directed cycle detected');
  });

  it('test_canConnect_whenTypesEmpty_returnsFalse', () => {
    expect(validator.canConnect('', 'modelWorker')).toBe(false);
    expect(validator.canConnect('inferenceGateway', '')).toBe(false);
  });

  it('test_canConnect_whenSubflowGroups_returnsTrue', () => {
    expect(
      validator.canConnect(CanvasConstants.NODE_TYPE_AGENT_SWARM_GROUP, CanvasConstants.NODE_TYPE_MODEL_WORKER)
    ).toBe(true);
    expect(
      validator.canConnect(CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY, CanvasConstants.NODE_TYPE_VLLM_CLUSTER_GROUP)
    ).toBe(true);
  });

  it('test_canConnect_whenGatewayToGateway_returnsFalse', () => {
    expect(
      validator.canConnect(CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY, CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY)
    ).toBe(false);
  });

  it('test_canConnect_whenFeatureStoreToFeatureStore_returnsFalse', () => {
    expect(
      validator.canConnect(CanvasConstants.NODE_TYPE_FEATURE_STORE, CanvasConstants.NODE_TYPE_FEATURE_STORE)
    ).toBe(false);
  });

  it('test_canConnect_whenVectorDbToGateway_returnsFalse', () => {
    expect(
      validator.canConnect(CanvasConstants.NODE_TYPE_VECTOR_DATABASE, CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY)
    ).toBe(false);
  });

  it('test_canConnect_whenCompatibleStandardNodes_returnsTrue', () => {
    expect(
      validator.canConnect(CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY, CanvasConstants.NODE_TYPE_MODEL_WORKER)
    ).toBe(true);
    expect(
      validator.canConnect(CanvasConstants.NODE_TYPE_SEMANTIC_GUARDRAIL, CanvasConstants.NODE_TYPE_MODEL_WORKER)
    ).toBe(true);
    expect(
      validator.canConnect(CanvasConstants.NODE_TYPE_MODEL_WORKER, CanvasConstants.NODE_TYPE_VECTOR_DATABASE)
    ).toBe(true);
  });

  it('test_findCriticalPath_whenValidDag_computesLongestPath', () => {
    const nodes = ['A', 'B', 'C', 'D'];
    const edges = [
      { source: 'A', target: 'B', latencyMs: 10 },
      { source: 'B', target: 'D', latencyMs: 25 },
      { source: 'A', target: 'C', latencyMs: 5 },
      { source: 'C', target: 'D', latencyMs: 15 },
    ];
    const result = validator.findCriticalPath(nodes, edges);
    expect(result.path).toEqual(['A', 'B', 'D']);
    expect(result.totalLatencyMs).toBe(35);
  });

  it('test_findCriticalPath_whenEdgeHasNoLatency_usesDefaultLatency', () => {
    const nodes = ['X', 'Y'];
    const edges = [{ source: 'X', target: 'Y' }];
    const result = validator.findCriticalPath(nodes, edges);
    expect(result.path).toEqual(['X', 'Y']);
    expect(result.totalLatencyMs).toBe(0.5);
  });

  it('test_findCriticalPath_whenCyclePresent_returnsEmptyPath', () => {
    const nodes = ['A', 'B'];
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'A' },
    ];
    const result = validator.findCriticalPath(nodes, edges);
    expect(result.path).toEqual([]);
    expect(result.totalLatencyMs).toBe(0);
  });
});
