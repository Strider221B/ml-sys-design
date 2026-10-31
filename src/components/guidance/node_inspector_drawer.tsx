import React from 'react';
import { GuidanceConstants } from '@/components/guidance/guidance_constants';
import { HardwareSpecsDatabase } from '@/core/math/hardware_specs_database';
import {
  LlmServingLatencyCalculator,
  LlmServingMetrics,
} from '@/core/math/llm_serving_latency_calculator';
import { MathConstants } from '@/core/math/math_constants';
import { RooflineModelProfiler } from '@/core/math/roofline_model_profiler';
import { InspectorNodeData } from '@/core/state/guidance_types';

export interface NodeInspectorDrawerProps {
  isOpen: boolean;
  selectedNode: InspectorNodeData | null;
  onClose: () => void;
  onUpdateNode?: ((updatedData: Partial<InspectorNodeData>) => void) | undefined;
  onDuplicateNode?: ((nodeId: string) => void) | undefined;
  onDisconnectEdges?: ((nodeId: string) => void) | undefined;
  onDeleteNode?: ((nodeId: string) => void) | undefined;
  latencyCalculator?: LlmServingLatencyCalculator | undefined;
  rooflineProfiler?: RooflineModelProfiler | undefined;
}

/**
 * Slide-out node configuration panel providing parameter sliders, metric explainers, and live impact badges.
 */
export class NodeInspectorDrawer extends React.Component<NodeInspectorDrawerProps> {
  private static readonly _MIN_QPS = 100;
  private static readonly _MAX_QPS = 20000;
  private static readonly _STEP_QPS = 100;
  private static readonly _MIN_BATCH = 1;
  private static readonly _MAX_BATCH = 64;
  private static readonly _DEFAULT_PARAMS_B = 70;
  private static readonly _DEFAULT_PROMPT_TOKENS = 2048;
  private static readonly _DEFAULT_OUTPUT_TOKENS = 512;
  private static readonly _HOURS_PER_MONTH = 730;

  public constructor(props: NodeInspectorDrawerProps) {
    super(props);
    const db = new HardwareSpecsDatabase();
    this._calc = props.latencyCalculator ?? new LlmServingLatencyCalculator(db);
    this._profiler = props.rooflineProfiler ?? new RooflineModelProfiler(db);
    this._db = db;
  }

  public override render(): React.ReactNode {
    if (!this.props.isOpen || !this.props.selectedNode) {
      return null;
    }
    const node = this.props.selectedNode;
    return (
      <aside
        className="fixed top-0 right-0 h-full w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-40 flex flex-col text-xs text-slate-200 overflow-hidden"
        role="dialog"
        aria-label={`Node Inspector: ${node.label}`}
        onKeyDown={this._handleKeyDown}
      >
        {this._renderHeader(node)}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {this._renderParameters(node)}
          {this._renderLiveImpactSection(node)}
          {this._renderMetricExplainers(node)}
        </div>
        {this._renderFooterActions(node)}
      </aside>
    );
  }

  private readonly _calc: LlmServingLatencyCalculator;
  private readonly _profiler: RooflineModelProfiler;
  private readonly _db: HardwareSpecsDatabase;

