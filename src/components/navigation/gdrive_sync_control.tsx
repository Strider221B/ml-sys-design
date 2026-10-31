import React from 'react';
import { GuidanceConstants } from '@/components/guidance/guidance_constants';
import { GoogleAuthClient } from '@/core/gdrive/google_auth_client';
import { SyncManager } from '@/core/gdrive/sync_manager';
import { SyncVisualState } from '@/core/state/guidance_types';
import { WorkspaceStore } from '@/core/state/workspace_store';
import { SyncState } from '@/core/state/workspace_types';

export interface GDriveSyncControlProps {
  store?: WorkspaceStore | undefined;
  authClient?: GoogleAuthClient | undefined;
  syncManager?: SyncManager | undefined;
  onResolveConflict?: (() => void) | undefined;
  onSwitchWorkspace?: (() => void) | undefined;
}

export interface GDriveSyncControlState {
  visualState: SyncVisualState;
  lastSyncedIso: string | null;
  dirtyCount: number;
  isDropdownOpen: boolean;
  timeSinceSave: string;
  isConnecting: boolean;
  errorMessage: string | null;
}

/**
 * Interactive Google Drive authentication, visual synchronization indicator, and SSOT control deck.
 */
export class GDriveSyncControl extends React.Component<
  GDriveSyncControlProps,
  GDriveSyncControlState
