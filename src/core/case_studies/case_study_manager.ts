import { InterviewConstants } from '@/core/interview/interview_constants';
import { WorkspaceEdge, WorkspaceNode } from '@/core/state/workspace_types';

export interface CaseStudyBlueprint {
  id: string;
  title: string;
  category: 'RECOMMENDATION' | 'FRAUD_DETECTION' | 'GENAI_RAG';
  description: string;
  targetQps: number;
  targetP99LatencyMs: number;
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
  verificationChecklist: string[];
  failureModes: string[];
}

export interface ValidationResult {
  isComplete: boolean;
  missingComponents: string[];
}

/**
 * Manages reference architecture blueprints, topology templates, and validation criteria for case studies.
 */
export class CaseStudyManager {
  private static readonly _ERR_BLUEPRINT_NOT_FOUND = 'Blueprint not found: ';
  private static readonly _CATEGORY_RECOMMENDATION = 'RECOMMENDATION';
  private static readonly _CATEGORY_FRAUD = 'FRAUD_DETECTION';
  private static readonly _CATEGORY_GENAI = 'GENAI_RAG';

  public constructor() {
    this._blueprints = this._initializeBlueprints();
  }

  /**
   * Returns list of all available production case-study blueprints.
   */
  public getAllBlueprints(): CaseStudyBlueprint[] {
    return Object.values(this._blueprints);
  }

  /**
   * Retrieves specific case-study blueprint by unique identifier.
   */
  public getBlueprint(blueprintId: string): CaseStudyBlueprint | null {
    return this._blueprints[blueprintId] ?? null;
  }

  /**
   * Returns identifiers of all registered case studies.
   */
  public getBlueprintIds(): string[] {
    return Object.keys(this._blueprints);
  }

  /**
   * Validates whether candidate whiteboard topology covers all critical architectural nodes in blueprint.
   */
  public validateBlueprintCompleteness(
    blueprintId: string,
    currentNodes: WorkspaceNode[],
    currentEdges: WorkspaceEdge[]
  ): ValidationResult {
    const blueprint = this.getBlueprint(blueprintId);
    if (!blueprint) {
      return { isComplete: false, missingComponents: [`${CaseStudyManager._ERR_BLUEPRINT_NOT_FOUND}${blueprintId}`] };
    }

    const missingComponents: string[] = [];
    this._checkRequiredNodeTypes(blueprint, currentNodes, missingComponents);
    this._checkEdgeConnectivity(blueprint, currentEdges, missingComponents);

    return {
      isComplete: missingComponents.length === 0,
      missingComponents,
    };
  }

  private readonly _blueprints: Record<string, CaseStudyBlueprint>;

  private _initializeBlueprints(): Record<string, CaseStudyBlueprint> {
    return {
      [InterviewConstants.CASE_STUDY_ECOMMERCE]: this._createEcommerceBlueprint(),
      [InterviewConstants.CASE_STUDY_FRAUD]: this._createFraudBlueprint(),
      [InterviewConstants.CASE_STUDY_GENAI]: this._createGenAiBlueprint(),
    };
  }

  private _createEcommerceBlueprint(): CaseStudyBlueprint {
    return {
      id: InterviewConstants.CASE_STUDY_ECOMMERCE,
      title: 'Real-Time Personalized E-Commerce Ranking',
      category: CaseStudyManager._CATEGORY_RECOMMENDATION,
      description: 'Two-stage recommendation pipeline with real-time streaming feature ingestion and cross-attention ranking.',
      targetQps: 10000,
      targetP99LatencyMs: 40,
      nodes: this._buildEcommerceNodes(),
      edges: this._buildEcommerceEdges(),
      verificationChecklist: [
        'Point-in-time correct feature join between streaming clicks and historical catalog',
        'ANN vector retrieval candidate generator reducing 10M items to 500',
        'Cross-encoder deep ranking layer reducing 500 candidates to 20',
        'Business logic filter ensuring diversity and out-of-stock exclusion',
      ],
      failureModes: [InterviewConstants.FAILURE_TRAIN_SERVE_SKEW],
    };
  }

  private _createFraudBlueprint(): CaseStudyBlueprint {
    return {
      id: InterviewConstants.CASE_STUDY_FRAUD,
      title: 'Real-Time Streaming Financial Fraud Detection',
      category: CaseStudyManager._CATEGORY_FRAUD,
      description: 'Ultra-low-latency card transaction scoring with Apache Kafka, Flink velocity aggregations, and XGBoost.',
      targetQps: 50000,
      targetP99LatencyMs: 20,
      nodes: this._buildFraudNodes(),
      edges: this._buildFraudEdges(),
      verificationChecklist: [
        'Sliding window velocity aggregation over 5m, 1h, and 24h intervals',
        'Feast / Redis low-latency feature lookup with sub-5ms SLA',
        'Quantized gradient boosted decision tree evaluating fraud probability',
        'Dual-path decision router: instant authorize vs review queue',
      ],
      failureModes: [InterviewConstants.FAILURE_DATA_DRIFT],
    };
  }

