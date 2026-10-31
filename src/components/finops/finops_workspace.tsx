import React from 'react';
import { ChipSpecs, HardwareSpecsDatabase } from '@/core/math/hardware_specs_database';
import { LlmServingLatencyCalculator, LlmServingMetrics } from '@/core/math/llm_serving_latency_calculator';
import { MathConstants } from '@/core/math/math_constants';
import { RooflineModelProfiler, RooflineResult } from '@/core/math/roofline_model_profiler';

export interface FinopsWorkspaceProps {
  db?: HardwareSpecsDatabase;
}

export interface FinopsWorkspaceState {
  selectedChipId: string;
  operationalIntensity: number;
  rooflineResult: RooflineResult | null;
  modelParamsBillion: number;
  batchSize: number;
  quantizationBits: number;
  promptTokens: number;
  outputTokens: number;
  llmMetrics: LlmServingMetrics | null;
  gpuCount: number;
}

/**
 * FinOps unit economics, hardware specs database, and Roofline model profiler workspace.
 */
export class FinopsWorkspace extends React.Component<FinopsWorkspaceProps, FinopsWorkspaceState> {
  private static readonly _DEFAULT_CHIP = MathConstants.CHIP_NVIDIA_H100_SXM5;
  private static readonly _DEFAULT_INTENSITY = 80;
  private static readonly _DEFAULT_FLOPS_UNIT = 1000;
  private static readonly _HOURS_PER_MONTH = 730;

  public constructor(props: FinopsWorkspaceProps) {
    super(props);
    this._db = props.db ?? new HardwareSpecsDatabase();
    this._rooflineProfiler = new RooflineModelProfiler(this._db);
    this._latencyCalculator = new LlmServingLatencyCalculator(this._db);
    this.state = {
      selectedChipId: FinopsWorkspace._DEFAULT_CHIP,
      operationalIntensity: FinopsWorkspace._DEFAULT_INTENSITY,
      rooflineResult: null,
      modelParamsBillion: 70,
      batchSize: 8,
      quantizationBits: 16,
      promptTokens: 2048,
      outputTokens: 256,
      llmMetrics: null,
      gpuCount: 8,
    };
  }

  public override componentDidMount(): void {
    this._recomputeAll();
  }

  public override render(): React.ReactNode {
    return (
      <div className="flex flex-col gap-6 p-6 bg-slate-950 text-slate-100 min-h-full">
        {this._renderHeader()}
        {this._renderChipSelector()}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {this._renderRooflineSection()}
          {this._renderLatencySection()}
        </div>
        {this._renderFinOpsBudgetSection()}
      </div>
    );
  }

  private readonly _db: HardwareSpecsDatabase;
  private readonly _rooflineProfiler: RooflineModelProfiler;
  private readonly _latencyCalculator: LlmServingLatencyCalculator;

  private _recomputeAll(): void {
    const chip = this.state.selectedChipId;
    const roofline = this._rooflineProfiler.profileWorkload(
      this.state.operationalIntensity * FinopsWorkspace._DEFAULT_FLOPS_UNIT,
      FinopsWorkspace._DEFAULT_FLOPS_UNIT,
      chip
    );
    const metrics = this._latencyCalculator.calculateLlmLatency({
      activeParamsBillion: this.state.modelParamsBillion,
      promptTokens: this.state.promptTokens,
      outputTokens: this.state.outputTokens,
      chipId: chip,
      batchSize: this.state.batchSize,
      quantizationBits: this.state.quantizationBits,
    });
    this.setState({ rooflineResult: roofline, llmMetrics: metrics });
  }

  private _handleChipChange(chipId: string): void {
    this.setState({ selectedChipId: chipId }, () => this._recomputeAll());
  }

  private _renderHeader(): React.ReactNode {
    return (
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">FinOps & Hardware Acceleration Engine</h1>
          <p className="text-sm text-slate-400">Williams Roofline model bounds, inference latency breakdown, and GPU cluster unit economics.</p>
        </div>
      </div>
    );
  }

