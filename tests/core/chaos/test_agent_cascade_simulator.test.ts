import { describe, expect, it } from 'vitest';
import { AgentCascadeSimulator } from '@/core/chaos/agent_cascade_simulator';
import { AgentCircuitBreaker } from '@/core/chaos/agent_circuit_breaker';

describe('AgentCascadeSimulator', () => {
  it('test_createDefaultAgentSwarm_returnsThreeConfiguredAgents', () => {
    const sim = new AgentCascadeSimulator();
    const swarm = sim.createDefaultAgentSwarm();

    expect(swarm).toHaveLength(3);
    expect(swarm[0]?.role).toBe('Supervisor Agent');
    expect(swarm[1]?.role).toBe('Research Agent');
    expect(swarm[2]?.role).toBe('Code Execution Agent');
    expect(swarm[1]?.repetitiveEmbedding).toBeDefined();
  });

  it('test_simulateCascade_withCircuitBreakerEnabled_haltsCascadeGracefully', () => {
    const sim = new AgentCascadeSimulator();
    const swarm = sim.createDefaultAgentSwarm();
    const breaker = new AgentCircuitBreaker(4, 5.0, 0.95);

    const result = sim.simulateCascade(swarm, {
      enableCircuitBreaker: true,
      circuitBreaker: breaker,
    });

    expect(result.circuitBreakerTripped).toBe(true);
    expect(result.systemStatus).toBe('HALTED_GRACEFULLY');
    expect(result.tripReason).toBeDefined();
    expect(result.iterations.length).toBeLessThanOrEqual(4);
    expect(result.totalTokensUsed).toBeGreaterThan(0);
    expect(result.totalCostUsd).toBeGreaterThan(0);
  });

  it('test_simulateCascade_withCircuitBreakerDisabled_exhaustsSafetyLimitAndCrashes', () => {
    const sim = new AgentCascadeSimulator();
    const swarm = sim.createDefaultAgentSwarm();

    const result = sim.simulateCascade(swarm, {
      enableCircuitBreaker: false,
      maxSafetyIterations: 10,
    });

    expect(result.circuitBreakerTripped).toBe(false);
    expect(result.systemStatus).toBe('INFINITE_LOOP_CRASH');
    expect(result.iterations).toHaveLength(10);
  });
});

