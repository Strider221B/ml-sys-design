import { describe, expect, it } from 'vitest';
import { InterviewConstants } from '@/core/interview/interview_constants';
import { InterviewStateMachine } from '@/core/interview/interview_state_machine';

describe('InterviewStateMachine', () => {
  it('test_initialize_defaultStateIsStepZero', () => {
    const sm = new InterviewStateMachine();
    expect(sm.getCurrentStepIndex()).toBe(0);
    expect(sm.getCurrentStepName()).toBe(InterviewConstants.STEP_1_CLARIFYING_REQUIREMENTS);
    expect(sm.getCurrentTitle()).toBe(InterviewConstants.STEP_TITLES[0]);
    expect(sm.getCurrentQuestion()).toBe(InterviewConstants.STEP_DEFAULT_QUESTIONS[0]);
    expect(sm.getStepCount()).toBe(6);
    expect(sm.isCompleted()).toBe(false);
    expect(sm.getStepHistory()).toHaveLength(0);
  });

  it('test_canTransition_evaluatesScoreAndStepBoundary', () => {
    const sm = new InterviewStateMachine(0, 70);
    expect(sm.canTransition(69)).toBe(false);
    expect(sm.canTransition(70)).toBe(true);
    expect(sm.canTransition(100)).toBe(true);

    const finalSm = new InterviewStateMachine(5, 70);
    expect(finalSm.canTransition(100)).toBe(false);
  });

  it('test_canTransitionTo_validatesBoundariesAndSequencing', () => {
    const sm = new InterviewStateMachine(2);
    expect(sm.canTransitionTo(-1)).toBe(false);
    expect(sm.canTransitionTo(6)).toBe(false);
    expect(sm.canTransitionTo(1)).toBe(true);
    expect(sm.canTransitionTo(2)).toBe(true);
    expect(sm.canTransitionTo(3)).toBe(true);
    expect(sm.canTransitionTo(4)).toBe(false);
  });

  it('test_transitionToNext_whenScoreBelowThreshold_returnsFailure', () => {
    const sm = new InterviewStateMachine(0, 70);
    const result = sm.transitionToNext({ stepIndex: 0, score: 65 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('below passing threshold');
    expect(sm.getCurrentStepIndex()).toBe(0);
  });

  it('test_transitionToNext_whenScorePassing_advancesStepAndRecordsHistory', () => {
    const sm = new InterviewStateMachine(0, 70);
    const result = sm.transitionToNext({ stepIndex: 0, score: 85, notes: 'Great requirements' });
    expect(result.success).toBe(true);
    expect(result.currentStepIndex).toBe(1);
    expect(result.currentStepName).toBe(InterviewConstants.STEP_2_DATA_INGESTION_FEATURES);
    expect(sm.getStepHistory()).toHaveLength(1);
    expect(sm.getStepHistory()[0]?.score).toBe(85);
  });

  it('test_transitionToNext_whenAtFinalStep_returnsFailure', () => {
    const sm = new InterviewStateMachine(5, 70);
    const result = sm.transitionToNext({ stepIndex: 5, score: 95 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('already at the final interview step');
  });

  it('test_jumpToStep_backwardJumpAlwaysPermitted', () => {
    const sm = new InterviewStateMachine(3);
    const result = sm.jumpToStep(1);
    expect(result.success).toBe(true);
    expect(result.currentStepIndex).toBe(1);
  });

  it('test_jumpToStep_outOfBounds_returnsFailure', () => {
    const sm = new InterviewStateMachine(1);
    const resLow = sm.jumpToStep(-1);
    const resHigh = sm.jumpToStep(10);
    expect(resLow.success).toBe(false);
    expect(resHigh.success).toBe(false);
  });

  it('test_jumpToStep_forwardWithoutBypass_returnsFailure', () => {
    const sm = new InterviewStateMachine(1);
    const res = sm.jumpToStep(2);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Cannot jump forward');
  });

  it('test_jumpToStep_forwardWithPassingBypass_succeeds', () => {
    const sm = new InterviewStateMachine(1, 70);
    const res = sm.jumpToStep(2, 80);
    expect(res.success).toBe(true);
    expect(res.currentStepIndex).toBe(2);
  });

  it('test_resetSession_resetsIndexAndHistory', () => {
    const sm = new InterviewStateMachine(0, 70);
    sm.transitionToNext({ stepIndex: 0, score: 90 });
    sm.transitionToNext({ stepIndex: 1, score: 90 });
    expect(sm.getCurrentStepIndex()).toBe(2);
    expect(sm.getStepHistory()).toHaveLength(2);

    sm.resetSession();
    expect(sm.getCurrentStepIndex()).toBe(0);
    expect(sm.getStepHistory()).toHaveLength(0);
  });

  it('test_isCompleted_returnsTrueOnlyWhenAllStepsTraversed', () => {
    const sm = new InterviewStateMachine(0, 70);
    for (let i = 0; i < 5; i++) {
      expect(sm.isCompleted()).toBe(false);
      sm.transitionToNext({ stepIndex: i, score: 80 });
    }
    expect(sm.getCurrentStepIndex()).toBe(5);
    // 5 steps completed so far
    expect(sm.isCompleted()).toBe(false);
  });
});

