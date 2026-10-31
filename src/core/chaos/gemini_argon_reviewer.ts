import { ChaosConstants } from '@/core/chaos/chaos_constants';
import { CanvasGraph } from '@/core/chaos/fault_injection_engine';
import { ExecutionOptions, LlmOrchestrator } from '@/core/ai_gateway/llm_orchestrator';
import { LLMExchangeEnvelope } from '@/schemas/exchange_envelope_schema';

export type WorkloadTrafficPattern =
  | 'POISSON_BURST'
  | 'SKEWED_HASH_KEY_COLLISION'
  | 'LONG_CONTEXT_PROMPT_BOMB'
  | 'CONCURRENT_CACHE_EVICTION';

export interface KillerWorkloadPacket {
  trafficPattern: WorkloadTrafficPattern;
  burstQPS: number;
  adversarialPayloadDescription: string;
  samplePayloadSnippet: string;
}

export interface ArgonReviewData {
  adversarialCritique: string;
  targetedVulnerability: string;
  killerWorkloadPacket: KillerWorkloadPacket;
  predictedSystemFailure: string;
}

export interface ArgonReviewResult {
  status: 'SUCCESS' | 'MANUAL_FALLBACK_REQUIRED' | 'FAILED';
  data: ArgonReviewData | null;
  envelope?: LLMExchangeEnvelope | undefined;
  error?: string | undefined;
}

export interface VulnerabilityScanSummary {
  hasVulnerabilities: boolean;
  vulnerabilities: string[];
  suggestedMitigations: string[];
}

/**
 * Adversarial reviewer scanning architectures and synthesizing targeted killer workload packets.
 */
export class GeminiArgonReviewer {
  private static readonly _SYSTEM_INSTRUCTION =
    'You are Gemini Argon, an adversarial Red-Team ML Systems Architect. Find critical single-points-of-failure and generate killer workloads.';
  private static readonly _DEFAULT_BURST_QPS = 25000;
  private static readonly _HIGH_BURST_QPS = 50000;
  private static readonly _ERR_MISSING_NODES = 'Architecture contains no nodes to analyze';
  private static readonly _VULN_NO_GUARDRAIL = 'Ingress exposes LLM serving directly without safety guardrails';
  private static readonly _VULN_NO_CACHE = 'Vector database exposed to raw repetitive burst without cache layer';
  private static readonly _VULN_AGENT_UNPROTECTED = 'Agent orchestrator lacks deterministic circuit breakers';
  private static readonly _MITIGATION_GUARDRAIL = 'Add SAFETY_GUARDRAIL before inference nodes';
  private static readonly _MITIGATION_CACHE = 'Deploy CACHING_LAYER in front of VECTOR_DATABASE';
  private static readonly _MITIGATION_CIRCUIT_BREAKER = 'Configure AgentCircuitBreaker with max iterations';

  public constructor(private readonly _orchestrator: LlmOrchestrator) {}

  /**
   * Evaluates architecture graph with AI Orchestrator to generate red-team critique and attack packet.
   */
  public async analyzeVulnerabilities(
    graph: CanvasGraph,
    options?: ExecutionOptions
  ): Promise<ArgonReviewResult> {
    if (graph.nodes.length === 0) {
      return this._createMissingNodesResult();
    }
    const context = this._buildAnalysisContext(graph);
    const execOptions = this._buildExecutionOptions(options);
    const result = await this._orchestrator.execute<ArgonReviewData>(
      ChaosConstants.MODULE_CHAOS_ARGON,
      context,
      execOptions
    );
    return {
      status: result.status,
      data: result.data,
      envelope: result.envelope,
      error: result.error,
    };
  }

  /**
   * Deterministically generates an adversarial killer workload packet without external network calls.
   */
  public generateDeterministicKillerWorkload(graph: CanvasGraph): KillerWorkloadPacket {
    const hasVllm = graph.nodes.some((n) => n.type === 'VLLM_INFERENCE_ENGINE');
    const hasVectorDb = graph.nodes.some((n) => n.type === 'VECTOR_DATABASE');
    const hasAgent = graph.nodes.some((n) => n.type === 'AGENT_ORCHESTRATOR');

    if (hasVllm) {
      return this._buildLongContextPacket();
    }
    if (hasVectorDb) {
      return this._buildSkewedHnswPacket();
    }
    if (hasAgent) {
      return this._buildCacheEvictionPacket();
    }
    return this._buildPoissonBurstPacket();
  }

