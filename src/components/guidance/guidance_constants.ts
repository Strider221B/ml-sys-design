export interface OnboardingSlideConfig {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  points: string[];
}

/**
 * Global constants, copies, tooltips, and configuration keys for workspace guidance.
 */
export class GuidanceConstants {
  public static readonly TAB_CANVAS = 'CANVAS';
  public static readonly TAB_INTERVIEW = 'INTERVIEW';
  public static readonly TAB_CHAOS = 'CHAOS';
  public static readonly TAB_CURRICULUM = 'CURRICULUM';
  public static readonly TAB_TELEMETRY = 'TELEMETRY';
  public static readonly TAB_FINOPS = 'FINOPS';

  public static readonly SYNC_UNAUTHENTICATED = 'UNAUTHENTICATED';
  public static readonly SYNC_SYNCED = 'SYNCED';
  public static readonly SYNC_DIRTY = 'DIRTY';
  public static readonly SYNC_CONFLICT = 'CONFLICT';

  public static readonly ACTION_LOAD_TEMPLATE = 'LOAD_TEMPLATE';
  public static readonly ACTION_START_STEP = 'START_STEP';
  public static readonly ACTION_RUN_CHAOS = 'RUN_CHAOS';
  public static readonly ACTION_LOAD_BLUEPRINT = 'LOAD_BLUEPRINT';
  public static readonly ACTION_TOGGLE_VIEW = 'TOGGLE_VIEW';
  public static readonly ACTION_CALC_FINOPS = 'CALC_FINOPS';

  public static readonly TOOLTIP_TTFT =
    'Time to First Token (TTFT): Prefill phase latency before streaming starts.';
  public static readonly TOOLTIP_TPOT =
    'Time Per Output Token (TPOT): Inter-token decode phase latency per token.';
  public static readonly TOOLTIP_RECALL =
    'Recall@K: Fraction of relevant ground-truth embeddings retrieved in top-k.';
  public static readonly TOOLTIP_QPS =
    'Queries Per Second: Target peak ingress traffic load for this component.';
  public static readonly TOOLTIP_BATCH_SIZE =
    'Batch Size: Number of concurrent sequences bundled together during forward pass.';
  public static readonly TOOLTIP_QUANT =
    'Quantization: Numerical precision (FP16, INT8, INT4 AWQ) balancing VRAM vs perplexity.';

  public static readonly LABEL_CONNECT_DRIVE = 'Connect Google Drive';
  public static readonly LABEL_RAM_ONLY_WARNING = 'RAM-Only SSOT';
  public static readonly LABEL_SYNCED_BADGE = 'Synced to Drive';
  public static readonly LABEL_SAVING_CHANGES = 'Saving changes...';
  public static readonly LABEL_CONFLICT_ALERT = 'Resolve Conflict';
  public static readonly LABEL_HELP_GUIDE = '[?] Help & Guide';

  public static readonly ONBOARDING_SLIDES: readonly OnboardingSlideConfig[] = [
    {
      id: 0,
      badge: 'Interactive Simulation Sandbox',
      title: 'Beyond Static Whiteboards',
      subtitle:
        'A deterministic simulation runtime modeling real M/G/c queue backpressure, roofline bounds, and tail latency.',
      points: [
        'Deterministic simulation engine backed by Web Workers and Pyodide WASM.',
        'Visual node editor with port-level compatibility checks and interactive telemetry.',
        'Real-time p50, p95, and p99 queue latency modeling under arbitrary traffic loads.',
      ],
    },
    {
      id: 1,
      badge: 'The 6-Screen Operational Loop',
      title: 'End-to-End Engineering Workflow',
      subtitle:
        'A continuous cycle taking you from curriculum blueprint to production-grade interview defense.',
      points: [
        'Curriculum: Pick production challenge specs and instantiate starter topologies.',
        'Canvas & Telemetry: Wire infrastructure, size queues, and monitor 60 FPS flame graphs.',
        'Chaos & FinOps: Inject adversarial faults, verify resilience, and optimize GPU economics.',
        'AI Interview: Practice the 6-step FAANG defense with AI Staff/Principal evaluation.',
      ],
    },
    {
      id: 2,
      badge: 'Zero Local Storage Mandate',
      title: 'Google Drive Single Source of Truth',
      subtitle:
        'Zero browser disk persistence. State is held in volatile RAM until synced to your Google Drive.',
      points: [
        'Zero cookies, zero localStorage, zero IndexedDB for complete enterprise air-gapping.',
        'One-click Google Identity Services (GIS) OAuth popup with drive.file scope.',
        'Automated debounced diffing and 3-way AST merge conflict resolution.',
      ],
    },
    {
      id: 3,
      badge: 'Dual-Mode AI Gateway',
      title: 'Direct Free API or Air-Gapped JSON',
      subtitle:
        'Flexible AI connectivity accommodating zero-cost experimentation or strict enterprise security.',
      points: [
        'Direct Mode: Execute queries via Google Gemini Free Tier without client secrets.',
        'Manual Mode: Export standard JSON prompt envelopes for Google AI Studio or ChatGPT.',
        'Import validated responses back into the runtime with complete structural schema checking.',
      ],
    },
  ];

  public constructor() {}

  /**
   * Retrieves onboarding slide configuration by index.
   */
  public getSlide(index: number): OnboardingSlideConfig {
    const clamped = Math.max(0, Math.min(index, GuidanceConstants.ONBOARDING_SLIDES.length - 1));
    return GuidanceConstants.ONBOARDING_SLIDES[clamped];
  }

  /**
   * Returns total count of onboarding slides.
   */
  public getSlideCount(): number {
    return GuidanceConstants.ONBOARDING_SLIDES.length;
  }
}
