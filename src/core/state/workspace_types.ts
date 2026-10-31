export type SyncState =
  | 'CLEAN'
  | 'DIRTY'
  | 'SYNCING'
  | 'CONFLICT'
  | 'UNAUTHENTICATED';

export type NodeType =
  | 'INGRESS_GATEWAY'
  | 'FEATURE_STORE'
  | 'EMBEDDING_MODEL'
  | 'VECTOR_DATABASE'
  | 'VLLM_INFERENCE_ENGINE'
  | 'RANKING_MODEL'
  | 'AGENT_ORCHESTRATOR'
  | 'CACHING_LAYER'
  | 'SAFETY_GUARDRAIL';

export interface Position2D {
  x: number;
  y: number;
}

export interface NodeMetrics {
  qps: number;
  p50LatencyMs: number;
  p99LatencyMs: number;
  gpuMemoryMb: number;
  costPerHourUsd: number;
}

export interface WorkspaceNode {
  id: string;
  type: NodeType;
  position: Position2D;
  data: {
    label: string;
    hardwareProfile?: string;
    concurrencyLimit?: number;
    batchSize?: number;
    trafficSharePct?: number;
    metrics?: NodeMetrics;
    customConfig?: Record<string, unknown>;
  };
}

export interface WorkspaceEdge {
  id: string;
  source: string;
  target: string;
  protocol: 'GRPC' | 'REST' | 'KAFKA' | 'REDIS_PUBSUB';
  data?: {
    qps?: number;
    p99LatencyMs?: number;
  };
}

export interface TelemetryMetricPoint {
  timestamp: number;
  aggregateQPS: number;
  aggregateP99Ms: number;
  totalCostMonthlyUsd: number;
  gpuMemoryUtilizationPct: number;
}

export interface WorkspaceDocument {
  workspaceId: string;
  title: string;
  lastModifiedIso: string;
  etag: string | null;
  activeModuleId: string;
  activeScenarioId: string | null;
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
}

export interface WorkspaceState {
  currentWorkspace: WorkspaceDocument;
  syncState: SyncState;
  lastSyncedIso: string | null;
  activeCurriculumIndex: number;
  telemetryRingBuffer: TelemetryMetricPoint[];
}

/**
 * Encapsulates core state definitions and factory helpers for RAM-only workspace structures.
 */
export class WorkspaceTypes {
  private static readonly _DEFAULT_TITLE = 'Untitled ML Architecture';
  private static readonly _DEFAULT_MODULE_ID = 'SANDBOX_BUILDER';
  private static readonly _INITIAL_SYNC_STATE: SyncState = 'CLEAN';
  private static readonly _INITIAL_CURRICULUM_INDEX = 0;
  private static readonly _EMPTY_STRING = '';

  public constructor() {}

  /**
   * Returns default sync state constant.
   */
  public get defaultSyncState(): SyncState {
    return WorkspaceTypes._INITIAL_SYNC_STATE;
  }

  /**
   * Generates a pristine workspace document.
   */
  public createEmptyWorkspace(workspaceId: string, title?: string): WorkspaceDocument {
    return {
      workspaceId,
      title: title ?? WorkspaceTypes._DEFAULT_TITLE,
      lastModifiedIso: new Date().toISOString(),
      etag: null,
      activeModuleId: WorkspaceTypes._DEFAULT_MODULE_ID,
      activeScenarioId: null,
      nodes: [],
      edges: [],
    };
  }

  /**
   * Generates initial in-memory application state.
   */
  public createInitialState(workspaceId: string): WorkspaceState {
    const currentWorkspace = this.createEmptyWorkspace(workspaceId);
    return {
      currentWorkspace,
      syncState: WorkspaceTypes._INITIAL_SYNC_STATE,
      lastSyncedIso: null,
      activeCurriculumIndex: WorkspaceTypes._INITIAL_CURRICULUM_INDEX,
      telemetryRingBuffer: [],
    };
  }

  /**
   * Validates document basic structural integrity.
   */
  public isValidDocument(doc: unknown): doc is WorkspaceDocument {
    if (typeof doc !== 'object' || doc === null) {
      return false;
    }
    const candidate = doc as Partial<WorkspaceDocument>;
    return (
      typeof candidate.workspaceId === 'string' &&
      candidate.workspaceId.length > 0 &&
      typeof candidate.title === 'string' &&
      typeof candidate.activeModuleId === 'string' &&
      Array.isArray(candidate.nodes) &&
      Array.isArray(candidate.edges)
    );
  }
}

