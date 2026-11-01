import {
  UserGuidancePreferences,
  WelcomeTypes,
  WorkspaceTabId,
} from '@/core/state/welcome_types';
import { WorkspaceStore } from '@/core/state/workspace_store';

/**
 * Coordinates in-memory volatile user guidance preferences with zero local disk storage.
 */
export class GuidancePreferenceManager {
  private static readonly _DEFAULT_WELCOME_TYPES = new WelcomeTypes();

  public constructor(
    initialPreferences?: Partial<UserGuidancePreferences>,
    store?: WorkspaceStore
  ) {
    this._store = store;
    this._preferences = this._initPreferences(initialPreferences);
    this._listeners = new Set();
  }

  /**
   * Determines whether the global application welcome modal should be presented.
   */
  public shouldShowAppWelcome(): boolean {
    return !this._preferences.hasSeenAppWelcome;
  }

  /**
   * Determines whether the component-specific welcome overlay should be presented.
   */
  public shouldShowComponentWelcome(tabId: WorkspaceTabId): boolean {
    return !this._preferences.dismissedComponentWelcomes[tabId];
  }

  /**
   * Dismisses the global application welcome modal and updates volatile state.
   */
  public dismissAppWelcome(dontShowAgain: boolean): void {
    if (dontShowAgain) {
      this._preferences.hasSeenAppWelcome = true;
      this._syncStore();
      this._notifyListeners();
    }
  }

  /**
   * Dismisses the component-specific welcome overlay for a specific tab.
   */
  public dismissComponentWelcome(tabId: WorkspaceTabId, dontShowAgain: boolean): void {
    if (dontShowAgain) {
      this._preferences.dismissedComponentWelcomes[tabId] = true;
      this._syncStore();
      this._notifyListeners();
    }
  }

  /**
   * Resets all welcome screen dismissal states to default.
   */
  public resetAllWelcomes(): void {
    this._preferences = GuidancePreferenceManager._DEFAULT_WELCOME_TYPES.createDefaultPreferences();
    this._syncStore();
    this._notifyListeners();
  }

  /**
   * Returns a copy of the current volatile user guidance preferences.
   */
  public getPreferences(): UserGuidancePreferences {
    return {
      hasSeenAppWelcome: this._preferences.hasSeenAppWelcome,
      dismissedComponentWelcomes: {
        ...this._preferences.dismissedComponentWelcomes,
      },
    };
  }

  /**
   * Merges partial preferences into volatile state.
   */
  public setPreferences(partial: Partial<UserGuidancePreferences>): void {
    this._preferences = {
      ...this._preferences,
      ...partial,
      dismissedComponentWelcomes: {
        ...this._preferences.dismissedComponentWelcomes,
        ...(partial.dismissedComponentWelcomes ?? {}),
      },
    };
    this._syncStore();
    this._notifyListeners();
  }

  /**
   * Subscribes to preference state updates.
   */
  public subscribe(listener: (prefs: UserGuidancePreferences) => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _preferences: UserGuidancePreferences;
  private readonly _store: WorkspaceStore | undefined;
  private readonly _listeners: Set<(prefs: UserGuidancePreferences) => void>;

  private _initPreferences(
    initial?: Partial<UserGuidancePreferences>
  ): UserGuidancePreferences {
    const defaults =
      GuidancePreferenceManager._DEFAULT_WELCOME_TYPES.createDefaultPreferences();
    if (!initial) {
      return defaults;
    }
    return {
      hasSeenAppWelcome: initial.hasSeenAppWelcome ?? defaults.hasSeenAppWelcome,
      dismissedComponentWelcomes: {
        ...defaults.dismissedComponentWelcomes,
        ...(initial.dismissedComponentWelcomes ?? {}),
      },
    };
  }

  private _syncStore(): void {
    if (this._store) {
      this._store.markDirty();
    }
  }

  private _notifyListeners(): void {
    const copy = this.getPreferences();
    for (const listener of this._listeners) {
      listener(copy);
    }
  }
}
