import { describe, expect, it } from 'vitest';
import {
  type ParetoCandidate,
  ParetoOptimizer,
} from '@/core/math/pareto_optimizer';

describe('ParetoOptimizer', () => {
  const optimizer = new ParetoOptimizer();

  it('test_computeFrontier_identifiesNonDominatedAndDominatedCandidates', () => {
    const candidates: ParetoCandidate[] = [
      {
        id: 'c1',
        metrics: { engagement: 0.9, toxicity: 0.05, cost: 0.2 },
        objectives: { engagement: 'maximize', toxicity: 'minimize', cost: 'minimize' },
      },
      {
        id: 'c2',
        metrics: { engagement: 0.7, toxicity: 0.02, cost: 0.1 },
        objectives: { engagement: 'maximize', toxicity: 'minimize', cost: 'minimize' },
      },
      {
        id: 'c3_dominated',
        metrics: { engagement: 0.6, toxicity: 0.10, cost: 0.3 },
        objectives: { engagement: 'maximize', toxicity: 'minimize', cost: 'minimize' },
      },
    ];

    const result = optimizer.computeFrontier(candidates);

    expect(result.frontier.map((c) => c.id)).toContain('c1');
    expect(result.frontier.map((c) => c.id)).toContain('c2');
    expect(result.dominated.map((c) => c.id)).toContain('c3_dominated');
    expect(result.frontier.length).toBe(2);
    expect(result.dominated.length).toBe(1);
  });

  it('test_computeFrontier_minimizingObjectives_identifiesDominance', () => {
    const candidates: ParetoCandidate[] = [
      {
        id: 'c_best',
        metrics: { latency: 5, errorRate: 0.01 },
        objectives: { latency: 'minimize', errorRate: 'minimize' },
      },
      {
        id: 'c_worst',
        metrics: { latency: 15, errorRate: 0.05 },
        objectives: { latency: 'minimize', errorRate: 'minimize' },
      },
    ];

    const result = optimizer.computeFrontier(candidates);
    expect(result.frontier.map((c) => c.id)).toEqual(['c_best']);
    expect(result.dominated.map((c) => c.id)).toEqual(['c_worst']);
  });

  it('test_rankFrontierByWeights_withoutExplicitWeights_usesDefaultWeights', () => {
    const frontier: ParetoCandidate[] = [
      {
        id: 'c1',
        metrics: { quality: 10, latency: 2 },
        objectives: { quality: 'maximize', latency: 'minimize' },
      },
      {
        id: 'c2',
        metrics: { quality: 5, latency: 10 },
        objectives: { quality: 'maximize', latency: 'minimize' },
      },
    ];

    const ranked = optimizer.rankFrontierByWeights(frontier, {});
    expect(ranked[0].id).toBe('c1');
  });

  it('test_computeFrontier_emptyList_returnsEmptyResults', () => {
    const result = optimizer.computeFrontier([]);
    expect(result.frontier).toEqual([]);
    expect(result.dominated).toEqual([]);
    expect(result.tradeOffMatrix).toEqual({});
  });

  it('test_computeTradeOffMatrix_calculatesPairwiseCorrelations', () => {
    const frontier: ParetoCandidate[] = [
      {
        id: 'c1',
        metrics: { latency: 10, throughput: 100 },
        objectives: { latency: 'minimize', throughput: 'maximize' },
      },
      {
        id: 'c2',
        metrics: { latency: 20, throughput: 200 },
        objectives: { latency: 'minimize', throughput: 'maximize' },
      },
      {
        id: 'c3',
        metrics: { latency: 30, throughput: 300 },
        objectives: { latency: 'minimize', throughput: 'maximize' },
      },
    ];

    const matrix = optimizer.computeTradeOffMatrix(frontier);
    expect(matrix.latency.throughput).toBeCloseTo(1.0, 4);
    expect(matrix.latency.latency).toBeCloseTo(1.0, 4);
  });

  it('test_computeTradeOffMatrix_singleCandidate_returnsEmpty', () => {
    const frontier: ParetoCandidate[] = [
      {
        id: 'c1',
        metrics: { a: 1, b: 2 },
        objectives: { a: 'maximize', b: 'maximize' },
      },
    ];
    expect(optimizer.computeTradeOffMatrix(frontier)).toEqual({});
  });

  it('test_computeTradeOffMatrix_zeroVarianceConstantMetrics_returnsZeroCorrelation', () => {
    const frontier: ParetoCandidate[] = [
      { id: 'c1', metrics: { latency: 10, cost: 5 }, objectives: { latency: 'minimize', cost: 'minimize' } },
      { id: 'c2', metrics: { latency: 10, cost: 5 }, objectives: { latency: 'minimize', cost: 'minimize' } },
    ];
    const matrix = optimizer.computeTradeOffMatrix(frontier);
    expect(matrix.latency.cost).toBe(0.0);
  });

  it('test_rankFrontierByWeights_ordersCandidatesCorrectly', () => {
    const frontier: ParetoCandidate[] = [
      {
        id: 'c_high_eng',
        metrics: { engagement: 1.0, cost: 0.8 },
        objectives: { engagement: 'maximize', cost: 'minimize' },
      },
      {
        id: 'c_low_cost',
        metrics: { engagement: 0.6, cost: 0.1 },
        objectives: { engagement: 'maximize', cost: 'minimize' },
      },
    ];

    const rankedForEngagement = optimizer.rankFrontierByWeights(frontier, {
      engagement: 10.0,
      cost: 1.0,
    });
    expect(rankedForEngagement[0].id).toBe('c_high_eng');

    const rankedForCost = optimizer.rankFrontierByWeights(frontier, {
      engagement: 1.0,
      cost: 10.0,
    });
    expect(rankedForCost[0].id).toBe('c_low_cost');
  });
});
