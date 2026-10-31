import React from 'react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

export interface AgentSwarmGroupNodeData {
  label?: string;
  memberCount?: number;
  consensusPolicy?: string;
  status?: string;
}

/**
 * Hierarchical subflow container node grouping collaborative multi-agent swarms.
 */
export class AgentSwarmGroupNode extends React.Component<NodeProps> {
  private static readonly _DEFAULT_LABEL = 'Agent Swarm Subflow';
  private static readonly _DEFAULT_MEMBERS = 4;
  private static readonly _DEFAULT_POLICY = 'Majority Voting (Consensus)';
  private static readonly _DEFAULT_STATUS = CanvasConstants.STATUS_OPTIMAL;

  public constructor(props: NodeProps) {
    super(props);
  }

  public override render(): React.ReactNode {
    const data = (this.props.data as AgentSwarmGroupNodeData | undefined) ?? {};
    const status = data.status ?? AgentSwarmGroupNode._DEFAULT_STATUS;
    const selectedClass = this.props.selected ? 'ring-2 ring-indigo-400' : '';

    return (
      <div
        className={`w-full h-full min-w-[500px] min-h-[320px] rounded-lg border-2 border-dashed border-purple-500/60 bg-purple-950/10 p-4 text-neutral-100 ${selectedClass}`}
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

  private _buildAriaLabel(data: AgentSwarmGroupNodeData, status: string): string {
    const label = data.label ?? AgentSwarmGroupNode._DEFAULT_LABEL;
    const members = data.memberCount ?? AgentSwarmGroupNode._DEFAULT_MEMBERS;
    return `Agent Swarm Container: ${label}. Contains ${members} agent nodes. Status: ${status}.`;
  }

  private _renderHeader(data: AgentSwarmGroupNodeData, status: string): React.ReactNode {
    const label = data.label ?? AgentSwarmGroupNode._DEFAULT_LABEL;
    const members = data.memberCount ?? AgentSwarmGroupNode._DEFAULT_MEMBERS;

    return (
      <div className="flex items-center justify-between border-b border-purple-800/40 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tracking-wide text-purple-200">{label}</span>
          <span className="rounded bg-purple-900/60 px-2 py-0.5 text-[10px] font-mono text-purple-300">
            {members} agents
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300">
          {status}
        </span>
      </div>
    );
  }

  private _renderFooter(data: AgentSwarmGroupNodeData): React.ReactNode {
    const policy = data.consensusPolicy ?? AgentSwarmGroupNode._DEFAULT_POLICY;
    return (
      <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-[10px] font-mono text-purple-400/80 pointer-events-none">
        <span>Policy: {policy}</span>
        <span>extent: parent</span>
      </div>
    );
  }
}

