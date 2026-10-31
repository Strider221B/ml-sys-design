import { PyodideConstants } from '@/core/math/pyodide_constants';

export interface ParetoCandidate {
  id: string;
  metrics: Record<string, number>;
  objectives: Record<string, 'maximize' | 'minimize'>;
}

export interface ParetoFrontierResult {
  frontier: ParetoCandidate[];
  dominated: ParetoCandidate[];
  tradeOffMatrix: Record<string, Record<string, number>>;
}

/**
 * Computes non-dominated Pareto frontiers and objective trade-off matrices.
 */
export class ParetoOptimizer {
  private static readonly _MIN_CANDIDATE_COUNT = 0;
  private static readonly _ZERO_SCORE = 0.0;
  private static readonly _DEFAULT_WEIGHT = 1.0;
  private static readonly _MIN_DENOMINATOR = 1e-9;

  public constructor() {}

  /**
   * Computes non-dominated Pareto frontier and trade-off matrix.
   */
  public computeFrontier(candidates: ParetoCandidate[]): ParetoFrontierResult {
    if (candidates.length === ParetoOptimizer._MIN_CANDIDATE_COUNT) {
      return { frontier: [], dominated: [], tradeOffMatrix: {} };
    }

    const frontier: ParetoCandidate[] = [];
    const dominated: ParetoCandidate[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const candidateA = candidates[i];
      if (this._isDominatedByAny(candidateA, candidates)) {
        dominated.push(candidateA);
      } else {
        frontier.push(candidateA);
      }
    }

    const tradeOffMatrix = this.computeTradeOffMatrix(frontier);
    return { frontier, dominated, tradeOffMatrix };
  }

  /**
   * Computes pairwise correlation matrix across frontier metrics.
   */
  public computeTradeOffMatrix(frontier: ParetoCandidate[]): Record<string, Record<string, number>> {
    if (frontier.length < 2) {
      return {};
    }
    const metricKeys = Object.keys(frontier[0].metrics);
    const matrix: Record<string, Record<string, number>> = {};

    for (const keyA of metricKeys) {
      matrix[keyA] = {};
      const valsA = frontier.map((c) => c.metrics[keyA] ?? ParetoOptimizer._ZERO_SCORE);
      for (const keyB of metricKeys) {
        const valsB = frontier.map((c) => c.metrics[keyB] ?? ParetoOptimizer._ZERO_SCORE);
        matrix[keyA][keyB] = this._calculateCorrelation(valsA, valsB);
      }
    }
    return matrix;
  }

  /**
   * Ranks candidates on the frontier by composite weighted utility score.
   */
  public rankFrontierByWeights(
    frontier: ParetoCandidate[],
    weights: Record<string, number>
  ): ParetoCandidate[] {
    const scored = frontier.map((c) => ({
      candidate: c,
      score: this._calculateCompositeScore(c, weights),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.candidate);
  }

  private _isDominatedByAny(target: ParetoCandidate, allCandidates: ParetoCandidate[]): boolean {
    for (const other of allCandidates) {
      if (other.id !== target.id && this._dominates(other, target)) {
        return true;
      }
    }
    return false;
  }

  private _dominates(a: ParetoCandidate, b: ParetoCandidate): boolean {
    let strictlyBetterInAtLeastOne = false;
    for (const [key, direction] of Object.entries(a.objectives)) {
      const valA = a.metrics[key] ?? ParetoOptimizer._ZERO_SCORE;
      const valB = b.metrics[key] ?? ParetoOptimizer._ZERO_SCORE;

      if (direction === PyodideConstants.OBJECTIVE_MAXIMIZE) {
        if (valA < valB) return false;
        if (valA > valB) strictlyBetterInAtLeastOne = true;
      } else {
        if (valA > valB) return false;
        if (valA < valB) strictlyBetterInAtLeastOne = true;
      }
    }
    return strictlyBetterInAtLeastOne;
  }

  private _calculateCompositeScore(candidate: ParetoCandidate, weights: Record<string, number>): number {
    let totalScore = ParetoOptimizer._ZERO_SCORE;
    for (const [key, direction] of Object.entries(candidate.objectives)) {
      const val = candidate.metrics[key] ?? ParetoOptimizer._ZERO_SCORE;
      const weight = weights[key] ?? ParetoOptimizer._DEFAULT_WEIGHT;
      if (direction === PyodideConstants.OBJECTIVE_MAXIMIZE) {
        totalScore += weight * val;
      } else {
        totalScore -= weight * val;
      }
    }
    return totalScore;
  }

  private _calculateCorrelation(x: number[], y: number[]): number {
    const meanX = x.reduce((a, b) => a + b, 0) / x.length;
    const meanY = y.reduce((a, b) => a + b, 0) / y.length;
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < x.length; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      numerator += diffX * diffY;
      denomX += diffX * diffX;
      denomY += diffY * diffY;
    }

    const denominator = Math.sqrt(denomX * denomY);
    if (denominator < ParetoOptimizer._MIN_DENOMINATOR) {
      return ParetoOptimizer._ZERO_SCORE;
    }
    return numerator / denominator;
  }
}

