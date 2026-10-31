import { CanvasConstants } from '@/components/canvas/canvas_constants';
import { WorkspaceEdge, WorkspaceNode } from '@/core/state/workspace_types';

export interface ArchitectureTemplate {
  id: string;
  name: string;
  description: string;
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
}

/**
 * Factory and catalog providing pre-configured ML system architecture blueprints.
 */
export class TemplateCatalog {
  private static readonly _DESC_MULTI_AGENT =
    'Hierarchical multi-agent supervisor network with consensus verifier and circuit breaker.';
  private static readonly _DESC_HYBRID_RAG =
    'Enterprise dual-retrieval RAG pipeline combining sparse BM25 and dense vector indexing.';
  private static readonly _DESC_GUARDRAIL =
    'Dual-tier safety classification pipeline with prompt injection defense and model routing.';

  private static readonly _NAME_MULTI_AGENT = 'Multi-Agent Orchestration Network';
  private static readonly _NAME_HYBRID_RAG = 'Enterprise Hybrid Search RAG';
  private static readonly _NAME_GUARDRAIL = 'LLM Guardrail & Safety Routing';

  public constructor() {}

  /**
   * Retrieves specific architecture template by unique identifier.
   */
  public getTemplate(templateId: string): ArchitectureTemplate | null {
    switch (templateId) {
      case CanvasConstants.TEMPLATE_MULTI_AGENT:
        return this._buildMultiAgentTemplate();
      case CanvasConstants.TEMPLATE_HYBRID_RAG:
        return this._buildHybridRagTemplate();
      case CanvasConstants.TEMPLATE_GUARDRAIL_ROUTING:
        return this._buildGuardrailTemplate();
      default:
        return null;
    }
  }

  /**
   * Returns list of all available pre-configured blueprints.
   */
  public getAllTemplates(): ArchitectureTemplate[] {
    return [
      this._buildMultiAgentTemplate(),
      this._buildHybridRagTemplate(),
      this._buildGuardrailTemplate(),
    ];
  }

  /**
   * Returns list of unique template identifiers.
   */
  public getTemplateIds(): string[] {
    return [
      CanvasConstants.TEMPLATE_MULTI_AGENT,
      CanvasConstants.TEMPLATE_HYBRID_RAG,
      CanvasConstants.TEMPLATE_GUARDRAIL_ROUTING,
    ];
  }

  private _buildMultiAgentTemplate(): ArchitectureTemplate {
    return {
      id: CanvasConstants.TEMPLATE_MULTI_AGENT,
      name: TemplateCatalog._NAME_MULTI_AGENT,
      description: TemplateCatalog._DESC_MULTI_AGENT,
      nodes: this._createMultiAgentNodes(),
      edges: this._createMultiAgentEdges(),
    };
  }

  private _createMultiAgentNodes(): WorkspaceNode[] {
    const supervisor: WorkspaceNode = {
      id: 'agent_supervisor',
      type: 'AGENT_ORCHESTRATOR',
      position: { x: 300, y: 100 },
      data: {
        label: 'Agent Supervisor Router',
        concurrencyLimit: 20,
        customConfig: { maxCycles: 5, consensusThreshold: 0.9 },
      },
    };
    const workers = this._createAgentWorkers();
    return [supervisor, ...workers];
  }

  private _createAgentWorkers(): WorkspaceNode[] {
    return [
      {
        id: 'agent_coder',
        type: 'AGENT_ORCHESTRATOR',
        position: { x: 100, y: 300 },
        data: { label: 'Code Generator Agent', batchSize: 4 },
      },
      {
        id: 'agent_qa',
        type: 'AGENT_ORCHESTRATOR',
        position: { x: 300, y: 300 },
        data: { label: 'QA Validator Agent', batchSize: 4 },
      },
      {
        id: 'agent_guardrail',
        type: 'SAFETY_GUARDRAIL',
        position: { x: 500, y: 300 },
        data: { label: 'Safety Guardrail Validator' },
      },
    ];
  }

