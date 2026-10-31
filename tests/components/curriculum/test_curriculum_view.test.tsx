// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CurriculumView } from '@/components/curriculum/curriculum_view';
import { CurriculumManager } from '@/core/curriculum/curriculum_manager';
import { CurriculumTracker } from '@/core/curriculum/curriculum_tracker';
import { ScenarioConstants } from '@/core/scenarios/scenario_constants';
import { ScenarioLoader } from '@/core/scenarios/scenario_loader';
import { WorkspaceStore } from '@/core/state/workspace_store';
import { ScenarioPluginSchema } from '@/schemas/scenario_plugin_schema';

describe('CurriculumView', () => {
  const schemaValidator = new ScenarioPluginSchema();

  it('test_render_displaysTitleProgressAndDefaultModule', () => {
    render(<CurriculumView />);

    expect(screen.getByText('2026 ML System Design Curriculum')).toBeDefined();
    expect(screen.getByTestId('overall-progress-pct').textContent).toBe('0%');
    expect(screen.getByTestId(`module-tab-${ScenarioConstants.MODULE_1_MLOPS}`)).toBeDefined();
    expect(screen.getAllByText(ScenarioConstants.MODULE_1_TITLE).length).toBeGreaterThan(0);
    expect(screen.getByText('Low-Latency Online Feature Stores vs. Batch Lakes')).toBeDefined();
    expect(screen.getByText('2026 Core Skill Transformations')).toBeDefined();
  });

  it('test_moduleTabs_switchesActiveModuleWhenClicked', () => {
    const onSelectModule = vi.fn();
    render(<CurriculumView onSelectModule={onSelectModule} />);

    const mod2Tab = screen.getByTestId(`module-tab-${ScenarioConstants.MODULE_2_GENAI}`);
    fireEvent.click(mod2Tab);

    expect(onSelectModule).toHaveBeenCalledWith(ScenarioConstants.MODULE_2_GENAI);
    expect(screen.getAllByText(ScenarioConstants.MODULE_2_TITLE).length).toBeGreaterThan(0);
    expect(screen.getByText('Hybrid Vector Infrastructure (HNSW + BM25 + RRF)')).toBeDefined();

    const mod3Tab = screen.getByTestId(`module-tab-${ScenarioConstants.MODULE_3_PRODUCTION_METRICS}`);
    fireEvent.click(mod3Tab);

    expect(onSelectModule).toHaveBeenCalledWith(ScenarioConstants.MODULE_3_PRODUCTION_METRICS);
    expect(screen.getAllByText(ScenarioConstants.MODULE_3_TITLE).length).toBeGreaterThan(0);
    expect(screen.getByText('Online Experimentation: Multi-Armed Bandits & CUPED')).toBeDefined();
  });

  it('test_progressOverview_reflectsTrackerScoresAndBadges', () => {
    const store = new WorkspaceStore();
    const manager = new CurriculumManager();
    const tracker = new CurriculumTracker(store, manager);

    tracker.recordCompletion(ScenarioConstants.BLUEPRINT_ECOM_ID, 95);

    render(<CurriculumView curriculumTracker={tracker} curriculumManager={manager} />);

    expect(screen.getByTestId('overall-progress-pct').textContent).toBe('33%');
    expect(screen.getByText(ScenarioConstants.BADGE_MLOPS_PIONEER)).toBeDefined();
  });

  it('test_launchScenario_triggersCallbackOnSuccess', async () => {
    const onLaunchScenario = vi.fn();
    const loader = new ScenarioLoader(schemaValidator);

    render(<CurriculumView scenarioLoader={loader} onLaunchScenario={onLaunchScenario} />);

    const launchBtn = screen.getByTestId('btn-launch-m1_l1_feature_stores');
    fireEvent.click(launchBtn);

    await waitFor(() => {
      expect(onLaunchScenario).toHaveBeenCalledTimes(1);
    });
    expect(onLaunchScenario.mock.calls[0]?.[0]).toBe(ScenarioConstants.BLUEPRINT_ECOM_ID);
    expect(onLaunchScenario.mock.calls[0]?.[1]).toBeDefined();
  });

  it('test_launchScenario_whenErrorOccurs_rendersErrorMessage', async () => {
    const mockLoader = {
      loadBuiltinScenario: vi.fn().mockRejectedValue(new Error('Network error loading blueprint')),
    } as unknown as ScenarioLoader;

    render(<CurriculumView scenarioLoader={mockLoader} />);

    const launchBtn = screen.getByTestId('btn-launch-m1_l1_feature_stores');
    fireEvent.click(launchBtn);

    await waitFor(() => {
      expect(screen.getByText('Network error loading blueprint')).toBeDefined();
    });
  });

  it('test_moduleLocked_disablesLaunchButtonWhenPrerequisitesNotMet', () => {
    const store = new WorkspaceStore();
    const manager = new CurriculumManager();
    const tracker = new CurriculumTracker(store, manager);

    render(<CurriculumView curriculumTracker={tracker} curriculumManager={manager} />);

    const mod2Tab = screen.getByTestId(`module-tab-${ScenarioConstants.MODULE_2_GENAI}`);
    fireEvent.click(mod2Tab);

    const launchBtn = screen.getByTestId('btn-launch-m2_l1_hybrid_search') as HTMLButtonElement;
    expect(launchBtn.disabled).toBe(true);
  });

  it('test_launchScenario_withoutCallback_completesSilently', async () => {
    const loader = new ScenarioLoader(schemaValidator);
    render(<CurriculumView scenarioLoader={loader} />);

    const launchBtn = screen.getByTestId('btn-launch-m1_l1_feature_stores');
    fireEvent.click(launchBtn);

    await waitFor(() => {
      expect(screen.queryByText('Loading Blueprint...')).toBeNull();
    });
  });

  it('test_launchScenario_whenNonErrorThrown_setsFallbackErrorMessage', async () => {
    const mockLoader = {
      loadBuiltinScenario: vi.fn().mockRejectedValue('String rejection reason'),
    } as unknown as ScenarioLoader;

    render(<CurriculumView scenarioLoader={mockLoader} />);

    const launchBtn = screen.getByTestId('btn-launch-m1_l1_feature_stores');
    fireEvent.click(launchBtn);

    await waitFor(() => {
      expect(screen.getByText('Unknown load error')).toBeDefined();
    });
  });

  it('test_lessonCard_whenScoreBelowPassing_doesNotRenderCompletedBadge', () => {
    const store = new WorkspaceStore();
    const manager = new CurriculumManager();
    const tracker = new CurriculumTracker(store, manager);

    tracker.recordCompletion(ScenarioConstants.BLUEPRINT_ECOM_ID, 65);

    render(<CurriculumView curriculumTracker={tracker} curriculumManager={manager} />);

    expect(screen.queryByText(/COMPLETED/)).toBeNull();
  });

  it('test_selectModule_withoutCallback_updatesModuleState', () => {
    render(<CurriculumView />);

    const mod2Tab = screen.getByTestId(`module-tab-${ScenarioConstants.MODULE_2_GENAI}`);
    fireEvent.click(mod2Tab);

    expect(screen.getAllByText(ScenarioConstants.MODULE_2_TITLE).length).toBeGreaterThan(0);
  });
});
