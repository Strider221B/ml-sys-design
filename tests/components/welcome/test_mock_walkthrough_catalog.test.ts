import { describe, expect, it } from 'vitest';
import { MockWalkthroughCatalog } from '@/components/welcome/mock_walkthrough_catalog';
import { WorkspaceTabId } from '@/core/state/welcome_types';

describe('MockWalkthroughCatalog', () => {
  const catalog = new MockWalkthroughCatalog();

  it('test_getAllTabIds_returnsAllSixWorkspaceTabs', () => {
    const tabs = catalog.getAllTabIds();
    expect(tabs).toHaveLength(6);
    expect(tabs).toContain('CANVAS');
    expect(tabs).toContain('INTERVIEW');
    expect(tabs).toContain('CHAOS');
    expect(tabs).toContain('CURRICULUM');
    expect(tabs).toContain('TELEMETRY');
    expect(tabs).toContain('FINOPS');
  });

  it('test_hasWalkthrough_validatesKnownAndUnknownTabs', () => {
    expect(catalog.hasWalkthrough('CANVAS')).toBe(true);
    expect(catalog.hasWalkthrough('FINOPS')).toBe(true);
    expect(catalog.hasWalkthrough('INVALID_TAB')).toBe(false);
  });

  it('test_getWalkthrough_forCanvas_returnsHybridRagSpecifications', () => {
    const walkthrough = catalog.getWalkthrough('CANVAS');
    expect(walkthrough.tabId).toBe('CANVAS');
    expect(walkthrough.componentTitle).toContain('Architecture Canvas');
    expect(walkthrough.scenarioTitle).toBe(
      'Enterprise Hybrid Search Retrieval-Augmented Generation (RAG)'
    );
    expect(walkthrough.steps.length).toBeGreaterThanOrEqual(4);
    expect(walkthrough.primaryActionLabel).toBe('Load Mock RAG Example');
    expect(walkthrough.primaryActionPayload.actionType).toBe('LOAD_CANVAS_RAG');
  });

  it('test_getWalkthrough_forInterview_returnsYoutubeRecSysSpecifications', () => {
    const walkthrough = catalog.getWalkthrough('INTERVIEW');
    expect(walkthrough.tabId).toBe('INTERVIEW');
    expect(walkthrough.scenarioTitle).toContain('YouTube Video Recommendation');
    expect(walkthrough.primaryActionLabel).toBe('Load Mock Transcript');
    expect(walkthrough.primaryActionPayload.actionType).toBe('LOAD_INTERVIEW_YOUTUBE');
  });

  it('test_getWalkthrough_forChaos_returnsPoissonBurstSpecifications', () => {
    const walkthrough = catalog.getWalkthrough('CHAOS');
    expect(walkthrough.tabId).toBe('CHAOS');
    expect(walkthrough.scenarioTitle).toContain('10x Poisson Traffic Burst');
    expect(walkthrough.primaryActionLabel).toBe('Simulate This Burst Attack');
    expect(walkthrough.primaryActionPayload.actionType).toBe('SIMULATE_CHAOS_BURST');
  });

  it('test_getWalkthrough_forCurriculum_returnsFraudChallengeSpecifications', () => {
    const walkthrough = catalog.getWalkthrough('CURRICULUM');
    expect(walkthrough.tabId).toBe('CURRICULUM');
    expect(walkthrough.scenarioTitle).toContain('Challenge #03');
    expect(walkthrough.primaryActionLabel).toBe('Load Challenge #03 Now');
    expect(walkthrough.primaryActionPayload.actionType).toBe('LOAD_CURRICULUM_FRAUD');
  });

  it('test_getWalkthrough_forTelemetry_returnsTtftExplosionSpecifications', () => {
    const walkthrough = catalog.getWalkthrough('TELEMETRY');
    expect(walkthrough.tabId).toBe('TELEMETRY');
    expect(walkthrough.scenarioTitle).toContain('TTFT');
    expect(walkthrough.primaryActionLabel).toBe('Simulate This Telemetry Spike');
    expect(walkthrough.primaryActionPayload.actionType).toBe('SIMULATE_TELEMETRY_SPIKE');
  });

  it('test_getWalkthrough_forFinOps_returnsLlamaSizingSpecifications', () => {
    const walkthrough = catalog.getWalkthrough('FINOPS');
    expect(walkthrough.tabId).toBe('FINOPS');
    expect(walkthrough.scenarioTitle).toContain('50,000 QPS Llama-3-70B');
    expect(walkthrough.primaryActionLabel).toBe('Load Mock FinOps Sizing');
    expect(walkthrough.primaryActionPayload.actionType).toBe('LOAD_FINOPS_LLAMA');
  });

  it('test_getWalkthrough_forUnknownTab_fallsBackToCanvas', () => {
    const walkthrough = catalog.getWalkthrough('UNKNOWN_TAB' as WorkspaceTabId);
    expect(walkthrough.tabId).toBe('CANVAS');
  });
});