  private _createMultiAgentEdges(): WorkspaceEdge[] {
    return [
      { id: 'e1', source: 'agent_supervisor', target: 'agent_coder', protocol: 'GRPC' },
      { id: 'e2', source: 'agent_supervisor', target: 'agent_qa', protocol: 'GRPC' },
      { id: 'e3', source: 'agent_supervisor', target: 'agent_guardrail', protocol: 'GRPC' },
    ];
  }

  private _buildHybridRagTemplate(): ArchitectureTemplate {
    return {
      id: CanvasConstants.TEMPLATE_HYBRID_RAG,
      name: TemplateCatalog._NAME_HYBRID_RAG,
      description: TemplateCatalog._DESC_HYBRID_RAG,
      nodes: this._createHybridRagNodes(),
      edges: this._createHybridRagEdges(),
    };
  }

  private _createHybridRagNodes(): WorkspaceNode[] {
    const ingress: WorkspaceNode = {
      id: 'rag_ingress',
      type: 'INGRESS_GATEWAY',
      position: { x: 100, y: 150 },
      data: { label: 'Query Ingress Gateway', trafficSharePct: 100 },
    };
    const storageNodes = this._createHybridRagStorageNodes();
    return [ingress, ...storageNodes];
  }

  private _createHybridRagStorageNodes(): WorkspaceNode[] {
    return [
      {
        id: 'rag_sparse_store',
        type: 'FEATURE_STORE',
        position: { x: 350, y: 50 },
        data: { label: 'Sparse BM25 Index (Elastic)' },
      },
      {
        id: 'rag_dense_vector',
        type: 'VECTOR_DATABASE',
        position: { x: 350, y: 250 },
        data: { label: 'Dense Vector DB (HNSW)' },
      },
      {
        id: 'rag_vllm_worker',
        type: 'VLLM_INFERENCE_ENGINE',
        position: { x: 650, y: 150 },
        data: { label: 'vLLM Serving Cluster', hardwareProfile: 'NVIDIA_H100_SXM5' },
      },
    ];
  }

  private _createHybridRagEdges(): WorkspaceEdge[] {
    return [
      { id: 'e_rag_1', source: 'rag_ingress', target: 'rag_sparse_store', protocol: 'REST' },
      { id: 'e_rag_2', source: 'rag_ingress', target: 'rag_dense_vector', protocol: 'GRPC' },
      { id: 'e_rag_3', source: 'rag_dense_vector', target: 'rag_vllm_worker', protocol: 'GRPC' },
    ];
  }

  private _buildGuardrailTemplate(): ArchitectureTemplate {
    return {
      id: CanvasConstants.TEMPLATE_GUARDRAIL_ROUTING,
      name: TemplateCatalog._NAME_GUARDRAIL,
      description: TemplateCatalog._DESC_GUARDRAIL,
      nodes: this._createGuardrailNodes(),
      edges: this._createGuardrailEdges(),
    };
  }

  private _createGuardrailNodes(): WorkspaceNode[] {
    return [
      {
        id: 'guard_ingress',
        type: 'INGRESS_GATEWAY',
        position: { x: 100, y: 200 },
        data: { label: 'API Ingress Gateway' },
      },
      {
        id: 'guard_classifier',
        type: 'SAFETY_GUARDRAIL',
        position: { x: 380, y: 200 },
        data: { label: 'Llama-Guard-3 Classifier' },
      },
      {
        id: 'guard_vllm_serving',
        type: 'VLLM_INFERENCE_ENGINE',
        position: { x: 680, y: 200 },
        data: { label: 'Target Model Worker' },
      },
    ];
  }

  private _createGuardrailEdges(): WorkspaceEdge[] {
    return [
      { id: 'e_g1', source: 'guard_ingress', target: 'guard_classifier', protocol: 'GRPC' },
      { id: 'e_g2', source: 'guard_classifier', target: 'guard_vllm_serving', protocol: 'GRPC' },
    ];
  }
}
