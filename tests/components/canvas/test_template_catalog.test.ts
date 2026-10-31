import { describe, expect, it } from 'vitest';
import { TemplateCatalog } from '@/components/canvas/template_catalog';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

describe('TemplateCatalog', () => {
  const catalog = new TemplateCatalog();

  it('test_getAllTemplates_returnsAllThreeBlueprints', () => {
    const templates = catalog.getAllTemplates();
    expect(templates.length).toBe(3);
    const ids = templates.map((t) => t.id);
    expect(ids).toContain(CanvasConstants.TEMPLATE_MULTI_AGENT);
    expect(ids).toContain(CanvasConstants.TEMPLATE_HYBRID_RAG);
    expect(ids).toContain(CanvasConstants.TEMPLATE_GUARDRAIL_ROUTING);
  });

  it('test_getTemplateIds_returnsMatchingIdentifiers', () => {
    const ids = catalog.getTemplateIds();
    expect(ids).toEqual([
      CanvasConstants.TEMPLATE_MULTI_AGENT,
      CanvasConstants.TEMPLATE_HYBRID_RAG,
      CanvasConstants.TEMPLATE_GUARDRAIL_ROUTING,
    ]);
  });

  it('test_getTemplate_multiAgent_returnsConfiguredGraph', () => {
    const template = catalog.getTemplate(CanvasConstants.TEMPLATE_MULTI_AGENT);
    expect(template).not.toBeNull();
    expect(template?.name).toBe('Multi-Agent Orchestration Network');
    expect(template?.nodes.length).toBe(4);
    expect(template?.edges.length).toBe(3);

    const supervisor = template?.nodes.find((n) => n.id === 'agent_supervisor');
    expect(supervisor?.type).toBe('AGENT_ORCHESTRATOR');
  });

  it('test_getTemplate_hybridRag_returnsConfiguredGraph', () => {
    const template = catalog.getTemplate(CanvasConstants.TEMPLATE_HYBRID_RAG);
    expect(template).not.toBeNull();
    expect(template?.name).toBe('Enterprise Hybrid Search RAG');
    expect(template?.nodes.length).toBe(4);
    expect(template?.edges.length).toBe(3);

    const ingress = template?.nodes.find((n) => n.id === 'rag_ingress');
    expect(ingress?.type).toBe('INGRESS_GATEWAY');
  });

  it('test_getTemplate_guardrail_returnsConfiguredGraph', () => {
    const template = catalog.getTemplate(CanvasConstants.TEMPLATE_GUARDRAIL_ROUTING);
    expect(template).not.toBeNull();
    expect(template?.name).toBe('LLM Guardrail & Safety Routing');
    expect(template?.nodes.length).toBe(3);
    expect(template?.edges.length).toBe(2);
  });

  it('test_getTemplate_whenUnknownId_returnsNull', () => {
    const template = catalog.getTemplate('NON_EXISTENT_TEMPLATE');
    expect(template).toBeNull();
  });
});

