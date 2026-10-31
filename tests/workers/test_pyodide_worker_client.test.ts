import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Comlink from 'comlink';
import type { PyodideSandboxWorker } from '@/workers/pyodide_sandbox_worker';
import { PyodideWorkerClient } from '@/workers/pyodide_worker_client';

describe('PyodideWorkerClient', () => {
  beforeEach(() => {
    PyodideWorkerClient.resetInstance();
  });

  afterEach(() => {
    PyodideWorkerClient.resetInstance();
  });

  it('test_isWorkerSupported_inNodeEnvironment_returnsFalse', () => {
    expect(PyodideWorkerClient.isWorkerSupported()).toBe(false);
  });

  it('test_getWorker_inNodeEnvironmentWithoutInstance_throwsError', () => {
    expect(() => PyodideWorkerClient.getWorker()).toThrow(
      'Pyodide Web Worker instantiation is only supported in browser runtime environment'
    );
  });

  it('test_setInstance_allowsMockWorkerInjection', () => {
    const mockWorker = {
      initialize: vi.fn(),
      runCuped: vi.fn(),
    } as unknown as Comlink.Remote<PyodideSandboxWorker>;

    PyodideWorkerClient.setInstance(mockWorker);
    expect(PyodideWorkerClient.getWorker()).toBe(mockWorker);
  });

  it('test_getWorker_inBrowserWithWorker_createsWorkerAndWraps', () => {
    const mockWorkerInstance = {
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: vi.fn(),
    };
    const MockWorker = vi.fn().mockImplementation(() => mockWorkerInstance);
    vi.stubGlobal('window', {});
    vi.stubGlobal('Worker', MockWorker);

    const worker = PyodideWorkerClient.getWorker();
    expect(worker).toBeDefined();
    expect(MockWorker).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('test_resetInstance_clearsWorkerAndTerminatesRawWorker', () => {
    const terminateMock = vi.fn();
    (PyodideWorkerClient as unknown as { _rawWorker: { terminate: () => void } })._rawWorker = {
      terminate: terminateMock,
    };

    PyodideWorkerClient.resetInstance();
    expect(terminateMock).toHaveBeenCalled();
    expect(() => PyodideWorkerClient.getWorker()).toThrow();
  });

  it('test_instantiate_createsInstance', () => {
    const client = new PyodideWorkerClient();
    expect(client).toBeDefined();
  });
});

