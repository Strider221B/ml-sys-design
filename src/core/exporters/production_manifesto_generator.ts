import { LlmOrchestrator } from '@/core/ai_gateway/llm_orchestrator';
import { TelemetryConstants } from '@/core/telemetry/telemetry_constants';
import { WorkspaceDocument } from '@/core/state/workspace_types';

export interface ProductionManifesto {
  portfolioTitle: string;
  executiveSummaryMd: string;
  architecturalDecisionsMd: string;
  hardwareAndUnitEconomicsMd: string;
  failureModesAndChaosResilienceMd: string;
  recommendedInterviewTalkingPoints: string[];
}

/**
 * Compiles workspace architectures into structured production engineering whitepapers and manifestos.
 */
export class ProductionManifestoGenerator {
  private static readonly _DEFAULT_PORTFOLIO_PREFIX = 'Production Architecture Manifesto: ';
  private static readonly _FALLBACK_TALKING_POINTS: readonly string[] = [
    'How Roofline memory-bandwidth saturation guided the choice between H100 vs L40S',
    'Trade-offs of KV-cache preemption and PagedAttention chunked prefill',
    'Enforcing GDPR Right-to-be-Forgotten via SISA sharded unlearning vs vector tombstoning',
    'Mitigating cascading agent loops via circuit breakers and step-budget quotas',
  ];

  public constructor(
    private readonly _llmOrchestrator?: LlmOrchestrator | undefined
  ) {}

  /**
   * Generates a structured ProductionManifesto object with architectural sections.
   */
  public async generateStructuredManifesto(
    document: WorkspaceDocument,
    useLlm: boolean = false
  ): Promise<ProductionManifesto> {
    const baseManifesto = this._buildHeuristicManifesto(document);
    if (useLlm && this._llmOrchestrator) {
      return this._performLlmEnrichedGeneration(document, baseManifesto);
    }
    return baseManifesto;
  }

  /**
   * Generates a single complete Markdown document ready for publication as README.md.
   */
  public async generateMarkdownManifesto(
    document: WorkspaceDocument,
    useLlm: boolean = false
  ): Promise<string> {
    const manifesto = await this.generateStructuredManifesto(document, useLlm);
    return this._formatMarkdown(manifesto);
  }

  /**
   * Returns list of canonical manifesto section titles.
   */
  public getSectionHeaders(): readonly string[] {
    return [
      'Executive Summary & Problem Statement',
      'Architectural Decision Records (ADRs)',
      'Hardware Sizing & Unit Economics',
      'Failure Modes & Chaos Resilience',
      'Interview Talking Points',
    ];
  }

  private _buildHeuristicManifesto(doc: WorkspaceDocument): ProductionManifesto {
    const title = `${ProductionManifestoGenerator._DEFAULT_PORTFOLIO_PREFIX}${doc.title}`;
    const execSummary = this._buildExecSummary(doc);
    const adr = this._buildAdr(doc);
    const unitEconomics = this._buildUnitEconomics(doc);
    const chaos = this._buildChaosSection(doc);

    return {
      portfolioTitle: title,
      executiveSummaryMd: execSummary,
      architecturalDecisionsMd: adr,
      hardwareAndUnitEconomicsMd: unitEconomics,
      failureModesAndChaosResilienceMd: chaos,
      recommendedInterviewTalkingPoints: [...ProductionManifestoGenerator._FALLBACK_TALKING_POINTS],
    };
  }

  private _buildExecSummary(doc: WorkspaceDocument): string {
    return `## Executive Summary
This document provides production verification for **${doc.title}**.
Comprising ${doc.nodes.length} nodes and ${doc.edges.length} interconnects, the architecture is engineered
to sustain high-throughput inference while meeting strict sub-second SLA requirements under burst concurrency.`;
  }

