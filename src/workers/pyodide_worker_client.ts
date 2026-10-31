import * as Comlink from 'comlink';
import type { PyodideSandboxWorker } from '@/workers/pyodide_sandbox_worker';

/**
 * Singleton client managing native Next.js 16.4 ES module worker instantiation and Comlink RPC proxy for Pyodide.
 */
export class PyodideWorkerClient {
  private static _instance: Comlink.Remote<PyodideSandboxWorker> | null = null;
  private static _rawWorker: Worker | null = null;

  /**
   * Retrieves or instantiates the singleton Comlink-wrapped Pyodide Web Worker RPC proxy.
   */
  public static getWorker(): Comlink.Remote<PyodideSandboxWorker> {
    if (!PyodideWorkerClient._instance) {
      if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
        const worker = new Worker(new URL('./pyodide_sandbox_worker.ts', import.meta.url), {
          type: 'module',
        });
        PyodideWorkerClient._rawWorker = worker;
        PyodideWorkerClient._instance = Comlink.wrap<PyodideSandboxWorker>(worker);
      } else {
        throw new Error('Pyodide Web Worker instantiation is only supported in browser runtime environment');
      }
    }
    return PyodideWorkerClient._instance;
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
  public static setInstance(instance: Comlink.Remote<PyodideSandboxWorker> | null): void {
    PyodideWorkerClient._instance = instance;
  }

  /**
   * Resets and terminates the active worker instance.
   */
  public static resetInstance(): void {
    if (PyodideWorkerClient._rawWorker) {
      PyodideWorkerClient._rawWorker.terminate();
      PyodideWorkerClient._rawWorker = null;
    }
    PyodideWorkerClient._instance = null;
  }

  public constructor() {}
}

