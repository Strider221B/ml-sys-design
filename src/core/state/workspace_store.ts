import { createStore, StoreApi } from 'zustand/vanilla';
import {
  SyncState,
  TelemetryMetricPoint,
  WorkspaceDocument,
  WorkspaceEdge,
  WorkspaceNode,
} from '@/core/state/workspace_types';

export interface FinOpsState {
  monthlyBudgetUsd: number;
  targetQps: number;
  hardwareAllocation: string;
}

export interface WorkspaceStoreState {
  currentWorkspace: WorkspaceDocument;
  syncState: SyncState;
  lastSyncedIso: string | null;
  activeFileId: string | null;
  activeEtag: string | null;
  dirtyCount: number;
  activeCurriculumIndex: number;
  interviewStep: number;
  rubricScores: Record<string, number>;
  finOpsConfig: FinOpsState;
  telemetryRingBuffer: TelemetryMetricPoint[];
}

/**
 * Volatile RAM-only Zustand 5.0 store coordinator with zero disk persistence.
 */
export class WorkspaceStore {
  private static readonly _INITIAL_STEP = 1;
  private static readonly _MAX_TELEMETRY_POINTS = 60;
  private static readonly _DEFAULT_BUDGET_USD = 5000;
  private static readonly _DEFAULT_TARGET_QPS = 10000;
  private static readonly _DEFAULT_HARDWARE = 'NVIDIA_H100';
  private static readonly _DEFAULT_WORKSPACE_ID = 'ws_guest_default';
  private static readonly _DEFAULT_TITLE = 'Guest ML System Workspace';
  private static readonly _DEFAULT_MODULE_ID = 'SANDBOX_BUILDER';
  private static readonly _INITIAL_CURRICULUM_INDEX = 0;

  public constructor(initialDoc?: WorkspaceDocument) {
    this._store = this._createVanillaStore(initialDoc);
  }

  /**
   * Returns the underlying Zustand store API for React subscriptions.
   */
  public getStore(): StoreApi<WorkspaceStoreState> {
    return this._store;
  }

  /**
   * Returns current snapshot of volatile state.
   */
  public getState(): WorkspaceStoreState {
    return this._store.getState();
  }

  /**
   * Updates canvas nodes and edges in memory and increments dirty state.
   */
  public updateCanvas(nodes: WorkspaceNode[], edges: WorkspaceEdge[]): void {
    this._store.setState((prev) => ({
      currentWorkspace: {
        ...prev.currentWorkspace,
        nodes,
        edges,
        lastModifiedIso: new Date().toISOString(),
      },
      syncState: 'DIRTY',
      dirtyCount: prev.dirtyCount + 1,
    }));
  }

  /**
   * Marks workspace as dirty with pending cloud synchronization.
   */
  public markDirty(): void {
    this._store.setState((prev) => ({
      syncState: 'DIRTY',
      dirtyCount: prev.dirtyCount + 1,
    }));
  }

  /**
   * Commits successful cloud synchronization into volatile RAM.
   */
  public markClean(etag: string, timestampIso: string): void {
    this._store.setState((prev) => ({
      currentWorkspace: {
        ...prev.currentWorkspace,
        etag,
        lastModifiedIso: timestampIso,
      },
      syncState: 'CLEAN',
      activeEtag: etag,
      lastSyncedIso: timestampIso,
      dirtyCount: 0,
    }));
  }

  /**
   * Updates synchronization state lifecycle flag.
   */
  public setSyncState(syncState: SyncState): void {
    this._store.setState({ syncState });
  }

  /**
   * Sets active Google Drive file metadata bindings.
   */
  public setActiveFile(fileId: string, etag: string | null): void {
    this._store.setState((prev) => ({
      activeFileId: fileId,
      activeEtag: etag,
      currentWorkspace: {
        ...prev.currentWorkspace,
        etag,
      },
    }));
  }

  /**
   * Advances or rewinds the interview simulation step machine (1 to 6).
   */
  public setInterviewStep(step: number): void {
    this._store.setState({ interviewStep: step });
  }

  /**
   * Sets or updates rubric score for specific evaluation dimension.
   */
  public setRubricScore(criterion: string, score: number): void {
    this._store.setState((prev) => ({
      rubricScores: {
        ...prev.rubricScores,
        [criterion]: score,
      },
    }));
  }

  /**
   * Updates financial operations and hardware sizing allocations.
   */
  public updateFinOps(config: Partial<FinOpsState>): void {
    this._store.setState((prev) => ({
      finOpsConfig: {
        ...prev.finOpsConfig,
        ...config,
      },
    }));
  }

  /**
   * Appends telemetry sample to the fixed-size ring buffer for 60fps streaming.
   */
  public pushTelemetry(metric: TelemetryMetricPoint): void {
    this._store.setState((prev) => {
      const ringBuffer = [...prev.telemetryRingBuffer, metric];
      if (ringBuffer.length > WorkspaceStore._MAX_TELEMETRY_POINTS) {
        ringBuffer.shift();
      }
      return { telemetryRingBuffer: ringBuffer };
    });
  }

  /**
   * Subscribes directly to telemetry buffer bypassing React component render loop.
   */
  public subscribeTelemetry(
    callback: (buffer: TelemetryMetricPoint[]) => void
  ): () => void {
    return this._store.subscribe((state) => {
      callback(state.telemetryRingBuffer);
    });
  }

  /**
   * Discards all RAM edits and resets state to guest default.
   */
  public resetToGuest(): void {
    const doc = this._createDefaultDocument();
    this._store.setState(this._createInitialState(doc));
  }

  private readonly _store: StoreApi<WorkspaceStoreState>;

  private _createVanillaStore(
    initialDoc?: WorkspaceDocument
  ): StoreApi<WorkspaceStoreState> {
    const doc = initialDoc ?? this._createDefaultDocument();
    const initialState = this._createInitialState(doc);
    return createStore<WorkspaceStoreState>(() => initialState);
  }

  private _createInitialState(doc: WorkspaceDocument): WorkspaceStoreState {
    return {
      currentWorkspace: doc,
      syncState: 'CLEAN',
      lastSyncedIso: null,
      activeFileId: null,
      activeEtag: null,
      dirtyCount: 0,
      activeCurriculumIndex: WorkspaceStore._INITIAL_CURRICULUM_INDEX,
      interviewStep: WorkspaceStore._INITIAL_STEP,
      rubricScores: {},
      finOpsConfig: {
        monthlyBudgetUsd: WorkspaceStore._DEFAULT_BUDGET_USD,
        targetQps: WorkspaceStore._DEFAULT_TARGET_QPS,
        hardwareAllocation: WorkspaceStore._DEFAULT_HARDWARE,
      },
      telemetryRingBuffer: [],
    };
  }

  private _createDefaultDocument(): WorkspaceDocument {
    return {
      workspaceId: WorkspaceStore._DEFAULT_WORKSPACE_ID,
      title: WorkspaceStore._DEFAULT_TITLE,
      lastModifiedIso: new Date().toISOString(),
      etag: null,
      activeModuleId: WorkspaceStore._DEFAULT_MODULE_ID,
      activeScenarioId: null,
      nodes: [],
      edges: [],
    };
  }
}
