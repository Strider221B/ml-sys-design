/**
 * Central constants for the ML architecture canvas, node topologies, and accessibility engine.
 * Single source of truth for colors, node type identifiers, handle IDs, and default dimensions.
 */
export class CanvasConstants {
  public static readonly COLOR_HEALTHY = '#009E73';
  public static readonly COLOR_WARNING = '#E69F00';
  public static readonly COLOR_CRITICAL = '#D55E00';
  public static readonly COLOR_INFERENCE = '#0072B2';
  public static readonly COLOR_STORAGE = '#F0E442';
  public static readonly COLOR_AGENT = '#CC79A7';
  public static readonly COLOR_CHAOS = '#8B5CF6';

  public static readonly STATUS_OPTIMAL = 'OPTIMAL';
  public static readonly STATUS_BOTTLENECK = 'BOTTLENECK';
  public static readonly STATUS_OVERFLOW = 'OVERFLOW';
  public static readonly STATUS_CHAOS = 'CHAOS_TRIGGERED';

  public static readonly NODE_TYPE_INFERENCE_GATEWAY = 'inferenceGateway';
  public static readonly NODE_TYPE_MODEL_WORKER = 'modelWorker';
  public static readonly NODE_TYPE_VECTOR_DATABASE = 'vectorDatabase';
  public static readonly NODE_TYPE_FEATURE_STORE = 'featureStore';
  public static readonly NODE_TYPE_AGENT_SUPERVISOR = 'agentSupervisor';
  public static readonly NODE_TYPE_SEMANTIC_GUARDRAIL = 'semanticGuardrail';
  public static readonly NODE_TYPE_AGENT_SWARM_GROUP = 'agentSwarmGroup';
  public static readonly NODE_TYPE_VLLM_CLUSTER_GROUP = 'vllmClusterGroup';

  public static readonly EDGE_TYPE_INTERACTIVE_INFRA = 'interactiveInfra';

  public static readonly HANDLE_IN = 'in';
  public static readonly HANDLE_OUT = 'out';
  public static readonly HANDLE_TARGET = 'target';
  public static readonly HANDLE_SOURCE = 'source';

  public static readonly ARIA_OPTIMAL = 'Optimal performance.';
  public static readonly ARIA_BOTTLENECK = 'Warning: Memory bandwidth saturated.';
  public static readonly ARIA_OVERFLOW = 'Critical: Queue drop detected.';
  public static readonly ARIA_CHAOS = 'Chaos fault injected: 40% latency degradation active.';

  public static readonly DEFAULT_NODE_WIDTH = 260;
  public static readonly DEFAULT_NODE_HEIGHT = 160;
  public static readonly GROUP_NODE_WIDTH = 640;
  public static readonly GROUP_NODE_HEIGHT = 420;
  public static readonly CHAOS_LATENCY_MULTIPLIER = 1.4;

  public static readonly TEMPLATE_MULTI_AGENT = 'MULTI_AGENT_ORCHESTRATION';
  public static readonly TEMPLATE_HYBRID_RAG = 'HYBRID_SEARCH_RAG';
  public static readonly TEMPLATE_GUARDRAIL_ROUTING = 'LLM_GUARDRAIL_ROUTING';

  public constructor() {}
}

