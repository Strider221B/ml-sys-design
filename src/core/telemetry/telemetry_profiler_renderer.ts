import { TelemetryConstants } from '@/core/telemetry/telemetry_constants';
import { TelemetryRingBuffer } from '@/core/telemetry/telemetry_ring_buffer';

export interface Canvas2DContextLike {
  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  fill(): void;
  closePath(): void;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  fillStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
}

export interface CanvasLike {
  width: number;
  height: number;
  getContext(contextId: '2d'): Canvas2DContextLike | null;
}

export interface MetricSeriesConfig {
  metricKey: string;
  buffer: TelemetryRingBuffer;
  color: string;
}

/**
 * 60 FPS visual telemetry renderer rendering multi-series time-series onto Canvas.
 */
export class TelemetryProfilerRenderer {
  private static readonly _DEFAULT_COLOR = '#00ffcc';
  private static readonly _BG_COLOR = '#0f172a';
  private static readonly _GRID_COLOR = '#1e293b';
  private static readonly _LINE_WIDTH = 2;
  private static readonly _GRID_STEPS = 4;
  private static readonly _MS_PER_SECOND = 1000;
  private static readonly _DEFAULT_MAX_VALUE = 100;
  private static readonly _MIN_DYNAMIC_RANGE = 0.001;

  public constructor(
    private readonly _canvas: CanvasLike,
    private readonly _seriesMap: Map<string, MetricSeriesConfig> = new Map(),
    private _running: boolean = false,
    private _rafId: number | null = null,
    private _lastFrameTimestamp: number = 0,
    private _fps: number = TelemetryConstants.TARGET_FPS
  ) {}

  /**
   * Starts the animation loop for continuous 60 FPS rendering.
   */
  public start(): void {
    if (this._running) return;
    this._running = true;
    this._lastFrameTimestamp = Date.now();
    this._scheduleNextTick();
  }

  /**
   * Stops the active rendering loop.
   */
  public stop(): void {
    this._running = false;
    if (this._rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._rafId);
    }
    this._rafId = null;
  }

  /**
   * Attaches a telemetry buffer to be rendered.
   */
  public attachBuffer(
    metricKey: string,
    buffer: TelemetryRingBuffer,
    color: string = TelemetryProfilerRenderer._DEFAULT_COLOR
  ): void {
    this._seriesMap.set(metricKey, { metricKey, buffer, color });
  }

  /**
   * Detaches a telemetry buffer.
   */
  public detachBuffer(metricKey: string): boolean {
    return this._seriesMap.delete(metricKey);
  }

  /**
   * Renders a single frame to the canvas immediately.
   */
  public renderFrame(): void {
    const ctx = this._canvas.getContext('2d');
    if (!ctx) return;

    this._drawBackgroundAndGrid(ctx);
    const maxValue = this._computeGlobalMax();

    for (const config of this._seriesMap.values()) {
      this._renderSeries(ctx, config, maxValue);
    }
    this._updateFpsCounter();
  }

  /**
   * Returns current running status.
   */
  public isRunning(): boolean {
    return this._running;
  }

  /**
   * Returns current measured FPS.
   */
  public getFps(): number {
    return this._fps;
  }

  /**
   * Returns count of registered series buffers.
   */
  public getSeriesCount(): number {
    return this._seriesMap.size;
  }

  private _scheduleNextTick(): void {
    if (!this._running) return;

    if (typeof requestAnimationFrame === 'function') {
      this._rafId = requestAnimationFrame(() => {
        this.renderFrame();
        this._scheduleNextTick();
      });
    } else {
      this.renderFrame();
    }
  }

  private _drawBackgroundAndGrid(ctx: Canvas2DContextLike): void {
    const w = this._canvas.width;
    const h = this._canvas.height;
    ctx.fillStyle = TelemetryProfilerRenderer._BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = TelemetryProfilerRenderer._GRID_COLOR;
    ctx.lineWidth = 1;

    for (let i = 1; i < TelemetryProfilerRenderer._GRID_STEPS; i++) {
      const y = (h / TelemetryProfilerRenderer._GRID_STEPS) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  private _computeGlobalMax(): number {
    let globalMax = TelemetryProfilerRenderer._MIN_DYNAMIC_RANGE;
    for (const config of this._seriesMap.values()) {
      const seriesMax = config.buffer.getMax();
      if (seriesMax > globalMax) {
        globalMax = seriesMax;
      }
    }
    return Math.max(globalMax, TelemetryProfilerRenderer._DEFAULT_MAX_VALUE);
  }

  private _renderSeries(
    ctx: Canvas2DContextLike,
    config: MetricSeriesConfig,
    maxValue: number
  ): void {
    const snapshot = config.buffer.getSnapshot();
    if (snapshot.length < 2) return;

    const w = this._canvas.width;
    const h = this._canvas.height;
    ctx.strokeStyle = config.color;
    ctx.lineWidth = TelemetryProfilerRenderer._LINE_WIDTH;
    ctx.beginPath();

    for (let i = 0; i < snapshot.length; i++) {
      const x = (i / (snapshot.length - 1)) * w;
      const normalizedY = 1 - (snapshot[i] ?? 0) / maxValue;
      const y = Math.max(0, Math.min(h, normalizedY * h));
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  private _updateFpsCounter(): void {
    const now = Date.now();
    const deltaMs = now - this._lastFrameTimestamp;
    if (deltaMs > 0) {
      const instantFps = TelemetryProfilerRenderer._MS_PER_SECOND / deltaMs;
      this._fps = Math.round(this._fps * 0.9 + instantFps * 0.1);
    }
    this._lastFrameTimestamp = now;
  }
}
