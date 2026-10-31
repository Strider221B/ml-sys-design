import * as Comlink from 'comlink';
import { FinOpsCalculator } from '@/core/math/finops_calculator';
import { HardwareSpecsDatabase } from '@/core/math/hardware_specs_database';
import { LlmServingLatencyCalculator } from '@/core/math/llm_serving_latency_calculator';
import { MathConstants } from '@/core/math/math_constants';
import { QueuingTheoryModel } from '@/core/math/queuing_theory_model';
import { RooflineModelProfiler } from '@/core/math/roofline_model_profiler';

export interface GraphNodePayload {
  id: string;
  type: string;
  hardwareSku?: string | undefined;
  replicaCount?: number | undefined;
  batchSize?: number | undefined;
  quantizationBits?: number | undefined;
  speculativeDecoding?: boolean | undefined;
  promptCacheEnabled?: boolean | undefined;
  activeParamsBillion?: number | undefined;
  promptTokens?: number | undefined;
  outputTokens?: number | undefined;
  baseServiceMs?: number | undefined;
}

export interface GraphEdgePayload {
  source: string;
  target: string;
  protocol?: 'GRPC' | 'REST' | 'KAFKA' | 'REDIS' | undefined;
  payloadBytes?: number | undefined;
  latencyMs?: number | undefined;
}

export interface GlobalSimParams {
  inputQPS: number;
}

export interface BottleneckInfo {
  nodeId: string;
  reason: string;
}

export interface SimulationResult {
  p50LatencyMs: number;
  p99LatencyMs: number;
  ttftMs: number;
  tpotMs: number;
  monthlyCostUSD: number;
  memoryVramGB: number;
  unstableNodes: string[];
  bottlenecks: BottleneckInfo[];
  executionDurationMs: number;
}

interface GraphData {
  nodesMap: Map<string, GraphNodePayload>;
  outgoingEdges: Map<string, GraphEdgePayload[]>;
  incomingEdges: Map<string, GraphEdgePayload[]>;
  inDegrees: Map<string, number>;
}

interface SimAccumulator {
  maxTtftMs: number;
  maxTpotMs: number;
  totalVramGb: number;
  monthlyCostUSD: number;
  unstableNodes: string[];
  bottlenecks: BottleneckInfo[];
  nodeLatencies: Map<string, number>;
  nodeWaitTimes: Map<string, number>;
}

/**
 * High-performance deterministic simulation Web Worker.
 * Executes analytical M/G/c queuing models, LLM serving latencies, Roofline profiling,
 * and FinOps monthly spend in under 15ms.
 */
export class DeterministicSimWorker {
  private static readonly _DEFAULT_BASE_SERVICE_MS = 5.0;
  private static readonly _DEFAULT_REPLICAS = 1;
  private static readonly _MIN_EXECUTION_TIME_MS = 0.01;

  public constructor(
    db?: HardwareSpecsDatabase,
    queuing?: QueuingTheoryModel,
    llm?: LlmServingLatencyCalculator,
    roofline?: RooflineModelProfiler,
    finops?: FinOpsCalculator
  ) {
    const specsDb = db ?? new HardwareSpecsDatabase();
    this._db = specsDb;
    this._queuing = queuing ?? new QueuingTheoryModel();
    this._llm = llm ?? new LlmServingLatencyCalculator(specsDb);
    this._roofline = roofline ?? new RooflineModelProfiler(specsDb);
    this._finops = finops ?? new FinOpsCalculator(specsDb);
  }

  /**
   * Evaluates entire architecture DAG and produces comprehensive system performance metrics.
   */
  public evaluateGraph(
    nodes: GraphNodePayload[],
    edges: GraphEdgePayload[],
    globalParams: number | GlobalSimParams
  ): SimulationResult {
    const startTime = performance.now();
    const inputQps = this._parseQps(globalParams);
    const graph = this._buildGraph(nodes, edges);
    const sortedIds = this._topologicalSort(graph);
    const traffic = this._computeTraffic(sortedIds, graph, inputQps);
    const accumulator = this._createAccumulator();

    for (const nodeId of sortedIds) {
      const node = graph.nodesMap.get(nodeId);
      if (node) {
        const arrivalRps = traffic.get(nodeId) ?? inputQps;
        this._evaluateNode(node, arrivalRps, accumulator);
      }
    }

    const pathMetrics = this._calculateCriticalPath(sortedIds, graph, accumulator);
    const duration = Math.max(
      DeterministicSimWorker._MIN_EXECUTION_TIME_MS,
      performance.now() - startTime
    );

    return this._formatResult(pathMetrics, accumulator, duration);
  }

