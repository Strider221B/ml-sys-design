import { ChaosConstants } from '@/core/chaos/chaos_constants';

export type QuantizationPrecision = 'FP32' | 'FP16' | 'INT8' | 'INT4';

export interface EdgeModelParams {
  paramCountBillions: number;
  precision: QuantizationPrecision;
  memoryCeilingGb?: number | undefined;
  runDurationSeconds?: number | undefined;
  baseTpotMs?: number | undefined;
}

export interface ThermalResult {
  isThrottled: boolean;
  clockSpeedMultiplier: number;
  effectiveTpotMs: number;
  thermalDegradationPct: number;
}

export interface EdgeSimResult {
  memoryFootprintGb: number;
  memoryCeilingGb: number;
  isOom: boolean;
  vramHeadroomGb: number;
  perplexityDelta: number;
  thermal: ThermalResult;
  recommendation: string;
}

/**
 * Simulates mobile/edge device memory footprints, thermal throttling, and INT4 precision degradation.
 */
export class EdgeQuantizationDebugger {
  private static readonly _DEFAULT_BASE_TPOT_MS = 25.0;
  private static readonly _DEFAULT_RUN_DURATION_SEC = 10;
  private static readonly _NOMINAL_CLOCK_MULTIPLIER = 1.0;
  private static readonly _THROTTLED_CLOCK_MULTIPLIER = 0.55;
  private static readonly _PPL_DELTA_FP32 = 0.0;
  private static readonly _PPL_DELTA_FP16 = 0.02;
  private static readonly _PPL_DELTA_INT8 = 0.15;
  private static readonly _PPL_DELTA_INT4 = 0.85;
  private static readonly _REC_OOM = 'Out of memory: Reduce precision to INT4 or quantize KV-cache';
  private static readonly _REC_THROTTLED = 'Thermal throttling detected: Limit batch size or duty-cycle inference';
  private static readonly _REC_OPTIMAL = 'Deployment fits within hardware envelope and thermal budget';

  public constructor() {}

  /**
   * Simulates edge hardware execution metrics and constraints.
   */
  public simulateEdgeDeployment(params: EdgeModelParams): EdgeSimResult {
    const ceiling = params.memoryCeilingGb ?? ChaosConstants.DEFAULT_EDGE_MEMORY_CEILING_GB;
    const duration = params.runDurationSeconds ?? EdgeQuantizationDebugger._DEFAULT_RUN_DURATION_SEC;
    const baseTpot = params.baseTpotMs ?? EdgeQuantizationDebugger._DEFAULT_BASE_TPOT_MS;

    const memoryGb = this.computeMemoryFootprintGb(params.paramCountBillions, params.precision);
    const isOom = memoryGb > ceiling;
    const vramHeadroomGb = Number((ceiling - memoryGb).toFixed(2));
    const perplexityDelta = this.computePerplexityDelta(params.precision);
    const thermal = this.computeThermalThrottling(duration, baseTpot);
    const recommendation = this._determineRecommendation(isOom, thermal.isThrottled);

    return {
      memoryFootprintGb: memoryGb,
      memoryCeilingGb: ceiling,
      isOom,
      vramHeadroomGb,
      perplexityDelta,
      thermal,
      recommendation,
    };
  }

  /**
   * Computes theoretical memory footprint in gigabytes using bit-width and KV overhead multiplier.
   */
  public computeMemoryFootprintGb(
    paramCountBillions: number,
    precision: QuantizationPrecision
  ): number {
    const bits = this.getBitsPerWeight(precision);
    const rawGb = (paramCountBillions * bits) / 8.0;
    const withOverhead = rawGb * ChaosConstants.KV_RUNTIME_OVERHEAD_MULTIPLIER;
    return Number(withOverhead.toFixed(3));
  }

  /**
   * Returns empirical perplexity penalty for designated quantization precision.
   */
  public computePerplexityDelta(precision: QuantizationPrecision): number {
    switch (precision) {
      case ChaosConstants.PRECISION_FP32:
        return EdgeQuantizationDebugger._PPL_DELTA_FP32;
      case ChaosConstants.PRECISION_FP16:
        return EdgeQuantizationDebugger._PPL_DELTA_FP16;
      case ChaosConstants.PRECISION_INT8:
        return EdgeQuantizationDebugger._PPL_DELTA_INT8;
      case ChaosConstants.PRECISION_INT4:
        return EdgeQuantizationDebugger._PPL_DELTA_INT4;
      default:
        return EdgeQuantizationDebugger._PPL_DELTA_FP32;
    }
  }

  /**
   * Models thermal clock drops when continuous inference exceeds thermal limit.
   */
  public computeThermalThrottling(runDurationSeconds: number, baseTpotMs: number): ThermalResult {
    const isThrottled = runDurationSeconds > ChaosConstants.THERMAL_THROTTLE_THRESHOLD_SEC;
    const multiplier = isThrottled
      ? EdgeQuantizationDebugger._THROTTLED_CLOCK_MULTIPLIER
      : EdgeQuantizationDebugger._NOMINAL_CLOCK_MULTIPLIER;

    const effectiveTpotMs = Number((baseTpotMs / multiplier).toFixed(2));
    const thermalDegradationPct = isThrottled
      ? Math.round(ChaosConstants.THERMAL_THROTTLE_CLOCK_DROP_PCT * 100)
      : 0;

    return {
      isThrottled,
      clockSpeedMultiplier: multiplier,
      effectiveTpotMs,
      thermalDegradationPct,
    };
  }

  /**
   * Returns bit count corresponding to the quantization precision identifier.
   */
  public getBitsPerWeight(precision: QuantizationPrecision): number {
    switch (precision) {
      case ChaosConstants.PRECISION_FP32:
        return ChaosConstants.BITS_PER_WEIGHT_FP32;
      case ChaosConstants.PRECISION_FP16:
        return ChaosConstants.BITS_PER_WEIGHT_FP16;
      case ChaosConstants.PRECISION_INT8:
        return ChaosConstants.BITS_PER_WEIGHT_INT8;
      case ChaosConstants.PRECISION_INT4:
        return ChaosConstants.BITS_PER_WEIGHT_INT4;
      default:
        return ChaosConstants.BITS_PER_WEIGHT_FP16;
    }
  }

  private _determineRecommendation(isOom: boolean, isThrottled: boolean): string {
    if (isOom) return EdgeQuantizationDebugger._REC_OOM;
    if (isThrottled) return EdgeQuantizationDebugger._REC_THROTTLED;
    return EdgeQuantizationDebugger._REC_OPTIMAL;
  }
}

