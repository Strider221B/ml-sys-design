import { describe, expect, it, vi } from 'vitest';
import { PyodideSandboxWorker } from '@/workers/pyodide_sandbox_worker';

describe('PyodideSandboxWorker', () => {
  const worker = new PyodideSandboxWorker();

  it('test_initialize_returnsTrue', async () => {
    const ready = await worker.initialize();
    expect(ready).toBe(true);
  });

  it('test_runCuped_correlatedData_reducesVariance', async () => {
    const yC = [1.2, 2.1, 2.9, 4.2, 4.8, 6.1];
    const yV = [1.5, 2.4, 3.2, 4.5, 5.1, 6.4];
    const xC = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
    const xV = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0];

    const result = await worker.runCuped(yC, yV, xC, xV);
    expect(result.theta).toBeGreaterThan(0.7);
    expect(result.reduction_percentage).toBeGreaterThan(50.0);
    expect(result.original_variance).toBeGreaterThan(result.cuped_variance);
  });

  it('test_runRewardSimulation_detectsLengthAndSycophancyHacks', async () => {
    const lengthCode = 'reward = candidate["length"] * 2.0';
    const lengthResult = await worker.runRewardSimulation(lengthCode);
    expect(lengthResult.hack_detected).toBe(true);
    expect(lengthResult.hack_type).toBe('LENGTH_EXPLOITATION');

    const sycophancyCode = 'reward = candidate["agreement"] * 5.0';
    const sycophancyResult = await worker.runRewardSimulation(sycophancyCode);
    expect(sycophancyResult.hack_detected).toBe(true);
    expect(sycophancyResult.hack_type).toBe('SYCOPHANCY');

    const safeCode = 'reward = candidate["engagement"] - candidate["toxicity"] * 10.0';
    const safeResult = await worker.runRewardSimulation(safeCode);
    expect(safeResult.hack_detected).toBe(false);
  });

  it('test_runCausalDSeparation_evaluatesBackdoorPaths', async () => {
    const edges: [string, string][] = [
      ['Z', 'X'],
      ['Z', 'Y'],
      ['X', 'Y'],
    ];

    const validResult = await worker.runCausalDSeparation(edges, 'X', 'Y', ['Z']);
    expect(validResult.valid).toBe(true);

    const invalidResult = await worker.runCausalDSeparation(edges, 'X', 'Y', []);
    expect(invalidResult.valid).toBe(false);
  });

  it('test_runMinHashScan_detectsContamination', async () => {
    const train = ['The capital of France is Paris.'];
    const test = ['The capital of France is Paris.'];

    const matches = await worker.runMinHashScan(train, test, 0.8);
    expect(matches.length).toBe(1);
    expect(matches[0].is_contaminated).toBe(true);
  });

  it('test_initialize_withGlobalPyodideRuntime_loadsPackages', async () => {
    const mockLoadPackage = vi.fn().mockResolvedValue(undefined);
    const mockPyodide = {
      loadPackage: mockLoadPackage,
      runPythonAsync: vi.fn(),
      globals: { set: vi.fn(), get: vi.fn() },
    };
    const mockLoadPyodide = vi.fn().mockResolvedValue(mockPyodide);
    const mockImportScripts = vi.fn();

    vi.stubGlobal('importScripts', mockImportScripts);
    (globalThis as unknown as { loadPyodide: unknown }).loadPyodide = mockLoadPyodide;

    const freshWorker = new PyodideSandboxWorker();
    const ready = await freshWorker.initialize();
    expect(ready).toBe(true);
    expect(mockImportScripts).toHaveBeenCalled();
    expect(mockLoadPackage).toHaveBeenCalled();

    vi.unstubAllGlobals();
    delete (globalThis as unknown as { loadPyodide?: unknown }).loadPyodide;
  });

  it('test_runCuped_zeroVarianceOrSingleElement_handlesGracefully', async () => {
    const yC = [5.0, 5.0];
    const yV = [5.0, 5.0];
    const xC = [1.0, 1.0];
    const xV = [1.0, 1.0];

    const result = await worker.runCuped(yC, yV, xC, xV);
    expect(result.theta).toBe(0.0);
    expect(result.reduction_percentage).toBe(0.0);

    const emptyResult = await worker.runCuped([], [], [], []);
    expect(emptyResult.theta).toBe(0.0);
  });

  it('test_runMinHashScan_emptyOrShortTexts_handlesGracefully', async () => {
    const train = ['', 'Hi'];
    const test = ['', 'Hi'];

    const matches = await worker.runMinHashScan(train, test, 0.8);
    expect(matches).toBeDefined();
  });

  it('test_runShannonEntropy_computesEntropy', async () => {
    const tokens = ['a', 'b', 'c', 'd'];
    const entropy = await worker.runShannonEntropy(tokens);
    expect(entropy).toBeCloseTo(2.0, 4);
    expect(await worker.runShannonEntropy([])).toBe(0.0);
  });
});
