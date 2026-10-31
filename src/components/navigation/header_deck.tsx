import React from 'react';
import { GuidanceConstants } from '@/components/guidance/guidance_constants';
import { GDriveSyncControl } from '@/components/navigation/gdrive_sync_control';
import { GoogleAuthClient } from '@/core/gdrive/google_auth_client';
import { SyncManager } from '@/core/gdrive/sync_manager';
import { WorkspaceTab } from '@/core/state/guidance_types';
import { WorkspaceStore } from '@/core/state/workspace_store';

export type ExportType = 'TERRAFORM' | 'K8S' | 'MANIFESTO';

export interface HeaderDeckProps {
  activeTab: WorkspaceTab;
  onTabSelect: (tab: WorkspaceTab) => void;
  onOpenAiModal: () => void;
  onOpenExportModal: (type: ExportType) => void;
  onOpenHelpModal: () => void;
  store?: WorkspaceStore | undefined;
  authClient?: GoogleAuthClient | undefined;
  syncManager?: SyncManager | undefined;
  onResolveConflict?: (() => void) | undefined;
  onSwitchWorkspace?: (() => void) | undefined;
}

/**
 * Global navigation header deck integrating brand identity, tab controls, GDrive sync, and actions.
 */
export class HeaderDeck extends React.Component<HeaderDeckProps> {
  private static readonly _TAB_ITEMS: readonly { id: WorkspaceTab; label: string }[] = [
    { id: 'CANVAS', label: '🏗️ Canvas' },
    { id: 'INTERVIEW', label: '🎙️ AI Interview' },
    { id: 'CHAOS', label: '⚡ Chaos Sandbox' },
    { id: 'CURRICULUM', label: '📚 Curriculum' },
    { id: 'TELEMETRY', label: '📊 Telemetry' },
    { id: 'FINOPS', label: '💰 FinOps' },
  ];

  public constructor(props: HeaderDeckProps) {
    super(props);
  }

  public override render(): React.ReactNode {
    return (
      <header className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 z-20 gap-3">
        {this._renderBrand()}
        {this._renderNavTabs()}
        {this._renderActions()}
      </header>
    );
  }

  private _renderBrand(): React.ReactNode {
    return (
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 font-black text-white text-xs shadow-md shadow-indigo-500/30">
          ML
        </span>
        <div>
          <span className="font-bold text-sm tracking-tight text-white block">
            2026 Machine Learning System Design Platform
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Deterministic interactive simulation and interview preparation engine.
          </span>
        </div>
      </div>
    );
  }

  private _renderNavTabs(): React.ReactNode {
    return (
      <nav
        className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs"
        aria-label="Workspace Navigation Tabs"
      >
        {HeaderDeck._TAB_ITEMS.map((item) => this._renderTabBtn(item.id, item.label))}
      </nav>
    );
  }

  private _renderTabBtn(tab: WorkspaceTab, label: string): React.ReactNode {
    const isActive = this.props.activeTab === tab;
    return (
      <button
        key={tab}
        type="button"
        onClick={() => this.props.onTabSelect(tab)}
        className={`px-3 py-1.5 rounded-md font-semibold transition ${
          isActive
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
        }`}
      >
        {label}
      </button>
    );
  }

  private _renderActions(): React.ReactNode {
    return (
      <div className="flex items-center gap-2 text-xs">
        <GDriveSyncControl
          store={this.props.store}
          authClient={this.props.authClient}
          syncManager={this.props.syncManager}
          onResolveConflict={this.props.onResolveConflict}
          onSwitchWorkspace={this.props.onSwitchWorkspace}
        />
        {this._renderHelpButton()}
        {this._renderActionButtons()}
      </div>
    );
  }

  private _renderHelpButton(): React.ReactNode {
    return (
      <button
        type="button"
        onClick={this.props.onOpenHelpModal}
        className="px-2.5 py-1.5 rounded-md bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-slate-200 font-medium transition"
        aria-label={GuidanceConstants.LABEL_HELP_GUIDE}
      >
        {GuidanceConstants.LABEL_HELP_GUIDE}
      </button>
    );
  }

  private _renderActionButtons(): React.ReactNode {
    return (
      <>
        <button
          type="button"
          onClick={this.props.onOpenAiModal}
          className="px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-medium transition"
        >
          AI Exchange
        </button>
        <button
          type="button"
          onClick={() => this.props.onOpenExportModal('TERRAFORM')}
          className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm transition"
        >
          Export IaC
        </button>
      </>
    );
  }
}
