import { describe, expect, it } from 'vitest';
import { WelcomeTypes } from '@/core/state/welcome_types';

describe('WelcomeTypes', () => {
  const welcomeTypes = new WelcomeTypes();

  it('test_createDefaultPreferences_initializesAllTabsToFalse', () => {
    const prefs = welcomeTypes.createDefaultPreferences();
    expect(prefs.hasSeenAppWelcome).toBe(false);
    expect(prefs.dismissedComponentWelcomes.CANVAS).toBe(false);
    expect(prefs.dismissedComponentWelcomes.INTERVIEW).toBe(false);
    expect(prefs.dismissedComponentWelcomes.CHAOS).toBe(false);
    expect(prefs.dismissedComponentWelcomes.CURRICULUM).toBe(false);
    expect(prefs.dismissedComponentWelcomes.TELEMETRY).toBe(false);
    expect(prefs.dismissedComponentWelcomes.FINOPS).toBe(false);
  });

  it('test_isValidTab_validatesSupportedTabs', () => {
    expect(welcomeTypes.isValidTab('CANVAS')).toBe(true);
    expect(welcomeTypes.isValidTab('FINOPS')).toBe(true);
    expect(welcomeTypes.isValidTab('INVALID')).toBe(false);
  });

  it('test_isValidActionType_validatesSupportedActions', () => {
    expect(welcomeTypes.isValidActionType('LOAD_CANVAS_RAG')).toBe(true);
    expect(welcomeTypes.isValidActionType('LOAD_FINOPS_LLAMA')).toBe(true);
    expect(welcomeTypes.isValidActionType('INVALID_ACTION')).toBe(false);
  });

  it('test_getValidTabs_returnsAllTabs', () => {
    const tabs = welcomeTypes.getValidTabs();
    expect(tabs.length).toBe(6);
  });

  it('test_getValidActionTypes_returnsAllActions', () => {
    const actions = welcomeTypes.getValidActionTypes();
    expect(actions.length).toBe(6);
  });
});

