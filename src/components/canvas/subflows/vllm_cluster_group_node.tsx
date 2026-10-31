import React from 'react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

export interface VllmClusterGroupNodeData {
  label?: string;
  replicaCount?: number;
  totalVramGb?: number;
  parallelismMode?: string;
  status?: string;
}

/**
 * Hierarchical subflow container node grouping distributed GPU vLLM worker replicas.
 */
export class VllmClusterGroupNode extends React.Component<NodeProps> {
  private static readonly _DEFAULT_LABEL = 'vLLM GPU Cluster';
  private static readonly _DEFAULT_REPLICAS = 8;
  private static readonly _DEFAULT_VRAM_GB = 640;
  private static readonly _DEFAULT_PARALLELISM = 'Tensor Parallel: 4 · Pipeline: 2';
  private static readonly _DEFAULT_STATUS = CanvasConstants.STATUS_OPTIMAL;

  public constructor(props: NodeProps) {
    super(props);
  }

  public override render(): React.ReactNode {
    const data = (this.props.data as VllmClusterGroupNodeData | undefined) ?? {};
    const status = data.status ?? VllmClusterGroupNode._DEFAULT_STATUS;
    const selectedClass = this.props.selected ? 'ring-2 ring-indigo-400' : '';

    return (
      <div
        className={`w-full h-full min-w-[500px] min-h-[320px] rounded-lg border-2 border-dashed border-indigo-500/60 bg-indigo-950/10 p-4 text-neutral-100 ${selectedClass}`}
        role="group"
        aria-label={this._buildAriaLabel(data, status)}
      >
        <Handle type="target" position={Position.Left} id={CanvasConstants.HANDLE_IN} />
        {this._renderHeader(data, status)}
        {this._renderFooter(data)}
        <Handle type="source" position={Position.Right} id={CanvasConstants.HANDLE_OUT} />
      </div>
    );
  }

  private _buildAriaLabel(data: VllmClusterGroupNodeData, status: string): string {
    const label = data.label ?? VllmClusterGroupNode._DEFAULT_LABEL;
    const replicas = data.replicaCount ?? VllmClusterGroupNode._DEFAULT_REPLICAS;
    const vram = data.totalVramGb ?? VllmClusterGroupNode._DEFAULT_VRAM_GB;
    return `vLLM Cluster Container: ${label}. ${replicas} GPUs, ${vram}GB total VRAM. Status: ${status}.`;
  }

  private _renderHeader(data: VllmClusterGroupNodeData, status: string): React.ReactNode {
    const label = data.label ?? VllmClusterGroupNode._DEFAULT_LABEL;
    const replicas = data.replicaCount ?? VllmClusterGroupNode._DEFAULT_REPLICAS;
    const vram = data.totalVramGb ?? VllmClusterGroupNode._DEFAULT_VRAM_GB;

    return (
      <div className="flex items-center justify-between border-b border-indigo-800/40 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tracking-wide text-indigo-200">{label}</span>
          <span className="rounded bg-indigo-900/60 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
            {replicas}x GPUs ({vram} GB)
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-900/40 text-indigo-300">
          {status}
        </span>
      </div>
    );
  }

  private _renderFooter(data: VllmClusterGroupNodeData): React.ReactNode {
    const parallelism = data.parallelismMode ?? VllmClusterGroupNode._DEFAULT_PARALLELISM;
    return (
      <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-[10px] font-mono text-indigo-400/80 pointer-events-none">
        <span>{parallelism}</span>
        <span>extent: parent</span>
      </div>
    );
  }
}

