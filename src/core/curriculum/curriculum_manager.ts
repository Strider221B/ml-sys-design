import { ScenarioConstants } from '@/core/scenarios/scenario_constants';

export interface CurriculumLesson {
  lessonId: string;
  moduleId: string;
  title: string;
  description: string;
  recommendedScenarioId: string;
  keyOutcomes: string[];
}

export interface DataScienceTransformation {
  legacySkill: string;
  modernSkill2026: string;
  industryImpact: string;
}

export interface CurriculumModule {
  moduleId: string;
  title: string;
  summary: string;
  prerequisites: string[];
  awardedBadge: string;
  lessons: CurriculumLesson[];
}

/**
 * Manages the 2026 Core Curriculum Matrix, module prerequisites, and architectural learning outcomes.
 */
export class CurriculumManager {
  private static readonly _EMPTY_LIST: string[] = [];
  private static readonly _MAX_PCT = 100;
  private static readonly _ZERO_PCT = 0;

  private static readonly _MODULE_1_SUMMARY =
    'Real-time feature stores, streaming aggregation, Kafka sharding, and point-in-time correctness.';
  private static readonly _MODULE_2_SUMMARY =
    'Hybrid vector search, speculative decoding, vLLM routing, prompt caching, and multi-agent graphs.';
  private static readonly _MODULE_3_SUMMARY =
    'Online A/B experimentation, CUPED variance reduction, GPU unit economics, and millisecond fraud detection.';

  public constructor() {}

  /**
   * Returns all 3 core curriculum learning modules.
   */
  public getAllModules(): CurriculumModule[] {
    return [
      this._buildModule1(),
      this._buildModule2(),
      this._buildModule3(),
    ];
  }

  /**
   * Retrieves a specific curriculum module by module identifier.
   */
  public getModule(moduleId: string): CurriculumModule | undefined {
    return this.getAllModules().find((m) => m.moduleId === moduleId);
  }

  /**
   * Returns all lessons associated with a given module.
   */
  public getLessons(moduleId: string): CurriculumLesson[] {
    const mod = this.getModule(moduleId);
    return mod ? mod.lessons : [];
  }

  /**
   * Retrieves a specific lesson by lesson identifier across all modules.
   */
  public getLesson(lessonId: string): CurriculumLesson | undefined {
    for (const mod of this.getAllModules()) {
      const match = mod.lessons.find((l) => l.lessonId === lessonId);
      if (match) return match;
    }
    return undefined;
  }

  /**
   * Returns high-value 2026 data science transformation mappings replacing deprecated workflows.
   */
  public getTransformations(): DataScienceTransformation[] {
    return [
      ...this._getTransformationsPart1(),
      ...this._getTransformationsPart2(),
    ];
  }

  /**
   * Returns prerequisites required before beginning a given module.
   */
  public getPrerequisites(moduleId: string): string[] {
    const mod = this.getModule(moduleId);
    return mod ? mod.prerequisites : CurriculumManager._EMPTY_LIST;
  }

  /**
   * Calculates overall curriculum completion percentage across all reference scenarios.
   */
  public calculateProgress(completedScenarioIds: string[]): number {
    const allScenarios = this._collectUniqueScenarioIds();
    if (allScenarios.length === 0) return CurriculumManager._ZERO_PCT;
    const completedCount = allScenarios.filter((id) => completedScenarioIds.includes(id)).length;
    return Math.round((completedCount / allScenarios.length) * CurriculumManager._MAX_PCT);
  }

  /**
   * Determines next recommended incomplete lesson based on student progress.
   */
  public getNextRecommendedLesson(completedScenarioIds: string[]): CurriculumLesson | null {
    for (const mod of this.getAllModules()) {
      for (const lesson of mod.lessons) {
        if (!completedScenarioIds.includes(lesson.recommendedScenarioId)) {
          return lesson;
        }
      }
    }
    return null;
  }

  private _collectUniqueScenarioIds(): string[] {
    const set = new Set<string>();
    for (const mod of this.getAllModules()) {
      for (const l of mod.lessons) {
        set.add(l.recommendedScenarioId);
      }
    }
    return Array.from(set);
  }

