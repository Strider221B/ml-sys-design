import React from 'react';
import {
  DiagnosisResult,
  IncidentCatalogItem,
  IncidentLogTrace,
  LogTraceIncidentEngine,
} from '@/core/telemetry/log_trace_incident_engine';
import { IncidentType, TelemetryConstants } from '@/core/telemetry/telemetry_constants';
import { TelemetryProfilerRenderer } from '@/core/telemetry/telemetry_profiler_renderer';
import { TelemetryRingBuffer } from '@/core/telemetry/telemetry_ring_buffer';

export interface TelemetryDashboardProps {
  engine?: LogTraceIncidentEngine;
}

export interface TelemetryDashboardState {
  isProfiling: boolean;
  activeScenario: IncidentType;
  activeTrace: IncidentLogTrace | null;
  selectedRootCause: string;
  diagnosisResult: DiagnosisResult | null;
}

/**
 * 60 FPS telemetry operations console, latency waterfall, and incident triage game.
 */
export class TelemetryDashboard extends React.Component<TelemetryDashboardProps, TelemetryDashboardState> {
  private static readonly _BUFFER_CAPACITY = 60;
  private static readonly _TICK_MS = 100;
  private static readonly _BASE_LATENCY = 65;
  private static readonly _LATENCY_JITTER = 30;

  public constructor(props: TelemetryDashboardProps) {
    super(props);
    this._engine = props.engine ?? new LogTraceIncidentEngine();
    this._canvasRef = React.createRef<HTMLCanvasElement>();
    this._renderer = null;
    this._buffer = null;
    this._intervalId = null;
    this.state = {
      isProfiling: false,
      activeScenario: TelemetryConstants.INCIDENT_CUDA_OOM as IncidentType,
      activeTrace: null,
      selectedRootCause: '',
      diagnosisResult: null,
    };
  }

  public override componentDidMount(): void {
    this._initProfiler();
    this._loadInitialTrace();
  }

  public override componentWillUnmount(): void {
    this._stopProfiler();
  }

  public override render(): React.ReactNode {
    return (
      <div className="flex flex-col gap-6 p-6 bg-slate-950 text-slate-100 min-h-full">
        {this._renderHeader()}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {this._renderProfilerSection()}
          {this._renderWaterfallSection()}
        </div>
        {this._renderIncidentGameSection()}
      </div>
    );
  }

  private readonly _engine: LogTraceIncidentEngine;
  private readonly _canvasRef: React.RefObject<HTMLCanvasElement | null>;
  private _renderer: TelemetryProfilerRenderer | null;
  private _buffer: TelemetryRingBuffer | null;
  private _intervalId: number | null;

  private _initProfiler(): void {
    if (!this._canvasRef.current) return;
    this._buffer = new TelemetryRingBuffer(TelemetryDashboard._BUFFER_CAPACITY);
    this._renderer = new TelemetryProfilerRenderer(this._canvasRef.current);
    this._renderer.attachBuffer('p99_latency', this._buffer, '#10b981');
    this._startProfiler();
  }

  private _loadInitialTrace(): void {
    const trace = this._engine.generateIncidentTrace(this.state.activeScenario);
    this.setState({ activeTrace: trace });
  }

  private _startProfiler(): void {
    if (!this._renderer || !this._buffer) return;
    this._renderer.start();
    this._intervalId = window.setInterval(() => {
      const sample = TelemetryDashboard._BASE_LATENCY + Math.random() * TelemetryDashboard._LATENCY_JITTER;
      this._buffer?.push(sample);
      this._renderer?.renderFrame();
    }, TelemetryDashboard._TICK_MS);
    this.setState({ isProfiling: true });
  }

