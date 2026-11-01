import React from 'react';
import { MockActionDispatcher } from '@/components/welcome/mock_action_dispatcher';
import { MockWalkthroughCatalog } from '@/components/welcome/mock_walkthrough_catalog';
import { WelcomeConstants } from '@/components/welcome/welcome_constants';
import {
  ComponentMockWalkthrough,
  MockActionPayload,
  WalkthroughStep,
  WorkspaceTabId,
} from '@/core/state/welcome_types';
import { WorkspaceStore } from '@/core/state/workspace_store';

export interface ComponentWelcomeOverlayProps {
  isOpen: boolean;
  tabId: WorkspaceTabId;
  catalog?: MockWalkthroughCatalog | undefined;
  dispatcher?: MockActionDispatcher | undefined;
  store?: WorkspaceStore | undefined;
  onClose: (dontShowAgain: boolean) => void;
  onExecuteAction?: ((payload: MockActionPayload) => void) | undefined;
}

export interface ComponentWelcomeOverlayState {
  dontShowAgain: boolean;
  isExecuting: boolean;
}

/**
 * Universal workspace overlay delivering mental models and 1-click concrete mock examples.
 */
export class ComponentWelcomeOverlay extends React.Component<
  ComponentWelcomeOverlayProps,
  ComponentWelcomeOverlayState
> {
  private static readonly _BTN_ACTION_CLASS =
    'px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 transition disabled:opacity-50';
  private static readonly _BTN_DISMISS_CLASS =
    'px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 transition text-xs';

  public constructor(props: ComponentWelcomeOverlayProps) {
    super(props);
    this._catalog = props.catalog ?? new MockWalkthroughCatalog();
    this._dispatcher = props.dispatcher ?? new MockActionDispatcher();
    this.state = {
      dontShowAgain: false,
      isExecuting: false,
    };
  }

  public override render(): React.ReactNode {
    if (!this.props.isOpen) {
      return null;
    }
    const walkthrough = this._catalog.getWalkthrough(this.props.tabId);
    return (
      <aside
        className="w-full border-b border-indigo-500/30 bg-slate-900/95 backdrop-blur-md px-4 py-3 text-xs text-slate-200 shadow-xl transition-all z-20"
        role="region"
        aria-label={WelcomeConstants.ARIA_COMPONENT_OVERLAY}
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          {this._renderHeaderBar(walkthrough)}
          {this._renderWalkthroughSteps(walkthrough.steps)}
          {this._renderActionBar(walkthrough)}
        </div>
      </aside>
    );
  }

  private readonly _catalog: MockWalkthroughCatalog;
  private readonly _dispatcher: MockActionDispatcher;

  private _toggleDontShowAgain = (): void => {
    this.setState((prev) => ({ dontShowAgain: !prev.dontShowAgain }));
  };

  private _handleDismiss = (): void => {
    this.props.onClose(this.state.dontShowAgain);
  };

  private _handleExecuteAction = async (payload: MockActionPayload): Promise<void> => {
    this.setState({ isExecuting: true });
    try {
      if (this.props.store) {
        await this._dispatcher.dispatchMockAction(payload, this.props.store);
      }
      if (this.props.onExecuteAction) {
        this.props.onExecuteAction(payload);
      }
      this.props.onClose(this.state.dontShowAgain);
    } finally {
      this.setState({ isExecuting: false });
    }
  };

  private _renderHeaderBar(walkthrough: ComponentMockWalkthrough): React.ReactNode {
    return (
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-slate-800 pb-2">
        {this._renderHeaderTitleSection(walkthrough)}
        <button
          type="button"
          onClick={this._handleDismiss}
          className={ComponentWelcomeOverlay._BTN_DISMISS_CLASS}
        >
          {WelcomeConstants.BTN_SKIP_GUIDE_START_BLANK}
        </button>
      </div>
    );
  }

  private _renderHeaderTitleSection(walkthrough: ComponentMockWalkthrough): React.ReactNode {
    return (
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white tracking-tight">
            {walkthrough.componentTitle}
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono">
            {walkthrough.scenarioTitle}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
          {walkthrough.mentalModel}
        </p>
      </div>
    );
  }

  private _renderWalkthroughSteps(steps: WalkthroughStep[]): React.ReactNode {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {steps.map((step) => this._renderStepCard(step))}
      </div>
    );
  }

  private _renderStepCard(step: WalkthroughStep): React.ReactNode {
    return (
      <div
        key={step.stepNumber}
        className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-indigo-900 text-indigo-200 font-bold text-[10px]">
              {step.stepNumber}
            </span>
            <span className="font-semibold text-slate-200 text-xs">{step.title}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">{step.narrative}</p>
        </div>
        {step.highlightMetric && this._renderHighlightMetric(step.highlightMetric)}
      </div>
    );
  }

  private _renderHighlightMetric(metric: string): React.ReactNode {
    return (
      <span className="mt-2 inline-block self-start px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/40 text-cyan-300 text-[10px] font-mono">
        {metric}
      </span>
    );
  }

  private _renderActionBar(walkthrough: ComponentMockWalkthrough): React.ReactNode {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
        {this._renderActionBarCheckbox()}
        {this._renderActionButton(walkthrough)}
      </div>
    );
  }

  private _renderActionBarCheckbox(): React.ReactNode {
    return (
      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={this.state.dontShowAgain}
          onChange={this._toggleDontShowAgain}
          className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0 cursor-pointer"
        />
        <span>{WelcomeConstants.CHECKBOX_DONT_SHOW_COMPONENT}</span>
      </label>
    );
  }

  private _renderActionButton(walkthrough: ComponentMockWalkthrough): React.ReactNode {
    return (
      <button
        type="button"
        disabled={this.state.isExecuting}
        onClick={() => void this._handleExecuteAction(walkthrough.primaryActionPayload)}
        className={ComponentWelcomeOverlay._BTN_ACTION_CLASS}
      >
        {walkthrough.primaryActionLabel}
      </button>
    );
  }
}
