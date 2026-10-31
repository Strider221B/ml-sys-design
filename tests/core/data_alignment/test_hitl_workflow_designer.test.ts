import { describe, expect, it } from 'vitest';
import {
  type HitlSample,
  HitlWorkflowDesigner,
} from '@/core/data_alignment/hitl_workflow_designer';

describe('HitlWorkflowDesigner', () => {
  const designer = new HitlWorkflowDesigner();

  it('test_routeSamples_highConfidenceLowEntropy_routesToSilverStore', () => {
    const samples: HitlSample[] = [
      { id: 's1', text: 'Clear prompt', confidence: 0.95, entropy: 1.5 },
    ];

    const result = designer.routeSamples(samples);
    expect(result.silverStore.map((s) => s.id)).toContain('s1');
    expect(result.humanQueue.length).toBe(0);
  });

  it('test_routeSamples_highConfidenceHighEntropy_routesToCommitteeOrHumanQueue', () => {
    const samples: HitlSample[] = [
      { id: 's_noisy', text: 'Noisy text', confidence: 0.95, entropy: 4.5, committeeVotes: undefined },
      { id: 's_single_vote', text: 'Single vote', confidence: 0.5, entropy: 3.5, committeeVotes: ['only_one'] },
    ];

    const result = designer.routeSamples(samples);
    expect(result.humanQueue.map((s) => s.id)).toContain('s_noisy');
    expect(result.humanQueue.map((s) => s.id)).toContain('s_single_vote');
    expect(result.silverStore.length).toBe(0);
  });

  it('test_routeSamples_committeeConsensus_routesToSilverStore', () => {
    const samples: HitlSample[] = [
      {
        id: 's2',
        text: 'Ambiguous prompt',
        confidence: 0.70,
        entropy: 3.5,
        committeeVotes: ['label_a', 'label_a', 'label_a'],
      },
    ];

    const result = designer.routeSamples(samples);
    expect(result.silverStore.map((s) => s.id)).toContain('s2');
    expect(result.humanQueue.length).toBe(0);
  });

  it('test_routeSamples_committeeSplit_routesToHumanQueue', () => {
    const samples: HitlSample[] = [
      {
        id: 's3',
        text: 'Controversial sample',
        confidence: 0.60,
        entropy: 4.2,
        committeeVotes: ['label_a', 'label_b', 'label_a'],
      },
    ];

    const result = designer.routeSamples(samples);
    expect(result.humanQueue.map((s) => s.id)).toContain('s3');
    expect(result.silverStore.length).toBe(0);
  });

  it('test_routeSamples_annotatedSamples_routesToGoldAndArbitration', () => {
    const samples: HitlSample[] = [
      {
        id: 's_agree',
        text: 'Agreeing annotators',
        confidence: 0.5,
        entropy: 3.0,
        annotatorLabels: { rater1: 'pref_a', rater2: 'pref_a' },
      },
      {
        id: 's_disagree',
        text: 'Disagreeing annotators',
        confidence: 0.5,
        entropy: 3.0,
        annotatorLabels: { rater1: 'pref_a', rater2: 'pref_b' },
      },
    ];

    const result = designer.routeSamples(samples);
    expect(result.goldStore.map((s) => s.id)).toContain('s_agree');
    expect(result.seniorArbitration.map((s) => s.id)).toContain('s_disagree');
    expect(result.cohensKappa).toBeLessThan(1.0);
  });

  it('test_calculateCohensKappa_perfectAgreement_returnsOne', () => {
    const raterA = ['cat', 'dog', 'cat', 'dog'];
    const raterB = ['cat', 'dog', 'cat', 'dog'];
    expect(designer.calculateCohensKappa(raterA, raterB)).toBeCloseTo(1.0, 4);
  });

  it('test_calculateCohensKappa_emptyOrMismatched_returnsZero', () => {
    expect(designer.calculateCohensKappa([], [])).toBe(0.0);
    expect(designer.calculateCohensKappa(['cat'], ['cat', 'dog'])).toBe(0.0);
  });

  it('test_calculateCohensKappa_allSameCategory_returnsOne', () => {
    const raterA = ['single_cat', 'single_cat'];
    const raterB = ['single_cat', 'single_cat'];
    expect(designer.calculateCohensKappa(raterA, raterB)).toBeCloseTo(1.0, 4);
  });

  it('test_routeSamples_annotatorWithSingleLabel_routesToCommitteeOrSilver', () => {
    const samples: HitlSample[] = [
      {
        id: 's_single_annotator',
        text: 'Partial annotation',
        confidence: 0.95,
        entropy: 1.0,
        annotatorLabels: { rater1: 'pref_a' },
      },
    ];

    const result = designer.routeSamples(samples);
    expect(result.silverStore.map((s) => s.id)).toContain('s_single_annotator');
    expect(result.cohensKappa).toBe(0.0);
  });

  it('test_routeSamples_emptySamples_returnsEmptyResultWithZeroKappa', () => {
    const result = designer.routeSamples([]);
    expect(result.silverStore).toEqual([]);
    expect(result.goldStore).toEqual([]);
    expect(result.humanQueue).toEqual([]);
    expect(result.seniorArbitration).toEqual([]);
    expect(result.cohensKappa).toBe(0.0);
  });

  it('test_routeSamples_customConfig_usesProvidedThresholds', () => {
    const samples: HitlSample[] = [
      { id: 's_custom', text: 'Custom threshold', confidence: 0.82, entropy: 1.8 },
    ];

    const result = designer.routeSamples(samples, {
      confidenceThreshold: 0.80,
      entropyThreshold: 2.0,
      kappaThreshold: 0.70,
    });
    expect(result.silverStore.map((s) => s.id)).toContain('s_custom');
  });

  it('test_prioritizeQueue_ordersByHighestEntropyAndLowestConfidence', () => {
    const queue: HitlSample[] = [
      { id: 'low_entropy', text: 'Text', confidence: 0.5, entropy: 1.0 },
      { id: 'high_entropy', text: 'Text', confidence: 0.5, entropy: 4.5 },
      { id: 'high_entropy_lower_conf', text: 'Text', confidence: 0.2, entropy: 4.5 },
    ];

    const prioritized = designer.prioritizeQueue(queue);
    expect(prioritized[0].id).toBe('high_entropy_lower_conf');
    expect(prioritized[1].id).toBe('high_entropy');
    expect(prioritized[2].id).toBe('low_entropy');
  });
});
