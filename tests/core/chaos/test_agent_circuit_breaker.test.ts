import { describe, expect, it } from 'vitest';
import { AgentCircuitBreaker } from '@/core/chaos/agent_circuit_breaker';

describe('AgentCircuitBreaker', () => {
  it('test_recordCall_incrementsCallCountAndAccumulatedCost', () => {
    const breaker = new AgentCircuitBreaker(5, 10.0);
    const status = breaker.recordCall(1.5, 'Thinking step 1');

    expect(status.isTripped).toBe(false);
    expect(status.callCount).toBe(1);
    expect(status.accumulatedCostUsd).toBe(1.5);
    expect(breaker.callCount).toBe(1);
    expect(breaker.accumulatedCostUsd).toBe(1.5);
    expect(breaker.isTripped).toBe(false);
  });

  it('test_recordCall_tripsWhenMaxDepthExceeded', () => {
    const breaker = new AgentCircuitBreaker(2, 50.0);
    breaker.recordCall(1.0);
    const status = breaker.recordCall(1.0);

    expect(status.isTripped).toBe(true);
    expect(status.reason).toBe('Call depth limit exceeded');
    expect(breaker.isTripped).toBe(true);
    expect(breaker.tripReason).toBe('Call depth limit exceeded');

    const nextCall = breaker.recordCall(1.0);
    expect(nextCall.reason).toBe('Circuit already tripped');
  });

  it('test_recordCall_tripsWhenBudgetExceeded', () => {
    const breaker = new AgentCircuitBreaker(10, 5.0);
    breaker.recordCall(3.0);
    const status = breaker.recordCall(2.5);

    expect(status.isTripped).toBe(true);
    expect(status.reason).toBe('Budget ceiling exceeded');
  });

  it('test_recordCall_tripsOnSemanticRepetitionLoop', () => {
    const breaker = new AgentCircuitBreaker(10, 20.0, 0.95);
    const emb1 = [1.0, 0.0, 0.0];
    const emb2 = [0.99, 0.01, 0.0];

    const first = breaker.recordCall(0.5, 'Execute sql', emb1);
    expect(first.isTripped).toBe(false);

    const second = breaker.recordCall(0.5, 'Execute sql repeated', emb2);
    expect(second.isTripped).toBe(true);
    expect(second.reason).toBe('Repetitive semantic loop detected');
  });

  it('test_evaluateSemanticLoop_withDifferentOrZeroVectors_handlesEdgeCases', () => {
    const breaker = new AgentCircuitBreaker();
    expect(breaker.evaluateSemanticLoop([])).toBe(false);
    expect(breaker.evaluateSemanticLoop([1, 2, 3])).toBe(false);
    expect(breaker.evaluateSemanticLoop([0, 0, 0])).toBe(false);
    expect(breaker.evaluateSemanticLoop([1, 2])).toBe(false);
  });

  it('test_reset_restoresInitialPristineState', () => {
    const breaker = new AgentCircuitBreaker(2, 5.0);
    breaker.recordCall(10.0);
    expect(breaker.isTripped).toBe(true);

    breaker.reset();
    expect(breaker.isTripped).toBe(false);
    expect(breaker.tripReason).toBeNull();
    expect(breaker.callCount).toBe(0);
    expect(breaker.accumulatedCostUsd).toBe(0);
  });
});

