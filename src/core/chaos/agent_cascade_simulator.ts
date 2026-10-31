import { AgentCircuitBreaker, CircuitStatus } from '@/core/chaos/agent_circuit_breaker';

export interface CascadeAgentDefinition {
  agentId: string;
  role: string;
  actionPrompt: string;
  tokenCostPerTurn: number;
  usdCostPerTurn: number;
  repetitiveEmbedding?: number[] | undefined;
}

export interface CascadeIteration {
  iterationIndex: number;
  fromAgentId: string;
  toAgentId: string;
  message: string;
  tokensUsed: number;
  costUsd: number;
  circuitStatus: CircuitStatus;
}

export interface SimulationOptions {
  enableCircuitBreaker?: boolean | undefined;
  circuitBreaker?: AgentCircuitBreaker | undefined;
  maxSafetyIterations?: number | undefined;
  initialMessage?: string | undefined;
}

export interface CascadeSimulationResult {
  iterations: CascadeIteration[];
  totalTokensUsed: number;
  totalCostUsd: number;
  circuitBreakerTripped: boolean;
  tripReason?: string | undefined;
  systemStatus:
    | 'HALTED_GRACEFULLY'
    | 'EXHAUSTED_BUDGET'
    | 'MAX_DEPTH_REACHED'
    | 'INFINITE_LOOP_CRASH';
}

/**
 * Simulates multi-agent execution loops, recursive ping-pong subflows, and circuit breaker interventions.
 */
export class AgentCascadeSimulator {
  private static readonly _DEFAULT_SAFETY_LIMIT = 20;
  private static readonly _DEFAULT_INITIAL_MSG = 'Find user missing billing record';
  private static readonly _MSG_QUERY_CALL = 'Tool Call: exec_query(SELECT * FROM users WHERE id=?)';
  private static readonly _MSG_QUERY_FAIL = 'Tool Error: Invalid table syntax in query execution';
  private static readonly _STATUS_GRACEFUL = 'HALTED_GRACEFULLY';
  private static readonly _STATUS_CRASH = 'INFINITE_LOOP_CRASH';

  public constructor() {}

  /**
   * Runs recursive cascade simulation between supervisor and worker agents.
   */
  public simulateCascade(
    agents: CascadeAgentDefinition[],
    options?: SimulationOptions
  ): CascadeSimulationResult {
    const breaker = this._resolveCircuitBreaker(options);
    const maxIters = options?.maxSafetyIterations ?? AgentCascadeSimulator._DEFAULT_SAFETY_LIMIT;
    const iterations: CascadeIteration[] = [];
    let totalTokens = 0;
    let totalCost = 0;

    for (let i = 0; i < maxIters; i++) {
      const step = this._executeTurn(i, agents, breaker);
      iterations.push(step);
      totalTokens += step.tokensUsed;
      totalCost += step.costUsd;

      if (step.circuitStatus.isTripped) {
        return this._buildTrippedResult(iterations, totalTokens, totalCost, step.circuitStatus);
      }
    }

    return this._buildCrashResult(iterations, totalTokens, totalCost);
  }

  /**
   * Generates a standard default 3-agent swarm configured for infinite query retry recursion.
   */
  public createDefaultAgentSwarm(): CascadeAgentDefinition[] {
    const embedding = [0.98, 0.95, 0.99, 0.91];
    return [
      this._createSupervisorAgent(),
      this._createResearchAgent(embedding),
      this._createCoderAgent(embedding),
    ];
  }

  private _createSupervisorAgent(): CascadeAgentDefinition {
    return {
      agentId: 'supervisor_router',
      role: 'Supervisor Agent',
      actionPrompt: AgentCascadeSimulator._DEFAULT_INITIAL_MSG,
      tokenCostPerTurn: 450,
      usdCostPerTurn: 0.05,
    };
  }

  private _createResearchAgent(embedding: number[]): CascadeAgentDefinition {
    return {
      agentId: 'research_agent',
      role: 'Research Agent',
      actionPrompt: AgentCascadeSimulator._MSG_QUERY_CALL,
      tokenCostPerTurn: 1200,
      usdCostPerTurn: 0.15,
      repetitiveEmbedding: embedding,
    };
  }

  private _createCoderAgent(embedding: number[]): CascadeAgentDefinition {
    return {
      agentId: 'coder_agent',
      role: 'Code Execution Agent',
      actionPrompt: AgentCascadeSimulator._MSG_QUERY_FAIL,
      tokenCostPerTurn: 800,
      usdCostPerTurn: 0.1,
      repetitiveEmbedding: embedding,
    };
  }

  private _resolveCircuitBreaker(options?: SimulationOptions): AgentCircuitBreaker | null {
    if (options?.enableCircuitBreaker === false) {
      return null;
    }
    return options?.circuitBreaker ?? new AgentCircuitBreaker();
  }

  private _executeTurn(
    index: number,
    agents: CascadeAgentDefinition[],
    breaker: AgentCircuitBreaker | null
  ): CascadeIteration {
    const sender = agents[index % agents.length] ?? agents[0]!;
    const receiver = agents[(index + 1) % agents.length] ?? agents[0]!;
    const tokens = sender.tokenCostPerTurn;
    const cost = sender.usdCostPerTurn;
    const thought = sender.actionPrompt;
    const embedding = sender.repetitiveEmbedding;

    const circuitStatus = breaker
      ? breaker.recordCall(cost, thought, embedding)
      : this._createDefaultStatus(index + 1, cost);

    return {
      iterationIndex: index,
      fromAgentId: sender.agentId,
      toAgentId: receiver.agentId,
      message: thought,
      tokensUsed: tokens,
      costUsd: cost,
      circuitStatus,
    };
  }

  private _createDefaultStatus(callCount: number, cost: number): CircuitStatus {
    return {
      isTripped: false,
      callCount,
      accumulatedCostUsd: cost,
    };
  }

  private _buildTrippedResult(
    iterations: CascadeIteration[],
    tokens: number,
    cost: number,
    status: CircuitStatus
  ): CascadeSimulationResult {
    return {
      iterations,
      totalTokensUsed: tokens,
      totalCostUsd: cost,
      circuitBreakerTripped: true,
      tripReason: status.reason,
      systemStatus: AgentCascadeSimulator._STATUS_GRACEFUL,
    };
  }

  private _buildCrashResult(
    iterations: CascadeIteration[],
    tokens: number,
    cost: number
  ): CascadeSimulationResult {
    return {
      iterations,
      totalTokensUsed: tokens,
      totalCostUsd: cost,
      circuitBreakerTripped: false,
      tripReason: 'Safety iteration limit reached without breaker intervention',
      systemStatus: AgentCascadeSimulator._STATUS_CRASH,
    };
  }
}
