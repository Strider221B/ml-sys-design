import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GuidancePreferenceManager } from '@/core/state/guidance_preference_manager';
import { WorkspaceStore } from '@/core/state/workspace_store';

describe('GuidancePreferenceManager', () => {
  let store: WorkspaceStore;

  beforeEach(() => {
    store = new WorkspaceStore();
  });

  it('test_initialDefaults_presentsBothAppAndComponentWelcomes', () => {
    const manager = new GuidancePreferenceManager();
    expect(manager.shouldShowAppWelcome()).toBe(true);
    expect(manager.shouldShowComponentWelcome('CANVAS')).toBe(true);
    expect(manager.shouldShowComponentWelcome('INTERVIEW')).toBe(true);
    expect(manager.shouldShowComponentWelcome('CHAOS')).toBe(true);
    expect(manager.shouldShowComponentWelcome('CURRICULUM')).toBe(true);
    expect(manager.shouldShowComponentWelcome('TELEMETRY')).toBe(true);
    expect(manager.shouldShowComponentWelcome('FINOPS')).toBe(true);
  });

  it('test_customInitialPreferences_respectsPassedState', () => {
    const manager = new GuidancePreferenceManager({
      hasSeenAppWelcome: true,
      dismissedComponentWelcomes: {
        CANVAS: true,
        INTERVIEW: false,
        CHAOS: false,
        CURRICULUM: false,
        TELEMETRY: false,
        FINOPS: false,
      },
    });

    expect(manager.shouldShowAppWelcome()).toBe(false);
    expect(manager.shouldShowComponentWelcome('CANVAS')).toBe(false);
    expect(manager.shouldShowComponentWelcome('INTERVIEW')).toBe(true);
  });

  it('test_dismissAppWelcome_whenDontShowAgainFalse_doesNotSuppressFutureWelcomes', () => {
    const manager = new GuidancePreferenceManager();
    manager.dismissAppWelcome(false);
    expect(manager.shouldShowAppWelcome()).toBe(true);
  });

  it('test_dismissAppWelcome_whenDontShowAgainTrue_suppressesFutureWelcomesAndSyncsStore', () => {
    const markDirtySpy = vi.spyOn(store, 'markDirty');
    const manager = new GuidancePreferenceManager(undefined, store);

    manager.dismissAppWelcome(true);
    expect(manager.shouldShowAppWelcome()).toBe(false);
    expect(markDirtySpy).toHaveBeenCalled();
  });

  it('test_dismissComponentWelcome_whenDontShowAgainFalse_keepsOverlayActive', () => {
    const manager = new GuidancePreferenceManager();
    manager.dismissComponentWelcome('CANVAS', false);
    expect(manager.shouldShowComponentWelcome('CANVAS')).toBe(true);
  });

  it('test_dismissComponentWelcome_whenDontShowAgainTrue_suppressesOnlyTargetTab', () => {
    const markDirtySpy = vi.spyOn(store, 'markDirty');
    const manager = new GuidancePreferenceManager(undefined, store);

    manager.dismissComponentWelcome('CANVAS', true);
    expect(manager.shouldShowComponentWelcome('CANVAS')).toBe(false);
    expect(manager.shouldShowComponentWelcome('INTERVIEW')).toBe(true);
    expect(markDirtySpy).toHaveBeenCalled();
  });

  it('test_resetAllWelcomes_restoresAllWelcomesToTrue', () => {
    const manager = new GuidancePreferenceManager();
    manager.dismissAppWelcome(true);
    manager.dismissComponentWelcome('CANVAS', true);
    manager.dismissComponentWelcome('INTERVIEW', true);

    expect(manager.shouldShowAppWelcome()).toBe(false);
    expect(manager.shouldShowComponentWelcome('CANVAS')).toBe(false);

    manager.resetAllWelcomes();
    expect(manager.shouldShowAppWelcome()).toBe(true);
    expect(manager.shouldShowComponentWelcome('CANVAS')).toBe(true);
    expect(manager.shouldShowComponentWelcome('INTERVIEW')).toBe(true);
  });

  it('test_setPreferences_mergesPartialStateCorrectly', () => {
    const manager = new GuidancePreferenceManager();
    manager.setPreferences({
      hasSeenAppWelcome: true,
      dismissedComponentWelcomes: {
        FINOPS: true,
        CANVAS: false,
        INTERVIEW: false,
        CHAOS: false,
        CURRICULUM: false,
        TELEMETRY: false,
      },
    });

    const prefs = manager.getPreferences();
    expect(prefs.hasSeenAppWelcome).toBe(true);
    expect(prefs.dismissedComponentWelcomes.FINOPS).toBe(true);
    expect(prefs.dismissedComponentWelcomes.CANVAS).toBe(false);

    // Test partial without dismissedComponentWelcomes
    manager.setPreferences({ hasSeenAppWelcome: false });
    expect(manager.getPreferences().hasSeenAppWelcome).toBe(false);
  });

  it('test_initPreferences_withEmptyPartial_usesDefaults', () => {
    const manager = new GuidancePreferenceManager({});
    expect(manager.shouldShowAppWelcome()).toBe(true);
    expect(manager.shouldShowComponentWelcome('CANVAS')).toBe(true);
  });

  it('test_subscribe_notifiesSubscribersOnUpdatesAndAllowsUnsubscribe', () => {
    const manager = new GuidancePreferenceManager();
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);

    manager.dismissAppWelcome(true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    manager.dismissComponentWelcome('CHAOS', true);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
