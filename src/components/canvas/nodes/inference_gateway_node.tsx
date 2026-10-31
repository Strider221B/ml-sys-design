import React from 'react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

export interface InferenceGatewayNodeData {
  label?: string;
  status?: string;
  rateLimitQps?: number;
  timeoutMs?: number;
  qps?: number;
  p99LatencyMs?: number;
}

/**
 * Visual canvas node representing an ML API Ingress Gateway with rate limiting and routing.
 */
export class InferenceGatewayNode extends React.Component<NodeProps> {
  private static readonly _DEFAULT_LABEL = 'Inference Gateway';
  private static readonly _DEFAULT_RATE_LIMIT = 5000;
  private static readonly _DEFAULT_TIMEOUT_MS = 200;
  private static readonly _DEFAULT_QPS = 1200;
  private static readonly _DEFAULT_P99_MS = 14.5;
  private static readonly _DEFAULT_STATUS = CanvasConstants.STATUS_OPTIMAL;

  private static readonly _BORDER_HEALTHY = 'border-emerald-500';
  private static readonly _BORDER_WARNING = 'border-amber-500';
  private static readonly _BORDER_CRITICAL = 'border-rose-500';
  private static readonly _BORDER_CHAOS = 'border-purple-500';

  public constructor(props: NodeProps) {
    super(props);
  }

  public override render(): React.ReactNode {
    const data = (this.props.data as InferenceGatewayNodeData | undefined) ?? {};
    const status = data.status ?? InferenceGatewayNode._DEFAULT_STATUS;
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
        return InferenceGatewayNode._BORDER_WARNING;
      case CanvasConstants.STATUS_OVERFLOW:
        return InferenceGatewayNode._BORDER_CRITICAL;
      case CanvasConstants.STATUS_CHAOS:
        return InferenceGatewayNode._BORDER_CHAOS;
      default:
        return InferenceGatewayNode._BORDER_HEALTHY;
    }
  }

  private _buildAriaLabel(data: InferenceGatewayNodeData, status: string): string {
    const label = data.label ?? InferenceGatewayNode._DEFAULT_LABEL;
    const p99 = data.p99LatencyMs ?? InferenceGatewayNode._DEFAULT_P99_MS;
    return `${label}. Status: ${status}. p99 latency ${p99}ms.`;
  }

  private _renderHeader(data: InferenceGatewayNodeData, status: string): React.ReactNode {
    const label = data.label ?? InferenceGatewayNode._DEFAULT_LABEL;
    return (
      <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2">
        <span className="font-semibold text-xs tracking-wide truncate">{label}</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
          {status}
        </span>
      </div>
    );
  }

  private _renderTelemetry(data: InferenceGatewayNodeData): React.ReactNode {
    return (
      <div className="space-y-1 text-[11px] font-mono text-neutral-400">
        {this._renderConfigMetrics(data)}
        {this._renderRuntimeMetrics(data)}
      </div>
    );
  }

  private _renderConfigMetrics(data: InferenceGatewayNodeData): React.ReactNode {
    const rateLimit = data.rateLimitQps ?? InferenceGatewayNode._DEFAULT_RATE_LIMIT;
    const timeout = data.timeoutMs ?? InferenceGatewayNode._DEFAULT_TIMEOUT_MS;
    return (
      <>
        <div className="flex justify-between">
          <span>Rate Limit:</span>
          <span className="text-neutral-200">{rateLimit} QPS</span>
        </div>
        <div className="flex justify-between">
          <span>Timeout:</span>
          <span className="text-neutral-200">{timeout} ms</span>
        </div>
      </>
    );
  }

  private _renderRuntimeMetrics(data: InferenceGatewayNodeData): React.ReactNode {
    const qps = data.qps ?? InferenceGatewayNode._DEFAULT_QPS;
    const p99 = data.p99LatencyMs ?? InferenceGatewayNode._DEFAULT_P99_MS;
    return (
      <div className="flex justify-between">
        <span>Load / p99:</span>
        <span className="text-emerald-400">
          {qps} QPS / {p99}ms
        </span>
      </div>
    );
  }
}
