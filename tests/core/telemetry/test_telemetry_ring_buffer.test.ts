import { describe, expect, it } from 'vitest';
import { TelemetryRingBuffer } from '@/core/telemetry/telemetry_ring_buffer';

describe('TelemetryRingBuffer', () => {
  it('test_initialState_whenEmpty_returnsDefaults', () => {
    const buffer = new TelemetryRingBuffer(5);
    expect(buffer.getCapacity()).toBe(5);
    expect(buffer.getSize()).toBe(0);
    expect(buffer.getLatest()).toBe(0);
    expect(buffer.getMean()).toBe(0);
    expect(buffer.getMin()).toBe(0);
    expect(buffer.getMax()).toBe(0);
    expect(buffer.getSnapshot().length).toBe(0);
  });

  it('test_push_belowCapacity_storesAndRetrievesOrderedValues', () => {
    const buffer = new TelemetryRingBuffer(5);
    buffer.push(10);
    buffer.push(20);
    buffer.push(30);

    expect(buffer.getSize()).toBe(3);
    expect(buffer.getLatest()).toBe(30);
    expect(buffer.getMean()).toBe(20);
    expect(buffer.getMin()).toBe(10);
    expect(buffer.getMax()).toBe(30);

    const snapshot = buffer.getSnapshot();
    expect(Array.from(snapshot)).toEqual([10, 20, 30]);
  });

  it('test_push_whenOverflowsCapacity_wrapsAroundAndPreservesOldestToNewest', () => {
    const buffer = new TelemetryRingBuffer(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);
    buffer.push(5);

    expect(buffer.getSize()).toBe(3);
    expect(buffer.getLatest()).toBe(5);
    expect(buffer.getMin()).toBe(3);
    expect(buffer.getMax()).toBe(5);
    expect(buffer.getMean()).toBe(4);

    const snapshot = buffer.getSnapshot();
    expect(Array.from(snapshot)).toEqual([3, 4, 5]);
  });

  it('test_clear_resetsBufferToEmpty', () => {
    const buffer = new TelemetryRingBuffer(4);
    buffer.push(100);
    buffer.push(200);
    expect(buffer.getSize()).toBe(2);

    buffer.clear();
    expect(buffer.getSize()).toBe(0);
    expect(buffer.getLatest()).toBe(0);
    expect(buffer.getSnapshot().length).toBe(0);
  });

  it('test_constructor_clampsMinimumCapacity', () => {
    const buffer = new TelemetryRingBuffer(0);
    expect(buffer.getCapacity()).toBe(1);

    buffer.push(42);
    expect(buffer.getLatest()).toBe(42);
    expect(buffer.getSize()).toBe(1);

    buffer.push(84);
    expect(buffer.getLatest()).toBe(84);
    expect(buffer.getSize()).toBe(1);
  });
});

