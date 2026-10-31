import type * as Comlink from 'comlink';
import {
  DeterministicSimWorker,
  type GlobalSimParams,
  type GraphEdgePayload,
  type GraphNodePayload,
  type SimulationResult,
} from '@/workers/deterministic_sim_worker';
import { SimWorkerClient } from '@/workers/sim_worker_client';

/**
 * Controller proxy managing Web Worker lifecycle, RPC evaluations, and fallback execution.
 */
export class SimWorkerController {
  private static readonly _DEFAULT_RETRY_COUNT = 1;

  public constructor(
    workerProxy?: Comlink.Remote<DeterministicSimWorker> | DeterministicSimWorker
  ) {
    if (workerProxy) {
      this._worker = workerProxy;
      this._isFallback = false;
    } else if (SimWorkerClient.isWorkerSupported()) {
      this._worker = SimWorkerClient.getWorker();
      this._isFallback = false;
    } else {
      this._worker = new DeterministicSimWorker();
      this._isFallback = true;
    }
  }

  /**
   * Dispatches DAG simulation evaluation to Web Worker with automatic fallback recovery.
   */
  public async evaluateGraph(
    nodes: GraphNodePayload[],
    edges: GraphEdgePayload[],
    globalParams: number | GlobalSimParams
  ): Promise<SimulationResult> {
    try {
      return await this._worker.evaluateGraph(nodes, edges, globalParams);
    } catch (err) {
      return this._handleEvaluationFailure(nodes, edges, globalParams, err);
    }
  }

  /**
   * Indicates whether worker is ready or currently active in fallback mode.
   */
  public isReady(): boolean {
    return this._worker !== null && this._worker !== undefined;
  }

  /**
   * Indicates whether execution is running in main-thread fallback mode.
   */
  public isFallbackMode(): boolean {
    return this._isFallback;
  }

  /**
   * Terminates active worker instance and resets client.
   */
  public terminate(): void {
    SimWorkerClient.resetInstance();
  }

  private readonly _worker: Comlink.Remote<DeterministicSimWorker> | DeterministicSimWorker;
  private readonly _isFallback: boolean;

  private async _handleEvaluationFailure(
    nodes: GraphNodePayload[],
    edges: GraphEdgePayload[],
    globalParams: number | GlobalSimParams,
    error: unknown
  ): Promise<SimulationResult> {
    console.warn('SimWorker RPC failed, falling back to direct computation:', error);
    const fallbackWorker = new DeterministicSimWorker();
    return fallbackWorker.evaluateGraph(nodes, edges, globalParams);
  }
}

