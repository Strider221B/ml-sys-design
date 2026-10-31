export interface HitlSample {
  id: string;
  text: string;
  confidence: number;
  entropy: number;
  committeeVotes?: string[] | undefined;
  annotatorLabels?: Record<string, string> | undefined;
}

export interface HitlConfig {
  confidenceThreshold: number;
  entropyThreshold: number;
  kappaThreshold: number;
}

export interface HitlRoutingResult {
  silverStore: HitlSample[];
  goldStore: HitlSample[];
  humanQueue: HitlSample[];
  seniorArbitration: HitlSample[];
  cohensKappa: number;
}

/**
 * Designs and simulates Human-In-The-Loop active learning routing workflows.
 */
export class HitlWorkflowDesigner {
  private static readonly _DEFAULT_CONF_THRESHOLD = 0.90;
  private static readonly _DEFAULT_ENTROPY_THRESHOLD = 3.0;
  private static readonly _DEFAULT_KAPPA_THRESHOLD = 0.80;
  private static readonly _ZERO_SCORE = 0.0;
  private static readonly _ONE_SCORE = 1.0;
  private static readonly _MIN_COMMITTEE_SIZE = 2;

  public constructor() {}

  /**
   * Routes incoming data samples into appropriate active learning and review queues.
   */
  public routeSamples(samples: HitlSample[], config?: Partial<HitlConfig>): HitlRoutingResult {
    const confThresh = config?.confidenceThreshold ?? HitlWorkflowDesigner._DEFAULT_CONF_THRESHOLD;
    const entropyThresh = config?.entropyThreshold ?? HitlWorkflowDesigner._DEFAULT_ENTROPY_THRESHOLD;
    const kappaThresh = config?.kappaThreshold ?? HitlWorkflowDesigner._DEFAULT_KAPPA_THRESHOLD;

    const result: HitlRoutingResult = {
      silverStore: [],
      goldStore: [],
      humanQueue: [],
      seniorArbitration: [],
      cohensKappa: this._evaluateAnnotatedKappa(samples),
    };

    for (const sample of samples) {
      this._routeSingleSample(sample, confThresh, entropyThresh, kappaThresh, result);
    }

    return result;
  }

  /**
   * Calculates Cohen's Kappa inter-annotator agreement between two raters.
   */
  public calculateCohensKappa(raterA: string[], raterB: string[]): number {
    if (raterA.length === 0 || raterA.length !== raterB.length) {
      return HitlWorkflowDesigner._ZERO_SCORE;
    }

    const n = raterA.length;
    let observedMatches = 0;
    const freqA: Record<string, number> = {};
    const freqB: Record<string, number> = {};

    for (let i = 0; i < n; i++) {
      if (raterA[i] === raterB[i]) observedMatches++;
      freqA[raterA[i]] = (freqA[raterA[i]] ?? 0) + 1;
      freqB[raterB[i]] = (freqB[raterB[i]] ?? 0) + 1;
    }

    const pObserved = observedMatches / n;
    const pExpected = this._calculateExpectedAgreement(freqA, freqB, n);

    if (Math.abs(HitlWorkflowDesigner._ONE_SCORE - pExpected) < 1e-9) {
      return HitlWorkflowDesigner._ONE_SCORE;
    }
    return (pObserved - pExpected) / (HitlWorkflowDesigner._ONE_SCORE - pExpected);
  }

  /**
   * Sorts active learning queue by sample ambiguity (high entropy, low confidence).
   */
  public prioritizeQueue(queue: HitlSample[]): HitlSample[] {
    const copy = [...queue];
    copy.sort((a, b) => {
      const entropyDiff = b.entropy - a.entropy;
      if (Math.abs(entropyDiff) > 1e-4) {
        return entropyDiff;
      }
      return a.confidence - b.confidence;
    });
    return copy;
  }

  private _routeSingleSample(
    sample: HitlSample,
    confThresh: number,
    entropyThresh: number,
    kappaThresh: number,
    result: HitlRoutingResult
  ): void {
    if (sample.annotatorLabels && Object.keys(sample.annotatorLabels).length >= 2) {
      this._routeAnnotatedSample(sample, kappaThresh, result.goldStore, result.seniorArbitration);
      return;
    }

    if (sample.confidence >= confThresh && sample.entropy < entropyThresh) {
      result.silverStore.push(sample);
      return;
    }

    if (this._hasCommitteeConsensus(sample.committeeVotes)) {
      result.silverStore.push(sample);
    } else {
      result.humanQueue.push(sample);
    }
  }

  private _routeAnnotatedSample(
    sample: HitlSample,
    kappaThresh: number,
    goldStore: HitlSample[],
    seniorArbitration: HitlSample[]
  ): void {
    const labels = Object.values(sample.annotatorLabels ?? {});
    const allAgree = labels.every((val) => val === labels[0]);
    if (allAgree) {
      goldStore.push(sample);
    } else {
      seniorArbitration.push(sample);
    }
  }

  private _hasCommitteeConsensus(votes?: string[]): boolean {
    if (!votes || votes.length < HitlWorkflowDesigner._MIN_COMMITTEE_SIZE) {
      return false;
    }
    const firstVote = votes[0];
    return votes.every((v) => v === firstVote);
  }

  private _calculateExpectedAgreement(
    freqA: Record<string, number>,
    freqB: Record<string, number>,
    n: number
  ): number {
    const allCategories = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
    let expected = 0;
    for (const cat of allCategories) {
      const pA = (freqA[cat] ?? 0) / n;
      const pB = (freqB[cat] ?? 0) / n;
      expected += pA * pB;
    }
    return expected;
  }

  private _evaluateAnnotatedKappa(samples: HitlSample[]): number {
    const raterA: string[] = [];
    const raterB: string[] = [];

    for (const s of samples) {
      if (s.annotatorLabels) {
        const keys = Object.keys(s.annotatorLabels);
        if (keys.length >= 2) {
          raterA.push(s.annotatorLabels[keys[0]]);
          raterB.push(s.annotatorLabels[keys[1]]);
        }
      }
    }

    if (raterA.length === 0) {
      return HitlWorkflowDesigner._ZERO_SCORE;
    }
    return this.calculateCohensKappa(raterA, raterB);
  }
}