  private _stopProfiler(): void {
    if (this._intervalId !== null) {
      window.clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._renderer?.stop();
    this.setState({ isProfiling: false });
  }

  private _toggleProfiling(): void {
    if (this.state.isProfiling) {
      this._stopProfiler();
    } else {
      this._startProfiler();
    }
  }

  private _handleScenarioChange(scenario: IncidentType): void {
    const trace = this._engine.generateIncidentTrace(scenario);
    this.setState({
      activeScenario: scenario,
      activeTrace: trace,
      selectedRootCause: '',
      diagnosisResult: null,
    });
  }

  private _handleDiagnose(): void {
    if (!this.state.activeTrace) return;
    const res = this._engine.validateDiagnosis(
      this.state.activeTrace.incidentId,
      this.state.selectedRootCause,
      'Restart pod with scaled VRAM allocation'
    );
    this.setState({ diagnosisResult: res });
  }

  private _renderHeader(): React.ReactNode {
    return (
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Telemetry & Profiler Operations Console</h1>
          <p className="text-sm text-slate-400">Real-time 60 FPS hardware telemetry, SLA latency breakdown, and incident triage.</p>
        </div>
        <button
          onClick={() => this._toggleProfiling()}
          className={`px-4 py-2 rounded text-sm font-semibold transition ${
            this.state.isProfiling ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          {this.state.isProfiling ? 'Pause Stream' : 'Resume 60 FPS Stream'}
        </button>
      </div>
    );
  }

  private _renderProfilerSection(): React.ReactNode {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Live p99 Latency Ring Buffer (60 FPS WebGL/2D)</h2>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
            {this.state.isProfiling ? 'LIVE STREAMING' : 'PAUSED'}
          </span>
        </div>
        <canvas ref={this._canvasRef} width={480} height={180} className="w-full rounded bg-slate-950 border border-slate-800" />
        <div className="flex justify-between text-xs text-slate-400">
          <span>Target FPS: 60</span>
          <span>Window: 60s Ring</span>
          <span className="text-emerald-400">Current p99: ~75ms</span>
        </div>
      </div>
    );
  }

  private _renderWaterfallSection(): React.ReactNode {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-slate-300">LLM Serving Request Lifecycle (End-to-End Flame Graph)</h2>
        <div className="space-y-2 text-xs">
          {this._renderLifecycleBar('Ingress & Routing', '4.2ms', 'bg-blue-500', 'w-1/12')}
          {this._renderLifecycleBar('Tokenizer & BPE Encode', '1.8ms', 'bg-cyan-500', 'w-1/12')}
          {this._renderLifecycleBar('KV Cache Retrieval (88% Hit)', '6.4ms', 'bg-indigo-500', 'w-2/12')}
          {this._renderLifecycleBar('Prefill Phase (TTFT)', '42.0ms', 'bg-amber-500', 'w-5/12')}
          {this._renderLifecycleBar('Autoregressive Decode (TPOT)', '86.5ms', 'bg-emerald-500', 'w-8/12')}
          {this._renderLifecycleBar('Semantic Guardrail Audit', '5.1ms', 'bg-rose-500', 'w-2/12')}
        </div>
        <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
          <span className="text-slate-400">Total Generation Latency: <strong className="text-white">146.0 ms</strong></span>
          <span className="text-emerald-400 font-semibold">STATUS: OPTIMAL (SLA &lt; 180ms)</span>
        </div>
      </div>
    );
  }

  private _renderLifecycleBar(label: string, latency: string, color: string, width: string): React.ReactNode {
    return (
      <div>
        <div className="flex justify-between text-slate-300 mb-0.5">
          <span>{label}</span>
          <span className="font-mono text-slate-400">{latency}</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div className={`${color} ${width} h-full rounded-full`} />
        </div>
      </div>
    );
  }

  private _renderIncidentGameSection(): React.ReactNode {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4">
        {this._renderIncidentGameHeader()}
        {this._renderLogsView()}
        {this._renderDiagnosisBar()}
      </div>
    );
  }

  private _renderIncidentGameHeader(): React.ReactNode {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-300">Production Log Trace Incident Triage Game</h2>
          <p className="text-xs text-slate-400">Inspect messy distributed traces, identify the fault origin, and diagnose root cause.</p>
        </div>
        {this._renderScenarioSelector()}
      </div>
    );
  }

  private _renderScenarioSelector(): React.ReactNode {
    const catalog = this._engine.getIncidentCatalog();
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400">Incident:</label>
        <select
          value={this.state.activeScenario}
          onChange={(e) => this._handleScenarioChange(e.target.value as IncidentType)}
          className="bg-slate-800 border border-slate-700 text-xs rounded px-2 py-1 text-slate-200"
        >
          {catalog.map((c: IncidentCatalogItem) => (
            <option key={c.scenario} value={c.scenario}>{c.scenario}</option>
          ))}
        </select>
      </div>
    );
  }

  private _renderLogsView(): React.ReactNode {
    if (!this.state.activeTrace) return null;
    return (
      <div className="font-mono text-xs bg-slate-950 border border-slate-800 rounded p-3 max-h-48 overflow-y-auto space-y-1">
        {this.state.activeTrace.logs.map((log, idx) => (
          <div key={idx} className="flex gap-2 text-slate-300">
            <span className="text-slate-500">{log.timestamp.slice(11, 19)}</span>
            <span className={`px-1 rounded text-[10px] ${log.level === 'ERROR' ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
              {log.level}
            </span>
            <span className="text-cyan-400">[{log.service}]</span>
            <span className="text-slate-300">{log.message}</span>
          </div>
        ))}
      </div>
    );
  }

  private _renderDiagnosisBar(): React.ReactNode {
    return (
      <div className="flex flex-col gap-3 border-t border-slate-800 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Enter diagnosed root cause..."
            value={this.state.selectedRootCause}
            onChange={(e) => this.setState({ selectedRootCause: e.target.value })}
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          />
          <button
            onClick={() => this._handleDiagnose()}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-semibold text-white transition"
          >
            Submit Diagnosis
          </button>
        </div>
        {this._renderDiagnosisFeedback()}
      </div>
    );
  }

  private _renderDiagnosisFeedback(): React.ReactNode {
    if (!this.state.diagnosisResult) return null;
    const isOk = this.state.diagnosisResult.correct;
    return (
      <div className={`p-3 rounded text-xs border ${
        isOk ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200' : 'bg-rose-950/60 border-rose-800 text-rose-200'
      }`}>
        <span className="font-bold">Score: {this.state.diagnosisResult.score}/100</span> — {this.state.diagnosisResult.explanation}
      </div>
    );
  }
}
