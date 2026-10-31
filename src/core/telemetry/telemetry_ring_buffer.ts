import { TelemetryConstants } from '@/core/telemetry/telemetry_constants';

/**
 * High-frequency circular ring buffer backed by a typed Float32Array.
 * Optimized for zero-allocation push cycles in 60 FPS telemetry loops.
 */
export class TelemetryRingBuffer {
  private static readonly _DEFAULT_CAPACITY = TelemetryConstants.DEFAULT_BUFFER_CAPACITY;
  private static readonly _EMPTY_VALUE = 0;
  private static readonly _MIN_CAPACITY = 1;

  public constructor(
    private _capacity: number = TelemetryRingBuffer._DEFAULT_CAPACITY,
    private readonly _buffer: Float32Array = new Float32Array(
      Math.max(TelemetryRingBuffer._MIN_CAPACITY, Math.floor(_capacity))
    ),
    private _head: number = 0,
    private _size: number = 0
  ) {
    this._capacity = Math.max(TelemetryRingBuffer._MIN_CAPACITY, Math.floor(this._capacity));
  }

  /**
   * Appends a new metric value into the circular buffer.
   */
  public push(value: number): void {
    this._buffer[this._head] = value;
    this._head = (this._head + 1) % this._capacity;
    if (this._size < this._capacity) {
      this._size++;
    }
  }

  /**
   * Returns an ordered snapshot of metrics from oldest to newest.
   */
  public getSnapshot(): Float32Array {
    const snapshot = new Float32Array(this._size);
    this._copyOrderedValues(snapshot);
    return snapshot;
  }

  /**
   * Retrieves the most recently inserted metric value.
   */
  public getLatest(): number {
    if (this._size === 0) {
      return TelemetryRingBuffer._EMPTY_VALUE;
    }
    const lastIndex = (this._head - 1 + this._capacity) % this._capacity;
    return this._buffer[lastIndex] as number;
  }

  /**
   * Calculates the arithmetic mean of stored values.
   */
  public getMean(): number {
    if (this._size === 0) {
      return TelemetryRingBuffer._EMPTY_VALUE;
    }
    let total = 0;
    for (let i = 0; i < this._size; i++) {
      const idx = this._getPhysicalIndex(i);
      total += this._buffer[idx] as number;
    }
    return total / this._size;
  }

  /**
   * Retrieves the minimum value in the active window.
   */
  public getMin(): number {
    if (this._size === 0) {
      return TelemetryRingBuffer._EMPTY_VALUE;
    }
    let minVal = Number.POSITIVE_INFINITY;
    for (let i = 0; i < this._size; i++) {
      const idx = this._getPhysicalIndex(i);
      const val = this._buffer[idx] as number;
      if (val < minVal) {
        minVal = val;
      }
    }
    return minVal;
  }

  /**
   * Retrieves the maximum value in the active window.
   */
  public getMax(): number {
    if (this._size === 0) {
      return TelemetryRingBuffer._EMPTY_VALUE;
    }
    let maxVal = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < this._size; i++) {
      const idx = this._getPhysicalIndex(i);
      const val = this._buffer[idx] as number;
      if (val > maxVal) {
        maxVal = val;
      }
    }
    return maxVal;
  }

  /**
   * Returns maximum capacity of the buffer.
   */
  public getCapacity(): number {
    return this._capacity;
  }

  /**
   * Returns current count of populated values.
   */
  public getSize(): number {
    return this._size;
  }

  /**
   * Resets the buffer to empty state.
   */
  public clear(): void {
    this._head = 0;
    this._size = 0;
    this._buffer.fill(TelemetryRingBuffer._EMPTY_VALUE);
  }

  private _getPhysicalIndex(logicalIndex: number): number {
    const start = (this._head - this._size + this._capacity) % this._capacity;
    return (start + logicalIndex) % this._capacity;
  }

  private _copyOrderedValues(target: Float32Array): void {
    const start = (this._head - this._size + this._capacity) % this._capacity;
    for (let i = 0; i < this._size; i++) {
      const physIdx = (start + i) % this._capacity;
      target[i] = this._buffer[physIdx] as number;
    }
  }
}
