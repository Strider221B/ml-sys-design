import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Canvas2DContextLike,
  CanvasLike,
  TelemetryProfilerRenderer,
} from '@/core/telemetry/telemetry_profiler_renderer';
import { TelemetryRingBuffer } from '@/core/telemetry/telemetry_ring_buffer';

describe('TelemetryProfilerRenderer', () => {
  let mockCtx: Canvas2DContextLike;
  let mockCanvas: CanvasLike;

  beforeEach(() => {
    mockCtx = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      strokeStyle: '#000',
      fillStyle: '#000',
      lineWidth: 1,
    };

    mockCanvas = {
      width: 400,
      height: 200,
      getContext: vi.fn().mockReturnValue(mockCtx),
    };
  });

  it('test_initialState_isNotRunningAndZeroSeries', () => {
    const renderer = new TelemetryProfilerRenderer(mockCanvas);
    expect(renderer.isRunning()).toBe(false);
    expect(renderer.getSeriesCount()).toBe(0);
    expect(renderer.getFps()).toBe(60);
  });

  it('test_attachAndDetachBuffer_managesSeriesCorrectly', () => {
    const renderer = new TelemetryProfilerRenderer(mockCanvas);
    const buf1 = new TelemetryRingBuffer(10);
    const buf2 = new TelemetryRingBuffer(10);

    renderer.attachBuffer('p99', buf1, '#ff0000');
    renderer.attachBuffer('ttft', buf2, '#00ff00');
    expect(renderer.getSeriesCount()).toBe(2);

    const detached = renderer.detachBuffer('p99');
    expect(detached).toBe(true);
    expect(renderer.getSeriesCount()).toBe(1);

    const detachedAgain = renderer.detachBuffer('non_existent');
    expect(detachedAgain).toBe(false);
  });

  it('test_renderFrame_drawsBackgroundGridAndSeriesPolyline', () => {
    const renderer = new TelemetryProfilerRenderer(mockCanvas);
    const buf = new TelemetryRingBuffer(10);
    buf.push(10);
    buf.push(50);
    buf.push(80);

    renderer.attachBuffer('p99', buf, '#00ffcc');
    renderer.renderFrame();

    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 400, 200);
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.moveTo).toHaveBeenCalled();
    expect(mockCtx.lineTo).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('test_renderFrame_whenContextIsNull_doesNotThrow', () => {
    const nullContextCanvas: CanvasLike = {
      width: 400,
      height: 200,
      getContext: vi.fn().mockReturnValue(null),
    };
    const renderer = new TelemetryProfilerRenderer(nullContextCanvas);
    expect(() => renderer.renderFrame()).not.toThrow();
  });

  it('test_renderFrame_whenSeriesHasFewerThanTwoPoints_skipsDrawingPolyline', () => {
    const renderer = new TelemetryProfilerRenderer(mockCanvas);
    const buf = new TelemetryRingBuffer(10);
    buf.push(42);

    renderer.attachBuffer('single', buf);
    renderer.renderFrame();

    // Background still drawn
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 400, 200);
  });

  it('test_startAndStop_managesRunningLifecycle', () => {
    let rafCallback: (() => void) | null = null;
    vi.stubGlobal('requestAnimationFrame', vi.fn().mockImplementation((cb: () => void) => {
      rafCallback = cb;
      return 101;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const renderer = new TelemetryProfilerRenderer(mockCanvas);
    renderer.start();
    expect(renderer.isRunning()).toBe(true);

    // Invoke scheduled animation frame callback
    if (rafCallback) {
      (rafCallback as () => void)();
    }

    // Starting while running should be a no-op
    renderer.start();
    expect(renderer.isRunning()).toBe(true);

    renderer.stop();
    expect(renderer.isRunning()).toBe(false);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(101);

    // Stopping while stopped should be a no-op
    renderer.stop();
    expect(renderer.isRunning()).toBe(false);

    vi.unstubAllGlobals();
  });
});