  private _getTransformationsPart1(): DataScienceTransformation[] {
    return [
      {
        legacySkill: 'Hyperparameter GridSearch / Optuna',
        modernSkill2026: 'Mathematical Reward Function Optimization',
        industryImpact: "Formulates multi-objective loss functions that prevent Goodhart's Law reward hacking.",
      },
      {
        legacySkill: 'Manual Feature Selection (PCA, Scikit)',
        modernSkill2026: 'Data Ingestion Alignment & Contamination Auditing',
        industryImpact: 'Employs MinHash LSH and Shannon entropy to purge synthetic collapse artifacts.',
      },
    ];
  }

  private _getTransformationsPart2(): DataScienceTransformation[] {
    return [
      {
        legacySkill: 'Simple Correlation A/B Testing',
        modernSkill2026: 'Causal Inference & CUPED Experimental Systems',
        industryImpact: 'Eliminates confounding bias via Causal DAGs and reduces experiment variance by >50%.',
      },
      {
        legacySkill: 'Manual Model Weight Fitting',
        modernSkill2026: 'Prompt & Context Pattern Mining',
        industryImpact: 'Optimizes KV caches and dynamic contextual prompts for multi-tenant foundation models.',
      },
    ];
  }

  private _buildModule1(): CurriculumModule {
    return {
      moduleId: ScenarioConstants.MODULE_1_MLOPS,
      title: ScenarioConstants.MODULE_1_TITLE,
      summary: CurriculumManager._MODULE_1_SUMMARY,
      prerequisites: [],
      awardedBadge: ScenarioConstants.BADGE_MLOPS_PIONEER,
      lessons: [
        this._buildLessonM1L1(),
        this._buildLessonM1L2(),
        this._buildLessonM1L3(),
      ],
    };
  }

  private _buildLessonM1L1(): CurriculumLesson {
    return {
      lessonId: 'm1_l1_feature_stores',
      moduleId: ScenarioConstants.MODULE_1_MLOPS,
      title: 'Low-Latency Online Feature Stores vs. Batch Lakes',
      description: 'Architecting sub-5ms online Redis/Aerospike feature retrieval with point-in-time correctness.',
      recommendedScenarioId: ScenarioConstants.BLUEPRINT_ECOM_ID,
      keyOutcomes: ['Redis cluster partitioning', 'Point-in-time join accuracy', 'Zero training-serving skew'],
    };
  }

  private _buildLessonM1L2(): CurriculumLesson {
    return {
      lessonId: 'm1_l2_streaming_aggregation',
      moduleId: ScenarioConstants.MODULE_1_MLOPS,
      title: 'Streaming Window Aggregations with Kafka and Flink',
      description: 'Tumbling and sliding event-time aggregations for dynamic clickstream sessionization.',
      recommendedScenarioId: ScenarioConstants.BLUEPRINT_ECOM_ID,
      keyOutcomes: ['Kafka partition key balancing', 'Flink out-of-order event handling', 'Watermark alignment'],
    };
  }

  private _buildLessonM1L3(): CurriculumLesson {
    return {
      lessonId: 'm1_l3_two_tower_retrieval',
      moduleId: ScenarioConstants.MODULE_1_MLOPS,
      title: 'Distributed Two-Tower Retrieval and Cross-Encoders',
      description: 'Scaling candidate generation to 10M+ catalog items under 65ms p99 latency constraints.',
      recommendedScenarioId: ScenarioConstants.BLUEPRINT_ECOM_ID,
      keyOutcomes: ['Annoy/HNSW candidate retrieval', 'Transformer ranker GPU sizing', 'Diversity reranking'],
    };
  }

  private _buildModule2(): CurriculumModule {
    return {
      moduleId: ScenarioConstants.MODULE_2_GENAI,
      title: ScenarioConstants.MODULE_2_TITLE,
      summary: CurriculumManager._MODULE_2_SUMMARY,
      prerequisites: [ScenarioConstants.MODULE_1_MLOPS],
      awardedBadge: ScenarioConstants.BADGE_GENAI_ARCHITECT,
      lessons: [
        this._buildLessonM2L1(),
        this._buildLessonM2L2(),
        this._buildLessonM2L3(),
      ],
    };
  }

