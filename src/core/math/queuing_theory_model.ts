import { MathConstants } from '@/core/math/math_constants';

export interface QueuingParams {
  arrivalRateRps: number;
  serviceRateRps?: number | undefined;
  serviceTimeMs?: number | undefined;
  replicaCount: number;
  caSquared?: number | undefined;
  csSquared?: number | undefined;
}

export interface LatencyPercentiles {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  meanMs: number;
}

export interface QueuingResult {
  utilization: number;
  waitingTimeMs: number;
  serviceMs: number;
  totalLatencyMs: number;
  isUnstable: boolean;
  percentiles: LatencyPercentiles;
}

/**
 * Analytical M/G/c multi-server queuing latency engine using Allen-Cunneen approximation.
 * Calculates server utilization, waiting times, and p50/p95/p99 tail latencies.
 */
export class QueuingTheoryModel {
  private static readonly _MIN_REPLICAS = 1;
  private static readonly _MIN_SERVICE_MS = 0.001;
  private static readonly _ZERO_LATENCY = 0;

  public constructor() {}

  /**
   * Evaluates node queue performance and percentile latencies.
   */
  public calculateLatency(params: QueuingParams): QueuingResult {
    const replicas = Math.max(QueuingTheoryModel._MIN_REPLICAS, params.replicaCount);
    const serviceMs = this._extractServiceMs(params);
    const arrivalRps = Math.max(0, params.arrivalRateRps);
    const ca2 = params.caSquared ?? MathConstants.DEFAULT_CA_SQUARED;
    const cs2 = params.csSquared ?? MathConstants.DEFAULT_CS_SQUARED;

    const utilization = this._calculateUtilization(arrivalRps, serviceMs, replicas);
    const isUnstable = utilization >= MathConstants.MAX_UTILIZATION_THRESHOLD;
    const waitMs = this._calculateWaitMs(utilization, replicas, serviceMs, ca2, cs2);
    const percentiles = this.estimatePercentiles(waitMs, serviceMs);

    return {
      utilization,
      waitingTimeMs: waitMs,
      serviceMs,
      totalLatencyMs: waitMs + serviceMs,
      isUnstable,
      percentiles,
    };
  }

  /**
   * Projects p50, p95, and p99 percentile latencies from waiting time and base service time.
   */
  public estimatePercentiles(meanWaitMs: number, serviceMs: number): LatencyPercentiles {
    const safeWait = Math.max(0, meanWaitMs);
    const safeService = Math.max(0, serviceMs);
    const p50Ms = safeService * MathConstants.KAPPA_P50 + safeWait * MathConstants.LN_2;
    const p95Ms = safeService * MathConstants.KAPPA_P95 + safeWait * MathConstants.LN_20;
    const p99Ms = safeService * MathConstants.KAPPA_P99 + safeWait * MathConstants.LN_100;
    const meanMs = safeService + safeWait;

    return {
      p50Ms: Math.round(p50Ms * 100) / 100,
      p95Ms: Math.round(p95Ms * 100) / 100,
      p99Ms: Math.round(p99Ms * 100) / 100,
      meanMs: Math.round(meanMs * 100) / 100,
    };
  }

  private _extractServiceMs(params: QueuingParams): number {
    if (params.serviceTimeMs !== undefined && params.serviceTimeMs > 0) {
      return params.serviceTimeMs;
    }
    if (params.serviceRateRps !== undefined && params.serviceRateRps > 0) {
      return MathConstants.MILLIS_PER_SECOND / params.serviceRateRps;
    }
    return QueuingTheoryModel._MIN_SERVICE_MS;
  }

  private _calculateUtilization(arrivalRps: number, serviceMs: number, replicas: number): number {
    if (arrivalRps <= 0) {
      return 0;
    }
    const serviceSec = serviceMs / MathConstants.MILLIS_PER_SECOND;
    const capacityPerServerRps = 1 / serviceSec;
    const totalCapacityRps = capacityPerServerRps * replicas;
    return arrivalRps / totalCapacityRps;
  }

  private _calculateWaitMs(
    rho: number,
    replicas: number,
    serviceMs: number,
    ca2: number,
    cs2: number
  ): number {
    if (rho <= 0) {
      return QueuingTheoryModel._ZERO_LATENCY;
    }
    if (rho >= MathConstants.QUEUE_SATURATION_UTILIZATION) {
      return MathConstants.OVERFLOW_LATENCY_MS;
    }
    const variabilityFactor = (ca2 + cs2) / 2;
    const exponent = Math.sqrt(2 * (replicas + 1)) - 1;
    const rhoFactor = Math.pow(rho, exponent);
    const denominator = replicas * (1 - rho);
    const waitRatio = (rhoFactor / denominator) * variabilityFactor;
    return waitRatio * serviceMs;
  }
}
