import React from 'react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

export interface FeatureStoreNodeData {
  label?: string;
  storageBackend?: string;
  p99ReadLatencyMs?: number;
  ttlSeconds?: number;
  streamingIngestion?: boolean;
  status?: string;
}

/**
 * Visual canvas node representing an online low-latency feature store.
 */
export class FeatureStoreNode extends React.Component<NodeProps> {
  private static readonly _DEFAULT_LABEL = 'Feature Store';
  private static readonly _DEFAULT_BACKEND = 'Redis / Feast';
  private static readonly _DEFAULT_P99_MS = 1.2;
  private static readonly _DEFAULT_TTL = 86400;
  private static readonly _DEFAULT_STATUS = CanvasConstants.STATUS_OPTIMAL;

  private static readonly _BORDER_HEALTHY = 'border-amber-400';
  private static readonly _BORDER_WARNING = 'border-amber-600';
  private static readonly _BORDER_CRITICAL = 'border-rose-500';
  private static readonly _BORDER_CHAOS = 'border-purple-500';

  public constructor(props: NodeProps) {
    super(props);
  }

  public override render(): React.ReactNode {
    const data = (this.props.data as FeatureStoreNodeData | undefined) ?? {};
    const status = data.status ?? FeatureStoreNode._DEFAULT_STATUS;
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
        return FeatureStoreNode._BORDER_WARNING;
      case CanvasConstants.STATUS_OVERFLOW:
        return FeatureStoreNode._BORDER_CRITICAL;
      case CanvasConstants.STATUS_CHAOS:
        return FeatureStoreNode._BORDER_CHAOS;
      default:
        return FeatureStoreNode._BORDER_HEALTHY;
    }
  }

  private _buildAriaLabel(data: FeatureStoreNodeData, status: string): string {
    const label = data.label ?? FeatureStoreNode._DEFAULT_LABEL;
    const p99 = data.p99ReadLatencyMs ?? FeatureStoreNode._DEFAULT_P99_MS;
    return `${label}. Backend: ${data.storageBackend ?? FeatureStoreNode._DEFAULT_BACKEND}. Read p99: ${p99}ms. Status: ${status}.`;
  }

  private _renderHeader(data: FeatureStoreNodeData, status: string): React.ReactNode {
    const label = data.label ?? FeatureStoreNode._DEFAULT_LABEL;
    return (
      <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2">
        <span className="font-semibold text-xs truncate">{label}</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
          {status}
        </span>
      </div>
    );
  }

  private _renderTelemetry(data: FeatureStoreNodeData): React.ReactNode {
    return (
      <div className="space-y-1 text-[11px] font-mono text-neutral-400">
        {this._renderBackendSpecs(data)}
        {this._renderIngestionSpecs(data)}
      </div>
    );
  }

  private _renderBackendSpecs(data: FeatureStoreNodeData): React.ReactNode {
    const backend = data.storageBackend ?? FeatureStoreNode._DEFAULT_BACKEND;
    const p99 = data.p99ReadLatencyMs ?? FeatureStoreNode._DEFAULT_P99_MS;
    return (
      <>
        <div className="flex justify-between">
          <span>Backend:</span>
          <span className="text-neutral-200">{backend}</span>
        </div>
        <div className="flex justify-between">
          <span>Online Read p99:</span>
          <span className="text-emerald-400">{p99} ms</span>
        </div>
      </>
    );
  }

  private _renderIngestionSpecs(data: FeatureStoreNodeData): React.ReactNode {
    const ttl = data.ttlSeconds ?? FeatureStoreNode._DEFAULT_TTL;
    const streaming = data.streamingIngestion !== false ? 'Active' : 'Disabled';
    return (
      <>
        <div className="flex justify-between">
          <span>TTL:</span>
          <span className="text-neutral-200">{ttl}s</span>
        </div>
        <div className="flex justify-between border-t border-neutral-800 pt-1 text-neutral-300">
          <span>Streaming:</span>
          <span className="text-indigo-400">{streaming}</span>
        </div>
      </>
    );
  }
}

