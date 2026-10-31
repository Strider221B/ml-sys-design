import { describe, expect, it } from 'vitest';
import { ChaosConstants } from '@/core/chaos/chaos_constants';

describe('ChaosConstants', () => {
  it('test_constants_exposeCorrectCanonicalValues', () => {
    expect(ChaosConstants.FAULT_NETWORK_PARTITION).toBe('NETWORK_PARTITION');
    expect(ChaosConstants.FAULT_TOKEN_OVERFLOW).toBe('TOKEN_OVERFLOW');
    expect(ChaosConstants.FAULT_RACE_CONDITION).toBe('RACE_CONDITION');
    expect(ChaosConstants.FAULT_CLOCK_SKEW).toBe('CLOCK_SKEW');

    expect(ChaosConstants.FAILURE_INFINITE_AGENT_LOOP).toBe('INFINITE_AGENT_LOOP');
    expect(ChaosConstants.FAILURE_OUT_OF_MEMORY).toBe('OUT_OF_MEMORY_CRASH');
    expect(ChaosConstants.FAILURE_CONTEXT_OVERFLOW).toBe('CONTEXT_WINDOW_OVERFLOW');
    expect(ChaosConstants.FAILURE_DATA_CORRUPTION).toBe('SILENT_DATA_CORRUPTION');
    expect(ChaosConstants.FAILURE_RESILIENT_SURVIVAL).toBe('RESILIENT_SURVIVAL');

    expect(ChaosConstants.PRECISION_FP32).toBe('FP32');
    expect(ChaosConstants.PRECISION_FP16).toBe('FP16');
    expect(ChaosConstants.PRECISION_INT8).toBe('INT8');
    expect(ChaosConstants.PRECISION_INT4).toBe('INT4');

    expect(ChaosConstants.BITS_PER_WEIGHT_FP32).toBe(32);
    expect(ChaosConstants.BITS_PER_WEIGHT_FP16).toBe(16);
    expect(ChaosConstants.BITS_PER_WEIGHT_INT8).toBe(8);
    expect(ChaosConstants.BITS_PER_WEIGHT_INT4).toBe(4);

    expect(ChaosConstants.KV_RUNTIME_OVERHEAD_MULTIPLIER).toBe(1.25);
    expect(ChaosConstants.DEFAULT_ERROR_BUDGET_MINUTES).toBe(43.2);
    expect(ChaosConstants.DEFAULT_MAX_AGENT_DEPTH).toBe(5);
  });

  it('test_getSupportedPrecisions_returnsAllFourPrecisions', () => {
    const constants = new ChaosConstants();
    const precisions = constants.getSupportedPrecisions();
    expect(precisions).toHaveLength(4);
    expect(precisions).toContain('FP32');
    expect(precisions).toContain('INT4');
  });

  it('test_getSupportedWorkloadPatterns_returnsAllFourPatterns', () => {
    const constants = new ChaosConstants();
    const patterns = constants.getSupportedWorkloadPatterns();
    expect(patterns).toHaveLength(4);
    expect(patterns).toContain('POISSON_BURST');
    expect(patterns).toContain('LONG_CONTEXT_PROMPT_BOMB');
  });
});

