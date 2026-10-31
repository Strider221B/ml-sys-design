import {
  GuidanceChecklistStep,
  QuickActionDescriptor,
  WorkspaceGuidanceItem,
  WorkspaceTab,
} from '@/core/state/guidance_types';

/**
 * Authoritative instructional catalog mapping guidance banners, checklists, and quick actions per workspace.
 */
export class WorkspaceGuidanceCatalog {
  private static readonly _DEFAULT_TAB: WorkspaceTab = 'CANVAS';
  private static readonly _CATALOG: Record<WorkspaceTab, WorkspaceGuidanceItem> = {
    CANVAS: {
      tab: 'CANVAS',
      title: 'Architecture Canvas',
      badge: 'Visual Infrastructure & Latency Simulator',
      checklist: [
        {
          stepNumber: 1,
          title: 'Add Components',
          instruction: 'Drag Gateways, Feature Stores, or vLLM Workers onto the canvas.',
        },
        {
          stepNumber: 2,
          title: 'Wire Connections',
          instruction: 'Connect source ports to target inputs; observe port compatibility glow.',
        },
        {
          stepNumber: 3,
          title: 'Inspect & Tune',
          instruction: 'Click any node to open the Inspector Drawer and adjust QPS or quantization.',
        },
      ],
      quickActions: [
        {
          id: 'load_rag_template',
          label: 'Load Hybrid Search RAG',
          icon: 'rag',
          actionType: 'LOAD_TEMPLATE',
          payload: 'HYBRID_SEARCH_RAG',
        },
        {
          id: 'load_agent_template',
          label: 'Load Multi-Agent Swarm',
          icon: 'agent',
          actionType: 'LOAD_TEMPLATE',
          payload: 'MULTI_AGENT_ORCHESTRATION',
        },
      ],
    },
    INTERVIEW: {
      tab: 'INTERVIEW',
      title: 'AI Interview Simulator',
      badge: '2026 FAANG Whiteboard Defense',
      checklist: [
        {
          stepNumber: 1,
          title: 'Select Step',
          instruction: 'Proceed through the 6-step framework from requirements to monitoring.',
        },
        {
          stepNumber: 2,
          title: 'Voice & Canvas',
          instruction: 'Explain design choices verbally or export visual architecture.',
        },
        {
          stepNumber: 3,
          title: 'Evaluate',
          instruction: 'Submit to AI interviewer for real-time rubric scoring and gap feedback.',
        },
      ],
      quickActions: [
        {
          id: 'start_step1',
          label: 'Start Step 1: Requirements',
          icon: 'mic',
          actionType: 'START_STEP',
          payload: 1,
        },
        {
          id: 'load_canvas_context',
          label: 'Load Canvas into Answer',
          icon: 'canvas',
          actionType: 'LOAD_CANVAS_CONTEXT',
        },
      ],
    },
    CHAOS: {
      tab: 'CHAOS',
      title: 'Chaos Sandbox',
      badge: 'Adversarial Attacks & Failure Resilience',
      checklist: [
        {
          stepNumber: 1,
          title: 'Pick Perturbation',
          instruction: 'Select Poisson bursts, network partitions, or agent cascade loops.',
        },
        {
          stepNumber: 2,
          title: 'Inject Fault',
          instruction: 'Run failure simulation and monitor error budget burn rate.',
        },
        {
          stepNumber: 3,
          title: 'Apply Mitigation',
          instruction: 'Engage circuit breakers or autoscaling to halt degradation.',
        },
      ],
      quickActions: [
        {
          id: 'trigger_burst',
          label: 'Run 10x Poisson Burst',
          icon: 'zap',
          actionType: 'RUN_CHAOS',
          payload: 'POISSON_BURST',
        },
        {
          id: 'trigger_argon',
          label: 'Run Argon Review',
          icon: 'shield',
          actionType: 'RUN_CHAOS',
          payload: 'ARGON_REVIEW',
        },
      ],
    },
    CURRICULUM: {
      tab: 'CURRICULUM',
      title: '2026 Core Curriculum',
      badge: 'Interactive Systems Blueprint Drills',
      checklist: [
        {
          stepNumber: 1,
          title: 'Select Track',
          instruction: 'Choose MLOps, Foundation Models, or Production Engineering.',
        },
        {
          stepNumber: 2,
          title: 'Load Challenge',
          instruction: 'Click Launch Scenario to populate the Canvas with starter topology.',
        },
        {
          stepNumber: 3,
          title: 'Pass Rubric',
          instruction: 'Optimize architecture to meet latency and cost SLA targets.',
        },
      ],
      quickActions: [
        {
          id: 'load_ecommerce',
          label: 'Load E-Commerce Ranking',
          icon: 'cart',
          actionType: 'LOAD_BLUEPRINT',
          payload: 'ecommerce_ranking',
        },
        {
          id: 'load_rag_blueprint',
          label: 'Load Multi-Modal RAG',
          icon: 'book',
          actionType: 'LOAD_BLUEPRINT',
          payload: 'multimodal_rag',
        },
      ],
    },
    TELEMETRY: {
      tab: 'TELEMETRY',
      title: 'Telemetry & Profiler',
      badge: '60 FPS High-Frequency Operations Dashboard',
      checklist: [
        {
          stepNumber: 1,
          title: 'Inspect Waterfall',
          instruction: 'Trace end-to-end p50, p95, and p99 latency distributions.',
        },
        {
          stepNumber: 2,
          title: 'Observe Memory',
          instruction: 'Check KV-cache fragmentation and GPU HBM memory saturation.',
        },
        {
          stepNumber: 3,
          title: 'Analyze Traces',
          instruction: 'Parse synthetic CUDA and NCCL crash logs to diagnose bottlenecks.',
        },
      ],
      quickActions: [
        {
          id: 'toggle_flamegraph',
          label: 'Toggle Flamegraph',
          icon: 'chart',
          actionType: 'TOGGLE_VIEW',
          payload: 'FLAMEGRAPH',
        },
        {
          id: 'toggle_waterfall',
          label: 'Inspect Waterfall',
          icon: 'activity',
          actionType: 'TOGGLE_VIEW',
          payload: 'WATERFALL',
        },
      ],
    },
    FINOPS: {
      tab: 'FINOPS',
      title: 'FinOps Unit Economics',
      badge: 'GPU/TPU Sizing & Infrastructure Cost Calculator',
      checklist: [
        {
          stepNumber: 1,
          title: 'Define Workload',
          instruction: 'Input Target QPS, input prompt tokens, and completion tokens.',
        },
        {
          stepNumber: 2,
          title: 'Compare Hardware',
          instruction: 'Evaluate H100 vs. TPU v5p vs. MI300X cost and bandwidth trade-offs.',
        },
        {
          stepNumber: 3,
          title: 'Export Spec',
          instruction: 'Generate financial provisioning manifesto for engineering approval.',
        },
      ],
      quickActions: [
        {
          id: 'calculate_sizing',
          label: 'Calculate GPU Sizing',
          icon: 'calc',
          actionType: 'CALC_FINOPS',
          payload: 'GPU_SIZING',
        },
        {
          id: 'export_cost_spec',
          label: 'Export Cost Breakdown',
          icon: 'file',
          actionType: 'CALC_FINOPS',
          payload: 'EXPORT_COST',
        },
      ],
    },
  };

  public constructor() {}

  /**
   * Retrieves instructional guidance descriptor for specified workspace tab.
   */
  public getGuidanceForTab(tab: WorkspaceTab): WorkspaceGuidanceItem {
    return (
      WorkspaceGuidanceCatalog._CATALOG[tab] ||
      WorkspaceGuidanceCatalog._CATALOG[WorkspaceGuidanceCatalog._DEFAULT_TAB]
    );
  }

  /**
   * Returns list of all supported workspace tab identifiers.
   */
  public getAllTabs(): WorkspaceTab[] {
    return Object.keys(WorkspaceGuidanceCatalog._CATALOG) as WorkspaceTab[];
  }

  /**
   * Checks whether the specified tab identifier is supported.
   */
  public hasTab(tab: string): tab is WorkspaceTab {
    return tab in WorkspaceGuidanceCatalog._CATALOG;
  }
}

