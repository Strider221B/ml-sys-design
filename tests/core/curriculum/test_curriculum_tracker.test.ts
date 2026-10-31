import { describe, expect, it, vi } from 'vitest';
import { CurriculumManager } from '@/core/curriculum/curriculum_manager';
import { CurriculumTracker } from '@/core/curriculum/curriculum_tracker';
import { SyncManager } from '@/core/gdrive/sync_manager';
import { ScenarioConstants } from '@/core/scenarios/scenario_constants';
import { WorkspaceStore } from '@/core/state/workspace_store';

describe('CurriculumTracker', () => {
  const createTracker = (syncManager: SyncManager | null = null) => {
    const store = new WorkspaceStore();
    const manager = new CurriculumManager();
    const tracker = new CurriculumTracker(store, manager, syncManager);
    return { store, manager, tracker };
  };

  it('test_initialization_setsDefaultMasteryWithModule1Unlocked', () => {
    const { tracker } = createTracker();
    const profile = tracker.getMasteryProfile();

    expect(profile.studentId).toBe('student_default');
    expect(profile.totalScoreAverage).toBe(0);
    expect(profile.earnedBadges).toEqual([]);
    expect(profile.moduleMastery[ScenarioConstants.MODULE_1_MLOPS]?.unlocked).toBe(true);
    expect(profile.moduleMastery[ScenarioConstants.MODULE_2_GENAI]?.unlocked).toBe(false);
    expect(profile.moduleMastery[ScenarioConstants.MODULE_3_PRODUCTION_METRICS]?.unlocked).toBe(false);
  });

  it('test_recordCompletion_whenScoreBelowPassing_marksFailedAndDoesNotUnlockNext', () => {
    const { tracker, store } = createTracker();
    tracker.recordCompletion(ScenarioConstants.BLUEPRINT_ECOM_ID, 72);

    expect(tracker.getScoreForScenario(ScenarioConstants.BLUEPRINT_ECOM_ID)).toBe(72);
    expect(tracker.getCompletedScenarios()).not.toContain(ScenarioConstants.BLUEPRINT_ECOM_ID);
    expect(tracker.isModuleCompleted(ScenarioConstants.MODULE_1_MLOPS)).toBe(false);
    expect(tracker.isModuleUnlocked(ScenarioConstants.MODULE_2_GENAI)).toBe(false);
    expect(store.getState().rubricScores[ScenarioConstants.BLUEPRINT_ECOM_ID]).toBe(72);
  });

  it('test_recordCompletion_whenScorePassing_completesModuleAndUnlocksNext', () => {
    const { tracker } = createTracker();
    tracker.recordCompletion(ScenarioConstants.BLUEPRINT_ECOM_ID, 90);

    expect(tracker.getCompletedScenarios()).toContain(ScenarioConstants.BLUEPRINT_ECOM_ID);
    expect(tracker.isModuleCompleted(ScenarioConstants.MODULE_1_MLOPS)).toBe(true);
    expect(tracker.isModuleUnlocked(ScenarioConstants.MODULE_2_GENAI)).toBe(true);

    const badges = tracker.getEarnedBadges();
    expect(badges).toContain(ScenarioConstants.BADGE_MLOPS_PIONEER);
  });

  it('test_recordCompletion_acrossAllModules_awardsFullSpectrumBadge', () => {
    const { tracker } = createTracker();

    tracker.recordCompletion(ScenarioConstants.BLUEPRINT_ECOM_ID, 92);
    tracker.recordCompletion(ScenarioConstants.BLUEPRINT_ENTERPRISE_RAG_ID, 88);
    tracker.recordCompletion(ScenarioConstants.BLUEPRINT_STREAMING_FRAUD_ID, 95);

    expect(tracker.isModuleCompleted(ScenarioConstants.MODULE_1_MLOPS)).toBe(true);
    expect(tracker.isModuleCompleted(ScenarioConstants.MODULE_2_GENAI)).toBe(true);
    expect(tracker.isModuleCompleted(ScenarioConstants.MODULE_3_PRODUCTION_METRICS)).toBe(true);

    const badges = tracker.getEarnedBadges();
    expect(badges).toContain(ScenarioConstants.BADGE_MLOPS_PIONEER);
    expect(badges).toContain(ScenarioConstants.BADGE_GENAI_ARCHITECT);
    expect(badges).toContain(ScenarioConstants.BADGE_METRICS_GUARDIAN);
    expect(badges).toContain(ScenarioConstants.BADGE_FULL_SPECTRUM_STAFF);

    const profile = tracker.getMasteryProfile();
    expect(profile.totalScoreAverage).toBe(92);
  });

  it('test_recordCompletion_withSyncManager_triggersEnqueueSync', () => {
    const mockSyncManager = {
      enqueueSync: vi.fn(),
    } as unknown as SyncManager;

    const { tracker } = createTracker(mockSyncManager);
    tracker.recordCompletion(ScenarioConstants.BLUEPRINT_ECOM_ID, 85);

    expect(mockSyncManager.enqueueSync).toHaveBeenCalledTimes(1);
  });

  it('test_resetProgress_resetsProfileAndSynchronizes', () => {
    const mockSyncManager = {
      enqueueSync: vi.fn(),
    } as unknown as SyncManager;

    const { tracker } = createTracker(mockSyncManager);
    tracker.recordCompletion(ScenarioConstants.BLUEPRINT_ECOM_ID, 85);
    tracker.resetProgress();

    const profile = tracker.getMasteryProfile();
    expect(profile.totalScoreAverage).toBe(0);
    expect(profile.earnedBadges).toEqual([]);
    expect(tracker.getCompletedScenarios()).toEqual([]);
    expect(mockSyncManager.enqueueSync).toHaveBeenCalledTimes(2);
  });
});