> {
  private static readonly _SEC_PER_MIN = 60;
  private static readonly _SEC_PER_HOUR = 3600;
  private static readonly _TIMER_INTERVAL_MS = 5000;
  private static readonly _DEFAULT_CLIENT_ID = 'adspire-web-client.apps.googleusercontent.com';
  private static readonly _TOOLTIP_UNAUTH =
    'Zero local storage enabled. Your architecture exists only in volatile RAM and will be lost on page reload. Connect Google Drive to auto-sync to your private folder.';
  private static readonly _TOOLTIP_SYNCED =
    'Single Source of Truth active. All workspace changes automatically synced to Google Drive.';
  private static readonly _TOOLTIP_DIRTY =
    'Uploading debounced workspace changes to Google Drive REST API v3...';
  private static readonly _TOOLTIP_CONFLICT =
    'A newer version exists on Google Drive (HTTP 412). Resolution required.';

  public constructor(props: GDriveSyncControlProps) {
    super(props);
    this._store = props.store ?? new WorkspaceStore();
    this._authClient = props.authClient ?? new GoogleAuthClient();
    this._syncManager = props.syncManager;
    this._unsubscribeStore = null;
    this._timerId = null;

    const initialStoreState = this._store.getState();
    const visualState = this._deriveVisualState(
      initialStoreState.syncState,
      this._authClient.isAuthenticated()
    );

    this.state = {
      visualState,
      lastSyncedIso: initialStoreState.lastSyncedIso,
      dirtyCount: initialStoreState.dirtyCount,
      isDropdownOpen: false,
      timeSinceSave: this._calculateTimeSinceSave(initialStoreState.lastSyncedIso),
      isConnecting: false,
      errorMessage: null,
    };
  }

  public override componentDidMount(): void {
    this._unsubscribeStore = this._store.getStore().subscribe((state) => {
      const isAuth = this._authClient.isAuthenticated();
      const visualState = this._deriveVisualState(state.syncState, isAuth);
      this.setState({
        visualState,
        lastSyncedIso: state.lastSyncedIso,
        dirtyCount: state.dirtyCount,
        timeSinceSave: this._calculateTimeSinceSave(state.lastSyncedIso),
      });
    });

    this._timerId = setInterval(() => {
      this.setState((prev) => ({
        timeSinceSave: this._calculateTimeSinceSave(prev.lastSyncedIso),
      }));
    }, GDriveSyncControl._TIMER_INTERVAL_MS);
  }

  public override componentWillUnmount(): void {
    if (this._unsubscribeStore) {
      this._unsubscribeStore();
      this._unsubscribeStore = null;
    }
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }

  public override render(): React.ReactNode {
    return (
      <div
        className="relative inline-flex items-center text-xs font-medium"
        role="status"
        aria-live="polite"
        onKeyDown={this._handleKeyDown}
      >
        {this._renderPillByState()}
        {this.state.isDropdownOpen && this._renderDropdownMenu()}
      </div>
    );
  }

  private readonly _store: WorkspaceStore;
  private readonly _authClient: GoogleAuthClient;
  private readonly _syncManager?: SyncManager | undefined;
  private _unsubscribeStore: (() => void) | null;
  private _timerId: ReturnType<typeof setInterval> | null;

  private _deriveVisualState(storeSync: SyncState, isAuthenticated: boolean): SyncVisualState {
    if (!isAuthenticated || storeSync === 'UNAUTHENTICATED') {
      return GuidanceConstants.SYNC_UNAUTHENTICATED as SyncVisualState;
    }
    if (storeSync === 'CONFLICT') {
      return GuidanceConstants.SYNC_CONFLICT as SyncVisualState;
    }
    if (storeSync === 'DIRTY' || storeSync === 'SYNCING') {
      return GuidanceConstants.SYNC_DIRTY as SyncVisualState;
    }
    return GuidanceConstants.SYNC_SYNCED as SyncVisualState;
  }

  private _calculateTimeSinceSave(iso: string | null): string {
    if (!iso) return 'never';
    const parsed = new Date(iso).getTime();
    if (isNaN(parsed)) return 'never';
    const diffSec = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
    if (diffSec < GDriveSyncControl._SEC_PER_MIN) {
      return `${diffSec}s ago`;
    }
    if (diffSec < GDriveSyncControl._SEC_PER_HOUR) {
      const minutes = Math.floor(diffSec / GDriveSyncControl._SEC_PER_MIN);
      return `${minutes}m ago`;
    }
    const hours = Math.floor(diffSec / GDriveSyncControl._SEC_PER_HOUR);
    return `${hours}h ago`;
  }

  private _handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape' && this.state.isDropdownOpen) {
      this.setState({ isDropdownOpen: false });
    }
  };

  private _handleConnectClick = async (): Promise<void> => {
    this.setState({ isConnecting: true, errorMessage: null });
    try {
      if (!this._authClient.isAuthenticated()) {
        await this._authClient.initialize(GDriveSyncControl._DEFAULT_CLIENT_ID);
        await this._authClient.requestAccessToken();
      }
      this._store.setSyncState('CLEAN');
      this.setState({
        visualState: GuidanceConstants.SYNC_SYNCED as SyncVisualState,
        isConnecting: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      this.setState({ isConnecting: false, errorMessage: msg });
    }
  };

  private _handleSyncNow = async (): Promise<void> => {
    this.setState({ isDropdownOpen: false });
    if (this._syncManager) {
      await this._syncManager.flushSync();
    } else {
      this._store.markClean('etag_manual', new Date().toISOString());
    }
  };

  private _handleDisconnect = async (): Promise<void> => {
    const token = this._authClient.getAccessToken();
    if (token) {
      await this._authClient.revokeToken(token);
    }
    this._store.setSyncState('UNAUTHENTICATED');
    this.setState({
      visualState: GuidanceConstants.SYNC_UNAUTHENTICATED as SyncVisualState,
      isDropdownOpen: false,
    });
  };

  private _handleSwitchWorkspace = (): void => {
    this.setState({ isDropdownOpen: false });
    this.props.onSwitchWorkspace?.();
  };

  private _handleResolveConflict = (): void => {
    this.props.onResolveConflict?.();
  };

  private _renderPillByState(): React.ReactNode {
    switch (this.state.visualState) {
      case 'UNAUTHENTICATED':
        return this._renderUnauthenticated();
      case 'DIRTY':
        return this._renderDirty();
      case 'CONFLICT':
        return this._renderConflict();
      case 'SYNCED':
      default:
        return this._renderSynced();
    }
  }

  private _renderUnauthenticated(): React.ReactNode {
    return (
      <div className="flex items-center gap-2" title={GDriveSyncControl._TOOLTIP_UNAUTH}>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-600/50 text-amber-300 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {GuidanceConstants.LABEL_RAM_ONLY_WARNING}
        </span>
        <button
          type="button"
          onClick={() => void this._handleConnectClick()}
          disabled={this.state.isConnecting}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium shadow transition disabled:opacity-50"
          aria-label={GuidanceConstants.LABEL_CONNECT_DRIVE}
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
          </svg>
          {this.state.isConnecting ? 'Connecting...' : GuidanceConstants.LABEL_CONNECT_DRIVE}
        </button>
      </div>
    );
  }

  private _renderSynced(): React.ReactNode {
    return (
      <button
        type="button"
        onClick={() => this.setState((prev) => ({ isDropdownOpen: !prev.isDropdownOpen }))}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 transition cursor-pointer"
        title={GDriveSyncControl._TOOLTIP_SYNCED}
        aria-expanded={this.state.isDropdownOpen}
        aria-haspopup="menu"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>
          {GuidanceConstants.LABEL_SYNCED_BADGE} ({this.state.timeSinceSave})
        </span>
        <span className="text-[10px] text-emerald-400">▼</span>
      </button>
    );
  }

  private _renderDirty(): React.ReactNode {
    const label =
      this.state.dirtyCount > 0
        ? `Saving changes... (${this.state.dirtyCount} pending)`
        : GuidanceConstants.LABEL_SAVING_CHANGES;
    return (
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/50 text-amber-300 animate-pulse"
        title={GDriveSyncControl._TOOLTIP_DIRTY}
      >
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span>{label}</span>
      </div>
    );
  }

  private _renderConflict(): React.ReactNode {
    return (
      <button
        type="button"
        onClick={this._handleResolveConflict}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/70 border border-red-500/60 text-red-300 hover:bg-red-900/60 transition cursor-pointer"
        title={GDriveSyncControl._TOOLTIP_CONFLICT}
      >
        <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
        <span className="font-semibold">{GuidanceConstants.LABEL_CONFLICT_ALERT}</span>
      </button>
    );
  }

  private _renderDropdownMenu(): React.ReactNode {
    return (
      <div
        role="menu"
        className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-slate-900 border border-slate-700 shadow-xl py-1 z-50 text-slate-200"
      >
        {this._renderSyncNowItem()}
        {this._renderSwitchItem()}
        <div className="border-t border-slate-800 my-1" />
        {this._renderDisconnectItem()}
      </div>
    );
  }

  private _renderSyncNowItem(): React.ReactNode {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={() => void this._handleSyncNow()}
        className="w-full text-left px-3 py-2 hover:bg-slate-800 transition flex items-center justify-between"
      >
        <span>Sync Now</span>
        <span className="text-[10px] text-slate-400 font-mono">Cmd+S</span>
      </button>
    );
  }

  private _renderSwitchItem(): React.ReactNode {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={this._handleSwitchWorkspace}
        className="w-full text-left px-3 py-2 hover:bg-slate-800 transition flex items-center justify-between"
      >
        <span>Switch Workspace</span>
      </button>
    );
  }

  private _renderDisconnectItem(): React.ReactNode {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={() => void this._handleDisconnect()}
        className="w-full text-left px-3 py-2 hover:bg-red-950/50 text-red-400 transition flex items-center justify-between"
      >
        <span>Disconnect Account</span>
      </button>
    );
  }
}
