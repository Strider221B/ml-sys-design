import {
  ComponentMockWalkthrough,
  WorkspaceTabId,
} from '@/core/state/welcome_types';

/**
 * Authoritative catalog of mock walkthrough scenarios, steps, and action payloads for all 6 workspaces.
 */
export class MockWalkthroughCatalog {
  private static readonly _DEFAULT_TAB: WorkspaceTabId = 'CANVAS';

  private static readonly _CATALOG: Record<WorkspaceTabId, ComponentMockWalkthrough> = {
    CANVAS: {
      tabId: 'CANVAS',
      componentTitle: 'Architecture Canvas: Visual Systems Modeling & Latency Simulation',
      mentalModel:
        'Interactive drag-and-drop ML topologies with real-time M/G/c queuing latency and compute trade-offs.',
      scenarioTitle: 'Enterprise Hybrid Search Retrieval-Augmented Generation (RAG)',
      steps: [
        {
          stepNumber: 1,
          title: 'Ingress & Query Routing',
          narrative:
            'Place Query Gateway configured with 5,000 QPS rate limit and 200ms client timeout.',
          highlightMetric: '5,000 QPS / 200ms timeout',
        },
        {
          stepNumber: 2,
          title: 'Semantic Retrieval & Fusion',
          narrative:
            'Connect Gateway to parallel Dense Vector DB (HNSW, 1536-d) and Sparse BM25 Index (Elasticsearch).',
          highlightMetric: '1.2ms online read',
        },
        {
          stepNumber: 3,
          title: 'Cross-Encoder Re-Ranking',
          narrative:
            'Cross-encoder trims candidates to top-5 highest-relevance contexts for LLM generation.',
          highlightMetric: 'Top-5 filtered',
        },
        {
          stepNumber: 4,
          title: 'vLLM Inference Cluster',
          narrative:
            '4x NVIDIA H100 GPUs run 70B model with INT4 AWQ quantization (TTFT: 68ms, TPOT: 12.4ms/tok).',
          highlightMetric: 'p99 <= 45ms ($2,450/mo)',
        },
      ],
      primaryActionLabel: 'Load Mock RAG Example',
      primaryActionPayload: { actionType: 'LOAD_CANVAS_RAG' },
    },
    INTERVIEW: {
      tabId: 'INTERVIEW',
      componentTitle: 'AI Interview Simulator: Structured 6-Step FAANG Defense',
      mentalModel:
        'Practice standardized 6-step FAANG ML system design defense with real-time multimodal evaluation.',
      scenarioTitle: 'Design YouTube Video Recommendation Engine (2B DAU)',
      steps: [
        {
          stepNumber: 1,
          title: 'Step 1: Clarifying Requirements',
          narrative:
            'Clarify scale: 2B DAU, 500 hours uploaded/minute, 50k QPS retrieval budget, and p99 latency < 50ms.',
          highlightMetric: '2B DAU / 50k QPS',
        },
        {
          stepNumber: 2,
          title: 'Step 2: High-Level Architecture',
          narrative:
            'Propose two-stage pipeline: Two-tower Candidate Generation (top-1k in <15ms) and Multi-Task Deep Ranking.',
          highlightMetric: 'Two-stage RecSys',
        },
        {
          stepNumber: 3,
          title: 'Step 3: Rubric Evaluation & Probing',
          narrative:
            'Submit answer for Staff/Principal evaluation scoring Correctness, Latency, and Cold-Start handling.',
          highlightMetric: 'Staff Rubric 4.8/5',
        },
      ],
      primaryActionLabel: 'Load Mock Transcript',
      primaryActionPayload: { actionType: 'LOAD_INTERVIEW_YOUTUBE' },
    },
    CHAOS: {
      tabId: 'CHAOS',
      componentTitle: 'Chaos Sandbox: Adversarial Stress-Testing & Fault Injection',
      mentalModel:
        'Stress-test architectures against real-world production incidents, agent cascades, and edge failures.',
      scenarioTitle: '10x Poisson Traffic Burst & Worker OOM Collapse Drill',
      steps: [
        {
          stepNumber: 1,
          title: 'Baseline Health Check',
          narrative:
            'Inspect baseline load: 1,200 QPS with healthy queues (<15% utilization).',
          highlightMetric: '1,200 QPS baseline',
        },
        {
          stepNumber: 2,
          title: 'Traffic Spike Injection',
          narrative:
            'Surge traffic to 12,000 QPS; observe queue saturation (M/G/c wait 320ms, 42% packet drops).',
          highlightMetric: '12,000 QPS burst',
        },
        {
          stepNumber: 3,
          title: 'Engage Throttling Mitigation',
          narrative:
            'Activate ingress rate limiter, prompt cache (65% hits), and 8 replicas restoring p99 to 42ms.',
          highlightMetric: 'Error rate: 0.01%',
        },
      ],
      primaryActionLabel: 'Simulate This Burst Attack',
      primaryActionPayload: { actionType: 'SIMULATE_CHAOS_BURST' },
    },
    CURRICULUM: {
      tabId: 'CURRICULUM',
      componentTitle: 'Curriculum Explorer: 13 Production Case Studies & Challenges',
      mentalModel:
        'Structured 2026 data science curriculum covering MLOps, Generative AI, and Production Engineering.',
      scenarioTitle: 'Challenge #03: 10M QPS Streaming Fraud Detection Engine',
      steps: [
        {
          stepNumber: 1,
          title: 'Explore Challenge Constraints',
          narrative:
            'Inspect specs: 10M transactions/sec, p99 latency <= 15ms SLA, zero data leakage.',
          highlightMetric: '10M QPS / 15ms SLA',
        },
        {
          stepNumber: 2,
          title: 'Ingest & Feature Pipeline',
          narrative:
            'Inspect starter topology: Kafka stream, Feast online Redis store, and XGBoost ONNX worker.',
          highlightMetric: 'Ensemble GNN + XGBoost',
        },
        {
          stepNumber: 3,
          title: 'Latency & Cost Verification',
          narrative:
            'Run verification test suite to ensure graph passes p99 latency threshold under peak load.',
          highlightMetric: 'Test suite: 100% pass',
        },
      ],
      primaryActionLabel: 'Load Challenge #03 Now',
      primaryActionPayload: { actionType: 'LOAD_CURRICULUM_FRAUD' },
    },
    TELEMETRY: {
      tabId: 'TELEMETRY',
      componentTitle: 'Real-Time Telemetry: 60 FPS Observability & Profiler Console',
      mentalModel:
        '60 FPS WebGL2 observability console tracing latency waterfalls, KV-cache fragmentation, and error traces.',
      scenarioTitle: 'Diagnosing Time-To-First-Token (TTFT) Latency Explosion',
      steps: [
        {
          stepNumber: 1,
          title: 'Traffic Sweep',
          narrative: 'Simulate user load increase from 1,000 QPS to 8,000 QPS.',
          highlightMetric: '8,000 QPS',
        },
        {
          stepNumber: 2,
          title: 'Analyze Latency Waterfall',
          narrative:
            'Isolate TTFT prefill latency (142ms) as dominant bottleneck (>80% of total response time).',
          highlightMetric: 'TTFT: 142ms',
        },
        {
          stepNumber: 3,
          title: 'Resolve KV-Cache Fragmentation',
          narrative:
            'Inspect memory heatmap showing 68% fragmentation; enable PagedAttention to reduce TTFT to 31ms.',
          highlightMetric: 'PagedAttention: 31ms',
        },
      ],
      primaryActionLabel: 'Simulate This Telemetry Spike',
      primaryActionPayload: { actionType: 'SIMULATE_TELEMETRY_SPIKE' },
    },
    FINOPS: {
      tabId: 'FINOPS',
      componentTitle: 'FinOps Workspace: Hardware Sizing & Cloud Cost Modeling',
      mentalModel:
        'Calculate GPU/TPU cluster sizing, memory bandwidth bounds, and monthly infrastructure cloud expenditures.',
      scenarioTitle: 'Sizing a 50,000 QPS Llama-3-70B Production Inference Cluster',
      steps: [
        {
          stepNumber: 1,
          title: 'Workload Parameters',
          narrative:
            'Target: 50,000 QPS, 512 input tokens, 128 output tokens, p99 latency <= 80ms.',
          highlightMetric: '50k QPS / 80ms SLA',
        },
        {
          stepNumber: 2,
          title: 'Compare Hardware Configurations',
          narrative:
            '64x A100 FP16 ($76,800/mo) vs 16x H100 INT4 AWQ ($22,400/mo).',
          highlightMetric: '$54,400/mo savings',
        },
        {
          stepNumber: 3,
          title: 'Review 71% Cost Reduction',
          narrative:
            'H100 INT4 AWQ satisfies 80ms SLA while saving $54,400/mo ($652,800/yr); export report.',
          highlightMetric: '71% cost reduction',
        },
      ],
      primaryActionLabel: 'Load Mock FinOps Sizing',
      primaryActionPayload: { actionType: 'LOAD_FINOPS_LLAMA' },
    },
  };

  public constructor() {}

  /**
   * Retrieves the mock walkthrough for a specific workspace tab.
   */
  public getWalkthrough(tabId: WorkspaceTabId): ComponentMockWalkthrough {
    return (
      MockWalkthroughCatalog._CATALOG[tabId] ||
      MockWalkthroughCatalog._CATALOG[MockWalkthroughCatalog._DEFAULT_TAB]
    );
  }

  /**
   * Returns all available tab IDs in the catalog.
   */
  public getAllTabIds(): WorkspaceTabId[] {
    return Object.keys(MockWalkthroughCatalog._CATALOG) as WorkspaceTabId[];
  }

  /**
   * Checks whether a walkthrough exists for the specified tab ID.
   */
  public hasWalkthrough(tabId: string): boolean {
    return Object.prototype.hasOwnProperty.call(MockWalkthroughCatalog._CATALOG, tabId);
  }
}

