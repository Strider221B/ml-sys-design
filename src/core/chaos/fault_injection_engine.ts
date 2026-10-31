import { ChaosConstants } from '@/core/chaos/chaos_constants';
import { WorkspaceEdge, WorkspaceNode } from '@/core/state/workspace_types';

export interface FaultDescriptor {
  faultType: string;
  targetId: string;
  targetType: 'NODE' | 'EDGE';
  intensity?: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CanvasGraph {
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
}

export interface PerturbedGraph {
  originalGraph: CanvasGraph;
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
  activeFaults: FaultDescriptor[];
  blastRadiusScore: number;
  logs: string[];
}

/**
 * Injects adversarial network partitions, token overflows, and race conditions into canvas graphs.
 */
export class FaultInjectionEngine {
  private static readonly _DEFAULT_LATENCY_SPIKE_MS = 500;
  private static readonly _DEFAULT_TOKEN_OVERFLOW_COUNT = 131072;
  private static readonly _MAX_BLAST_RADIUS_SCORE = 100;
  private static readonly _MIN_BLAST_RADIUS_SCORE = 0;
  private static readonly _DEFAULT_BASE_SCORE_PER_FAULT = 25;
  private static readonly _LOG_EDGE_PARTITION = 'Injected network partition on edge ';
  private static readonly _LOG_NODE_OVERFLOW = 'Injected token context overflow on node ';
  private static readonly _LOG_RACE_CONDITION = 'Injected race condition jitter on target ';
  private static readonly _LOG_CLOCK_SKEW = 'Injected clock desync skew on node ';
  private static readonly _ERR_TARGET_NOT_FOUND = 'Target element not found: ';

  public constructor() {}

  /**
   * Applies a designated fault descriptor onto the graph topology.
   */
  public injectFault(graph: CanvasGraph, fault: FaultDescriptor): PerturbedGraph {
    const logs: string[] = [];
    const perturbedNodes = this._cloneNodes(graph.nodes);
    const perturbedEdges = this._cloneEdges(graph.edges);

    if (fault.targetType === 'EDGE') {
      this._applyEdgePerturbation(perturbedEdges, fault, logs);
    } else {
      this._applyNodePerturbation(perturbedNodes, fault, logs);
    }

    const blastRadius = this.calculateBlastRadius(
      { nodes: perturbedNodes, edges: perturbedEdges },
      [fault]
    );

    return {
      originalGraph: graph,
      nodes: perturbedNodes,
      edges: perturbedEdges,
      activeFaults: [fault],
      blastRadiusScore: blastRadius,
      logs,
    };
  }

  /**
   * Injects network latency spikes and packet loss directly into edge cables.
   */
  public injectEdgeFault(
    edges: WorkspaceEdge[],
    edgeId: string,
    latencyMs?: number,
    isDropped?: boolean
  ): WorkspaceEdge[] {
    const spike = latencyMs ?? FaultInjectionEngine._DEFAULT_LATENCY_SPIKE_MS;
    return edges.map((edge) => {
      if (edge.id !== edgeId) return edge;
      const currentLatency = edge.data?.p99LatencyMs ?? 1;
      const currentQps = edge.data?.qps ?? 100;
      return {
        ...edge,
        data: {
          ...edge.data,
          p99LatencyMs: currentLatency + spike,
          qps: isDropped ? 0 : currentQps,
        },
      };
    });
  }

  /**
   * Injects token overflows, memory spikes, or clock skew into a single node.
   */
  public injectNodeFault(
    nodes: WorkspaceNode[],
    nodeId: string,
    faultType: string,
    intensity?: number
  ): WorkspaceNode[] {
    return nodes.map((node) => {
      if (node.id !== nodeId) return node;
      return this._mutateNodeMetrics(node, faultType, intensity);
    });
  }

  /**
   * Computes normalized blast radius score based on topology and active perturbations.
   */
  public calculateBlastRadius(graph: CanvasGraph, activeFaults: FaultDescriptor[]): number {
    if (activeFaults.length === 0 || graph.nodes.length === 0) {
      return FaultInjectionEngine._MIN_BLAST_RADIUS_SCORE;
    }
    const rawScore = activeFaults.length * FaultInjectionEngine._DEFAULT_BASE_SCORE_PER_FAULT;
    const ratio = Math.min(1.0, activeFaults.length / Math.max(1, graph.nodes.length));
    const combined = Math.round(rawScore * 0.5 + ratio * 50);
    return Math.min(FaultInjectionEngine._MAX_BLAST_RADIUS_SCORE, combined);
  }

  /**
   * Resets all perturbations, restoring edges and nodes to pristine states.
   */
  public clearFaults(graph: CanvasGraph): CanvasGraph {
    const cleanNodes = graph.nodes.map((node) => this._cleanNode(node));
    const cleanEdges = graph.edges.map((edge) => this._cleanEdge(edge));
    return { nodes: cleanNodes, edges: cleanEdges };
  }

