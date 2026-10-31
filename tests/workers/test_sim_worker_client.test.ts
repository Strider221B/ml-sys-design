import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Comlink from 'comlink';
import type { DeterministicSimWorker } from '@/workers/deterministic_sim_worker';
import { SimWorkerClient } from '@/workers/sim_worker_client';

describe('SimWorkerClient', () => {
  beforeEach(() => {
    SimWorkerClient.resetInstance();
  });

  afterEach(() => {
    SimWorkerClient.resetInstance();
  });

  it('test_isWorkerSupported_inNodeEnvironment_returnsFalse', () => {
    expect(SimWorkerClient.isWorkerSupported()).toBe(false);
  });

  it('test_getWorker_inNodeEnvironmentWithoutInstance_throwsError', () => {
    expect(() => SimWorkerClient.getWorker()).toThrow(
      'Web Worker instantiation is only supported in browser runtime environment'
    );
  });

  it('test_setInstance_allowsMockWorkerInjection', () => {
    const mockWorker = {
      evaluateGraph: vi.fn(),
    } as unknown as Comlink.Remote<DeterministicSimWorker>;

    SimWorkerClient.setInstance(mockWorker);
    expect(SimWorkerClient.getWorker()).toBe(mockWorker);
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

    const worker = SimWorkerClient.getWorker();
    expect(worker).toBeDefined();
    expect(MockWorker).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('test_resetInstance_clearsWorkerAndTerminatesRawWorker', () => {
    const terminateMock = vi.fn();
    (SimWorkerClient as unknown as { _rawWorker: { terminate: () => void } })._rawWorker = {
      terminate: terminateMock,
    };

    SimWorkerClient.resetInstance();
    expect(terminateMock).toHaveBeenCalled();
    expect(() => SimWorkerClient.getWorker()).toThrow();
  });

  it('test_instantiate_createsInstance', () => {
    const client = new SimWorkerClient();
    expect(client).toBeDefined();
  });
});
