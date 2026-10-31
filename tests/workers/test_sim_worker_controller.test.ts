import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Comlink from 'comlink';
import type { DeterministicSimWorker } from '@/workers/deterministic_sim_worker';
import { SimWorkerClient } from '@/workers/sim_worker_client';
import { SimWorkerController } from '@/workers/sim_worker_controller';

describe('SimWorkerController', () => {
  beforeEach(() => {
    SimWorkerClient.resetInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    SimWorkerClient.resetInstance();
  });

  it('test_controller_inNodeEnvironment_defaultsToFallbackMode', () => {
    const controller = new SimWorkerController();

    expect(controller.isReady()).toBe(true);
    expect(controller.isFallbackMode()).toBe(true);
  });

  it('test_controller_whenWorkerSupported_initializesWithClientWorker', () => {
    vi.spyOn(SimWorkerClient, 'isWorkerSupported').mockReturnValue(true);
    const mockWorker = {
      evaluateGraph: vi.fn(),
    } as unknown as Comlink.Remote<DeterministicSimWorker>;
    vi.spyOn(SimWorkerClient, 'getWorker').mockReturnValue(mockWorker);

    const controller = new SimWorkerController();
    expect(controller.isReady()).toBe(true);
    expect(controller.isFallbackMode()).toBe(false);
  });

  it('test_evaluateGraph_inFallbackMode_evaluatesSuccessfully', async () => {
    const controller = new SimWorkerController();

    const result = await controller.evaluateGraph(
      [{ id: 'node_1', type: 'GATEWAY', baseServiceMs: 2.0 }],
      [],
      10
    );

    expect(result.p50LatencyMs).toBeGreaterThan(0);
    expect(result.executionDurationMs).toBeLessThan(15.0);
  });

  it('test_evaluateGraph_withInjectedProxy_delegatesToProxy', async () => {
    const mockResult = {
      p50LatencyMs: 12.5,
      p99LatencyMs: 25.0,
      ttftMs: 10.0,
      tpotMs: 5.0,
      monthlyCostUSD: 1000.0,
      memoryVramGB: 16.0,
      unstableNodes: [],
      bottlenecks: [],
      executionDurationMs: 2.1,
    };
    const mockWorker = {
      evaluateGraph: vi.fn().mockResolvedValue(mockResult),
    } as unknown as Comlink.Remote<DeterministicSimWorker>;

    const controller = new SimWorkerController(mockWorker);
    const result = await controller.evaluateGraph([], [], 5);

    expect(result).toEqual(mockResult);
    expect(mockWorker.evaluateGraph).toHaveBeenCalled();
    expect(controller.isFallbackMode()).toBe(false);
  });

  it('test_evaluateGraph_whenProxyFails_recoversViaFallbackWorker', async () => {
    const mockWorker = {
      evaluateGraph: vi.fn().mockRejectedValue(new Error('Worker crashed!')),
    } as unknown as Comlink.Remote<DeterministicSimWorker>;

    const controller = new SimWorkerController(mockWorker);
    const result = await controller.evaluateGraph(
      [{ id: 'recovered_node', type: 'MICROSERVICE', baseServiceMs: 3.0 }],
      [],
      15
    );

    expect(result).toBeDefined();
    expect(result.p50LatencyMs).toBeGreaterThan(0);
  });

  it('test_terminate_callsClientResetInstance', () => {
    const resetSpy = vi.spyOn(SimWorkerClient, 'resetInstance');
    const controller = new SimWorkerController();

    controller.terminate();
    expect(resetSpy).toHaveBeenCalled();
  });
});