  private _cleanNode(node: WorkspaceNode): WorkspaceNode {
    const copy: WorkspaceNode = {
      id: node.id,
      type: node.type,
      position: { ...node.position },
      data: { ...node.data },
    };
    if (node.data.metrics) {
      copy.data.metrics = {
        ...node.data.metrics,
        p99LatencyMs: Math.min(node.data.metrics.p99LatencyMs, 50),
      };
    }
    return copy;
  }

  private _cleanEdge(edge: WorkspaceEdge): WorkspaceEdge {
    const copy: WorkspaceEdge = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      protocol: edge.protocol,
    };
    if (edge.data) {
      copy.data = {
        ...edge.data,
        p99LatencyMs: Math.min(edge.data.p99LatencyMs ?? 1, 5),
      };
    }
    return copy;
  }

  private _cloneNodes(nodes: WorkspaceNode[]): WorkspaceNode[] {
    return nodes.map((n) => {
      const copy: WorkspaceNode = {
        id: n.id,
        type: n.type,
        position: { ...n.position },
        data: { ...n.data },
      };
      if (n.data.metrics) {
        copy.data.metrics = { ...n.data.metrics };
      }
      return copy;
    });
  }

  private _cloneEdges(edges: WorkspaceEdge[]): WorkspaceEdge[] {
    return edges.map((e) => {
      const copy: WorkspaceEdge = {
        id: e.id,
        source: e.source,
        target: e.target,
        protocol: e.protocol,
      };
      if (e.data) {
        copy.data = { ...e.data };
      }
      return copy;
    });
  }

  private _applyEdgePerturbation(
    edges: WorkspaceEdge[],
    fault: FaultDescriptor,
    logs: string[]
  ): void {
    const target = edges.find((e) => e.id === fault.targetId);
    if (!target) {
      logs.push(`${FaultInjectionEngine._ERR_TARGET_NOT_FOUND}${fault.targetId}`);
      return;
    }
    const isDrop = fault.faultType === ChaosConstants.FAULT_NETWORK_PARTITION;
    const updated = this.injectEdgeFault(edges, fault.targetId, fault.intensity, isDrop);
    edges.splice(0, edges.length, ...updated);
    logs.push(`${FaultInjectionEngine._LOG_EDGE_PARTITION}${fault.targetId}`);
  }

  private _applyNodePerturbation(
    nodes: WorkspaceNode[],
    fault: FaultDescriptor,
    logs: string[]
  ): void {
    const target = nodes.find((n) => n.id === fault.targetId);
    if (!target) {
      logs.push(`${FaultInjectionEngine._ERR_TARGET_NOT_FOUND}${fault.targetId}`);
      return;
    }
    const updated = this.injectNodeFault(nodes, fault.targetId, fault.faultType, fault.intensity);
    nodes.splice(0, nodes.length, ...updated);
    this._appendNodeLog(fault, logs);
  }

  private _appendNodeLog(fault: FaultDescriptor, logs: string[]): void {
    if (fault.faultType === ChaosConstants.FAULT_TOKEN_OVERFLOW) {
      logs.push(`${FaultInjectionEngine._LOG_NODE_OVERFLOW}${fault.targetId}`);
    } else if (fault.faultType === ChaosConstants.FAULT_CLOCK_SKEW) {
      logs.push(`${FaultInjectionEngine._LOG_CLOCK_SKEW}${fault.targetId}`);
    } else {
      logs.push(`${FaultInjectionEngine._LOG_RACE_CONDITION}${fault.targetId}`);
    }
  }

  private _mutateNodeMetrics(
    node: WorkspaceNode,
    faultType: string,
    intensity?: number
  ): WorkspaceNode {
    const current = node.data.metrics ?? this._getDefaultMetrics();
    const factor = intensity ?? 2.0;
    const isOverflow = faultType === ChaosConstants.FAULT_TOKEN_OVERFLOW;
    const metrics = isOverflow
      ? this._createOverflowMetrics(current, factor)
      : this._createGenericFaultMetrics(current, factor);

    return {
      ...node,
      data: { ...node.data, metrics },
    };
  }

  private _getDefaultMetrics() {
    return {
      qps: 1000,
      p50LatencyMs: 10,
      p99LatencyMs: 35,
      gpuMemoryMb: 4000,
      costPerHourUsd: 1.5,
    };
  }

  private _createOverflowMetrics(current: ReturnType<typeof this._getDefaultMetrics>, factor: number) {
    return {
      ...current,
      p99LatencyMs: current.p99LatencyMs * factor,
      gpuMemoryMb: current.gpuMemoryMb * factor,
    };
  }

  private _createGenericFaultMetrics(current: ReturnType<typeof this._getDefaultMetrics>, factor: number) {
    return {
      ...current,
      p99LatencyMs: current.p99LatencyMs + 50 * factor,
    };
  }
}