  private readonly _db: HardwareSpecsDatabase;
  private readonly _queuing: QueuingTheoryModel;
  private readonly _llm: LlmServingLatencyCalculator;
  private readonly _roofline: RooflineModelProfiler;
  private readonly _finops: FinOpsCalculator;

  private _parseQps(param: number | GlobalSimParams): number {
    if (typeof param === 'number') {
      return Math.max(0, param);
    }
    return Math.max(0, param?.inputQPS ?? 0);
  }

  private _createAccumulator(): SimAccumulator {
    return {
      maxTtftMs: 0,
      maxTpotMs: 0,
      totalVramGb: 0,
      monthlyCostUSD: 0,
      unstableNodes: [],
      bottlenecks: [],
      nodeLatencies: new Map<string, number>(),
      nodeWaitTimes: new Map<string, number>(),
    };
  }

  private _buildGraph(nodes: GraphNodePayload[], edges: GraphEdgePayload[]): GraphData {
    const nodesMap = new Map<string, GraphNodePayload>();
    const outgoingEdges = new Map<string, GraphEdgePayload[]>();
    const incomingEdges = new Map<string, GraphEdgePayload[]>();
    const inDegrees = new Map<string, number>();

    for (const node of nodes) {
      nodesMap.set(node.id, node);
      outgoingEdges.set(node.id, []);
      incomingEdges.set(node.id, []);
      inDegrees.set(node.id, 0);
    }
    for (const edge of edges) {
      if (nodesMap.has(edge.source) && nodesMap.has(edge.target)) {
        outgoingEdges.get(edge.source)!.push(edge);
        incomingEdges.get(edge.target)!.push(edge);
        inDegrees.set(edge.target, (inDegrees.get(edge.target) ?? 0) + 1);
      }
    }
    return { nodesMap, outgoingEdges, incomingEdges, inDegrees };
  }

