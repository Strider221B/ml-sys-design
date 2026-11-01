import { CanvasConstants } from '@/components/canvas/canvas_constants';
import { TemplateCatalog } from '@/components/canvas/template_catalog';
import { MockActionPayload } from '@/core/state/welcome_types';
import { WorkspaceStore } from '@/core/state/workspace_store';

/**
 * Dispatches 1-click mock example scenarios and walkthrough payloads into the workspace store.
 */
export class MockActionDispatcher {
  private static readonly _SCENARIO_YOUTUBE_RECSYS = 'youtube_recommendation_v1';
  private static readonly _SCENARIO_CHAOS_BURST = 'chaos_poisson_burst_10x';
  private static readonly _SCENARIO_FRAUD_CHALLENGE = 'challenge_03_streaming_fraud';
  private static readonly _FRAUD_CURRICULUM_INDEX = 2;
  private static readonly _BURST_QPS = 12000;
  private static readonly _BURST_P99_MS = 1850;
  private static readonly _BURST_GPU_MEM_PCT = 98;
  private static readonly _BURST_MONTHLY_COST = 14500;
  private static readonly _TELEMETRY_SAMPLE_COUNT = 5;
  private static readonly _FINOPS_TARGET_QPS = 50000;
  private static readonly _FINOPS_BUDGET_USD = 22400;
  private static readonly _FINOPS_HARDWARE = '16x NVIDIA H100 SXM5 (INT4 AWQ)';

  public constructor(catalog?: TemplateCatalog) {
    this._catalog = catalog ?? new TemplateCatalog();
  }

  /**
   * Executes the specified mock action against volatile workspace store.
   */
  public async dispatchMockAction(
    payload: MockActionPayload,
    store: WorkspaceStore
  ): Promise<void> {
    const handled = this._dispatchPrimaryScenarios(payload.actionType, store);
    if (!handled) {
      this._dispatchSecondaryScenarios(payload.actionType, store);
    }
  }

  private readonly _catalog: TemplateCatalog;

  private _dispatchPrimaryScenarios(type: string, store: WorkspaceStore): boolean {
    if (type === 'LOAD_CANVAS_RAG') {
      this._dispatchCanvasRag(store);
      return true;
    }
    if (type === 'LOAD_INTERVIEW_YOUTUBE') {
      this._dispatchInterviewYoutube(store);
      return true;
    }
    if (type === 'SIMULATE_CHAOS_BURST') {
      this._dispatchChaosBurst(store);
      return true;
    }
    return false;
  }

  private _dispatchSecondaryScenarios(type: string, store: WorkspaceStore): void {
    if (type === 'LOAD_CURRICULUM_FRAUD') {
      this._dispatchCurriculumFraud(store);
    } else if (type === 'SIMULATE_TELEMETRY_SPIKE') {
      this._dispatchTelemetrySpike(store);
    } else if (type === 'LOAD_FINOPS_LLAMA') {
      this._dispatchFinOpsLlama(store);
    }
  }

  private _dispatchCanvasRag(store: WorkspaceStore): void {
    const template = this._catalog.getTemplate(CanvasConstants.TEMPLATE_HYBRID_RAG);
    if (template) {
      store.updateCanvas(template.nodes, template.edges);
    }
  }

  private _dispatchInterviewYoutube(store: WorkspaceStore): void {
    store.setInterviewStep(1);
    store.setRubricScore('correctness', 5);
    store.setRubricScore('scale', 4.5);
    store.setRubricScore('tradeoffs', 4.5);
    store.getStore().setState((prev) => ({
      currentWorkspace: {
        ...prev.currentWorkspace,
        activeScenarioId: MockActionDispatcher._SCENARIO_YOUTUBE_RECSYS,
      },
    }));
    store.markDirty();
  }

  private _dispatchChaosBurst(store: WorkspaceStore): void {
    store.getStore().setState((prev) => ({
      currentWorkspace: {
        ...prev.currentWorkspace,
        activeScenarioId: MockActionDispatcher._SCENARIO_CHAOS_BURST,
      },
    }));
    store.pushTelemetry({
      timestamp: Date.now(),
      aggregateQPS: MockActionDispatcher._BURST_QPS,
      aggregateP99Ms: MockActionDispatcher._BURST_P99_MS,
      totalCostMonthlyUsd: MockActionDispatcher._BURST_MONTHLY_COST,
      gpuMemoryUtilizationPct: MockActionDispatcher._BURST_GPU_MEM_PCT,
    });
    store.markDirty();
  }

  private _dispatchCurriculumFraud(store: WorkspaceStore): void {
    store.getStore().setState((prev) => ({
      activeCurriculumIndex: MockActionDispatcher._FRAUD_CURRICULUM_INDEX,
      currentWorkspace: {
        ...prev.currentWorkspace,
        activeScenarioId: MockActionDispatcher._SCENARIO_FRAUD_CHALLENGE,
      },
    }));
    store.markDirty();
  }

  private _dispatchTelemetrySpike(store: WorkspaceStore): void {
    const now = Date.now();
    for (let index = 0; index < MockActionDispatcher._TELEMETRY_SAMPLE_COUNT; index++) {
      const stepFactor = index + 1;
      store.pushTelemetry({
        timestamp: now + index * 1000,
        aggregateQPS: 1000 + stepFactor * 1400,
        aggregateP99Ms: 40 + stepFactor * 25,
        totalCostMonthlyUsd: 8000,
        gpuMemoryUtilizationPct: 40 + stepFactor * 10,
      });
    }
    store.markDirty();
  }

  private _dispatchFinOpsLlama(store: WorkspaceStore): void {
    store.updateFinOps({
      targetQps: MockActionDispatcher._FINOPS_TARGET_QPS,
      monthlyBudgetUsd: MockActionDispatcher._FINOPS_BUDGET_USD,
      hardwareAllocation: MockActionDispatcher._FINOPS_HARDWARE,
    });
    store.markDirty();
  }
}