  private _buildLessonM2L1(): CurriculumLesson {
    return {
      lessonId: 'm2_l1_hybrid_search',
      moduleId: ScenarioConstants.MODULE_2_GENAI,
      title: 'Hybrid Vector Infrastructure (HNSW + BM25 + RRF)',
      description: 'Combining dense embeddings with sparse lexical index using Reciprocal Rank Fusion.',
      recommendedScenarioId: ScenarioConstants.BLUEPRINT_ENTERPRISE_RAG_ID,
      keyOutcomes: ['Reciprocal Rank Fusion k=60', 'Cross-encoder top-k reranking', 'Hybrid recall boost'],
    };
  }

  private _buildLessonM2L2(): CurriculumLesson {
    return {
      lessonId: 'm2_l2_speculative_decoding',
      moduleId: ScenarioConstants.MODULE_2_GENAI,
      title: 'LLM Serving: Speculative Decoding & Prompt Caching',
      description: 'Serving multi-tenant LLM queries with draft models and radixed prompt cache hit rates.',
      recommendedScenarioId: ScenarioConstants.BLUEPRINT_ENTERPRISE_RAG_ID,
      keyOutcomes: ['Draft vs target model verification', 'Prefix cache eviction management', 'TTFT reduction'],
    };
  }

  private _buildLessonM2L3(): CurriculumLesson {
    return {
      lessonId: 'm2_l3_agent_graphs',
      moduleId: ScenarioConstants.MODULE_2_GENAI,
      title: 'Stateful Multi-Agent Graphs & Cascading Loop Breakers',
      description: 'Orchestrating autonomous agents with cycle limits and semantic groundedness guardrails.',
      recommendedScenarioId: ScenarioConstants.BLUEPRINT_ENTERPRISE_RAG_ID,
      keyOutcomes: ['Loop breaker circuit breaker', 'Hallucination threshold tuning', 'Deterministic fallback'],
    };
  }

  private _buildModule3(): CurriculumModule {
    return {
      moduleId: ScenarioConstants.MODULE_3_PRODUCTION_METRICS,
      title: ScenarioConstants.MODULE_3_TITLE,
      summary: CurriculumManager._MODULE_3_SUMMARY,
      prerequisites: [ScenarioConstants.MODULE_2_GENAI],
      awardedBadge: ScenarioConstants.BADGE_METRICS_GUARDIAN,
      lessons: [
        this._buildLessonM3L1(),
        this._buildLessonM3L2(),
        this._buildLessonM3L3(),
      ],
    };
  }

  private _buildLessonM3L1(): CurriculumLesson {
    return {
      lessonId: 'm3_l1_causal_cuped',
      moduleId: ScenarioConstants.MODULE_3_PRODUCTION_METRICS,
      title: 'Online Experimentation: Multi-Armed Bandits & CUPED',
      description: 'Controlling false discovery rates and reducing metric variance with pre-experiment covariates.',
      recommendedScenarioId: ScenarioConstants.BLUEPRINT_STREAMING_FRAUD_ID,
      keyOutcomes: ['CUPED theta estimation', 'Covariance adjustment', 'Sample size reduction >40%'],
    };
  }

  private _buildLessonM3L2(): CurriculumLesson {
    return {
      lessonId: 'm3_l2_finops_rooflines',
      moduleId: ScenarioConstants.MODULE_3_PRODUCTION_METRICS,
      title: 'Hardware Rooflines & GPU/TPU Unit Economics',
      description: 'Calculating arithmetic intensity and sizing cluster topologies within cost ceilings.',
      recommendedScenarioId: ScenarioConstants.BLUEPRINT_STREAMING_FRAUD_ID,
      keyOutcomes: ['Memory bandwidth vs compute bounds', 'H100 vs H200 TCO calculation', 'QPS per dollar ROI'],
    };
  }

  private _buildLessonM3L3(): CurriculumLesson {
    return {
      lessonId: 'm3_l3_sub20ms_fraud',
      moduleId: ScenarioConstants.MODULE_3_PRODUCTION_METRICS,
      title: 'Statistical Drift (PSI) & Real-Time Fraud Inference',
      description: 'Detecting population stability index shifts and scoring transactions in under 20ms.',
      recommendedScenarioId: ScenarioConstants.BLUEPRINT_STREAMING_FRAUD_ID,
      keyOutcomes: ['PSI drift alerts >0.25', 'Sliding window velocity checks', 'Sub-20ms p99 SLA adherence'],
    };
  }
}
