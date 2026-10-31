import { describe, expect, it } from 'vitest';
import { GuidanceConstants } from '@/components/guidance/guidance_constants';
import { WorkspaceGuidanceCatalog } from '@/components/guidance/workspace_guidance_catalog';
import { GuidanceTypes, WorkspaceTab } from '@/core/state/guidance_types';

describe('WorkspaceGuidanceCatalog', () => {
  const catalog = new WorkspaceGuidanceCatalog();
  const typesHelper = new GuidanceTypes();
  const constantsHelper = new GuidanceConstants();

  it('test_getAllTabs_returnsAllSixWorkspaceTabs', () => {
    const tabs = catalog.getAllTabs();
    expect(tabs).toHaveLength(6);
    expect(tabs).toEqual(['CANVAS', 'INTERVIEW', 'CHAOS', 'CURRICULUM', 'TELEMETRY', 'FINOPS']);
  });

  it('test_hasTab_identifiesValidAndInvalidTabs', () => {
    expect(catalog.hasTab('CANVAS')).toBe(true);
    expect(catalog.hasTab('FINOPS')).toBe(true);
    expect(catalog.hasTab('INVALID_TAB')).toBe(false);
  });

  it('test_getGuidanceForTab_returnsCanvasDescriptorWithChecklistAndQuickActions', () => {
    const item = catalog.getGuidanceForTab('CANVAS');
    expect(item.tab).toBe('CANVAS');
    expect(item.title).toBe('Architecture Canvas');
    expect(item.badge).toBe('Visual Infrastructure & Latency Simulator');
    expect(item.checklist).toHaveLength(3);
    expect(item.checklist[0].stepNumber).toBe(1);
    expect(item.quickActions).toHaveLength(2);
    expect(item.quickActions[0].id).toBe('load_rag_template');
    expect(item.quickActions[1].id).toBe('load_agent_template');
  });

  it('test_getGuidanceForTab_returnsInterviewDescriptor', () => {
    const item = catalog.getGuidanceForTab('INTERVIEW');
    expect(item.tab).toBe('INTERVIEW');
    expect(item.title).toBe('AI Interview Simulator');
    expect(item.badge).toContain('FAANG');
    expect(item.checklist).toHaveLength(3);
    expect(item.quickActions).toHaveLength(2);
    expect(item.quickActions[0].id).toBe('start_step1');
  });

  it('test_getGuidanceForTab_returnsChaosDescriptor', () => {
    const item = catalog.getGuidanceForTab('CHAOS');
    expect(item.tab).toBe('CHAOS');
    expect(item.title).toBe('Chaos Sandbox');
    expect(item.checklist).toHaveLength(3);
    expect(item.quickActions).toHaveLength(2);
    expect(item.quickActions[0].id).toBe('trigger_burst');
  });

  it('test_getGuidanceForTab_returnsCurriculumDescriptor', () => {
    const item = catalog.getGuidanceForTab('CURRICULUM');
    expect(item.tab).toBe('CURRICULUM');
    expect(item.title).toBe('2026 Core Curriculum');
    expect(item.checklist).toHaveLength(3);
    expect(item.quickActions).toHaveLength(2);
    expect(item.quickActions[0].id).toBe('load_ecommerce');
  });

  it('test_getGuidanceForTab_returnsTelemetryDescriptor', () => {
    const item = catalog.getGuidanceForTab('TELEMETRY');
    expect(item.tab).toBe('TELEMETRY');
    expect(item.title).toBe('Telemetry & Profiler');
    expect(item.checklist).toHaveLength(3);
    expect(item.quickActions).toHaveLength(2);
    expect(item.quickActions[0].id).toBe('toggle_flamegraph');
  });

  it('test_getGuidanceForTab_returnsFinOpsDescriptor', () => {
    const item = catalog.getGuidanceForTab('FINOPS');
    expect(item.tab).toBe('FINOPS');
    expect(item.title).toBe('FinOps Unit Economics');
    expect(item.checklist).toHaveLength(3);
    expect(item.quickActions).toHaveLength(2);
    expect(item.quickActions[0].id).toBe('calculate_sizing');
  });

  it('test_getGuidanceForTab_fallsBackToCanvasWhenTabUnknown', () => {
    const item = catalog.getGuidanceForTab('UNKNOWN_TAB' as WorkspaceTab);
    expect(item.tab).toBe('CANVAS');
    expect(item.title).toBe('Architecture Canvas');
  });

  it('test_guidanceTypes_validatesTabsAndSyncStates', () => {
    expect(typesHelper.defaultTab).toBe('CANVAS');
    expect(typesHelper.defaultSyncState).toBe('UNAUTHENTICATED');
    expect(typesHelper.isValidTab('CANVAS')).toBe(true);
    expect(typesHelper.isValidTab('NON_EXISTENT')).toBe(false);
    expect(typesHelper.isValidSyncState('SYNCED')).toBe(true);
    expect(typesHelper.isValidSyncState('INVALID')).toBe(false);
    expect(typesHelper.getAllTabs()).toHaveLength(6);
  });

  it('test_guidanceConstants_retrievesSlidesAndClampsIndex', () => {
    expect(constantsHelper.getSlideCount()).toBe(4);
    const slide0 = constantsHelper.getSlide(0);
    expect(slide0.id).toBe(0);
    expect(slide0.title).toContain('Whiteboards');

    const clampedLow = constantsHelper.getSlide(-5);
    expect(clampedLow.id).toBe(0);

    const clampedHigh = constantsHelper.getSlide(99);
    expect(clampedHigh.id).toBe(3);
  });
});

