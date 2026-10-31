import { describe, expect, it } from 'vitest';
import { HardwareSpecsDatabase } from '@/core/math/hardware_specs_database';
import { MathConstants } from '@/core/math/math_constants';
import { RooflineModelProfiler } from '@/core/math/roofline_model_profiler';

describe('RooflineModelProfiler', () => {
  it('test_profileWorkload_memoryBound_classifiesMemoryBound', () => {
    const db = new HardwareSpecsDatabase();
    const profiler = new RooflineModelProfiler(db);

    // 1000 FLOPs for 10000 Bytes -> intensity = 0.1 FLOPs/Byte (far below H100 knee ~ 590)
    const result = profiler.profileWorkload(1000, 10000, MathConstants.CHIP_NVIDIA_H100_SXM5);

    expect(result.operationalIntensity).toBe(0.1);
    expect(result.bottleneck).toBe(MathConstants.BOTTLENECK_MEMORY_BOUND);
    expect(result.attainableGflops).toBeLessThan(result.peakGflops);
  });

  it('test_profileWorkload_computeBound_classifiesComputeBound', () => {
    const db = new HardwareSpecsDatabase();
    const profiler = new RooflineModelProfiler(db);

    // 10,000,000 FLOPs for 10,000 Bytes -> intensity = 1000 FLOPs/Byte (above H100 knee ~ 590)
    const result = profiler.profileWorkload(
      10000000,
      10000,
      MathConstants.CHIP_NVIDIA_H100_SXM5
    );

    expect(result.operationalIntensity).toBe(1000);
    expect(result.bottleneck).toBe(MathConstants.BOTTLENECK_COMPUTE_BOUND);
    expect(result.attainableGflops).toBe(result.peakGflops);
  });

  it('test_profileWorkload_zeroBytesOrFlops_returnsZeroIntensity', () => {
    const db = new HardwareSpecsDatabase();
    const profiler = new RooflineModelProfiler(db);

    const zeroBytes = profiler.profileWorkload(1000, 0, MathConstants.CHIP_NVIDIA_H100_SXM5);
    const zeroFlops = profiler.profileWorkload(0, 1000, MathConstants.CHIP_NVIDIA_H100_SXM5);

    expect(zeroBytes.operationalIntensity).toBe(0);
    expect(zeroFlops.operationalIntensity).toBe(0);
  });

  it('test_profileWorkload_zeroBandwidth_returnsZeroKnee', () => {
    const db = new HardwareSpecsDatabase();
    db.registerChip({
      chipId: 'ZERO_BW_CHIP',
      name: 'Zero BW',
      architecture: 'Test',
      precision: 'FP16',
      peakTflops: 100,
      memoryBandwidthGbps: 0,
      vramCapacityGb: 16,
      costPerHourUsd: 1.0,
    });
    const profiler = new RooflineModelProfiler(db);
    const result = profiler.profileWorkload(100, 100, 'ZERO_BW_CHIP');

    expect(result.kneeIntensity).toBe(0);
  });

  it('test_calculateAttainableThroughput_returnsCorrectBound', () => {
    const db = new HardwareSpecsDatabase();
    const profiler = new RooflineModelProfiler(db);

    const lowIntensityThroughput = profiler.calculateAttainableThroughput(
      1.0,
      MathConstants.CHIP_NVIDIA_L4
    );
    const highIntensityThroughput = profiler.calculateAttainableThroughput(
      5000.0,
      MathConstants.CHIP_NVIDIA_L4
    );

    expect(lowIntensityThroughput).toBe(300); // 1.0 * 300 GB/s = 300 GFLOPS
    expect(highIntensityThroughput).toBe(120000); // 120 TFLOPS = 120,000 GFLOPS
  });
});
