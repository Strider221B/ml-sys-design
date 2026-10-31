import React from 'react';
import { Handle, NodeProps, NodeResizer, Position } from '@xyflow/react';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

export interface ModelWorkerNodeData {
  label?: string;
  modelName?: string;
  hardwareSku?: string;
  quantization?: string;
  vramUsedGb?: number;
  vramTotalGb?: number;
  ttftMs?: number;
  tpotMs?: number;
  status?: string;
}

/**
 * Visual canvas compute block representing a vLLM/TensorRT-LLM model serving cluster.
 */
export class ModelWorkerNode extends React.Component<NodeProps> {
  private static readonly _DEFAULT_LABEL = 'Model Worker';
  private static readonly _DEFAULT_MODEL = 'Llama-3-70B';
  private static readonly _DEFAULT_SKU = '4x NVIDIA H100';
  private static readonly _DEFAULT_QUANT = 'INT4';
  private static readonly _DEFAULT_VRAM_USED = 61.2;
  private static readonly _DEFAULT_VRAM_TOTAL = 80.0;
  private static readonly _DEFAULT_TTFT_MS = 68.0;
  private static readonly _DEFAULT_TPOT_MS = 12.4;
  private static readonly _DEFAULT_STATUS = CanvasConstants.STATUS_OPTIMAL;

  private static readonly _BORDER_HEALTHY = 'border-emerald-500';
  private static readonly _BORDER_WARNING = 'border-amber-500';
  private static readonly _BORDER_CRITICAL = 'border-rose-500';
  private static readonly _BORDER_CHAOS = 'border-purple-500';

  public constructor(props: NodeProps) {
    super(props);
  }

  public override render(): React.ReactNode {
    const data = (this.props.data as ModelWorkerNodeData | undefined) ?? {};
    const status = data.status ?? ModelWorkerNode._DEFAULT_STATUS;
    const borderClass = this._resolveBorderClass(status);
    const selectedClass = this.props.selected ? 'ring-2 ring-indigo-400' : '';

    return (
      <div
        className={`w-72 rounded-md border-2 bg-neutral-900 p-3 text-neutral-100 shadow-md ${borderClass} ${selectedClass}`}
        role="region"
        aria-label={this._buildAriaLabel(data, status)}
      >
        <NodeResizer minWidth={260} minHeight={160} isVisible={Boolean(this.props.selected)} />
        <Handle type="target" position={Position.Left} id={CanvasConstants.HANDLE_IN} />
        {this._renderHeader(data, status)}
        {this._renderHardwareSpecs(data)}
        {this._renderPerformanceMetrics(data)}
        <Handle type="source" position={Position.Right} id={CanvasConstants.HANDLE_OUT} />
      </div>
    );
  }

  private _resolveBorderClass(status: string): string {
    switch (status) {
      case CanvasConstants.STATUS_BOTTLENECK:
        return ModelWorkerNode._BORDER_WARNING;
      case CanvasConstants.STATUS_OVERFLOW:
        return ModelWorkerNode._BORDER_CRITICAL;
      case CanvasConstants.STATUS_CHAOS:
        return ModelWorkerNode._BORDER_CHAOS;
      default:
        return ModelWorkerNode._BORDER_HEALTHY;
    }
  }

  private _buildAriaLabel(data: ModelWorkerNodeData, status: string): string {
    const model = data.modelName ?? ModelWorkerNode._DEFAULT_MODEL;
    const ttft = data.ttftMs ?? ModelWorkerNode._DEFAULT_TTFT_MS;
    return `${model} serving worker. Status: ${status}. TTFT: ${ttft}ms.`;
  }

  private _renderHeader(data: ModelWorkerNodeData, status: string): React.ReactNode {
    const label = data.label ?? ModelWorkerNode._DEFAULT_LABEL;
    const model = data.modelName ?? ModelWorkerNode._DEFAULT_MODEL;
    return (
      <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2">
        <span className="font-semibold text-xs truncate">
          {label} ({model})
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
          {status}
        </span>
      </div>
    );
  }

  private _renderHardwareSpecs(data: ModelWorkerNodeData): React.ReactNode {
    const sku = data.hardwareSku ?? ModelWorkerNode._DEFAULT_SKU;
    const quant = data.quantization ?? ModelWorkerNode._DEFAULT_QUANT;
    const used = data.vramUsedGb ?? ModelWorkerNode._DEFAULT_VRAM_USED;
    const total = data.vramTotalGb ?? ModelWorkerNode._DEFAULT_VRAM_TOTAL;

    return (
      <div className="space-y-1 text-[11px] font-mono text-neutral-400 mb-2">
        <div className="flex justify-between">
          <span>GPU / Quant:</span>
          <span className="text-neutral-200">
            {sku} · {quant}
          </span>
        </div>
        <div className="flex justify-between">
          <span>VRAM Usage:</span>
          <span className="text-neutral-200">
            {used} / {total} GB
          </span>
        </div>
      </div>
    );
  }

  private _renderPerformanceMetrics(data: ModelWorkerNodeData): React.ReactNode {
    const ttft = data.ttftMs ?? ModelWorkerNode._DEFAULT_TTFT_MS;
    const tpot = data.tpotMs ?? ModelWorkerNode._DEFAULT_TPOT_MS;

    return (
      <div className="flex justify-between text-[11px] font-mono border-t border-neutral-800 pt-1.5 text-neutral-300">
        <span>TTFT: {ttft}ms</span>
        <span className="text-indigo-400">TPOT: {tpot}ms/tok</span>
      </div>
    );
  }
}

