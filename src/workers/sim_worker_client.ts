import * as Comlink from 'comlink';
import type { DeterministicSimWorker } from '@/workers/deterministic_sim_worker';

/**
 * Singleton client managing native Next.js 16.4 ES module worker instantiation and Comlink RPC proxy.
 */
export class SimWorkerClient {
  private static _instance: Comlink.Remote<DeterministicSimWorker> | null = null;
  private static _rawWorker: Worker | null = null;

  /**
   * Retrieves or instantiates the singleton Comlink-wrapped Web Worker RPC proxy.
   */
  public static getWorker(): Comlink.Remote<DeterministicSimWorker> {
    if (!SimWorkerClient._instance) {
      if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
        const worker = new Worker(new URL('./deterministic_sim_worker.ts', import.meta.url), {
          type: 'module',
        });
        SimWorkerClient._rawWorker = worker;
        SimWorkerClient._instance = Comlink.wrap<DeterministicSimWorker>(worker);
      } else {
        throw new Error('Web Worker instantiation is only supported in browser runtime environment');
      }
    }
    return SimWorkerClient._instance;
  }

  /**
   * Checks whether the current runtime environment supports native Web Workers.
   */
  public static isWorkerSupported(): boolean {
    return typeof window !== 'undefined' && typeof Worker !== 'undefined';
  }

  /**
   * Sets or overrides the singleton worker instance (useful for testing or fallback proxies).
   */
  public static setInstance(instance: Comlink.Remote<DeterministicSimWorker> | null): void {
    SimWorkerClient._instance = instance;
  }

  /**
   * Resets and terminates the active worker instance.
   */
  public static resetInstance(): void {
    if (SimWorkerClient._rawWorker) {
      SimWorkerClient._rawWorker.terminate();
      SimWorkerClient._rawWorker = null;
    }
    SimWorkerClient._instance = null;
  }

  public constructor() {}
}
