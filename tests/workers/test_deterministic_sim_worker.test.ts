import { describe, expect, it } from 'vitest';
import { MathConstants } from '@/core/math/math_constants';
import {
  DeterministicSimWorker,
  type GraphEdgePayload,
  type GraphNodePayload,
} from '@/workers/deterministic_sim_worker';

describe('DeterministicSimWorker', () => {
  it('test_evaluateGraph_smallRagPipeline_completesUnder15ms', () => {
    const worker = new DeterministicSimWorker();

    const nodes: GraphNodePayload[] = [
      { id: 'gateway', type: 'API_GATEWAY', baseServiceMs: 2.0, replicaCount: 4 },
      { id: 'retriever', type: 'VECTOR_DB', baseServiceMs: 15.0, replicaCount: 2 },
      {
        id: 'llm',
        type: 'VLLM_CLUSTER',
        hardwareSku: MathConstants.CHIP_NVIDIA_H100_SXM5,
        replicaCount: 8,
        activeParamsBillion: 70,
        promptTokens: 2048,
        outputTokens: 128,
        batchSize: 4,
        promptCacheEnabled: true,
        speculativeDecoding: true,
      },
      { id: 'guardrail', type: 'SAFETY_FILTER', baseServiceMs: 5.0, replicaCount: 2 },
    ];

    const edges: GraphEdgePayload[] = [
      { source: 'gateway', target: 'retriever', protocol: 'GRPC' },
      { source: 'retriever', target: 'llm', protocol: 'GRPC' },
      { source: 'llm', target: 'guardrail', protocol: 'REST' },
    ];

    const result = worker.evaluateGraph(nodes, edges, { inputQPS: 25 });

    expect(result.executionDurationMs).toBeLessThan(15.0);
    expect(result.p50LatencyMs).toBeGreaterThan(0);
    expect(result.p99LatencyMs).toBeGreaterThan(result.p50LatencyMs);
    expect(result.ttftMs).toBeGreaterThan(0);
    expect(result.tpotMs).toBeGreaterThan(0);
    expect(result.monthlyCostUSD).toBeGreaterThan(0);
    expect(result.memoryVramGB).toBeGreaterThan(0);
  });

  it('test_evaluateGraph_overloadedNode_detectsBottleneckAndUnstableQueue', () => {
    const worker = new DeterministicSimWorker();

    const nodes: GraphNodePayload[] = [
      { id: 'nodeA', type: 'GATEWAY', baseServiceMs: 1.0, replicaCount: 1 },
      // 1 replica serving in 100ms can only handle 10 RPS. Under 50 RPS, it's 500% overloaded!
      { id: 'nodeB', type: 'SLOW_SERVICE', baseServiceMs: 100.0, replicaCount: 1 },
    ];

    const edges: GraphEdgePayload[] = [
      { source: 'nodeA', target: 'nodeB', protocol: 'REST' },
    ];

    const result = worker.evaluateGraph(nodes, edges, 50);

    expect(result.unstableNodes).toContain('nodeB');
    expect(result.bottlenecks.length).toBeGreaterThanOrEqual(1);
    expect(result.bottlenecks[0].nodeId).toBe('nodeB');
  });

  it('test_evaluateGraph_protocols_evaluatesGrpcRestKafkaRedisEdges', () => {
    const worker = new DeterministicSimWorker();

    const nodes: GraphNodePayload[] = [
      { id: 'n1', type: 'SERVICE', baseServiceMs: 1.0 },
      { id: 'n2', type: 'SERVICE', baseServiceMs: 1.0 },
      { id: 'n3', type: 'SERVICE', baseServiceMs: 1.0 },
      { id: 'n4', type: 'SERVICE', baseServiceMs: 1.0 },
      { id: 'n5', type: 'SERVICE', baseServiceMs: 1.0 },
    ];

    const edges: GraphEdgePayload[] = [
      { source: 'n1', target: 'n2', protocol: 'GRPC' },
      { source: 'n2', target: 'n3', protocol: 'REST' },
      { source: 'n3', target: 'n4', protocol: 'KAFKA' },
      { source: 'n4', target: 'n5', protocol: 'REDIS', latencyMs: 0.2 },
    ];

    const result = worker.evaluateGraph(nodes, edges, 10);
    expect(result.p99LatencyMs).toBeGreaterThan(5.0);
  });

  it('test_evaluateGraph_graphWithCycle_terminatesSafely', () => {
    const worker = new DeterministicSimWorker();

    const nodes: GraphNodePayload[] = [
      { id: 'cA', type: 'LOOP_A', baseServiceMs: 2.0 },
      { id: 'cB', type: 'LOOP_B', baseServiceMs: 2.0 },
    ];

    const edges: GraphEdgePayload[] = [
      { source: 'cA', target: 'cB' },
      { source: 'cB', target: 'cA' },
    ];

    const result = worker.evaluateGraph(nodes, edges, 5);

    expect(result.executionDurationMs).toBeLessThan(15.0);
    expect(result.p50LatencyMs).toBeGreaterThan(0);
  });

  it('test_evaluateGraph_100NodeBenchmark_completesUnder15msSla', () => {
    const worker = new DeterministicSimWorker();
    const nodeCount = 100;
    const nodes: GraphNodePayload[] = [];
    const edges: GraphEdgePayload[] = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        id: `bench_node_${i}`,
        type: i % 10 === 0 ? 'VLLM_LLM' : 'MICROSERVICE',
        baseServiceMs: 2.0 + (i % 5),
        replicaCount: 2,
        activeParamsBillion: i % 10 === 0 ? 8 : undefined,
        promptTokens: 512,
        outputTokens: 64,
      });

      if (i > 0) {
        edges.push({
          source: `bench_node_${i - 1}`,
          target: `bench_node_${i}`,
          protocol: i % 2 === 0 ? 'GRPC' : 'REST',
        });
      }
    }

    const result = worker.evaluateGraph(nodes, edges, 20);

    expect(result.executionDurationMs).toBeLessThan(15.0);
    expect(result.p99LatencyMs).toBeGreaterThan(0);
  });

  it('test_evaluateGraph_edgeCases_handlesFallbackQpsAndUnknownProtocol', () => {
    const worker = new DeterministicSimWorker();

    const nodes: GraphNodePayload[] = [
      { id: 'lone_node', type: 'LLM_GENERIC' },
      { id: 'target_node', type: 'MICROSERVICE' },
    ];
    const edges: GraphEdgePayload[] = [
      { source: 'lone_node', target: 'target_node', protocol: 'CUSTOM_UNKNOWN' as unknown as 'GRPC' },
    ];

    const resultNegative = worker.evaluateGraph(nodes, edges, -10);
    const resultEmptyObj = worker.evaluateGraph(nodes, edges, {} as unknown as { inputQPS: number });

    expect(resultNegative.p50LatencyMs).toBeGreaterThan(0);
    expect(resultEmptyObj.p50LatencyMs).toBeGreaterThan(0);
  });
});