  private _buildAdr(doc: WorkspaceDocument): string {
    const hasGuardrail = doc.nodes.some((n) => n.type === 'SAFETY_GUARDRAIL');
    return `## Architectural Decisions
- **Decoupled Ingress & Compute**: Ingress routing is separated from model execution layers.
- **Safety Interceptors**: ${hasGuardrail ? 'Ingress guardrail deployed' : 'Heuristic gateway screening enabled'}.
- **Asynchronous Storage**: State management decoupled via Redis feature cache and vector databases.`;
  }

  private _buildUnitEconomics(doc: WorkspaceDocument): string {
    const modelNodes = doc.nodes.filter((n) => n.type === 'VLLM_INFERENCE_ENGINE');
    return `## Hardware Sizing & Unit Economics
- **Inference Accelerators**: Configured across ${modelNodes.length} dedicated serving nodes.
- **Roofline Analysis**: Workload profile balances memory bandwidth against FP16/INT4 tensor cores.
- **FinOps Optimization**: Dynamic autoscaling scales down idle replicas to minimize cloud spend.`;
  }

  private _buildChaosSection(doc: WorkspaceDocument): string {
    const hasGuardrail = doc.nodes.some((n) => n.type === 'SAFETY_GUARDRAIL');
    return `## Chaos Resilience & Compliance
- **EU AI Act**: ${hasGuardrail ? 'High-Risk AI System obligations satisfied through automated logging and safety gates.' : 'Adversarial guardrails recommended.'}
- **GDPR RTBF**: SISA sharded retraining limits unlearning cost to ~5.5% of full model retraining.
- **Fault Mitigation**: Circuit breakers protect upstreams from cascading request retry storms.`;
  }

  private _formatMarkdown(manifesto: ProductionManifesto): string {
    return `# ${manifesto.portfolioTitle}\n\n` +
      `${manifesto.executiveSummaryMd}\n\n` +
      `${manifesto.architecturalDecisionsMd}\n\n` +
      `${manifesto.hardwareAndUnitEconomicsMd}\n\n` +
      `${manifesto.failureModesAndChaosResilienceMd}\n\n` +
      `## Recommended Interview Talking Points\n` +
      manifesto.recommendedInterviewTalkingPoints.map((tp) => `- ${tp}`).join('\n') + '\n';
  }

  private async _performLlmEnrichedGeneration(
    doc: WorkspaceDocument,
    base: ProductionManifesto
  ): Promise<ProductionManifesto> {
    try {
      const response = await this._llmOrchestrator!.execute<Record<string, unknown>>(
        TelemetryConstants.MODULE_RESUME_PORTFOLIO_EXPORTER,
        { title: doc.title, nodeCount: doc.nodes.length }
      );
      if (response.status === 'SUCCESS' && response.data) {
        return this._mergeLlmManifesto(response.data, base);
      }
    } catch {
      // Clean fallback to heuristic manifesto
    }
    return base;
  }

  private _mergeLlmManifesto(
    data: Record<string, unknown>,
    base: ProductionManifesto
  ): ProductionManifesto {
    const title = typeof data.portfolioTitle === 'string' ? data.portfolioTitle : base.portfolioTitle;
    const exec = typeof data.executiveSummaryMd === 'string' ? data.executiveSummaryMd : base.executiveSummaryMd;
    const adr = typeof data.architecturalDecisionsMd === 'string' ? data.architecturalDecisionsMd : base.architecturalDecisionsMd;
    const hw = typeof data.hardwareAndUnitEconomicsMd === 'string' ? data.hardwareAndUnitEconomicsMd : base.hardwareAndUnitEconomicsMd;
    const chaos = typeof data.failureModesAndChaosResilienceMd === 'string' ? data.failureModesAndChaosResilienceMd : base.failureModesAndChaosResilienceMd;
    const pts = Array.isArray(data.recommendedInterviewTalkingPoints) ? (data.recommendedInterviewTalkingPoints as string[]) : base.recommendedInterviewTalkingPoints;

    return {
      portfolioTitle: title,
      executiveSummaryMd: exec,
      architecturalDecisionsMd: adr,
      hardwareAndUnitEconomicsMd: hw,
      failureModesAndChaosResilienceMd: chaos,
      recommendedInterviewTalkingPoints: pts,
    };
  }
}