  private _renderChipSelector(): React.ReactNode {
    const current = this._db.getSpecs(this.state.selectedChipId);
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-300">Selected Hardware Accelerator SKU:</span>
          {this._renderChipButtons()}
        </div>
        {this._renderChipMetricsGrid(current)}
      </div>
    );
  }

  private _renderChipButtons(): React.ReactNode {
    const chips = this._db.listChips();
    return (
      <div className="flex flex-wrap gap-2">
        {chips.map((chip: ChipSpecs) => (
          <button
            key={chip.chipId}
            onClick={() => this._handleChipChange(chip.chipId)}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              this.state.selectedChipId === chip.chipId
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {chip.name}
          </button>
        ))}
      </div>
    );
  }

  private _renderChipMetricsGrid(current: ChipSpecs): React.ReactNode {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-slate-800 pt-3">
        <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block">Peak FP16/BF16</span>
          <span className="text-base font-bold text-emerald-400">{current.peakTflops} TFLOPS</span>
        </div>
        <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block">Memory Bandwidth</span>
          <span className="text-base font-bold text-cyan-400">{current.memoryBandwidthGbps} GB/s</span>
        </div>
        <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block">VRAM Capacity</span>
          <span className="text-base font-bold text-indigo-400">{current.vramCapacityGb} GB</span>
        </div>
        <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block">Cloud Rate</span>
          <span className="text-base font-bold text-amber-400">${current.costPerHourUsd.toFixed(2)}/hr</span>
        </div>
      </div>
    );
  }

  private _renderRooflineSection(): React.ReactNode {
    const res = this.state.rooflineResult;
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Williams Roofline Model Profiler</h2>
          {res && (
            <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${
              res.bottleneck === 'COMPUTE_BOUND'
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-amber-950 text-amber-400 border-amber-800'
            }`}>
              {res.bottleneck}
            </span>
          )}
        </div>
        {this._renderIntensityInput()}
        {res && this._renderRooflineStats(res)}
      </div>
    );
  }

  private _renderIntensityInput(): React.ReactNode {
    return (
      <div className="flex items-center gap-3 text-xs">
        <label className="text-slate-400">Operational Intensity (FLOPs/byte):</label>
        <input
          type="number"
          value={this.state.operationalIntensity}
          onChange={(e) => this.setState({ operationalIntensity: Number(e.target.value) }, () => this._recomputeAll())}
          className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
        />
      </div>
    );
  }

  private _renderRooflineStats(res: RooflineResult): React.ReactNode {
    return (
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-950 p-3 rounded border border-slate-800">
          <span className="text-slate-400">Ridge / Knee Point</span>
          <span className="block text-sm font-bold text-slate-200">{res.kneeIntensity} FLOPs/byte</span>
        </div>
        <div className="bg-slate-950 p-3 rounded border border-slate-800">
          <span className="text-slate-400">Attainable Performance</span>
          <span className="block text-sm font-bold text-emerald-400">{res.attainableGflops.toFixed(1)} GFLOPS</span>
        </div>
      </div>
    );
  }

  private _renderLatencySection(): React.ReactNode {
    const met = this.state.llmMetrics;
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-slate-300">Generative Serving Latency & VRAM Decomposition</h2>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {this._renderModelParamSelect()}
          {this._renderPrecisionSelect()}
          {this._renderBatchInput()}
        </div>
        {met && this._renderLatencyResults(met)}
      </div>
    );
  }

  private _renderModelParamSelect(): React.ReactNode {
    return (
      <div>
        <span className="text-slate-400 block mb-1">Model (Billion):</span>
        <select
          value={this.state.modelParamsBillion}
          onChange={(e) => this.setState({ modelParamsBillion: Number(e.target.value) }, () => this._recomputeAll())}
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
        >
          <option value={8}>8B (Llama-3-8B)</option>
          <option value={70}>70B (Llama-3-70B)</option>
          <option value={405}>405B (Llama-3-405B)</option>
        </select>
      </div>
    );
  }

  private _renderPrecisionSelect(): React.ReactNode {
    return (
      <div>
        <span className="text-slate-400 block mb-1">Precision:</span>
        <select
          value={this.state.quantizationBits}
          onChange={(e) => this.setState({ quantizationBits: Number(e.target.value) }, () => this._recomputeAll())}
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
        >
          <option value={16}>FP16 (16-bit)</option>
          <option value={8}>INT8 (8-bit)</option>
          <option value={4}>INT4 (4-bit)</option>
        </select>
      </div>
    );
  }

  private _renderBatchInput(): React.ReactNode {
    return (
      <div>
        <span className="text-slate-400 block mb-1">Batch Size:</span>
        <input
          type="number"
          value={this.state.batchSize}
          onChange={(e) => this.setState({ batchSize: Number(e.target.value) }, () => this._recomputeAll())}
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
        />
      </div>
    );
  }

  private _renderLatencyResults(met: LlmServingMetrics): React.ReactNode {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-t border-slate-800 pt-3">
        <div className="bg-slate-950 p-2 rounded border border-slate-800">
          <span className="text-slate-400 block">Prefill (TTFT)</span>
          <span className="font-bold text-amber-400">{met.ttftMs.toFixed(1)} ms</span>
        </div>
        <div className="bg-slate-950 p-2 rounded border border-slate-800">
          <span className="text-slate-400 block">Decode (TPOT)</span>
          <span className="font-bold text-emerald-400">{met.tpotMs.toFixed(2)} ms/tok</span>
        </div>
        <div className="bg-slate-950 p-2 rounded border border-slate-800">
          <span className="text-slate-400 block">Throughput</span>
          <span className="font-bold text-cyan-400">{met.tokensPerSecond.toFixed(0)} tok/s</span>
        </div>
        <div className="bg-slate-950 p-2 rounded border border-slate-800">
          <span className="text-slate-400 block">Total VRAM</span>
          <span className="font-bold text-indigo-400">{met.totalVramGb.toFixed(1)} GB</span>
        </div>
      </div>
    );
  }

  private _renderFinOpsBudgetSection(): React.ReactNode {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-slate-300">Cluster FinOps Unit Economics & Monthly Run-Rate</h2>
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          {this._renderClusterGpuInput()}
          {this._renderClusterCostStats()}
        </div>
      </div>
    );
  }

  private _renderClusterGpuInput(): React.ReactNode {
    return (
      <div className="flex items-center gap-3">
        <span className="text-slate-400">Cluster GPU Replicas:</span>
        <input
          type="number"
          value={this.state.gpuCount}
          onChange={(e) => this.setState({ gpuCount: Math.max(1, Number(e.target.value)) })}
          className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
        />
      </div>
    );
  }

  private _renderClusterCostStats(): React.ReactNode {
    const chip = this._db.getSpecs(this.state.selectedChipId);
    const hourlyClusterCost = chip.costPerHourUsd * this.state.gpuCount;
    const monthlyCost = hourlyClusterCost * FinopsWorkspace._HOURS_PER_MONTH;
    return (
      <div className="flex items-center gap-6">
        <div>
          <span className="text-slate-400 block">Hourly Cluster Burn:</span>
          <span className="text-base font-bold text-white">${hourlyClusterCost.toFixed(2)}/hr</span>
        </div>
        <div>
          <span className="text-slate-400 block">Monthly Projected Run-Rate:</span>
          <span className="text-base font-bold text-emerald-400">
            ${monthlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
          </span>
        </div>
      </div>
    );
  }
}
