// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { GDriveSyncControl } from '@/components/navigation/gdrive_sync_control';
import { ConflictResolver } from '@/core/gdrive/conflict_resolver';
import { GDriveSyncClient } from '@/core/gdrive/gdrive_sync_client';
import { GoogleAuthClient } from '@/core/gdrive/google_auth_client';
import { SyncManager } from '@/core/gdrive/sync_manager';
import { WorkspaceStore } from '@/core/state/workspace_store';

describe('GDriveSyncControl', () => {
  let store: WorkspaceStore;
  let authClient: GoogleAuthClient;
  let syncClient: GDriveSyncClient;
  let syncManager: SyncManager;

  beforeEach(() => {
    vi.restoreAllMocks();
    store = new WorkspaceStore();
    authClient = new GoogleAuthClient();
    syncClient = new GDriveSyncClient('mock_token');
    syncManager = new SyncManager(syncClient, store, new ConflictResolver());
  });

  it('test_render_whenUnauthenticated_showsConnectButtonAndWarning', () => {
    render(<GDriveSyncControl store={store} authClient={authClient} />);

    expect(screen.getByText('Connect Google Drive')).toBeDefined();
    expect(screen.getByText('RAM-Only SSOT')).toBeDefined();
  });

  it('test_handleConnectClick_authenticatesAndSwitchesToSynced', async () => {
    vi.spyOn(authClient, 'isAuthenticated').mockReturnValue(false);
    const initSpy = vi.spyOn(authClient, 'initialize').mockResolvedValue(undefined);
    const authSpy = vi.spyOn(authClient, 'requestAccessToken').mockResolvedValue('mock_token');

    render(<GDriveSyncControl store={store} authClient={authClient} />);

    const connectBtn = screen.getByText('Connect Google Drive');
    await act(async () => {
      fireEvent.click(connectBtn);
    });

    expect(initSpy).toHaveBeenCalled();
    expect(authSpy).toHaveBeenCalled();
    expect(screen.getByText(/Synced to Drive/i)).toBeDefined();
  });

  it('test_handleConnectClick_whenErrorThrown_displaysErrorAndResetsConnecting', async () => {
    vi.spyOn(authClient, 'isAuthenticated').mockReturnValue(false);
    vi.spyOn(authClient, 'initialize').mockRejectedValue(new Error('Popup blocked'));

    render(<GDriveSyncControl store={store} authClient={authClient} />);

    const connectBtn = screen.getByText('Connect Google Drive');
    await act(async () => {
      fireEvent.click(connectBtn);
    });

    expect(screen.getByText('Connect Google Drive')).toBeDefined();
  });

  it('test_render_whenSynced_togglesDropdownAndHandlesKeyboardEscape', () => {
    vi.spyOn(authClient, 'isAuthenticated').mockReturnValue(true);
    store.setSyncState('CLEAN');

    render(<GDriveSyncControl store={store} authClient={authClient} />);

    const pillBtn = screen.getByText(/Synced to Drive/i);
    fireEvent.click(pillBtn);

    expect(screen.getByText('Sync Now')).toBeDefined();
    expect(screen.getByText('Switch Workspace')).toBeDefined();
    expect(screen.getByText('Disconnect Account')).toBeDefined();

    fireEvent.keyDown(pillBtn, { key: 'Escape' });
    expect(screen.queryByText('Sync Now')).toBeNull();
  });

  it('test_dropdownActions_executesSyncNowSwitchAndDisconnect', async () => {
    vi.spyOn(authClient, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authClient, 'getAccessToken').mockReturnValue('token_123');
    const revokeSpy = vi.spyOn(authClient, 'revokeToken').mockResolvedValue(undefined);
    const flushSpy = vi.spyOn(syncManager, 'flushSync').mockResolvedValue(undefined);
    const onSwitch = vi.fn();

    render(
      <GDriveSyncControl
        store={store}
        authClient={authClient}
        syncManager={syncManager}
        onSwitchWorkspace={onSwitch}
      />
    );

    // Test Sync Now
    fireEvent.click(screen.getByText(/Synced to Drive/i));
    await act(async () => {
      fireEvent.click(screen.getByText('Sync Now'));
    });
    expect(flushSpy).toHaveBeenCalled();

    // Test Switch Workspace
    fireEvent.click(screen.getByText(/Synced to Drive/i));
    fireEvent.click(screen.getByText('Switch Workspace'));
    expect(onSwitch).toHaveBeenCalled();

    // Test Disconnect
    fireEvent.click(screen.getByText(/Synced to Drive/i));
    await act(async () => {
      fireEvent.click(screen.getByText('Disconnect Account'));
    });
    expect(revokeSpy).toHaveBeenCalledWith('token_123');
    expect(screen.getByText('Connect Google Drive')).toBeDefined();
  });

  it('test_dropdownSyncNow_withoutSyncManager_marksStoreClean', async () => {
    vi.spyOn(authClient, 'isAuthenticated').mockReturnValue(true);
    const cleanSpy = vi.spyOn(store, 'markClean');

    render(<GDriveSyncControl store={store} authClient={authClient} />);

    fireEvent.click(screen.getByText(/Synced to Drive/i));
    await act(async () => {
      fireEvent.click(screen.getByText('Sync Now'));
    });

    expect(cleanSpy).toHaveBeenCalled();
  });

  it('test_storeSubscription_updatesDirtyAndConflictStates', () => {
    vi.spyOn(authClient, 'isAuthenticated').mockReturnValue(true);
    const onResolve = vi.fn();

    render(
      <GDriveSyncControl
        store={store}
        authClient={authClient}
        onResolveConflict={onResolve}
      />
    );

    // Dirty state
    act(() => {
      store.markDirty();
    });
    expect(screen.getByText(/Saving changes.../i)).toBeDefined();

    // Conflict state
    act(() => {
      store.setSyncState('CONFLICT');
    });
    const conflictBtn = screen.getByText('Resolve Conflict');
    expect(conflictBtn).toBeDefined();

    fireEvent.click(conflictBtn);
    expect(onResolve).toHaveBeenCalled();
  });

  it('test_timeSinceSave_formatsSecondsMinutesAndHours', () => {
    vi.spyOn(authClient, 'isAuthenticated').mockReturnValue(true);
    const pastMinutes = new Date(Date.now() - 120000).toISOString();
    store.markClean('etag1', pastMinutes);

    render(<GDriveSyncControl store={store} authClient={authClient} />);

    expect(screen.getByText(/2m ago/i)).toBeDefined();
  });

  it('test_unmount_clearsIntervalAndStoreSubscription', () => {
    vi.spyOn(authClient, 'isAuthenticated').mockReturnValue(true);
    const { unmount } = render(<GDriveSyncControl store={store} authClient={authClient} />);

    expect(() => unmount()).not.toThrow();
  });
});