  private _createGenAiBlueprint(): CaseStudyBlueprint {
    return {
      id: InterviewConstants.CASE_STUDY_GENAI,
      title: 'Enterprise GenAI Hybrid Vector Knowledge Retrieval',
      category: CaseStudyManager._CATEGORY_GENAI,
      description: 'Hybrid sparse-dense RAG pipeline featuring prompt injection defense, cross-encoders, and groundedness grading.',
      targetQps: 2500,
      targetP99LatencyMs: 150,
      nodes: this._buildGenAiNodes(),
      edges: this._buildGenAiEdges(),
      verificationChecklist: [
        'Ingress prompt injection and jailbreak semantic classifier',
        'Hybrid HNSW vector embeddings and BM25 sparse keyword retriever',
        'Cross-encoder reranking context reduction',
        'vLLM high-throughput generation cluster with prompt KV-caching',
      ],
      failureModes: [InterviewConstants.FAILURE_HALLUCINATION_SPIKE],
    };
  }

  private _buildEcommerceNodes(): WorkspaceNode[] {
    return [
      { id: 'node_ingest', type: 'INGRESS_GATEWAY', position: { x: 50, y: 150 }, data: { label: 'Clickstream Gateway' } },
      { id: 'node_feature_store', type: 'FEATURE_STORE', position: { x: 250, y: 100 }, data: { label: 'Redis Online Features' } },
      { id: 'node_retrieval', type: 'VECTOR_DATABASE', position: { x: 450, y: 100 }, data: { label: 'Two-Tower Candidate Gen' } },
      { id: 'node_ranker', type: 'RANKING_MODEL', position: { x: 650, y: 150 }, data: { label: 'Cross-Encoder Deep Ranker' } },
      { id: 'node_guardrail', type: 'SAFETY_GUARDRAIL', position: { x: 850, y: 150 }, data: { label: 'Diversity & Stock Filter' } },
    ];
  }

  private _buildEcommerceEdges(): WorkspaceEdge[] {
    return [
      { id: 'edge_1', source: 'node_ingest', target: 'node_feature_store', protocol: 'KAFKA' },
      { id: 'edge_2', source: 'node_feature_store', target: 'node_retrieval', protocol: 'GRPC' },
      { id: 'edge_3', source: 'node_retrieval', target: 'node_ranker', protocol: 'GRPC' },
      { id: 'edge_4', source: 'node_ranker', target: 'node_guardrail', protocol: 'REST' },
    ];
  }

  private _buildFraudNodes(): WorkspaceNode[] {
    return [
      { id: 'node_card_swipe', type: 'INGRESS_GATEWAY', position: { x: 50, y: 150 }, data: { label: 'Transaction Ingress' } },
      { id: 'node_velocity_store', type: 'FEATURE_STORE', position: { x: 300, y: 150 }, data: { label: 'Feast Velocity Aggregates' } },
      { id: 'node_fraud_model', type: 'RANKING_MODEL', position: { x: 550, y: 150 }, data: { label: 'XGBoost Fraud Classifier' } },
      { id: 'node_decision', type: 'SAFETY_GUARDRAIL', position: { x: 800, y: 150 }, data: { label: 'Fraud Decision Router' } },
    ];
  }

  private _buildFraudEdges(): WorkspaceEdge[] {
    return [
      { id: 'edge_f1', source: 'node_card_swipe', target: 'node_velocity_store', protocol: 'KAFKA' },
      { id: 'edge_f2', source: 'node_velocity_store', target: 'node_fraud_model', protocol: 'GRPC' },
      { id: 'edge_f3', source: 'node_fraud_model', target: 'node_decision', protocol: 'GRPC' },
    ];
  }

  private _buildGenAiNodes(): WorkspaceNode[] {
    return [
      { id: 'node_query_in', type: 'INGRESS_GATEWAY', position: { x: 50, y: 150 }, data: { label: 'User Ingress Gateway' } },
      { id: 'node_guard', type: 'SAFETY_GUARDRAIL', position: { x: 250, y: 150 }, data: { label: 'Prompt Injection Guard' } },
      { id: 'node_vdb', type: 'VECTOR_DATABASE', position: { x: 450, y: 150 }, data: { label: 'Hybrid Qdrant / BM25' } },
      { id: 'node_vllm', type: 'VLLM_INFERENCE_ENGINE', position: { x: 650, y: 150 }, data: { label: 'vLLM Serving Engine' } },
      { id: 'node_hallucination', type: 'AGENT_ORCHESTRATOR', position: { x: 850, y: 150 }, data: { label: 'Groundedness Verifier' } },
    ];
  }

  private _buildGenAiEdges(): WorkspaceEdge[] {
    return [
      { id: 'edge_g1', source: 'node_query_in', target: 'node_guard', protocol: 'REST' },
      { id: 'edge_g2', source: 'node_guard', target: 'node_vdb', protocol: 'GRPC' },
      { id: 'edge_g3', source: 'node_vdb', target: 'node_vllm', protocol: 'GRPC' },
      { id: 'edge_g4', source: 'node_vllm', target: 'node_hallucination', protocol: 'GRPC' },
    ];
  }

  private _checkRequiredNodeTypes(
    blueprint: CaseStudyBlueprint,
    currentNodes: WorkspaceNode[],
    missing: string[]
  ): void {
    const presentTypes = new Set(currentNodes.map((n) => n.type));
    for (const requiredNode of blueprint.nodes) {
      if (!presentTypes.has(requiredNode.type)) {
        missing.push(`Missing architectural component: ${requiredNode.type} (${requiredNode.data.label})`);
      }
    }
  }

  private _checkEdgeConnectivity(
    blueprint: CaseStudyBlueprint,
    currentEdges: WorkspaceEdge[],
    missing: string[]
  ): void {
    if (currentEdges.length < blueprint.edges.length) {
      missing.push(`Insufficient edge connections: found ${currentEdges.length}, expected at least ${blueprint.edges.length}`);
    }
  }
}

