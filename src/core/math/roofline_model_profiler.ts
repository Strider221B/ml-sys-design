import { HardwareSpecsDatabase } from '@/core/math/hardware_specs_database';
import { MathConstants } from '@/core/math/math_constants';

export interface RooflineResult {
  operationalIntensity: number;
  kneeIntensity: number;
  attainableGflops: number;
  peakGflops: number;
  bandwidthGbps: number;
  bottleneck: 'MEMORY_BOUND' | 'COMPUTE_BOUND';
}

/**
 * Hardware arithmetic intensity and bottleneck classifier using Williams Roofline Model.
 * Evaluates whether an ML kernel is memory-bandwidth bound or compute-throughput bound.
 */
export class RooflineModelProfiler {
  private static readonly _ZERO_INTENSITY = 0;
  private static readonly _ROUNDING_FACTOR = 100;

  public constructor(private readonly _db: HardwareSpecsDatabase) {}

  /**
   * Profiles a given workload characterized by FLOPs and memory bytes against an accelerator SKU.
   */
  public profileWorkload(flops: number, bytesTransferred: number, chipId: string): RooflineResult {
    const specs = this._db.getSpecs(chipId);
    const intensity = this._computeIntensity(flops, bytesTransferred);
    const knee = this._computeKnee(specs.peakTflops, specs.memoryBandwidthGbps);
    const attainable = this._computeAttainable(
      intensity,
      specs.peakTflops,
      specs.memoryBandwidthGbps
    );
    const bottleneck =
      intensity < knee
        ? (MathConstants.BOTTLENECK_MEMORY_BOUND as 'MEMORY_BOUND')
        : (MathConstants.BOTTLENECK_COMPUTE_BOUND as 'COMPUTE_BOUND');

    return {
      operationalIntensity: Math.round(intensity * RooflineModelProfiler._ROUNDING_FACTOR) / 100,
      kneeIntensity: Math.round(knee * RooflineModelProfiler._ROUNDING_FACTOR) / 100,
      attainableGflops: Math.round(attainable * RooflineModelProfiler._ROUNDING_FACTOR) / 100,
      peakGflops: specs.peakTflops * MathConstants.TFLOPS_TO_GFLOPS,
      bandwidthGbps: specs.memoryBandwidthGbps,
      bottleneck,
    };
  }

  /**
   * Computes attainable throughput (GFLOPS) for a given operational intensity.
   */
  public calculateAttainableThroughput(intensity: number, chipId: string): number {
    const specs = this._db.getSpecs(chipId);
    return this._computeAttainable(intensity, specs.peakTflops, specs.memoryBandwidthGbps);
  }

  private _computeIntensity(flops: number, bytes: number): number {
    if (bytes <= 0 || flops <= 0) {
      return RooflineModelProfiler._ZERO_INTENSITY;
    }
    return flops / bytes;
  }

  private _computeKnee(peakTflops: number, bandwidthGbps: number): number {
    if (bandwidthGbps <= 0) {
      return RooflineModelProfiler._ZERO_INTENSITY;
    }
    return (peakTflops * MathConstants.TFLOPS_TO_GFLOPS) / bandwidthGbps;
  }

  private _computeAttainable(
    intensity: number,
    peakTflops: number,
    bandwidthGbps: number
  ): number {
    const peakGflops = peakTflops * MathConstants.TFLOPS_TO_GFLOPS;
    const bandwidthBound = intensity * bandwidthGbps;
    return Math.min(peakGflops, bandwidthBound);
  }
}

