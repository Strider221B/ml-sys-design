import { describe, expect, it } from 'vitest';
import { MathConstants } from '@/core/math/math_constants';
import { QueuingTheoryModel } from '@/core/math/queuing_theory_model';

describe('QueuingTheoryModel', () => {
  it('test_calculateLatency_lowLoad_returnsSubMillisecondWaitTime', () => {
    const model = new QueuingTheoryModel();
    const result = model.calculateLatency({
      arrivalRateRps: 10,
      serviceTimeMs: 5,
      replicaCount: 2,
    });

    expect(result.utilization).toBeCloseTo(0.025, 3);
    expect(result.isUnstable).toBe(false);
    expect(result.waitingTimeMs).toBeLessThan(1.0);
    expect(result.totalLatencyMs).toBeGreaterThanOrEqual(5.0);
    expect(result.percentiles.p50Ms).toBeGreaterThanOrEqual(5.0);
    expect(result.percentiles.p99Ms).toBeGreaterThan(result.percentiles.p50Ms);
  });

  it('test_calculateLatency_zeroArrival_returnsZeroWait', () => {
    const model = new QueuingTheoryModel();
    const result = model.calculateLatency({
      arrivalRateRps: 0,
      serviceTimeMs: 10,
      replicaCount: 1,
    });

    expect(result.utilization).toBe(0);
    expect(result.waitingTimeMs).toBe(0);
    expect(result.totalLatencyMs).toBe(10);
    expect(result.isUnstable).toBe(false);
  });

  it('test_calculateLatency_unstableNearSaturation_flagsUnstable', () => {
    const model = new QueuingTheoryModel();
    // 1 server serving in 10ms -> capacity 100 RPS. At 96 RPS, rho = 0.96 >= 0.95
    const result = model.calculateLatency({
      arrivalRateRps: 96,
      serviceTimeMs: 10,
      replicaCount: 1,
    });

    expect(result.utilization).toBeCloseTo(0.96, 2);
    expect(result.isUnstable).toBe(true);
    expect(result.waitingTimeMs).toBeGreaterThan(50);
  });

  it('test_calculateLatency_overflowAboveCapacity_returnsOverflowLatency', () => {
    const model = new QueuingTheoryModel();
    // 1 server serving 10ms (100 RPS capacity), arrival is 150 RPS -> rho = 1.5
    const result = model.calculateLatency({
      arrivalRateRps: 150,
      serviceTimeMs: 10,
      replicaCount: 1,
    });

    expect(result.utilization).toBe(1.5);
    expect(result.isUnstable).toBe(true);
    expect(result.waitingTimeMs).toBe(MathConstants.OVERFLOW_LATENCY_MS);
  });

  it('test_calculateLatency_withServiceRateRps_extractsServiceMsAccurately', () => {
    const model = new QueuingTheoryModel();
    // 50 RPS service rate = 20ms service time
    const result = model.calculateLatency({
      arrivalRateRps: 20,
      serviceRateRps: 50,
      replicaCount: 1,
    });

    expect(result.serviceMs).toBe(20);
    expect(result.utilization).toBeCloseTo(0.4, 2);
  });

  it('test_calculateLatency_missingOrNegativeServiceTime_usesFallback', () => {
    const model = new QueuingTheoryModel();
    const result = model.calculateLatency({
      arrivalRateRps: 10,
      serviceTimeMs: -5,
      replicaCount: -2,
    });

    expect(result.serviceMs).toBe(0.001);
  });

  it('test_calculateLatency_higherVariability_increasesWaitTime', () => {
    const model = new QueuingTheoryModel();
    const deterministic = model.calculateLatency({
      arrivalRateRps: 80,
      serviceTimeMs: 10,
      replicaCount: 1,
      caSquared: 0,
      csSquared: 0,
    });
    const highVariance = model.calculateLatency({
      arrivalRateRps: 80,
      serviceTimeMs: 10,
      replicaCount: 1,
      caSquared: 2.0,
      csSquared: 2.0,
    });

    expect(highVariance.waitingTimeMs).toBeGreaterThan(deterministic.waitingTimeMs);
  });

  it('test_estimatePercentiles_calculatesIncreasingPercentiles', () => {
    const model = new QueuingTheoryModel();
    const percentiles = model.estimatePercentiles(15, 10);

    expect(percentiles.p50Ms).toBeLessThan(percentiles.p95Ms);
    expect(percentiles.p95Ms).toBeLessThan(percentiles.p99Ms);
    expect(percentiles.meanMs).toBe(25);
  });
});

