import React from 'react';
import { WorkspaceGuidanceCatalog } from '@/components/guidance/workspace_guidance_catalog';
import {
  GuidanceChecklistStep,
  QuickActionDescriptor,
  WorkspaceGuidanceItem,
  WorkspaceTab,
} from '@/core/state/guidance_types';

export interface ScreenContextBannerProps {
  activeTab: WorkspaceTab;
  catalog?: WorkspaceGuidanceCatalog | undefined;
  onQuickAction?: ((action: QuickActionDescriptor) => void) | undefined;
  defaultCollapsed?: boolean | undefined;
  onShowMockExample?: (() => void) | undefined;
}

export interface ScreenContextBannerState {
  isCollapsed: boolean;
}

/**
 * Docked contextual guidance banner rendering operational purpose badges, 1-2-3 steps, and quick actions.
 */
export class ScreenContextBanner extends React.Component<
  ScreenContextBannerProps,
  ScreenContextBannerState
> {
  private static readonly _LABEL_COLLAPSE = 'Collapse Guide [^]';
  private static readonly _LABEL_EXPAND = 'Show Guide [v]';

  public constructor(props: ScreenContextBannerProps) {
    super(props);
    this._catalog = props.catalog ?? new WorkspaceGuidanceCatalog();
    this.state = {
      isCollapsed: props.defaultCollapsed ?? false,
    };
  }

  public override render(): React.ReactNode {
    const guidance = this._catalog.getGuidanceForTab(this.props.activeTab);
    return (
      <aside
        className="w-full border-b border-slate-800/80 bg-slate-900/75 backdrop-blur-md px-4 py-2 text-xs text-slate-200 transition-all z-10"
        aria-label={`${guidance.title} Guidance Banner`}
      >
        <div className="flex flex-col gap-2.5 max-w-7xl mx-auto">
          {this._renderHeaderBar(guidance)}
          {!this.state.isCollapsed && this._renderExpandedBody(guidance)}
        </div>
      </aside>
    );
  }

  private readonly _catalog: WorkspaceGuidanceCatalog;

  private _toggleCollapse = (): void => {
    this.setState((prev) => ({ isCollapsed: !prev.isCollapsed }));
  };

  private _renderHeaderBar(guidance: WorkspaceGuidanceItem): React.ReactNode {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white text-sm tracking-tight">{guidance.title}</span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-950/70 border border-indigo-500/40 text-indigo-300 text-[11px] font-medium">
            {guidance.badge}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {this._renderMockExampleButton()}
          {this._renderCollapseToggle()}
        </div>
      </div>
    );
  }

  private _renderMockExampleButton(): React.ReactNode {
    if (!this.props.onShowMockExample) return null;
    return (
      <button
        type="button"
        onClick={this.props.onShowMockExample}
        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono transition px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800"
        aria-label="(?) Show Mock Example"
      >
        (?) Show Mock Example
      </button>
    );
  }

  private _renderCollapseToggle(): React.ReactNode {
    const label = this.state.isCollapsed
      ? ScreenContextBanner._LABEL_EXPAND
      : ScreenContextBanner._LABEL_COLLAPSE;
    return (
      <button
        type="button"
        onClick={this._toggleCollapse}
        className="text-[11px] text-slate-400 hover:text-slate-200 font-mono transition px-2 py-0.5 rounded bg-slate-800/60 hover:bg-slate-800 border border-slate-700"
        aria-expanded={!this.state.isCollapsed}
      >
        {label}
      </button>
    );
  }

  private _renderExpandedBody(guidance: WorkspaceGuidanceItem): React.ReactNode {
    return (
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
        {this._renderStepCards(guidance.checklist)}
        {this._renderQuickActions(guidance.quickActions)}
      </div>
    );
  }

  private _renderStepCards(checklist: GuidanceChecklistStep[]): React.ReactNode {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
        {checklist.map((step) => this._renderStepCard(step))}
      </div>
    );
  }

  private _renderStepCard(step: GuidanceChecklistStep): React.ReactNode {
    return (
      <div
        key={step.stepNumber}
        className="flex items-start gap-2 bg-slate-950/60 border border-slate-800/80 p-2 rounded-lg"
      >
        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600/80 text-white font-bold text-[10px]">
          {step.stepNumber}
        </span>
        <div className="min-w-0">
          <span className="font-semibold text-slate-200 block text-[11px]">{step.title}</span>
          <span className="text-[11px] text-slate-400 leading-snug block truncate md:whitespace-normal">
            {step.instruction}
          </span>
        </div>
      </div>
    );
  }

  private _renderQuickActions(actions: QuickActionDescriptor[]): React.ReactNode {
    if (actions.length === 0) return null;
    return (
      <div className="flex items-center gap-1.5 flex-wrap self-end md:self-center">
        {actions.map((action) => this._renderQuickActionBtn(action))}
      </div>
    );
  }

  private _renderQuickActionBtn(action: QuickActionDescriptor): React.ReactNode {
    return (
      <button
        key={action.id}
        type="button"
        onClick={() => this.props.onQuickAction?.(action)}
        className="px-2.5 py-1.5 rounded-md bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-200 font-medium text-[11px] transition shadow-sm whitespace-nowrap"
      >
        {action.label}
      </button>
    );
  }
}
