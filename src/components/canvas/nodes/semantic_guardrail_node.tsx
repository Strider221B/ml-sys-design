import React from 'react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

export interface SemanticGuardrailNodeData {
  label?: string;
  guardrailModel?: string;
  toxicityThreshold?: number;
  piiMasking?: boolean;
  latencyOverheadMs?: number;
  status?: string;
}

/**
 * Visual canvas node representing an ML safety classifier, prompt injection filter, and PII scrubber.
 */
export class SemanticGuardrailNode extends React.Component<NodeProps> {
  private static readonly _DEFAULT_LABEL = 'Semantic Guardrail';
  private static readonly _DEFAULT_MODEL = 'Llama-Guard-3 (INT4)';
  private static readonly _DEFAULT_THRESHOLD = 0.85;
  private static readonly _DEFAULT_LATENCY_MS = 12.0;
  private static readonly _DEFAULT_STATUS = CanvasConstants.STATUS_OPTIMAL;

  private static readonly _BORDER_HEALTHY = 'border-emerald-500';
  private static readonly _BORDER_WARNING = 'border-amber-500';
  private static readonly _BORDER_CRITICAL = 'border-rose-500';
  private static readonly _BORDER_CHAOS = 'border-purple-500';

  public constructor(props: NodeProps) {
    super(props);
  }

  public override render(): React.ReactNode {
    const data = (this.props.data as SemanticGuardrailNodeData | undefined) ?? {};
    const status = data.status ?? SemanticGuardrailNode._DEFAULT_STATUS;
    const borderClass = this._resolveBorderClass(status);
    const selectedClass = this.props.selected ? 'ring-2 ring-indigo-400' : '';

    return (
      <div
        className={`w-64 rounded-md border-2 bg-neutral-900 p-3 text-neutral-100 shadow-md ${borderClass} ${selectedClass}`}
        role="region"
        aria-label={this._buildAriaLabel(data, status)}
      >
        <Handle type="target" position={Position.Left} id={CanvasConstants.HANDLE_IN} />
        {this._renderHeader(data, status)}
        {this._renderTelemetry(data)}
        <Handle type="source" position={Position.Right} id={CanvasConstants.HANDLE_OUT} />
      </div>
    );
  }

  private _resolveBorderClass(status: string): string {
    switch (status) {
      case CanvasConstants.STATUS_BOTTLENECK:
        return SemanticGuardrailNode._BORDER_WARNING;
      case CanvasConstants.STATUS_OVERFLOW:
        return SemanticGuardrailNode._BORDER_CRITICAL;
      case CanvasConstants.STATUS_CHAOS:
        return SemanticGuardrailNode._BORDER_CHAOS;
      default:
        return SemanticGuardrailNode._BORDER_HEALTHY;
    }
  }

  private _buildAriaLabel(data: SemanticGuardrailNodeData, status: string): string {
    const label = data.label ?? SemanticGuardrailNode._DEFAULT_LABEL;
    const model = data.guardrailModel ?? SemanticGuardrailNode._DEFAULT_MODEL;
    return `${label}. Model: ${model}. Status: ${status}.`;
  }

  private _renderHeader(data: SemanticGuardrailNodeData, status: string): React.ReactNode {
    const label = data.label ?? SemanticGuardrailNode._DEFAULT_LABEL;
    return (
      <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2">
        <span className="font-semibold text-xs truncate">{label}</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
          {status}
        </span>
      </div>
    );
  }

  private _renderTelemetry(data: SemanticGuardrailNodeData): React.ReactNode {
    return (
      <div className="space-y-1 text-[11px] font-mono text-neutral-400">
        {this._renderModelSpecs(data)}
        {this._renderFilterSpecs(data)}
      </div>
    );
  }

  private _renderModelSpecs(data: SemanticGuardrailNodeData): React.ReactNode {
    const model = data.guardrailModel ?? SemanticGuardrailNode._DEFAULT_MODEL;
    const latency = data.latencyOverheadMs ?? SemanticGuardrailNode._DEFAULT_LATENCY_MS;
    return (
      <>
        <div className="flex justify-between">
          <span>Model:</span>
          <span className="text-neutral-200">{model}</span>
        </div>
        <div className="flex justify-between">
          <span>Latency Overhead:</span>
          <span className="text-emerald-400">+{latency} ms</span>
        </div>
      </>
    );
  }

  private _renderFilterSpecs(data: SemanticGuardrailNodeData): React.ReactNode {
    const threshold = (
      (data.toxicityThreshold ?? SemanticGuardrailNode._DEFAULT_THRESHOLD) * 100
    ).toFixed(0);
    const pii = data.piiMasking !== false ? 'Active' : 'Disabled';
    return (
      <>
        <div className="flex justify-between">
          <span>Toxicity Gate:</span>
          <span className="text-neutral-200">{threshold}%</span>
        </div>
        <div className="flex justify-between border-t border-neutral-800 pt-1 text-neutral-300">
          <span>PII Scrubbing:</span>
          <span className="text-indigo-400">{pii}</span>
        </div>
      </>
    );
  }
}

