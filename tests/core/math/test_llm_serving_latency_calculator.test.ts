import { describe, expect, it } from 'vitest';
import { HardwareSpecsDatabase } from '@/core/math/hardware_specs_database';
import { LlmServingLatencyCalculator } from '@/core/math/llm_serving_latency_calculator';
import { MathConstants } from '@/core/math/math_constants';

describe('LlmServingLatencyCalculator', () => {
  it('test_calculateLlmLatency_70B_onH100_computesRealisticMetrics', () => {
    const db = new HardwareSpecsDatabase();
    const calculator = new LlmServingLatencyCalculator(db);

    const metrics = calculator.calculateLlmLatency({
      activeParamsBillion: 70,
      promptTokens: 2048,
      outputTokens: 256,
      chipId: MathConstants.CHIP_NVIDIA_H100_SXM5,
      batchSize: 1,
      quantizationBits: 16,
    });

    expect(metrics.ttftMs).toBeGreaterThan(15.0);
    expect(metrics.tpotMs).toBeGreaterThan(5.0);
    expect(metrics.totalLatencyMs).toBeGreaterThan(metrics.ttftMs);
    expect(metrics.tokensPerSecond).toBeGreaterThan(0);
    expect(metrics.vramWeightsGb).toBeGreaterThan(140);
    expect(metrics.totalVramGb).toBeGreaterThan(metrics.vramWeightsGb);
  });

  it('test_calculateLlmLatency_promptCaching_reducesTtft', () => {
    const db = new HardwareSpecsDatabase();
    const calculator = new LlmServingLatencyCalculator(db);

    const noCache = calculator.calculateLlmLatency({
      activeParamsBillion: 70,
      promptTokens: 4096,
      outputTokens: 128,
      chipId: MathConstants.CHIP_NVIDIA_H100_SXM5,
      promptCacheHitRatio: 0.0,
    });
    const withCache = calculator.calculateLlmLatency({
      activeParamsBillion: 70,
      promptTokens: 4096,
      outputTokens: 128,
      chipId: MathConstants.CHIP_NVIDIA_H100_SXM5,
      promptCacheHitRatio: 0.8,
    });

    expect(withCache.ttftMs).toBeLessThan(noCache.ttftMs);
  });

  it('test_calculateLlmLatency_speculativeDecoding_acceleratesTpot', () => {
    const db = new HardwareSpecsDatabase();
    const calculator = new LlmServingLatencyCalculator(db);

    const baseline = calculator.calculateLlmLatency({
      activeParamsBillion: 70,
      promptTokens: 1024,
      outputTokens: 200,
      chipId: MathConstants.CHIP_NVIDIA_H100_SXM5,
      speculativeDecoding: false,
    });
    const speculative = calculator.calculateLlmLatency({
      activeParamsBillion: 70,
      promptTokens: 1024,
      outputTokens: 200,
      chipId: MathConstants.CHIP_NVIDIA_H100_SXM5,
      speculativeDecoding: true,
      speculativeSpeedupFactor: 2.0,
    });

    expect(speculative.tpotMs).toBeLessThan(baseline.tpotMs);
    expect(speculative.totalLatencyMs).toBeLessThan(baseline.totalLatencyMs);
  });

  it('test_calculateLlmLatency_quantization_reducesVramAndImprovesTpot', () => {
    const db = new HardwareSpecsDatabase();
    const calculator = new LlmServingLatencyCalculator(db);

    const fp16 = calculator.calculateLlmLatency({
      activeParamsBillion: 70,
      promptTokens: 1024,
      outputTokens: 128,
      chipId: MathConstants.CHIP_NVIDIA_H100_SXM5,
      quantizationBits: 16,
    });
    const int4 = calculator.calculateLlmLatency({
      activeParamsBillion: 70,
      promptTokens: 1024,
      outputTokens: 128,
      chipId: MathConstants.CHIP_NVIDIA_H100_SXM5,
      quantizationBits: 4,
    });

    expect(int4.vramWeightsGb).toBeLessThan(fp16.vramWeightsGb);
    expect(int4.tpotMs).toBeLessThan(fp16.tpotMs);
  });

  it('test_calculateLlmLatency_batchSize_scalesThroughputAndKvVram', () => {
    const db = new HardwareSpecsDatabase();
    const calculator = new LlmServingLatencyCalculator(db);

    const b1 = calculator.calculateLlmLatency({
      activeParamsBillion: 8,
      promptTokens: 512,
      outputTokens: 100,
      chipId: MathConstants.CHIP_NVIDIA_L4,
      batchSize: 1,
    });
    const b8 = calculator.calculateLlmLatency({
      activeParamsBillion: 8,
      promptTokens: 512,
      outputTokens: 100,
      chipId: MathConstants.CHIP_NVIDIA_L4,
      batchSize: 8,
    });

    expect(b8.vramKvGb).toBeGreaterThan(b1.vramKvGb);
    expect(b8.maxServiceRateRps).toBeGreaterThan(b1.maxServiceRateRps);
  });
});

