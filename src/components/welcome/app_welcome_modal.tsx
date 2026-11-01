import React from 'react';
import {
  ArchitecturalPillarConfig,
  WelcomeConstants,
  WorkspaceOverviewCard,
} from '@/components/welcome/welcome_constants';

export interface AppWelcomeModalProps {
  isOpen: boolean;
  onClose: (dontShowAgain: boolean) => void;
  onTakeTour: () => void;
  constants?: WelcomeConstants | undefined;
}

export interface AppWelcomeModalState {
  dontShowAgain: boolean;
}

/**
 * Global application welcome dialog presenting platform identity, 3 pillars, and 6 workspaces.
 */
export class AppWelcomeModal extends React.Component<
  AppWelcomeModalProps,
  AppWelcomeModalState
> {
  private static readonly _BTN_TOUR_CLASS =
    'px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md shadow-cyan-600/30 transition';
  private static readonly _BTN_SKIP_CLASS =
    'px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition';

  public constructor(props: AppWelcomeModalProps) {
    super(props);
    this._constants = props.constants ?? new WelcomeConstants();
    this.state = {
      dontShowAgain: false,
    };
  }

  public override render(): React.ReactNode {
    if (!this.props.isOpen) {
      return null;
    }
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto text-xs text-slate-200"
        role="dialog"
        aria-modal="true"
        aria-label={WelcomeConstants.ARIA_WELCOME_MODAL}
        onKeyDown={this._handleKeyDown}
        tabIndex={0}
      >
        {this._renderDialogContainer()}
      </div>
    );
  }

  private readonly _constants: WelcomeConstants;

  private _handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.props.onClose(this.state.dontShowAgain);
    }
  };

  private _toggleDontShowAgain = (): void => {
    this.setState((prev) => ({ dontShowAgain: !prev.dontShowAgain }));
  };

  private _handleSkip = (): void => {
    this.props.onClose(this.state.dontShowAgain);
  };

  private _handleTakeTour = (): void => {
    this.props.onClose(this.state.dontShowAgain);
    this.props.onTakeTour();
  };

  private _renderDialogContainer(): React.ReactNode {
    return (
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
        {this._renderHeader()}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {this._renderPillarsSection()}
          {this._renderWorkspacesSection()}
        </div>
        {this._renderFooter()}
      </div>
    );
  }

  private _renderHeader(): React.ReactNode {
    return (
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
        {this._renderHeaderBranding()}
        <button
          type="button"
          onClick={this._handleSkip}
          className="text-slate-400 hover:text-white text-base font-bold transition p-1"
          aria-label="Close welcome screen"
        >
          ✕
        </button>
      </div>
    );
  }

  private _renderHeaderBranding(): React.ReactNode {
    return (
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 font-black text-white text-sm shadow-lg shadow-indigo-500/30">
          ML
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight">
              {WelcomeConstants.HERO_TITLE}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-medium font-mono">
              {WelcomeConstants.HERO_BADGE}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{WelcomeConstants.HERO_SUBTITLE}</p>
        </div>
      </div>
    );
  }

  private _renderPillarsSection(): React.ReactNode {
    const pillars = this._constants.getPillars();
    return (
      <section aria-labelledby="pillars-heading" className="space-y-3">
        <h2 id="pillars-heading" className="text-xs font-bold uppercase tracking-wider text-slate-400">
          The 3 Architectural Foundations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pillars.map((pillar) => this._renderPillarCard(pillar))}
        </div>
      </section>
    );
  }

  private _renderPillarCard(pillar: ArchitecturalPillarConfig): React.ReactNode {
    return (
      <div
        key={pillar.id}
        className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-base">{pillar.icon}</span>
            <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-[10px] font-mono">
              {pillar.badge}
            </span>
          </div>
          <h3 className="font-bold text-slate-100 text-xs mb-1">{pillar.title}</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">{pillar.description}</p>
        </div>
      </div>
    );
  }

  private _renderWorkspacesSection(): React.ReactNode {
    const cards = this._constants.getWorkspaceCards();
    return (
      <section aria-labelledby="workspaces-heading" className="space-y-3">
        <h2 id="workspaces-heading" className="text-xs font-bold uppercase tracking-wider text-slate-400">
          The 6-Workspace Operational Loop
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map((card) => this._renderWorkspaceCard(card))}
        </div>
      </section>
    );
  }

  private _renderWorkspaceCard(card: WorkspaceOverviewCard): React.ReactNode {
    return (
      <div
        key={card.tabId}
        className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">{card.icon}</span>
          <span className="font-semibold text-slate-200 text-xs">{card.title}</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight mb-2">{card.description}</p>
        <span className="self-start text-[10px] text-cyan-400 font-mono bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/50">
          {card.badge}
        </span>
      </div>
    );
  }

  private _renderFooter(): React.ReactNode {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800 px-6 py-4 bg-slate-950/80 gap-3">
        {this._renderFooterCheckbox()}
        {this._renderFooterButtons()}
      </div>
    );
  }

  private _renderFooterCheckbox(): React.ReactNode {
    return (
      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={this.state.dontShowAgain}
          onChange={this._toggleDontShowAgain}
          className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
        />
        <span>{WelcomeConstants.CHECKBOX_DONT_SHOW_AGAIN}</span>
      </label>
    );
  }

  private _renderFooterButtons(): React.ReactNode {
    return (
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={this._handleSkip}
          className={AppWelcomeModal._BTN_SKIP_CLASS}
        >
          {WelcomeConstants.BTN_SKIP_TO_CANVAS}
        </button>
        <button
          type="button"
          onClick={this._handleTakeTour}
          className={AppWelcomeModal._BTN_TOUR_CLASS}
        >
          {WelcomeConstants.BTN_TAKE_TOUR}
        </button>
      </div>
    );
  }
}
