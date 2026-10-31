import { describe, expect, it } from 'vitest';
import { CaseStudyManager } from '@/core/case_studies/case_study_manager';
import { InterviewConstants } from '@/core/interview/interview_constants';

describe('CaseStudyManager', () => {
  it('test_getAllBlueprints_returnsAllThreeReferenceArchitectures', () => {
    const manager = new CaseStudyManager();
    const blueprints = manager.getAllBlueprints();

    expect(blueprints).toHaveLength(3);
    const ids = blueprints.map((b) => b.id);
    expect(ids).toContain(InterviewConstants.CASE_STUDY_ECOMMERCE);
    expect(ids).toContain(InterviewConstants.CASE_STUDY_FRAUD);
    expect(ids).toContain(InterviewConstants.CASE_STUDY_GENAI);
  });

  it('test_getBlueprint_returnsSpecificBlueprintDetails', () => {
    const manager = new CaseStudyManager();
    const ecom = manager.getBlueprint(InterviewConstants.CASE_STUDY_ECOMMERCE);

    expect(ecom).toBeDefined();
    expect(ecom?.title).toContain('E-Commerce');
    expect(ecom?.targetQps).toBe(10000);
    expect(ecom?.nodes.length).toBeGreaterThan(0);
    expect(ecom?.edges.length).toBeGreaterThan(0);
    expect(ecom?.verificationChecklist.length).toBeGreaterThan(0);
    expect(ecom?.failureModes).toContain(InterviewConstants.FAILURE_TRAIN_SERVE_SKEW);

    const nonExistent = manager.getBlueprint('INVALID_ID');
    expect(nonExistent).toBeNull();
  });

  it('test_getBlueprintIds_returnsListMatchingConstants', () => {
    const manager = new CaseStudyManager();
    const ids = manager.getBlueprintIds();
    expect(ids).toHaveLength(3);
  });

  it('test_validateBlueprintCompleteness_whenBlueprintNotFound_returnsError', () => {
    const manager = new CaseStudyManager();
    const result = manager.validateBlueprintCompleteness('UNKNOWN', [], []);
    expect(result.isComplete).toBe(false);
    expect(result.missingComponents[0]).toContain('Blueprint not found');
  });

  it('test_validateBlueprintCompleteness_whenMissingNodesOrEdges_reportsMissing', () => {
    const manager = new CaseStudyManager();
    const result = manager.validateBlueprintCompleteness(
      InterviewConstants.CASE_STUDY_FRAUD,
      [],
      []
    );

    expect(result.isComplete).toBe(false);
    expect(result.missingComponents.some((m) => m.includes('Missing architectural component'))).toBe(true);
    expect(result.missingComponents.some((m) => m.includes('Insufficient edge connections'))).toBe(true);
  });

  it('test_validateBlueprintCompleteness_whenComplete_returnsTrue', () => {
    const manager = new CaseStudyManager();
    const blueprint = manager.getBlueprint(InterviewConstants.CASE_STUDY_FRAUD);
    expect(blueprint).not.toBeNull();

    if (blueprint) {
      const result = manager.validateBlueprintCompleteness(
        blueprint.id,
        blueprint.nodes,
        blueprint.edges
      );
      expect(result.isComplete).toBe(true);
      expect(result.missingComponents).toHaveLength(0);
    }
  });
});
