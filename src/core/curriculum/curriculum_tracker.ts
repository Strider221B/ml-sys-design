import { CurriculumManager, CurriculumModule } from '@/core/curriculum/curriculum_manager';
import { SyncManager } from '@/core/gdrive/sync_manager';
import { ScenarioConstants } from '@/core/scenarios/scenario_constants';
import { WorkspaceStore } from '@/core/state/workspace_store';

export interface ScenarioCompletionRecord {
  scenarioId: string;
  rubricScore: number;
  completedAtIso: string;
  passed: boolean;
}

export interface ModuleMasteryStatus {
  completedLessons: number;
  totalLessons: number;
  averageScore: number;
  unlocked: boolean;
  completed: boolean;
}

export interface StudentMasteryProfile {
  studentId: string;
  completedScenarios: Record<string, ScenarioCompletionRecord>;
  moduleMastery: Record<string, ModuleMasteryStatus>;
  earnedBadges: string[];
  totalScoreAverage: number;
  lastUpdatedIso: string;
}

/**
 * Tracks student scenario completions, rubric scores, curriculum unlocks, and synchronizes to Google Drive SSOT.
 */
export class CurriculumTracker {
  private static readonly _PASSING_SCORE = ScenarioConstants.MIN_PASSING_RUBRIC_SCORE;
  private static readonly _DEFAULT_STUDENT_ID = 'student_default';
  private static readonly _ZERO_SCORE = 0;
  private static readonly _MIN_PASS_AVG = 80;

  public constructor(
    private readonly _workspaceStore: WorkspaceStore,
    private readonly _curriculumManager: CurriculumManager,
    private readonly _syncManager: SyncManager | null = null
  ) {
    this._profile = this._initializeMasteryProfile();
  }

  /**
   * Records scenario score, computes module unlock status, and queues Drive sync.
   */
  public recordCompletion(scenarioId: string, rubricScore: number): void {
    const passed = rubricScore >= CurriculumTracker._PASSING_SCORE;
    this._profile.completedScenarios[scenarioId] = {
      scenarioId,
      rubricScore,
      completedAtIso: new Date().toISOString(),
      passed,
    };
    this._workspaceStore.setRubricScore(scenarioId, rubricScore);
    this._recalculateMastery();
    this._syncToDrive();
  }

  /**
   * Returns current snapshot of student mastery profile.
   */
  public getMasteryProfile(): StudentMasteryProfile {
    return {
      ...this._profile,
      completedScenarios: { ...this._profile.completedScenarios },
      moduleMastery: { ...this._profile.moduleMastery },
      earnedBadges: [...this._profile.earnedBadges],
    };
  }

  /**
   * Checks whether student has satisfied prerequisites to access a given module.
   */
  public isModuleUnlocked(moduleId: string): boolean {
    const prereqs = this._curriculumManager.getPrerequisites(moduleId);
    if (prereqs.length === 0) return true;
    return prereqs.every((prereqId) => this.isModuleCompleted(prereqId));
  }

  /**
   * Evaluates if all lessons in a given module have passing scenario completions.
   */
  public isModuleCompleted(moduleId: string): boolean {
    const lessons = this._curriculumManager.getLessons(moduleId);
    if (lessons.length === 0) return false;
    return lessons.every((l) => {
      const rec = this._profile.completedScenarios[l.recommendedScenarioId];
      return rec !== undefined && rec.passed;
    });
  }

  /**
   * Returns list of passed scenario IDs.
   */
  public getCompletedScenarios(): string[] {
    return Object.values(this._profile.completedScenarios)
      .filter((r) => r.passed)
      .map((r) => r.scenarioId);
  }

  /**
   * Retrieves highest recorded score for given scenario.
   */
  public getScoreForScenario(scenarioId: string): number | undefined {
    return this._profile.completedScenarios[scenarioId]?.rubricScore;
  }

  /**
   * Returns all badges earned through curriculum mastery.
   */
  public getEarnedBadges(): string[] {
    return [...this._profile.earnedBadges];
  }

  /**
   * Resets local RAM mastery state to pristine baseline.
   */
  public resetProgress(): void {
    this._profile = this._initializeMasteryProfile();
    this._syncToDrive();
  }

  private _profile: StudentMasteryProfile;

  private _initializeMasteryProfile(): StudentMasteryProfile {
    const modules = this._curriculumManager.getAllModules();
    const moduleMastery: Record<string, ModuleMasteryStatus> = {};
    for (const mod of modules) {
      moduleMastery[mod.moduleId] = {
        completedLessons: 0,
        totalLessons: mod.lessons.length,
        averageScore: CurriculumTracker._ZERO_SCORE,
        unlocked: mod.prerequisites.length === 0,
        completed: false,
      };
    }
    return {
      studentId: CurriculumTracker._DEFAULT_STUDENT_ID,
      completedScenarios: {},
      moduleMastery,
      earnedBadges: [],
      totalScoreAverage: CurriculumTracker._ZERO_SCORE,
      lastUpdatedIso: new Date().toISOString(),
    };
  }

  private _recalculateMastery(): void {
    const modules = this._curriculumManager.getAllModules();
    const allScores: number[] = [];
    for (const mod of modules) {
      const status = this._calculateModuleStatus(mod);
      this._profile.moduleMastery[mod.moduleId] = status;
      if (status.completedLessons > 0) {
        allScores.push(status.averageScore);
      }
    }
    this._profile.totalScoreAverage = this._calculateAverage(allScores);
    this._updateEarnedBadges();
    this._profile.lastUpdatedIso = new Date().toISOString();
  }

  private _calculateModuleStatus(mod: CurriculumModule): ModuleMasteryStatus {
    const lessons = mod.lessons;
    let completedCount = 0;
    const scores: number[] = [];
    for (const lesson of lessons) {
      const rec = this._profile.completedScenarios[lesson.recommendedScenarioId];
      if (rec && rec.passed) {
        completedCount++;
        scores.push(rec.rubricScore);
      }
    }
    const avg = this._calculateAverage(scores);
    const unlocked = this.isModuleUnlocked(mod.moduleId);
    const completed = completedCount === lessons.length && lessons.length > 0;
    return { completedLessons: completedCount, totalLessons: lessons.length, averageScore: avg, unlocked, completed };
  }

  private _updateEarnedBadges(): void {
    const badges: string[] = [];
    const modules = this._curriculumManager.getAllModules();
    let allCompleted = true;
    for (const mod of modules) {
      const status = this._profile.moduleMastery[mod.moduleId];
      if (status?.completed && status.averageScore >= CurriculumTracker._MIN_PASS_AVG) {
        badges.push(mod.awardedBadge);
      } else {
        allCompleted = false;
      }
    }
    if (allCompleted && modules.length > 0) {
      badges.push(ScenarioConstants.BADGE_FULL_SPECTRUM_STAFF);
    }
    this._profile.earnedBadges = badges;
  }

  private _calculateAverage(scores: number[]): number {
    if (scores.length === 0) return CurriculumTracker._ZERO_SCORE;
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    return Math.round(sum / scores.length);
  }

  private _syncToDrive(): void {
    if (this._syncManager) {
      const currentDoc = this._workspaceStore.getState().currentWorkspace;
      this._syncManager.enqueueSync(currentDoc);
    }
  }
}
