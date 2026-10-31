import { describe, expect, it } from 'vitest';
import { CurriculumManager } from '@/core/curriculum/curriculum_manager';
import { ScenarioConstants } from '@/core/scenarios/scenario_constants';

describe('CurriculumManager', () => {
  const manager = new CurriculumManager();

  it('test_getAllModules_returnsAllThreeModulesInOrder', () => {
    const modules = manager.getAllModules();

    expect(modules).toHaveLength(3);
    expect(modules[0]?.moduleId).toBe(ScenarioConstants.MODULE_1_MLOPS);
    expect(modules[1]?.moduleId).toBe(ScenarioConstants.MODULE_2_GENAI);
    expect(modules[2]?.moduleId).toBe(ScenarioConstants.MODULE_3_PRODUCTION_METRICS);
  });

  it('test_getModule_whenFound_returnsCorrectModule', () => {
    const mod = manager.getModule(ScenarioConstants.MODULE_2_GENAI);

    expect(mod).toBeDefined();
    expect(mod?.title).toBe(ScenarioConstants.MODULE_2_TITLE);
    expect(mod?.awardedBadge).toBe(ScenarioConstants.BADGE_GENAI_ARCHITECT);
    expect(mod?.prerequisites).toContain(ScenarioConstants.MODULE_1_MLOPS);
  });

  it('test_getModule_whenNotFound_returnsUndefined', () => {
    const mod = manager.getModule('NON_EXISTENT_MODULE');
    expect(mod).toBeUndefined();
  });

  it('test_getLessons_returnsAllLessonsForModule', () => {
    const lessons1 = manager.getLessons(ScenarioConstants.MODULE_1_MLOPS);
    expect(lessons1).toHaveLength(3);
    expect(lessons1[0]?.lessonId).toBe('m1_l1_feature_stores');

    const lessonsEmpty = manager.getLessons('INVALID_MODULE');
    expect(lessonsEmpty).toEqual([]);
  });

  it('test_getLesson_retrievesSpecificLessonAcrossModules', () => {
    const lesson = manager.getLesson('m3_l1_causal_cuped');
    expect(lesson).toBeDefined();
    expect(lesson?.title).toContain('Online Experimentation');
    expect(lesson?.recommendedScenarioId).toBe(ScenarioConstants.BLUEPRINT_STREAMING_FRAUD_ID);

    const missing = manager.getLesson('unknown_lesson');
    expect(missing).toBeUndefined();
  });

  it('test_getTransformations_returnsCore2026Skills', () => {
    const transformations = manager.getTransformations();

    expect(transformations).toHaveLength(4);
    const rewardOpt = transformations.find((t) => t.legacySkill.includes('Hyperparameter'));
    expect(rewardOpt?.modernSkill2026).toBe('Mathematical Reward Function Optimization');

    const causal = transformations.find((t) => t.legacySkill.includes('Simple Correlation'));
    expect(causal?.modernSkill2026).toBe('Causal Inference & CUPED Experimental Systems');
  });

  it('test_getPrerequisites_returnsCorrectPrerequisitesHierarchy', () => {
    expect(manager.getPrerequisites(ScenarioConstants.MODULE_1_MLOPS)).toEqual([]);
    expect(manager.getPrerequisites(ScenarioConstants.MODULE_2_GENAI)).toEqual([
      ScenarioConstants.MODULE_1_MLOPS,
    ]);
    expect(manager.getPrerequisites(ScenarioConstants.MODULE_3_PRODUCTION_METRICS)).toEqual([
      ScenarioConstants.MODULE_2_GENAI,
    ]);
    expect(manager.getPrerequisites('UNKNOWN')).toEqual([]);
  });

  it('test_calculateProgress_computesCorrectPercentages', () => {
    expect(manager.calculateProgress([])).toBe(0);

    const p1 = manager.calculateProgress([ScenarioConstants.BLUEPRINT_ECOM_ID]);
    expect(p1).toBe(33);

    const p2 = manager.calculateProgress([
      ScenarioConstants.BLUEPRINT_ECOM_ID,
      ScenarioConstants.BLUEPRINT_ENTERPRISE_RAG_ID,
    ]);
    expect(p2).toBe(67);

    const pAll = manager.calculateProgress([
      ScenarioConstants.BLUEPRINT_ECOM_ID,
      ScenarioConstants.BLUEPRINT_ENTERPRISE_RAG_ID,
      ScenarioConstants.BLUEPRINT_STREAMING_FRAUD_ID,
    ]);
    expect(pAll).toBe(100);
  });

  it('test_getNextRecommendedLesson_identifiesFirstIncompleteLesson', () => {
    const firstLesson = manager.getNextRecommendedLesson([]);
    expect(firstLesson?.lessonId).toBe('m1_l1_feature_stores');

    const nextAfterMod1 = manager.getNextRecommendedLesson([ScenarioConstants.BLUEPRINT_ECOM_ID]);
    expect(nextAfterMod1?.lessonId).toBe('m2_l1_hybrid_search');

    const allCompleted = manager.getNextRecommendedLesson([
      ScenarioConstants.BLUEPRINT_ECOM_ID,
      ScenarioConstants.BLUEPRINT_ENTERPRISE_RAG_ID,
      ScenarioConstants.BLUEPRINT_STREAMING_FRAUD_ID,
    ]);
    expect(allCompleted).toBeNull();
  });
});

