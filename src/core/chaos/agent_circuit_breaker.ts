import { ChaosConstants } from '@/core/chaos/chaos_constants';

export interface CircuitStatus {
  isTripped: boolean;
  reason?: string | undefined;
  callCount: number;
  accumulatedCostUsd: number;
}

/**
 * Enforces execution loop depth, API budget ceilings, and semantic repetition trip conditions.
 */
export class AgentCircuitBreaker {
  private static readonly _DEFAULT_MAX_DEPTH = ChaosConstants.DEFAULT_MAX_AGENT_DEPTH;
  private static readonly _DEFAULT_MAX_BUDGET_USD = ChaosConstants.DEFAULT_MAX_BUDGET_USD;
  private static readonly _DEFAULT_SIMILARITY_THRESHOLD = ChaosConstants.DEFAULT_SIMILARITY_THRESHOLD;
  private static readonly _REASON_DEPTH_EXCEEDED = 'Call depth limit exceeded';
  private static readonly _REASON_BUDGET_EXCEEDED = 'Budget ceiling exceeded';
  private static readonly _REASON_SEMANTIC_LOOP = 'Repetitive semantic loop detected';
  private static readonly _REASON_ALREADY_TRIPPED = 'Circuit already tripped';

  public constructor(
    private readonly _maxDepth: number = AgentCircuitBreaker._DEFAULT_MAX_DEPTH,
    private readonly _maxBudgetUsd: number = AgentCircuitBreaker._DEFAULT_MAX_BUDGET_USD,
    private readonly _similarityThreshold: number = AgentCircuitBreaker._DEFAULT_SIMILARITY_THRESHOLD,
    private _callCount: number = 0,
    private _accumulatedCostUsd: number = 0,
    private _isTripped: boolean = false,
    private _tripReason: string | null = null,
    private readonly _thoughtHistory: string[] = [],
    private readonly _embeddingHistory: number[][] = []
  ) {}

  /**
   * Records an agent call, updates budget, checks thresholds, and returns updated circuit status.
   */
  public recordCall(
    costUsd: number,
    thought?: string,
    embedding?: number[]
  ): CircuitStatus {
    if (this._isTripped) {
      return this._buildStatus(AgentCircuitBreaker._REASON_ALREADY_TRIPPED);
    }

    this._callCount++;
    this._accumulatedCostUsd += costUsd;
    if (thought) this._thoughtHistory.push(thought);

    if (embedding && this.evaluateSemanticLoop(embedding)) {
      this._trip(AgentCircuitBreaker._REASON_SEMANTIC_LOOP);
      return this._buildStatus(AgentCircuitBreaker._REASON_SEMANTIC_LOOP);
    }

    if (this._exceedsLimits()) {
      const reason = this._resolveLimitTripReason();
      this._trip(reason);
      return this._buildStatus(reason);
    }

    return this._buildStatus();
  }

  /**
   * Evaluates if given embedding vector is semantically repetitive against prior thoughts.
   */
  public evaluateSemanticLoop(embedding: number[]): boolean {
    if (this._embeddingHistory.length === 0) {
      this._embeddingHistory.push(embedding);
      return false;
    }

    for (const prior of this._embeddingHistory) {
      const sim = this._computeCosineSimilarity(embedding, prior);
      if (sim >= this._similarityThreshold) {
        return true;
      }
    }

    this._embeddingHistory.push(embedding);
    return false;
  }

  /**
   * Returns whether circuit breaker is tripped.
   */
  public get isTripped(): boolean {
    return this._isTripped;
  }

  /**
   * Returns current trip reason if tripped, otherwise null.
   */
  public get tripReason(): string | null {
    return this._tripReason;
  }

  /**
   * Returns number of recorded calls.
   */
  public get callCount(): number {
    return this._callCount;
  }

  /**
   * Returns accumulated cost in USD.
   */
  public get accumulatedCostUsd(): number {
    return this._accumulatedCostUsd;
  }

  /**
   * Resets counter, history, and trip status to pristine initial state.
   */
  public reset(): void {
    this._callCount = 0;
    this._accumulatedCostUsd = 0;
    this._isTripped = false;
    this._tripReason = null;
    this._thoughtHistory.length = 0;
    this._embeddingHistory.length = 0;
  }

  private _exceedsLimits(): boolean {
    return (
      this._callCount >= this._maxDepth ||
      this._accumulatedCostUsd >= this._maxBudgetUsd
    );
  }

  private _resolveLimitTripReason(): string {
    if (this._callCount >= this._maxDepth) {
      return AgentCircuitBreaker._REASON_DEPTH_EXCEEDED;
    }
    return AgentCircuitBreaker._REASON_BUDGET_EXCEEDED;
  }

  private _trip(reason: string): void {
    this._isTripped = true;
    this._tripReason = reason;
  }

  private _buildStatus(reason?: string): CircuitStatus {
    return {
      isTripped: this._isTripped,
      reason: reason ?? (this._tripReason ?? undefined),
      callCount: this._callCount,
      accumulatedCostUsd: this._accumulatedCostUsd,
    };
  }

  private _computeCosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      const valA = a[i] ?? 0;
      const valB = b[i] ?? 0;
      dot += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
