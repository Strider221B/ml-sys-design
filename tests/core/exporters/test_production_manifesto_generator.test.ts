import { describe, expect, it, vi } from 'vitest';
import { LlmOrchestrator } from '@/core/ai_gateway/llm_orchestrator';
import { ProductionManifestoGenerator } from '@/core/exporters/production_manifesto_generator';
import { WorkspaceDocument } from '@/core/state/workspace_types';

describe('ProductionManifestoGenerator', () => {
  const sampleDoc: WorkspaceDocument = {
    workspaceId: 'ws_manifesto_test',
    title: 'High-Concurrency Multi-Modal RAG Platform',
    lastModifiedIso: new Date().toISOString(),
    etag: null,
    activeModuleId: 'RESUME_PORTFOLIO_EXPORTER',
    activeScenarioId: null,
    nodes: [
      {
        id: 'node_1',
        type: 'VLLM_INFERENCE_ENGINE',
        position: { x: 0, y: 0 },
        data: { label: 'Model Worker' },
      },
      {
        id: 'node_2',
        type: 'SAFETY_GUARDRAIL',
        position: { x: 50, y: 50 },
        data: { label: 'Guardrail' },
      },
    ],
    edges: [],
  };

  it('test_generateStructuredManifesto_withoutLlm_producesCompleteHeuristicManifesto', async () => {
    const generator = new ProductionManifestoGenerator();
    const manifesto = await generator.generateStructuredManifesto(sampleDoc, false);

    expect(manifesto.portfolioTitle).toContain('High-Concurrency Multi-Modal RAG Platform');
    expect(manifesto.executiveSummaryMd).toContain('Executive Summary');
    expect(manifesto.architecturalDecisionsMd).toContain('Architectural Decisions');
    expect(manifesto.hardwareAndUnitEconomicsMd).toContain('Hardware Sizing & Unit Economics');
    expect(manifesto.failureModesAndChaosResilienceMd).toContain('Chaos Resilience & Compliance');
    expect(manifesto.recommendedInterviewTalkingPoints.length).toBeGreaterThan(0);
  });

  it('test_generateMarkdownManifesto_formatsAllSectionsIntoSingleDocument', async () => {
    const generator = new ProductionManifestoGenerator();
    const markdown = await generator.generateMarkdownManifesto(sampleDoc);

    expect(markdown).toContain('# Production Architecture Manifesto: High-Concurrency Multi-Modal RAG Platform');
    expect(markdown).toContain('## Executive Summary');
    expect(markdown).toContain('## Recommended Interview Talking Points');
  });

  it('test_generateStructuredManifesto_withLlmSuccess_mergesLlmEnrichment', async () => {
    const mockOrch = {
      execute: vi.fn().mockResolvedValue({
        status: 'SUCCESS',
        data: {
          portfolioTitle: 'Custom LLM Enriched Title',
          executiveSummaryMd: 'Custom LLM Exec Summary',
          recommendedInterviewTalkingPoints: ['Point A', 'Point B'],
        },
      }),
    } as unknown as LlmOrchestrator;

    const generator = new ProductionManifestoGenerator(mockOrch);
    const manifesto = await generator.generateStructuredManifesto(sampleDoc, true);

    expect(manifesto.portfolioTitle).toBe('Custom LLM Enriched Title');
    expect(manifesto.executiveSummaryMd).toBe('Custom LLM Exec Summary');
    expect(manifesto.recommendedInterviewTalkingPoints).toEqual(['Point A', 'Point B']);
  });

  it('test_generateStructuredManifesto_whenLlmThrows_fallsBackHeuristically', async () => {
    const mockOrch = {
      execute: vi.fn().mockRejectedValue(new Error('API quota exceeded')),
    } as unknown as LlmOrchestrator;

    const generator = new ProductionManifestoGenerator(mockOrch);
    const manifesto = await generator.generateStructuredManifesto(sampleDoc, true);

    expect(manifesto.portfolioTitle).toContain('High-Concurrency Multi-Modal RAG Platform');
  });

  it('test_generateStructuredManifesto_withoutGuardrail_flagsRecommendedGuardrails', async () => {
    const generator = new ProductionManifestoGenerator();
    const docNoGuard: WorkspaceDocument = {
      ...sampleDoc,
      nodes: [{ id: 'vllm_node', type: 'VLLM_INFERENCE_ENGINE', position: { x: 0, y: 0 }, data: { label: 'Worker' } }],
    };

    const manifesto = await generator.generateStructuredManifesto(docNoGuard);
    expect(manifesto.architecturalDecisionsMd).toContain('Heuristic gateway screening enabled');
    expect(manifesto.failureModesAndChaosResilienceMd).toContain('Adversarial guardrails recommended');
  });

  it('test_generateStructuredManifesto_withLlmEmptyData_fallsBackToBaseFields', async () => {
    const mockOrch = {
      execute: vi.fn().mockResolvedValue({
        status: 'SUCCESS',
        data: {}, // empty data object
      }),
    } as unknown as LlmOrchestrator;

    const generator = new ProductionManifestoGenerator(mockOrch);
    const manifesto = await generator.generateStructuredManifesto(sampleDoc, true);
    expect(manifesto.portfolioTitle).toContain('High-Concurrency Multi-Modal RAG Platform');
  });

  it('test_getSectionHeaders_returnsStandardFiveSections', () => {
    const generator = new ProductionManifestoGenerator();
    const headers = generator.getSectionHeaders();
    expect(headers.length).toBe(5);
    expect(headers).toContain('Executive Summary & Problem Statement');
  });
});
