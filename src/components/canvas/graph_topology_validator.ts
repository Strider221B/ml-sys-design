import { CanvasConstants } from '@/components/canvas/canvas_constants';

export interface TopologyEdge {
  source: string;
  target: string;
  sourceHandle?: string | null | undefined;
  targetHandle?: string | null | undefined;
  latencyMs?: number | undefined;
}

export interface GraphValidationResult {
  isValid: boolean;
  error?: string;
  hasCycle?: boolean;
  topologicalOrder?: string[];
}

export interface CriticalPathResult {
  path: string[];
  totalLatencyMs: number;
}

/**
 * Validates DAG topology using Kahn's algorithm, port compatibility, and critical path analysis.
 */
export class GraphTopologyValidator {
  private static readonly _CYCLE_ERROR =
    'Topological error: Directed cycle detected in architecture graph.';
  private static readonly _SELF_CONNECT_ERROR =
    'Validation error: Self-connections are prohibited.';
  private static readonly _EMPTY_GRAPH_ERROR =
    'Validation error: Graph has no nodes to validate.';
  private static readonly _DEFAULT_EDGE_LATENCY_MS = 0.5;
  private static readonly _ZERO_LATENCY = 0;

  public constructor() {}

  /**
   * Validates DAG for acyclicity and structure using Kahn's algorithm.
   */
  public validateGraph(
    nodeIds: string[],
    edges: TopologyEdge[]
  ): GraphValidationResult {
    if (nodeIds.length === 0) {
      return { isValid: true, hasCycle: false, topologicalOrder: [] };
    }
    if (this._hasSelfConnections(edges)) {
      return { isValid: false, error: GraphTopologyValidator._SELF_CONNECT_ERROR };
    }
    return this._executeKahnAlgorithm(nodeIds, edges);
  }

  /**
   * Evaluates port and node type compatibility for connection drawing.
   */
  public canConnect(sourceType: string, targetType: string): boolean {
    if (!sourceType || !targetType) {
      return false;
    }
    return this._checkCompatibilityRule(sourceType, targetType);
  }

  /**
   * Traces the critical (longest latency) path across the DAG.
   */
  public findCriticalPath(
    nodeIds: string[],
    edges: TopologyEdge[]
  ): CriticalPathResult {
    const validation = this.validateGraph(nodeIds, edges);
    if (!validation.isValid || !validation.topologicalOrder) {
      return { path: [], totalLatencyMs: GraphTopologyValidator._ZERO_LATENCY };
    }
    return this._computeLongestPath(validation.topologicalOrder, edges);
  }

  private _hasSelfConnections(edges: TopologyEdge[]): boolean {
    return edges.some((edge) => edge.source === edge.target);
  }

  private _executeKahnAlgorithm(
    nodeIds: string[],
    edges: TopologyEdge[]
  ): GraphValidationResult {
    const inDegree = this._calculateInDegrees(nodeIds, edges);
    const queue = nodeIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
    const topologicalOrder: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      topologicalOrder.push(current);
      this._decrementNeighbors(current, edges, inDegree, queue);
    }

    if (topologicalOrder.length !== nodeIds.length) {
      return {
        isValid: false,
        error: GraphTopologyValidator._CYCLE_ERROR,
        hasCycle: true,
      };
    }
    return { isValid: true, hasCycle: false, topologicalOrder };
  }

  private _calculateInDegrees(
    nodeIds: string[],
    edges: TopologyEdge[]
  ): Map<string, number> {
    const inDegree = new Map<string, number>();
    nodeIds.forEach((id) => inDegree.set(id, 0));
    for (const edge of edges) {
      if (inDegree.has(edge.target)) {
        inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
      }
    }
    return inDegree;
  }

  private _decrementNeighbors(
    nodeId: string,
    edges: TopologyEdge[],
    inDegree: Map<string, number>,
    queue: string[]
  ): void {
    const outgoing = edges.filter((e) => e.source === nodeId);
    for (const edge of outgoing) {
      const nextDegree = (inDegree.get(edge.target) ?? 1) - 1;
      inDegree.set(edge.target, nextDegree);
      if (nextDegree === 0) {
        queue.push(edge.target);
      }
    }
  }

  private _checkCompatibilityRule(
    sourceType: string,
    targetType: string
  ): boolean {
    if (
      sourceType === CanvasConstants.NODE_TYPE_AGENT_SWARM_GROUP ||
      targetType === CanvasConstants.NODE_TYPE_AGENT_SWARM_GROUP
    ) {
      return true;
    }
    if (
      sourceType === CanvasConstants.NODE_TYPE_VLLM_CLUSTER_GROUP ||
      targetType === CanvasConstants.NODE_TYPE_VLLM_CLUSTER_GROUP
    ) {
      return true;
    }
    return this._checkStandardTypeRules(sourceType, targetType);
  }

  private _checkStandardTypeRules(
    sourceType: string,
    targetType: string
  ): boolean {
    if (sourceType === CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY) {
      return targetType !== CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY;
    }
    if (sourceType === CanvasConstants.NODE_TYPE_SEMANTIC_GUARDRAIL) {
      return true;
    }
    if (sourceType === CanvasConstants.NODE_TYPE_FEATURE_STORE) {
      return targetType !== CanvasConstants.NODE_TYPE_FEATURE_STORE;
    }
    if (sourceType === CanvasConstants.NODE_TYPE_VECTOR_DATABASE) {
      return targetType !== CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY;
    }
    return true;
  }

  private _computeLongestPath(
    topoOrder: string[],
    edges: TopologyEdge[]
  ): CriticalPathResult {
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    topoOrder.forEach((id) => {
      dist.set(id, GraphTopologyValidator._ZERO_LATENCY);
      prev.set(id, null);
    });

    for (const u of topoOrder) {
      const currentDist = dist.get(u) ?? GraphTopologyValidator._ZERO_LATENCY;
      this._relaxOutgoingEdges(u, currentDist, edges, dist, prev);
    }

    return this._findMaxDistPath(topoOrder, dist, prev);
  }

  private _relaxOutgoingEdges(
    sourceNode: string,
    currentDist: number,
    edges: TopologyEdge[],
    dist: Map<string, number>,
    prev: Map<string, string | null>
  ): void {
    const outgoing = edges.filter((e) => e.source === sourceNode);
    for (const edge of outgoing) {
      const weight = edge.latencyMs ?? GraphTopologyValidator._DEFAULT_EDGE_LATENCY_MS;
      const newDist = currentDist + weight;
      if (newDist > (dist.get(edge.target) ?? GraphTopologyValidator._ZERO_LATENCY)) {
        dist.set(edge.target, newDist);
        prev.set(edge.target, sourceNode);
      }
    }
  }

  private _findMaxDistPath(
    topoOrder: string[],
    dist: Map<string, number>,
    prev: Map<string, string | null>
  ): CriticalPathResult {
    let maxNode = topoOrder[0] ?? '';
    let maxDist = dist.get(maxNode) ?? GraphTopologyValidator._ZERO_LATENCY;

    for (const id of topoOrder) {
      const d = dist.get(id) ?? GraphTopologyValidator._ZERO_LATENCY;
      if (d > maxDist) {
        maxDist = d;
        maxNode = id;
      }
    }

    const path = this._reconstructPath(maxNode, prev);
    return { path, totalLatencyMs: maxDist };
  }

  private _reconstructPath(
    endNode: string,
    prev: Map<string, string | null>
  ): string[] {
    const path: string[] = [];
    let curr: string | null = endNode;
    while (curr) {
      path.unshift(curr);
      curr = prev.get(curr) ?? null;
    }
    return path;
  }
}
