import React from 'react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

export interface AgentSupervisorNodeData {
  label?: string;
  maxCycles?: number;
  consensusThreshold?: number;
  circuitBreakerStatus?: string;
  workerCount?: number;
  status?: string;
}

/**
 * Visual canvas node representing an Agent Supervisor Orchestration state machine.
 */
export class AgentSupervisorNode extends React.Component<NodeProps> {
  private static readonly _DEFAULT_LABEL = 'Agent Supervisor';
  private static readonly _DEFAULT_MAX_CYCLES = 5;
  private static readonly _DEFAULT_CONSENSUS = 0.9;
  private static readonly _DEFAULT_BREAKER = 'ARMED';
  private static readonly _DEFAULT_WORKERS = 3;
  private static readonly _DEFAULT_STATUS = CanvasConstants.STATUS_OPTIMAL;

  private static readonly _BORDER_HEALTHY = 'border-purple-400';
  private static readonly _BORDER_WARNING = 'border-amber-600';
  private static readonly _BORDER_CRITICAL = 'border-rose-500';
  private static readonly _BORDER_CHAOS = 'border-purple-600';

  public constructor(props: NodeProps) {
    super(props);
  }

  public override render(): React.ReactNode {
    const data = (this.props.data as AgentSupervisorNodeData | undefined) ?? {};
    const status = data.status ?? AgentSupervisorNode._DEFAULT_STATUS;
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
        return AgentSupervisorNode._BORDER_WARNING;
      case CanvasConstants.STATUS_OVERFLOW:
        return AgentSupervisorNode._BORDER_CRITICAL;
      case CanvasConstants.STATUS_CHAOS:
        return AgentSupervisorNode._BORDER_CHAOS;
      default:
        return AgentSupervisorNode._BORDER_HEALTHY;
    }
  }

  private _buildAriaLabel(data: AgentSupervisorNodeData, status: string): string {
    const label = data.label ?? AgentSupervisorNode._DEFAULT_LABEL;
    const cycles = data.maxCycles ?? AgentSupervisorNode._DEFAULT_MAX_CYCLES;
    return `${label}. Max cycles: ${cycles}. Breaker: ${data.circuitBreakerStatus ?? AgentSupervisorNode._DEFAULT_BREAKER}. Status: ${status}.`;
  }

  private _renderHeader(data: AgentSupervisorNodeData, status: string): React.ReactNode {
    const label = data.label ?? AgentSupervisorNode._DEFAULT_LABEL;
    return (
      <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2">
        <span className="font-semibold text-xs truncate">{label}</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
          {status}
        </span>
      </div>
    );
  }

  private _renderTelemetry(data: AgentSupervisorNodeData): React.ReactNode {
    return (
      <div className="space-y-1 text-[11px] font-mono text-neutral-400">
        {this._renderCycleSpecs(data)}
        {this._renderBreakerSpecs(data)}
      </div>
    );
  }

  private _renderCycleSpecs(data: AgentSupervisorNodeData): React.ReactNode {
    const maxCycles = data.maxCycles ?? AgentSupervisorNode._DEFAULT_MAX_CYCLES;
    const threshold = (
      (data.consensusThreshold ?? AgentSupervisorNode._DEFAULT_CONSENSUS) * 100
    ).toFixed(0);
    return (
      <>
        <div className="flex justify-between">
          <span>Max Iterations:</span>
          <span className="text-neutral-200">{maxCycles} cycles</span>
        </div>
        <div className="flex justify-between">
          <span>Consensus Gate:</span>
          <span className="text-neutral-200">{threshold}% threshold</span>
        </div>
      </>
    );
  }

  private _renderBreakerSpecs(data: AgentSupervisorNodeData): React.ReactNode {
    const workers = data.workerCount ?? AgentSupervisorNode._DEFAULT_WORKERS;
    const breaker = data.circuitBreakerStatus ?? AgentSupervisorNode._DEFAULT_BREAKER;
    return (
      <>
        <div className="flex justify-between">
          <span>Active Workers:</span>
          <span className="text-neutral-200">{workers} agents</span>
        </div>
        <div className="flex justify-between border-t border-neutral-800 pt-1 text-neutral-300">
          <span>Circuit Breaker:</span>
          <span className="text-emerald-400">{breaker}</span>
        </div>
      </>
    );
  }
}