  /**
   * Performs static topological scan detecting common single-points-of-failure.
   */
  public scanVulnerabilitiesHeuristic(graph: CanvasGraph): VulnerabilityScanSummary {
    const vulns: string[] = [];
    const mitigations: string[] = [];
    const nodeTypes = new Set(graph.nodes.map((n) => n.type));

    this._checkGuardrailVulnerability(nodeTypes, vulns, mitigations);
    this._checkCacheVulnerability(nodeTypes, vulns, mitigations);
    this._checkAgentVulnerability(nodeTypes, vulns, mitigations);

    return {
      hasVulnerabilities: vulns.length > 0,
      vulnerabilities: vulns,
      suggestedMitigations: mitigations,
    };
  }

  private _createMissingNodesResult(): ArgonReviewResult {
    return {
      status: 'FAILED',
      data: null,
      error: GeminiArgonReviewer._ERR_MISSING_NODES,
    };
  }

  private _buildExecutionOptions(options?: ExecutionOptions): ExecutionOptions {
    return {
      systemInstruction: GeminiArgonReviewer._SYSTEM_INSTRUCTION,
      ...options,
    };
  }

  private _buildAnalysisContext(graph: CanvasGraph): Record<string, unknown> {
    return {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      nodeTypes: graph.nodes.map((n) => ({ id: n.id, type: n.type, label: n.data.label })),
      connections: graph.edges.map((e) => ({ source: e.source, target: e.target, protocol: e.protocol })),
    };
  }

  private _checkGuardrailVulnerability(
    nodeTypes: Set<string>,
    vulns: string[],
    mitigations: string[]
  ): void {
    if (nodeTypes.has('VLLM_INFERENCE_ENGINE') && !nodeTypes.has('SAFETY_GUARDRAIL')) {
      vulns.push(GeminiArgonReviewer._VULN_NO_GUARDRAIL);
      mitigations.push(GeminiArgonReviewer._MITIGATION_GUARDRAIL);
    }
  }

  private _checkCacheVulnerability(
    nodeTypes: Set<string>,
    vulns: string[],
    mitigations: string[]
  ): void {
    if (nodeTypes.has('VECTOR_DATABASE') && !nodeTypes.has('CACHING_LAYER')) {
      vulns.push(GeminiArgonReviewer._VULN_NO_CACHE);
      mitigations.push(GeminiArgonReviewer._MITIGATION_CACHE);
    }
  }

  private _checkAgentVulnerability(
    nodeTypes: Set<string>,
    vulns: string[],
    mitigations: string[]
  ): void {
    if (nodeTypes.has('AGENT_ORCHESTRATOR')) {
      vulns.push(GeminiArgonReviewer._VULN_AGENT_UNPROTECTED);
      mitigations.push(GeminiArgonReviewer._MITIGATION_CIRCUIT_BREAKER);
    }
  }

  private _buildLongContextPacket(): KillerWorkloadPacket {
    return {
      trafficPattern: 'LONG_CONTEXT_PROMPT_BOMB',
      burstQPS: GeminiArgonReviewer._DEFAULT_BURST_QPS,
      adversarialPayloadDescription: '128,000 token context prompt bomb inducing vLLM KV-cache OOM crash.',
      samplePayloadSnippet: '{"prompt": "[REPEATED_HIGH_ENTROPY_TOKENS_128K]", "max_tokens": 4096}',
    };
  }

  private _buildSkewedHnswPacket(): KillerWorkloadPacket {
    return {
      trafficPattern: 'SKEWED_HASH_KEY_COLLISION',
      burstQPS: GeminiArgonReviewer._HIGH_BURST_QPS,
      adversarialPayloadDescription: 'Skewed nearest-neighbor query clustering hitting single partition shard centroid.',
      samplePayloadSnippet: '{"query_vector": [0.999, 0.999, ...], "top_k": 1000}',
    };
  }

  private _buildCacheEvictionPacket(): KillerWorkloadPacket {
    return {
      trafficPattern: 'CONCURRENT_CACHE_EVICTION',
      burstQPS: GeminiArgonReviewer._DEFAULT_BURST_QPS,
      adversarialPayloadDescription: 'High-cardinality random queries forcing zero hit rate and cache thrashing.',
      samplePayloadSnippet: '{"cache_key": "uuid-random-unique-nonce", "force_refresh": true}',
    };
  }

  private _buildPoissonBurstPacket(): KillerWorkloadPacket {
    return {
      trafficPattern: 'POISSON_BURST',
      burstQPS: GeminiArgonReviewer._HIGH_BURST_QPS,
      adversarialPayloadDescription: 'Uncorrelated burst traffic with exponential arrival inter-times exceeding thread limits.',
      samplePayloadSnippet: '{"burst_multiplier": 10.0, "distribution": "POISSON"}',
    };
  }
}
