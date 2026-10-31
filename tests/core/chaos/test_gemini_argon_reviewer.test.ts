import { describe, expect, it, vi } from 'vitest';
import { LlmOrchestrator } from '@/core/ai_gateway/llm_orchestrator';
import { CanvasGraph } from '@/core/chaos/fault_injection_engine';
import { ArgonReviewData, GeminiArgonReviewer } from '@/core/chaos/gemini_argon_reviewer';
import { LLMExchangeEnvelope } from '@/schemas/exchange_envelope_schema';

describe('GeminiArgonReviewer', () => {
  const sampleArgonData: ArgonReviewData = {
    adversarialCritique: 'Identified unbounded queue on generation node.',
    targetedVulnerability: 'Unprotected vLLM engine lacking rate limits',
    killerWorkloadPacket: {
      trafficPattern: 'LONG_CONTEXT_PROMPT_BOMB',
      burstQPS: 25000,
      adversarialPayloadDescription: '128k prompt bomb',
      samplePayloadSnippet: '{"prompt": "payload"}',
    },
    predictedSystemFailure: 'KV-cache memory exhaustion',
  };

  const sampleEnvelope: LLMExchangeEnvelope = {
    envelopeVersion: '2026.1.0',
    envelopeId: 'env_argon_1',
    moduleId: 'CHAOS_MONKEY_ARGON',
    useCaseId: 'argon_test',
    timestamp: new Date().toISOString(),
    promptPayload: {
      systemInstruction: 'sys',
      userPrompt: 'prompt',
      serializedContext: {},
      copyPasteReadyMarkdown: 'markdown',
    },
    expectedResponseSchema: {},
    llmResponse: null,
    metadata: {
      source: 'DIRECT_GEMINI_API',
      modelIdentifier: 'gemini-1.5-flash',
      executionLatencyMs: 80,
      validationErrors: [],
    },
  };

  it('test_analyzeVulnerabilities_whenGraphEmpty_returnsFailedStatus', async () => {
    const mockOrch = {} as unknown as LlmOrchestrator;
    const reviewer = new GeminiArgonReviewer(mockOrch);

    const result = await reviewer.analyzeVulnerabilities({ nodes: [], edges: [] });
    expect(result.status).toBe('FAILED');
    expect(result.error).toContain('Architecture contains no nodes');
  });

  it('test_analyzeVulnerabilities_whenOrchestratorSucceeds_returnsReviewData', async () => {
    const mockOrch = {
      execute: vi.fn().mockResolvedValue({
        status: 'SUCCESS',
        data: sampleArgonData,
        envelope: sampleEnvelope,
      }),
    } as unknown as LlmOrchestrator;

    const reviewer = new GeminiArgonReviewer(mockOrch);
    const graph: CanvasGraph = {
      nodes: [{ id: 'n1', type: 'VLLM_INFERENCE_ENGINE', position: { x: 0, y: 0 }, data: { label: 'vLLM' } }],
      edges: [],
    };

    const result = await reviewer.analyzeVulnerabilities(graph);
    expect(result.status).toBe('SUCCESS');
    expect(result.data?.targetedVulnerability).toBe(sampleArgonData.targetedVulnerability);
    expect(result.data?.killerWorkloadPacket.trafficPattern).toBe('LONG_CONTEXT_PROMPT_BOMB');
  });

  it('test_generateDeterministicKillerWorkload_selectsPatternMatchingArchitecture', () => {
    const mockOrch = {} as unknown as LlmOrchestrator;
    const reviewer = new GeminiArgonReviewer(mockOrch);

    const vllmGraph: CanvasGraph = {
      nodes: [{ id: 'n1', type: 'VLLM_INFERENCE_ENGINE', position: { x: 0, y: 0 }, data: { label: 'vLLM' } }],
      edges: [],
    };
    expect(reviewer.generateDeterministicKillerWorkload(vllmGraph).trafficPattern).toBe('LONG_CONTEXT_PROMPT_BOMB');

    const vdbGraph: CanvasGraph = {
      nodes: [{ id: 'n1', type: 'VECTOR_DATABASE', position: { x: 0, y: 0 }, data: { label: 'Qdrant' } }],
      edges: [],
    };
    expect(reviewer.generateDeterministicKillerWorkload(vdbGraph).trafficPattern).toBe('SKEWED_HASH_KEY_COLLISION');

    const agentGraph: CanvasGraph = {
      nodes: [{ id: 'n1', type: 'AGENT_ORCHESTRATOR', position: { x: 0, y: 0 }, data: { label: 'Agent' } }],
      edges: [],
    };
    expect(reviewer.generateDeterministicKillerWorkload(agentGraph).trafficPattern).toBe('CONCURRENT_CACHE_EVICTION');

    const genericGraph: CanvasGraph = {
      nodes: [{ id: 'n1', type: 'INGRESS_GATEWAY', position: { x: 0, y: 0 }, data: { label: 'Gateway' } }],
      edges: [],
    };
    expect(reviewer.generateDeterministicKillerWorkload(genericGraph).trafficPattern).toBe('POISSON_BURST');
  });

  it('test_scanVulnerabilitiesHeuristic_detectsVulnerabilitiesAndMitigations', () => {
    const mockOrch = {} as unknown as LlmOrchestrator;
    const reviewer = new GeminiArgonReviewer(mockOrch);

    const vulnerableGraph: CanvasGraph = {
      nodes: [
        { id: 'n1', type: 'VLLM_INFERENCE_ENGINE', position: { x: 0, y: 0 }, data: { label: 'vLLM' } },
        { id: 'n2', type: 'VECTOR_DATABASE', position: { x: 0, y: 0 }, data: { label: 'Qdrant' } },
        { id: 'n3', type: 'AGENT_ORCHESTRATOR', position: { x: 0, y: 0 }, data: { label: 'Agent' } },
      ],
      edges: [],
    };

    const scan = reviewer.scanVulnerabilitiesHeuristic(vulnerableGraph);
    expect(scan.hasVulnerabilities).toBe(true);
    expect(scan.vulnerabilities).toHaveLength(3);
    expect(scan.suggestedMitigations).toHaveLength(3);

    const protectedGraph: CanvasGraph = {
      nodes: [
        { id: 'n1', type: 'VLLM_INFERENCE_ENGINE', position: { x: 0, y: 0 }, data: { label: 'vLLM' } },
        { id: 'n2', type: 'SAFETY_GUARDRAIL', position: { x: 0, y: 0 }, data: { label: 'Guard' } },
        { id: 'n3', type: 'VECTOR_DATABASE', position: { x: 0, y: 0 }, data: { label: 'Qdrant' } },
        { id: 'n4', type: 'CACHING_LAYER', position: { x: 0, y: 0 }, data: { label: 'Cache' } },
      ],
      edges: [],
    };

    const protectedScan = reviewer.scanVulnerabilitiesHeuristic(protectedGraph);
    expect(protectedScan.hasVulnerabilities).toBe(false);
  });
});

