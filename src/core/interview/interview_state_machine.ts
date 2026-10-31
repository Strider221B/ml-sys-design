import { InterviewConstants } from '@/core/interview/interview_constants';

export type InterviewStepName =
  | 'CLARIFYING_REQUIREMENTS'
  | 'DATA_INGESTION_FEATURES'
  | 'MODEL_SELECTION_TRAINING'
  | 'MODEL_EVALUATION'
  | 'SERVING_SCALABILITY'
  | 'MONITORING_RETRAINING';

export interface StepSubmission {
  stepIndex: number;
  score: number;
  notes?: string;
}

export interface TransitionResult {
  success: boolean;
  currentStepIndex: number;
  currentStepName: InterviewStepName;
  error?: string;
}

/**
 * Enforces strict sequential progression across the 6-Step Machine Learning System Design Interview framework.
 */
export class InterviewStateMachine {
  private static readonly _ERR_LOW_SCORE = 'Cannot advance: score is below passing threshold.';
  private static readonly _ERR_FINAL_STEP = 'Cannot advance: already at the final interview step.';
  private static readonly _ERR_INVALID_TARGET = 'Invalid target step index.';
  private static readonly _ERR_NON_SEQUENTIAL = 'Cannot jump forward without completing intermediate steps.';

  public constructor(
    private _currentStepIndex: number = InterviewConstants.MIN_STEP_INDEX,
    private readonly _minPassingScore: number = InterviewConstants.MIN_PASSING_SCORE
  ) {
    this._history = [];
  }

  /**
   * Returns active step 0-based index.
   */
  public getCurrentStepIndex(): number {
    return this._currentStepIndex;
  }

  /**
   * Returns active step canonical identifier.
   */
  public getCurrentStepName(): InterviewStepName {
    return InterviewConstants.STEPS[this._currentStepIndex] as InterviewStepName;
  }

  /**
   * Returns human-readable title for current step.
   */
  public getCurrentTitle(): string {
    return InterviewConstants.STEP_TITLES[this._currentStepIndex] ?? '';
  }

  /**
   * Returns default prompt question for current step.
   */
  public getCurrentQuestion(): string {
    return InterviewConstants.STEP_DEFAULT_QUESTIONS[this._currentStepIndex] ?? '';
  }

  /**
   * Total number of framework stages.
   */
  public getStepCount(): number {
    return InterviewConstants.TOTAL_STEPS;
  }

  /**
   * Checks whether candidate score permits progression to the next step.
   */
  public canTransition(score: number): boolean {
    const isPassing = score >= this._minPassingScore;
    const hasNext = this._currentStepIndex < InterviewConstants.MAX_STEP_INDEX;
    return isPassing && hasNext;
  }

  /**
   * Checks if transition to specific target index is valid.
   */
  public canTransitionTo(targetStepIndex: number): boolean {
    if (targetStepIndex < InterviewConstants.MIN_STEP_INDEX) return false;
    if (targetStepIndex > InterviewConstants.MAX_STEP_INDEX) return false;
    if (targetStepIndex <= this._currentStepIndex) return true;
    return targetStepIndex === this._currentStepIndex + 1;
  }

  /**
   * Evaluates submission and advances state machine if passing threshold is met.
   */
  public transitionToNext(submission: StepSubmission): TransitionResult {
    if (this._currentStepIndex >= InterviewConstants.MAX_STEP_INDEX) {
      return this._createFailureResult(InterviewStateMachine._ERR_FINAL_STEP);
    }
    if (submission.score < this._minPassingScore) {
      return this._createFailureResult(InterviewStateMachine._ERR_LOW_SCORE);
    }

    this._history.push({ ...submission, stepIndex: this._currentStepIndex });
    this._currentStepIndex += 1;
    return this._createSuccessResult();
  }

  /**
   * Jumps backward to previously visited step or forward if bypass score is provided.
   */
  public jumpToStep(targetStepIndex: number, bypassScore?: number): TransitionResult {
    if (targetStepIndex < InterviewConstants.MIN_STEP_INDEX || targetStepIndex > InterviewConstants.MAX_STEP_INDEX) {
      return this._createFailureResult(InterviewStateMachine._ERR_INVALID_TARGET);
    }
    if (targetStepIndex <= this._currentStepIndex) {
      this._currentStepIndex = targetStepIndex;
      return this._createSuccessResult();
    }
    return this._handleForwardJump(targetStepIndex, bypassScore);
  }

  /**
   * Resets interview progress to step 1 and clears history.
   */
  public resetSession(): void {
    this._currentStepIndex = InterviewConstants.MIN_STEP_INDEX;
    this._history.length = 0;
  }

  /**
   * Indicates whether candidate has completed all 6 framework steps.
   */
  public isCompleted(): boolean {
    return this._currentStepIndex === InterviewConstants.MAX_STEP_INDEX && this._history.length >= InterviewConstants.TOTAL_STEPS;
  }

  /**
   * Returns immutable record of historical step submissions.
   */
  public getStepHistory(): readonly StepSubmission[] {
    return [...this._history];
  }

  private readonly _history: StepSubmission[];

  private _handleForwardJump(targetStepIndex: number, bypassScore?: number): TransitionResult {
    const requiredScore = bypassScore ?? 0;
    if (targetStepIndex === this._currentStepIndex + 1 && requiredScore >= this._minPassingScore) {
      this._currentStepIndex = targetStepIndex;
      return this._createSuccessResult();
    }
    return this._createFailureResult(InterviewStateMachine._ERR_NON_SEQUENTIAL);
  }

  private _createSuccessResult(): TransitionResult {
    return {
      success: true,
      currentStepIndex: this._currentStepIndex,
      currentStepName: this.getCurrentStepName(),
    };
  }

  private _createFailureResult(error: string): TransitionResult {
    return {
      success: false,
      currentStepIndex: this._currentStepIndex,
      currentStepName: this.getCurrentStepName(),
      error,
    };
  }
}

