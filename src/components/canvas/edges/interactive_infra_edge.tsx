import React from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from '@xyflow/react';

export interface InteractiveEdgeData {
  protocol?: string;
  latencyMs?: number;
  qps?: number;
  isChaosInjected?: boolean;
  onInjectChaos?: (edgeId: string) => void;
}

/**
 * Interactive canvas cable rendering wire metrics and inline chaos fault triggers.
 */
export class InteractiveInfraEdge extends React.Component<EdgeProps> {
  private static readonly _DEFAULT_PROTOCOL = 'gRPC';
  private static readonly _DEFAULT_LATENCY_MS = 0.4;
  private static readonly _DEFAULT_QPS = 0;
  private static readonly _MS_UNIT = 'ms';
  private static readonly _QPS_UNIT = ' QPS';
  private static readonly _LABEL_CHAOS_BTN = '⚡ Chaos';
  private static readonly _LABEL_CHAOS_ACTIVE = '💥 Degraded';
  private static readonly _ARIA_CHAOS_TRIGGER = 'Inject chaos fault on connection ';
  private static readonly _CLASS_BASE_EDGE = 'stroke-slate-500 stroke-2';
  private static readonly _CLASS_CHAOS_EDGE = 'stroke-purple-500 stroke-2 stroke-dasharray-4';

  public constructor(props: EdgeProps) {
    super(props);
  }

  public override render(): React.ReactNode {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX: this.props.sourceX,
      sourceY: this.props.sourceY,
      sourcePosition: this.props.sourcePosition,
      targetX: this.props.targetX,
      targetY: this.props.targetY,
      targetPosition: this.props.targetPosition,
    });
    const edgeData = (this.props.data as InteractiveEdgeData | undefined) ?? {};
    const edgeClass = edgeData.isChaosInjected
      ? InteractiveInfraEdge._CLASS_CHAOS_EDGE
      : InteractiveInfraEdge._CLASS_BASE_EDGE;

    return (
      <>
        <BaseEdge id={this.props.id} path={edgePath} className={edgeClass} />
        {this._renderOverlay(edgeData, labelX, labelY)}
      </>
    );
  }

  private _renderOverlay(
    edgeData: InteractiveEdgeData,
    labelX: number,
    labelY: number
  ): React.ReactNode {
    return (
      <EdgeLabelRenderer>
        <div
          style={this._buildLabelStyle(labelX, labelY)}
          className="nodrag nopan flex items-center gap-1.5 rounded bg-slate-900 border border-slate-700 px-2 py-0.5 text-xs text-slate-200 shadow-lg pointer-events-auto"
          data-testid={`edge-label-${this.props.id}`}
        >
          {this._renderMetricsBadge(edgeData)}
          {this._renderChaosButton(edgeData)}
        </div>
      </EdgeLabelRenderer>
    );
  }

  private _buildLabelStyle(labelX: number, labelY: number): React.CSSProperties {
    return {
      position: 'absolute',
      transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
      pointerEvents: 'all',
    };
  }

  private _renderMetricsBadge(data: InteractiveEdgeData): React.ReactNode {
    const protocol = data.protocol ?? InteractiveInfraEdge._DEFAULT_PROTOCOL;
    const latency = (data.latencyMs ?? InteractiveInfraEdge._DEFAULT_LATENCY_MS).toFixed(1);
    const qps = data.qps ?? InteractiveInfraEdge._DEFAULT_QPS;

    return (
      <span className="font-mono text-[10px]">
        {protocol} ({latency}
        {InteractiveInfraEdge._MS_UNIT})
        {qps > 0 ? ` · ${qps}${InteractiveInfraEdge._QPS_UNIT}` : ''}
      </span>
    );
  }

  private _renderChaosButton(data: InteractiveEdgeData): React.ReactNode {
    const isDegraded = Boolean(data.isChaosInjected);
    const label = isDegraded
      ? InteractiveInfraEdge._LABEL_CHAOS_ACTIVE
      : InteractiveInfraEdge._LABEL_CHAOS_BTN;
    const btnClass = isDegraded
      ? 'rounded bg-purple-700 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-purple-600'
      : 'rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-purple-900 hover:text-white transition';

    return (
      <button
        type="button"
        onClick={this._handleChaosClick}
        className={btnClass}
        aria-label={`${InteractiveInfraEdge._ARIA_CHAOS_TRIGGER}${this.props.id}`}
      >
        {label}
      </button>
    );
  }

  private _handleChaosClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    const edgeData = this.props.data as InteractiveEdgeData | undefined;
    if (edgeData?.onInjectChaos) {
      edgeData.onInjectChaos(this.props.id);
    }
  };
}