  private _topologicalSort(graph: GraphData): string[] {
    const sorted: string[] = [];
    const inDeg = new Map(graph.inDegrees);
    const queue: string[] = [];

    for (const [id, deg] of inDeg.entries()) {
      if (deg === 0) queue.push(id);
    }
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      for (const edge of graph.outgoingEdges.get(current) ?? []) {
        const nextDeg = (inDeg.get(edge.target) ?? 0) - 1;
        inDeg.set(edge.target, nextDeg);
        if (nextDeg === 0) queue.push(edge.target);
      }
    }
    for (const id of graph.nodesMap.keys()) {
      if (!sorted.includes(id)) sorted.push(id);
    }
    return sorted;
  }

  private _computeTraffic(
    sortedIds: string[],
    graph: GraphData,
    inputQps: number
  ): Map<string, number> {
    const traffic = new Map<string, number>();
    for (const id of sortedIds) {
      const inEdges = graph.incomingEdges.get(id) ?? [];
      if (inEdges.length === 0) {
        traffic.set(id, inputQps);
      } else {
        let sum = 0;
        for (const inEdge of inEdges) {
          const parentTraffic = traffic.get(inEdge.source) ?? inputQps;
          const parentOutDegree = graph.outgoingEdges.get(inEdge.source)?.length ?? 1;
          sum += parentTraffic / Math.max(1, parentOutDegree);
        }
        traffic.set(id, sum);
      }
    }
    return traffic;
  }

  private _evaluateNode(
    node: GraphNodePayload,
    arrivalRps: number,
    accumulator: SimAccumulator
  ): void {
    const isLlm = this._isLlmNode(node);
    let serviceMs = node.baseServiceMs ?? DeterministicSimWorker._DEFAULT_BASE_SERVICE_MS;

    if (isLlm) {
      serviceMs = this._evaluateLlmDetails(node, accumulator);
    }
    this._evaluateQueuingAndFinops(node, arrivalRps, serviceMs, accumulator);
  }

  private _isLlmNode(node: GraphNodePayload): boolean {
    const upperType = node.type.toUpperCase();
    return (
      upperType.includes('LLM') ||
      upperType.includes('VLLM') ||
      upperType.includes('GENERATIVE') ||
      node.activeParamsBillion !== undefined
    );
  }

  private _evaluateLlmDetails(node: GraphNodePayload, accumulator: SimAccumulator): number {
    const chipId = node.hardwareSku ?? MathConstants.CHIP_NVIDIA_H100_SXM5;
    const metrics = this._llm.calculateLlmLatency({
      activeParamsBillion: node.activeParamsBillion ?? 70,
      promptTokens: node.promptTokens ?? 2048,
      outputTokens: node.outputTokens ?? 256,
      chipId,
      batchSize: node.batchSize ?? 1,
      quantizationBits: node.quantizationBits ?? MathConstants.DEFAULT_QUANTIZATION_BITS,
      speculativeDecoding: node.speculativeDecoding,
      promptCacheHitRatio: node.promptCacheEnabled ? 0.5 : 0.0,
    });
    accumulator.maxTtftMs = Math.max(accumulator.maxTtftMs, metrics.ttftMs);
    accumulator.maxTpotMs = Math.max(accumulator.maxTpotMs, metrics.tpotMs);
    accumulator.totalVramGb += metrics.totalVramGb;
    return metrics.totalLatencyMs;
  }

  private _evaluateQueuingAndFinops(
    node: GraphNodePayload,
    arrivalRps: number,
    serviceMs: number,
    accumulator: SimAccumulator
  ): void {
    const replicas = node.replicaCount ?? DeterministicSimWorker._DEFAULT_REPLICAS;
    const qResult = this._queuing.calculateLatency({
      arrivalRateRps: arrivalRps,
      serviceTimeMs: serviceMs,
      replicaCount: replicas,
    });
    accumulator.nodeLatencies.set(node.id, qResult.totalLatencyMs);
    accumulator.nodeWaitTimes.set(node.id, qResult.waitingTimeMs);

    if (qResult.isUnstable) {
      accumulator.unstableNodes.push(node.id);
      accumulator.bottlenecks.push({
        nodeId: node.id,
        reason: `Queue utilization >= 95% (${Math.round(qResult.utilization * 100)}%)`,
      });
    }
    const chipId = node.hardwareSku ?? MathConstants.CHIP_NVIDIA_H100_SXM5;
    const finops = this._finops.calculateMonthlyCost(arrivalRps, chipId, replicas);
    accumulator.monthlyCostUSD += finops.monthlyCostUSD;
  }

  private _calculateCriticalPath(
    sortedIds: string[],
    graph: GraphData,
    accumulator: SimAccumulator
  ): { p50LatencyMs: number; p99LatencyMs: number } {
    const pathLatencies = new Map<string, number>();
    let maxPathLatency = 0;

    for (const id of sortedIds) {
      const nodeLat = accumulator.nodeLatencies.get(id) ?? 0;
      let maxParentLatency = 0;
      for (const inEdge of graph.incomingEdges.get(id) ?? []) {
        const edgeLat = this._resolveEdgeLatency(inEdge.protocol, inEdge.latencyMs);
        const parentTotal = (pathLatencies.get(inEdge.source) ?? 0) + edgeLat;
        maxParentLatency = Math.max(maxParentLatency, parentTotal);
      }
      const totalNodePath = maxParentLatency + nodeLat;
      pathLatencies.set(id, totalNodePath);
      maxPathLatency = Math.max(maxPathLatency, totalNodePath);
    }
    return {
      p50LatencyMs: Math.round(maxPathLatency * 0.7 * 100) / 100,
      p99LatencyMs: Math.round(maxPathLatency * 1.5 * 100) / 100,
    };
  }

  private _resolveEdgeLatency(protocol?: string, customMs?: number): number {
    if (customMs !== undefined && customMs >= 0) return customMs;
    switch (protocol) {
      case MathConstants.PROTOCOL_GRPC:
        return MathConstants.PROTOCOL_LATENCY_GRPC_MS;
      case MathConstants.PROTOCOL_REST:
        return MathConstants.PROTOCOL_LATENCY_REST_MS;
      case MathConstants.PROTOCOL_KAFKA:
        return MathConstants.PROTOCOL_LATENCY_KAFKA_MS;
      case MathConstants.PROTOCOL_REDIS:
        return MathConstants.PROTOCOL_LATENCY_REDIS_MS;
      default:
        return MathConstants.DEFAULT_EDGE_LATENCY_MS;
    }
  }

  private _formatResult(
    pathMetrics: { p50LatencyMs: number; p99LatencyMs: number },
    accumulator: SimAccumulator,
    durationMs: number
  ): SimulationResult {
    return {
      p50LatencyMs: pathMetrics.p50LatencyMs,
      p99LatencyMs: pathMetrics.p99LatencyMs,
      ttftMs: Math.round(accumulator.maxTtftMs * 100) / 100,
      tpotMs: Math.round(accumulator.maxTpotMs * 100) / 100,
      monthlyCostUSD: Math.round(accumulator.monthlyCostUSD * 100) / 100,
      memoryVramGB: Math.round(accumulator.totalVramGb * 100) / 100,
      unstableNodes: accumulator.unstableNodes,
      bottlenecks: accumulator.bottlenecks,
      executionDurationMs: Math.round(durationMs * 100) / 100,
    };
  }
}

// In Web Worker thread, expose to Comlink RPC
if (
  typeof self !== 'undefined' &&
  typeof (self as unknown as Worker).postMessage === 'function' &&
  typeof window === 'undefined'
) {
  Comlink.expose(new DeterministicSimWorker());
}
