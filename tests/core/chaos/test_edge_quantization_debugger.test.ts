import { describe, expect, it } from 'vitest';
import { EdgeModelParams, EdgeQuantizationDebugger } from '@/core/chaos/edge_quantization_debugger';

describe('EdgeQuantizationDebugger', () => {
  it('test_computeMemoryFootprintGb_calculatesFootprintWithOverhead', () => {
    const debuggerInst = new EdgeQuantizationDebugger();

    const fp32 = debuggerInst.computeMemoryFootprintGb(7, 'FP32');
    expect(fp32).toBe(35.0);

    const fp16 = debuggerInst.computeMemoryFootprintGb(7, 'FP16');
    expect(fp16).toBe(17.5);

    const int8 = debuggerInst.computeMemoryFootprintGb(7, 'INT8');
    expect(int8).toBe(8.75);

    const int4 = debuggerInst.computeMemoryFootprintGb(7, 'INT4');
    expect(int4).toBe(4.375);
  });

  it('test_computePerplexityDelta_returnsExpectedPenalties', () => {
    const debuggerInst = new EdgeQuantizationDebugger();

    expect(debuggerInst.computePerplexityDelta('FP32')).toBe(0.0);
    expect(debuggerInst.computePerplexityDelta('FP16')).toBe(0.02);
    expect(debuggerInst.computePerplexityDelta('INT8')).toBe(0.15);
    expect(debuggerInst.computePerplexityDelta('INT4')).toBe(0.85);
  });

  it('test_computeThermalThrottling_whenDurationExceedsThreshold_throttlesClock', () => {
    const debuggerInst = new EdgeQuantizationDebugger();

    const normal = debuggerInst.computeThermalThrottling(15, 20.0);
    expect(normal.isThrottled).toBe(false);
    expect(normal.clockSpeedMultiplier).toBe(1.0);
    expect(normal.effectiveTpotMs).toBe(20.0);
    expect(normal.thermalDegradationPct).toBe(0);

    const throttled = debuggerInst.computeThermalThrottling(45, 20.0);
    expect(throttled.isThrottled).toBe(true);
    expect(throttled.clockSpeedMultiplier).toBe(0.55);
    expect(throttled.effectiveTpotMs).toBeGreaterThan(30.0);
    expect(throttled.thermalDegradationPct).toBe(45);
  });

  it('test_simulateEdgeDeployment_whenOom_returnsOomRecommendation', () => {
    const debuggerInst = new EdgeQuantizationDebugger();
    const params: EdgeModelParams = {
      paramCountBillions: 70,
      precision: 'FP16',
      memoryCeilingGb: 8.0,
      runDurationSeconds: 10,
    };

    const result = debuggerInst.simulateEdgeDeployment(params);
    expect(result.isOom).toBe(true);
    expect(result.recommendation).toContain('Out of memory');
  });

  it('test_simulateEdgeDeployment_whenThermalThrottled_returnsThrottleRecommendation', () => {
    const debuggerInst = new EdgeQuantizationDebugger();
    const params: EdgeModelParams = {
      paramCountBillions: 1,
      precision: 'INT4',
      memoryCeilingGb: 8.0,
      runDurationSeconds: 40,
    };

    const result = debuggerInst.simulateEdgeDeployment(params);
    expect(result.isOom).toBe(false);
    expect(result.thermal.isThrottled).toBe(true);
    expect(result.recommendation).toContain('Thermal throttling detected');
  });

  it('test_simulateEdgeDeployment_whenFitsEnvelope_returnsOptimalRecommendation', () => {
    const debuggerInst = new EdgeQuantizationDebugger();
    const params: EdgeModelParams = {
      paramCountBillions: 3,
      precision: 'INT4',
      memoryCeilingGb: 8.0,
      runDurationSeconds: 10,
    };

    const result = debuggerInst.simulateEdgeDeployment(params);
    expect(result.isOom).toBe(false);
    expect(result.thermal.isThrottled).toBe(false);
    expect(result.recommendation).toContain('Deployment fits within hardware envelope');
  });
});

