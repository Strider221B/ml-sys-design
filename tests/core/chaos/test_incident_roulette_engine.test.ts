import { describe, expect, it } from 'vitest';
import { IncidentRouletteEngine } from '@/core/chaos/incident_roulette_engine';

describe('IncidentRouletteEngine', () => {
  it('test_triggerRandomIncident_selectsIncidentAndPopulatesActiveState', () => {
    const engine = new IncidentRouletteEngine();
    const inc = engine.triggerRandomIncident();

    expect(inc).toBeDefined();
    expect(inc.title.length).toBeGreaterThan(0);
    expect(inc.remediationChoices.length).toBeGreaterThan(0);
    expect(engine.getActiveIncident()).toBeDefined();
    expect(engine.getActiveIncident()?.id).toBe(inc.id);
  });

  it('test_triggerIncidentById_whenFound_setsActiveIncident', () => {
    const engine = new IncidentRouletteEngine();
    const inc = engine.triggerIncidentById('inc_vdb_v2_latency');

    expect(inc.id).toBe('inc_vdb_v2_latency');
    expect(inc.currentP99Ms).toBe(125);
  });

  it('test_triggerIncidentById_whenNotFound_throwsError', () => {
    const engine = new IncidentRouletteEngine();
    expect(() => engine.triggerIncidentById('non_existent')).toThrow('Incident not found');
  });

  it('test_applyMitigation_whenNoActiveIncident_throwsError', () => {
    const engine = new IncidentRouletteEngine();
    expect(() => engine.applyMitigation('choice_1')).toThrow('No active incident');
  });

  it('test_applyMitigation_whenChoiceNotFound_throwsError', () => {
    const engine = new IncidentRouletteEngine();
    engine.triggerIncidentById('inc_vdb_v2_latency');
    expect(() => engine.applyMitigation('invalid_choice')).toThrow('Remediation choice not found');
  });

  it('test_applyMitigation_withRestartCluster_drainsImmediateOutageBudget', () => {
    const engine = new IncidentRouletteEngine(43.2, 43.2);
    engine.triggerIncidentById('inc_vdb_v2_latency');

    const result = engine.applyMitigation('choice_restart_vdb');
    expect(result.success).toBe(true);
    expect(result.resolved).toBe(true);
    expect(result.budgetDrainedMinutes).toBe(2.0);
    expect(result.remainingBudgetMinutes).toBe(41.2);
    expect(engine.getErrorBudgetRemaining()).toBe(41.2);
  });

  it('test_tick_drainsErrorBudgetWhenSlaViolated', () => {
    const engine = new IncidentRouletteEngine(10.0, 10.0);
    engine.triggerIncidentById('inc_vdb_v2_latency');

    const tickResult = engine.tick(60);
    expect(tickResult.deltaMinutesDrained).toBeGreaterThan(0);
    expect(tickResult.remainingBudgetMinutes).toBeLessThan(10.0);
    expect(tickResult.systemHalted).toBe(false);
  });

  it('test_tick_whenBudgetDepleted_haltsSystem', () => {
    const engine = new IncidentRouletteEngine(0.5, 0.5);
    engine.triggerIncidentById('inc_vdb_v2_latency');

    const tickResult = engine.tick(300);
    expect(tickResult.remainingBudgetMinutes).toBe(0);
    expect(tickResult.systemHalted).toBe(true);
    expect(engine.isSystemHalted()).toBe(true);
  });

  it('test_tick_whenNoActiveIncident_doesNotDrainBudget', () => {
    const engine = new IncidentRouletteEngine(43.2, 43.2);
    const tickResult = engine.tick(60);
    expect(tickResult.deltaMinutesDrained).toBe(0);
    expect(tickResult.remainingBudgetMinutes).toBe(43.2);
  });

  it('test_reset_restoresFullBudgetAndClearsActiveIncident', () => {
    const engine = new IncidentRouletteEngine(43.2, 43.2);
    engine.triggerIncidentById('inc_vdb_v2_latency');
    engine.tick(300);

    engine.reset();
    expect(engine.getActiveIncident()).toBeNull();
    expect(engine.getErrorBudgetRemaining()).toBe(43.2);
    expect(engine.getErrorBudgetPercentage()).toBe(100);
    expect(engine.isSystemHalted()).toBe(false);
  });
});

