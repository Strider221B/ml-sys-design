import { describe, expect, it } from 'vitest';
import { MathConstants } from '@/core/math/math_constants';

describe('MathConstants', () => {
  it('test_instantiate_createsInstanceWithExpectedDefaults', () => {
    const constants = new MathConstants();
    expect(constants).toBeDefined();

    expect(MathConstants.PROTOCOL_GRPC).toBe('GRPC');
    expect(MathConstants.PROTOCOL_REST).toBe('REST');
    expect(MathConstants.PROTOCOL_KAFKA).toBe('KAFKA');
    expect(MathConstants.PROTOCOL_REDIS).toBe('REDIS');

    expect(MathConstants.PROTOCOL_LATENCY_GRPC_MS).toBe(0.4);
    expect(MathConstants.PROTOCOL_LATENCY_REST_MS).toBe(0.8);
    expect(MathConstants.PROTOCOL_LATENCY_KAFKA_MS).toBe(2.5);
    expect(MathConstants.PROTOCOL_LATENCY_REDIS_MS).toBe(0.3);
    expect(MathConstants.DEFAULT_EDGE_LATENCY_MS).toBe(0.5);

    expect(MathConstants.CHIP_NVIDIA_H100_SXM5).toBe('NVIDIA_H100_SXM5');
    expect(MathConstants.CHIP_NVIDIA_H200_SXM).toBe('NVIDIA_H200_SXM');
    expect(MathConstants.CHIP_NVIDIA_B200).toBe('NVIDIA_B200');
    expect(MathConstants.CHIP_AMD_MI300X).toBe('AMD_MI300X');
    expect(MathConstants.CHIP_GOOGLE_TPU_V5P).toBe('GOOGLE_TPU_V5P');
    expect(MathConstants.CHIP_GOOGLE_TPU_V6E).toBe('GOOGLE_TPU_V6E');
    expect(MathConstants.CHIP_NVIDIA_L4).toBe('NVIDIA_L4');

    expect(MathConstants.BOTTLENECK_MEMORY_BOUND).toBe('MEMORY_BOUND');
    expect(MathConstants.BOTTLENECK_COMPUTE_BOUND).toBe('COMPUTE_BOUND');
    expect(MathConstants.BOTTLENECK_QUEUE_SATURATED).toBe('QUEUE_SATURATED');

    expect(MathConstants.MAX_UTILIZATION_THRESHOLD).toBe(0.95);
    expect(MathConstants.QUEUE_SATURATION_UTILIZATION).toBe(1.0);
    expect(MathConstants.OVERFLOW_LATENCY_MS).toBe(99999.0);

    expect(MathConstants.HOURS_PER_MONTH).toBe(730);
    expect(MathConstants.SECONDS_PER_HOUR).toBe(3600);
    expect(MathConstants.MILLIS_PER_SECOND).toBe(1000);
  });
});