  private _handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.props.onClose();
    }
  };

  private _computeCurrentMetrics(node: InspectorNodeData, chipId: string): LlmServingMetrics {
    return this._calc.calculateLlmLatency({
      activeParamsBillion: NodeInspectorDrawer._DEFAULT_PARAMS_B,
      promptTokens: node.promptTokens ?? NodeInspectorDrawer._DEFAULT_PROMPT_TOKENS,
      outputTokens: node.outputTokens ?? NodeInspectorDrawer._DEFAULT_OUTPUT_TOKENS,
      chipId,
      batchSize: node.batchSize,
      quantizationBits: node.quantizationBits,
    });
  }

  private _computeMetrics(node: InspectorNodeData): {
    current: LlmServingMetrics;
    vramSavedGb: number;
    monthlySavingsUsd: number;
  } {
    const chipId = node.chipId || MathConstants.CHIP_NVIDIA_H100_SXM5;
    const current = this._computeCurrentMetrics(node, chipId);
    const fp16 = this._calc.calculateLlmLatency({
      activeParamsBillion: NodeInspectorDrawer._DEFAULT_PARAMS_B,
      promptTokens: node.promptTokens ?? NodeInspectorDrawer._DEFAULT_PROMPT_TOKENS,
      outputTokens: node.outputTokens ?? NodeInspectorDrawer._DEFAULT_OUTPUT_TOKENS,
      chipId,
      batchSize: node.batchSize,
      quantizationBits: 16,
    });
    const vramSavedGb = Math.max(0, fp16.totalVramGb - current.totalVramGb);
    const hourlyCost = this._db.getSpecs(chipId).costPerHourUsd;
    const ratio = Math.min(1, vramSavedGb / (fp16.totalVramGb || 1));
    const monthlySavingsUsd = Math.round(ratio * hourlyCost * NodeInspectorDrawer._HOURS_PER_MONTH);
    return { current, vramSavedGb, monthlySavingsUsd };
  }

  private _renderHeader(node: InspectorNodeData): React.ReactNode {
    return (
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-950/60">
        <div>
          <h2 className="font-bold text-white text-sm">{node.label}</h2>
          <span className="text-[10px] text-slate-400 font-mono">
            {node.type} • {node.id}
          </span>
        </div>
        <button
          type="button"
          onClick={this.props.onClose}
          className="text-slate-400 hover:text-white font-bold p-1 rounded hover:bg-slate-800 transition"
          aria-label="Close Inspector"
        >
          ✕
        </button>
      </div>
    );
  }

  private _renderParameters(node: InspectorNodeData): React.ReactNode {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
          Node Configuration
        </h3>
        {this._renderQpsControl(node)}
        {this._renderBatchSizeControl(node)}
        {this._renderQuantizationControl(node)}
        {this._renderHardwareControl(node)}
      </div>
    );
  }

  private _renderQpsControl(node: InspectorNodeData): React.ReactNode {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <label htmlFor="qps-slider" className="text-slate-400">
            Ingress QPS <span title={GuidanceConstants.TOOLTIP_QPS}>(?)</span>
          </label>
          <span className="font-mono text-indigo-400 font-semibold">{node.qps} req/s</span>
        </div>
        <input
          id="qps-slider"
          type="range"
          min={NodeInspectorDrawer._MIN_QPS}
          max={NodeInspectorDrawer._MAX_QPS}
          step={NodeInspectorDrawer._STEP_QPS}
          value={node.qps}
          onChange={(e) => this.props.onUpdateNode?.({ qps: Number(e.target.value) })}
          className="w-full accent-indigo-600 bg-slate-800"
        />
      </div>
    );
  }

  private _renderBatchSizeControl(node: InspectorNodeData): React.ReactNode {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <label htmlFor="batch-slider" className="text-slate-400">
            Batch Size <span title={GuidanceConstants.TOOLTIP_BATCH_SIZE}>(?)</span>
          </label>
          <span className="font-mono text-indigo-400 font-semibold">{node.batchSize}</span>
        </div>
        <input
          id="batch-slider"
          type="range"
          min={NodeInspectorDrawer._MIN_BATCH}
          max={NodeInspectorDrawer._MAX_BATCH}
          value={node.batchSize}
          onChange={(e) => this.props.onUpdateNode?.({ batchSize: Number(e.target.value) })}
          className="w-full accent-indigo-600 bg-slate-800"
        />
      </div>
    );
  }

  private _renderQuantizationControl(node: InspectorNodeData): React.ReactNode {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-slate-400">
          Quantization <span title={GuidanceConstants.TOOLTIP_QUANT}>(?)</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {this._renderQuantBtn(node, 16, 'FP16')}
          {this._renderQuantBtn(node, 8, 'INT8')}
          {this._renderQuantBtn(node, 4, 'INT4 AWQ')}
        </div>
      </div>
    );
  }

  private _renderQuantBtn(node: InspectorNodeData, bits: number, label: string): React.ReactNode {
    const isSel = node.quantizationBits === bits;
    return (
      <button
        key={bits}
        type="button"
        onClick={() => this.props.onUpdateNode?.({ quantizationBits: bits })}
        className={`py-1 rounded font-semibold border transition ${
          isSel
            ? 'bg-indigo-600 border-indigo-500 text-white'
            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
        }`}
      >
        {label}
      </button>
    );
  }

  private _renderHardwareControl(node: InspectorNodeData): React.ReactNode {
    const chips = this._db.listChips();
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor="chip-selector" className="text-slate-400">
          Accelerator SKU
        </label>
        <select
          id="chip-selector"
          value={node.chipId || MathConstants.CHIP_NVIDIA_H100_SXM5}
          onChange={(e) => this.props.onUpdateNode?.({ chipId: e.target.value })}
          className="bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          {chips.map((chip) => (
            <option key={chip.chipId} value={chip.chipId}>
              {chip.name} ({chip.vramCapacityGb}GB VRAM, ${chip.costPerHourUsd}/hr)
            </option>
          ))}
        </select>
      </div>
    );
  }

  private _renderLiveImpactSection(node: InspectorNodeData): React.ReactNode {
    const { current, vramSavedGb, monthlySavingsUsd } = this._computeMetrics(node);
    return (
      <div className="rounded-lg bg-indigo-950/30 border border-indigo-500/30 p-3 flex flex-col gap-2">
        <span className="font-semibold text-indigo-300 text-[11px] uppercase tracking-wider">
          Live Impact Preview
        </span>
        {this._renderLiveMetricsGrid(current, vramSavedGb)}
        <p className="text-[11px] text-indigo-200/90 leading-snug pt-1 border-t border-indigo-500/20">
          Estimated savings: <strong className="text-emerald-400">${monthlySavingsUsd}/mo</strong>{' '}
          compared to unquantized baseline.
        </p>
      </div>
    );
  }

  private _renderLiveMetricsGrid(
    current: LlmServingMetrics,
    vramSavedGb: number
  ): React.ReactNode {
    return (
      <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono">
        <div>
          <span className="text-[10px] text-slate-400 block">Prefill TTFT</span>
          <span className="text-white font-bold">{current.ttftMs.toFixed(1)} ms</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">Decode TPOT</span>
          <span className="text-white font-bold">{current.tpotMs.toFixed(1)} ms/tok</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">VRAM Footprint</span>
          <span className="text-white font-bold">{current.totalVramGb.toFixed(1)} GB</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">VRAM Delta</span>
          <span className="text-emerald-400 font-bold">-{vramSavedGb.toFixed(1)} GB</span>
        </div>
      </div>
    );
  }

  private _renderMetricExplainers(node: InspectorNodeData): React.ReactNode {
    return (
      <div className="flex flex-col gap-2 bg-slate-950/50 border border-slate-800 p-3 rounded-lg">
        <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
          Metric Explainers
        </span>
        <div className="flex flex-col gap-1.5 text-[11px]">
          {this._renderExplainerRow('TTFT', 'Prefill time before 1st token')}
          {this._renderExplainerRow('TPOT', 'Streaming decode time per token')}
          {this._renderExplainerRow('Recall@K', `${node.recallAtK ?? 0.88} top-k precision`)}
        </div>
      </div>
    );
  }

  private _renderExplainerRow(label: string, text: string): React.ReactNode {
    return (
      <div className="flex justify-between">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300">{text}</span>
      </div>
    );
  }

  private _renderFooterActions(node: InspectorNodeData): React.ReactNode {
    return (
      <div className="border-t border-slate-800 p-3 bg-slate-950/70 flex items-center justify-between gap-2">
        {this._renderDuplicateBtn(node.id)}
        {this._renderDisconnectBtn(node.id)}
        {this._renderDeleteBtn(node.id)}
      </div>
    );
  }

  private _renderDuplicateBtn(nodeId: string): React.ReactNode {
    return (
      <button
        type="button"
        onClick={() => this.props.onDuplicateNode?.(nodeId)}
        className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition"
      >
        Duplicate
      </button>
    );
  }

  private _renderDisconnectBtn(nodeId: string): React.ReactNode {
    return (
      <button
        type="button"
        onClick={() => this.props.onDisconnectEdges?.(nodeId)}
        className="px-2.5 py-1.5 rounded bg-amber-950/50 hover:bg-amber-900/60 border border-amber-600/40 text-amber-200 font-medium transition"
      >
        Disconnect
      </button>
    );
  }

  private _renderDeleteBtn(nodeId: string): React.ReactNode {
    return (
      <button
        type="button"
        onClick={() => this.props.onDeleteNode?.(nodeId)}
        className="px-2.5 py-1.5 rounded bg-red-950/60 hover:bg-red-900/70 border border-red-600/40 text-red-200 font-medium transition"
      >
        Delete
      </button>
    );
  }
}
