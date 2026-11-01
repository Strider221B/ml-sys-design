import { describe, expect, it } from 'vitest';
import { WelcomeConstants } from '@/components/welcome/welcome_constants';

describe('WelcomeConstants', () => {
  const constants = new WelcomeConstants();

  it('test_getPillars_returnsThreeArchitecturalPillars', () => {
    const pillars = constants.getPillars();
    expect(pillars.length).toBe(3);
    expect(pillars[0]?.title).toBe('Deterministic Simulation');
    expect(pillars[1]?.title).toBe('Zero Local Persistence & Drive SSOT');
    expect(pillars[2]?.title).toBe('Dual-Mode AI Engine');
  });

  it('test_getWorkspaceCards_returnsSixOperationalWorkspaces', () => {
    const cards = constants.getWorkspaceCards();
    expect(cards.length).toBe(6);
    expect(cards[0]?.tabId).toBe('CANVAS');
    expect(cards[1]?.tabId).toBe('INTERVIEW');
    expect(cards[2]?.tabId).toBe('CHAOS');
    expect(cards[3]?.tabId).toBe('CURRICULUM');
    expect(cards[4]?.tabId).toBe('TELEMETRY');
    expect(cards[5]?.tabId).toBe('FINOPS');
  });
});

