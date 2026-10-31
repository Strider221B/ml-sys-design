import React from 'react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

export interface VectorDatabaseNodeData {
  label?: string;
  indexType?: string;
  dimension?: number;
  shardCount?: number;
  topKRecallPct?: number;
  memoryGb?: number;
  status?: string;
}

/**
 * Visual canvas node representing an HNSW/IVF dense vector database.
 */
export class VectorDatabaseNode extends React.Component<NodeProps> {
  private static readonly _DEFAULT_LABEL = 'Vector Database';
  private static readonly _DEFAULT_INDEX = 'HNSW (Cosine)';
  private static readonly _DEFAULT_DIM = 1536;
  private static readonly _DEFAULT_SHARDS = 4;
  private static readonly _DEFAULT_RECALL = 98.5;
  private static readonly _DEFAULT_MEM_GB = 32.0;
  private static readonly _DEFAULT_STATUS = CanvasConstants.STATUS_OPTIMAL;

  private static readonly _BORDER_HEALTHY = 'border-amber-400';
  private static readonly _BORDER_WARNING = 'border-amber-600';
  private static readonly _BORDER_CRITICAL = 'border-rose-500';
  private static readonly _BORDER_CHAOS = 'border-purple-500';

  public constructor(props: NodeProps) {
    super(props);
  }

  public override render(): React.ReactNode {
    const data = (this.props.data as VectorDatabaseNodeData | undefined) ?? {};
    const status = data.status ?? VectorDatabaseNode._DEFAULT_STATUS;
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
        {this._renderDetails(data)}
        <Handle type="source" position={Position.Right} id={CanvasConstants.HANDLE_OUT} />
      </div>
    );
  }

  private _resolveBorderClass(status: string): string {
    switch (status) {
      case CanvasConstants.STATUS_BOTTLENECK:
        return VectorDatabaseNode._BORDER_WARNING;
      case CanvasConstants.STATUS_OVERFLOW:
        return VectorDatabaseNode._BORDER_CRITICAL;
      case CanvasConstants.STATUS_CHAOS:
        return VectorDatabaseNode._BORDER_CHAOS;
      default:
        return VectorDatabaseNode._BORDER_HEALTHY;
    }
  }

  private _buildAriaLabel(data: VectorDatabaseNodeData, status: string): string {
    const label = data.label ?? VectorDatabaseNode._DEFAULT_LABEL;
    const recall = data.topKRecallPct ?? VectorDatabaseNode._DEFAULT_RECALL;
    return `${label}. Index: ${data.indexType ?? VectorDatabaseNode._DEFAULT_INDEX}. Recall: ${recall}%. Status: ${status}.`;
  }

  private _renderHeader(data: VectorDatabaseNodeData, status: string): React.ReactNode {
    const label = data.label ?? VectorDatabaseNode._DEFAULT_LABEL;
    return (
      <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2">
        <span className="font-semibold text-xs truncate">{label}</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
          {status}
        </span>
      </div>
    );
  }

  private _renderDetails(data: VectorDatabaseNodeData): React.ReactNode {
    return (
      <div className="space-y-1 text-[11px] font-mono text-neutral-400">
        {this._renderConfigSpecs(data)}
        {this._renderRecallMetrics(data)}
      </div>
    );
  }

  private _renderConfigSpecs(data: VectorDatabaseNodeData): React.ReactNode {
    const index = data.indexType ?? VectorDatabaseNode._DEFAULT_INDEX;
    const dim = data.dimension ?? VectorDatabaseNode._DEFAULT_DIM;
    const shards = data.shardCount ?? VectorDatabaseNode._DEFAULT_SHARDS;
    const mem = data.memoryGb ?? VectorDatabaseNode._DEFAULT_MEM_GB;
    return (
      <>
        <div className="flex justify-between">
          <span>Index / Dim:</span>
          <span className="text-neutral-200">
            {index} · {dim}d
          </span>
        </div>
        <div className="flex justify-between">
          <span>Shards / RAM:</span>
          <span className="text-neutral-200">
            {shards}x · {mem} GB
          </span>
        </div>
      </>
    );
  }

  private _renderRecallMetrics(data: VectorDatabaseNodeData): React.ReactNode {
    const recall = data.topKRecallPct ?? VectorDatabaseNode._DEFAULT_RECALL;
    return (
      <div className="flex justify-between border-t border-neutral-800 pt-1 text-amber-300">
        <span>Recall @ k:</span>
        <span>{recall}%</span>
      </div>
    );
  }
}
