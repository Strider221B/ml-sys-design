import React from 'react';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

export interface CanvasToolbarProps {
  activeTemplateId: string | null;
  onAddNode: (type: string) => void;
  onLoadTemplate: (templateId: string) => void;
  onClearCanvas: () => void;
}

/**
 * Accessible toolbar offering infrastructure block creation and blueprint selection.
 */
export class CanvasToolbar extends React.Component<CanvasToolbarProps> {
  private static readonly _LABEL_ADD = 'Add:';
  private static readonly _LABEL_BLUEPRINT = 'Blueprint:';
  private static readonly _LABEL_CLEAR = 'Clear';
  private static readonly _PLACEHOLDER_SELECT = 'Select Blueprint...';
  private static readonly _EMPTY_STRING = '';
  private static readonly _BTN_CLASS = 'rounded bg-neutral-800 px-2 py-1 hover:bg-neutral-700';

  public constructor(props: CanvasToolbarProps) {
    super(props);
  }

  public override render(): React.ReactNode {
    return (
      <div className="flex flex-wrap items-center justify-between border-b border-neutral-800 bg-neutral-900/90 px-4 py-2 gap-2 z-10">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="font-semibold text-neutral-400 mr-1">{CanvasToolbar._LABEL_ADD}</span>
          {this._renderCoreNodes()}
          {this._renderAgentNodes()}
        </div>
        {this._renderTemplateSelector()}
      </div>
    );
  }

  private _renderCoreNodes(): React.ReactNode {
    return (
      <>
        {this._renderNodeBtn(CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY, '+ Gateway')}
        {this._renderNodeBtn(CanvasConstants.NODE_TYPE_MODEL_WORKER, '+ Model Worker')}
        {this._renderNodeBtn(CanvasConstants.NODE_TYPE_VECTOR_DATABASE, '+ Vector DB')}
      </>
    );
  }

  private _renderAgentNodes(): React.ReactNode {
    return (
      <>
        {this._renderNodeBtn(CanvasConstants.NODE_TYPE_FEATURE_STORE, '+ Feature Store')}
        {this._renderNodeBtn(CanvasConstants.NODE_TYPE_AGENT_SUPERVISOR, '+ Supervisor')}
        {this._renderNodeBtn(CanvasConstants.NODE_TYPE_SEMANTIC_GUARDRAIL, '+ Guardrail')}
      </>
    );
  }

  private _renderNodeBtn(type: string, label: string): React.ReactNode {
    return (
      <button
        key={type}
        onClick={() => this.props.onAddNode(type)}
        className={CanvasToolbar._BTN_CLASS}
      >
        {label}
      </button>
    );
  }

  private _renderTemplateSelector(): React.ReactNode {
    return (
      <div className="flex items-center gap-2 text-xs">
        <label htmlFor="template-select" className="text-neutral-400 font-semibold">
          {CanvasToolbar._LABEL_BLUEPRINT}
        </label>
        {this._renderSelectDropdown()}
        {this._renderClearButton()}
      </div>
    );
  }

  private _renderSelectDropdown(): React.ReactNode {
    const val = this.props.activeTemplateId ?? CanvasToolbar._EMPTY_STRING;
    return (
      <select
        id="template-select"
        value={val}
        onChange={(e) => this.props.onLoadTemplate(e.target.value)}
        className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-200 focus:outline-none"
      >
        <option value="" disabled>
          {CanvasToolbar._PLACEHOLDER_SELECT}
        </option>
        <option value={CanvasConstants.TEMPLATE_HYBRID_RAG}>Hybrid Search RAG</option>
        <option value={CanvasConstants.TEMPLATE_MULTI_AGENT}>Multi-Agent Swarm</option>
        <option value={CanvasConstants.TEMPLATE_GUARDRAIL_ROUTING}>Safety Guardrail</option>
      </select>
    );
  }

  private _renderClearButton(): React.ReactNode {
    return (
      <button
        onClick={this.props.onClearCanvas}
        className="rounded bg-rose-900/40 border border-rose-800/60 px-2 py-1 text-rose-300 hover:bg-rose-900/80"
      >
        {CanvasToolbar._LABEL_CLEAR}
      </button>
    );
  }
}
