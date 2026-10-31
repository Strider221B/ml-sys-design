import { z } from 'zod';
import { SupportedModuleId } from '@/schemas/exchange_envelope_schema';

export interface ModuleSchemaMap {
  [key: string]: z.ZodTypeAny;
}

/**
 * Encapsulates schema definitions and retrieval for all 13 platform modules.
 */
export class ModuleExchangeSchemas {
  private static readonly _ERR_UNSUPPORTED_PREFIX = 'Unsupported module ID: ';

  private static readonly _SANDBOX_BUILDER_SCHEMA = z.object({
    overallHealthScore: z.number().min(0).max(100),
    identifiedBottlenecks: z.array(
      z.object({
        nodeId: z.string(),
        severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        category: z.enum(['LATENCY', 'MEMORY_VRAM', 'NETWORK_BANDWIDTH', 'COST', 'RELIABILITY']),
        description: z.string(),
        suggestedFix: z.string(),
      })
    ),
    suggestedOptimizations: z.array(
      z.object({
        componentSwap: z.string(),
        estimatedLatencyDeltaMs: z.number(),
        estimatedCostDeltaUSD: z.number(),
        rationale: z.string(),
      })
    ),
    tradeOffAssessment: z.string(),
  });

  private static readonly _CASE_STUDY_LIBRARY_SCHEMA = z.object({
    resolutionStatus: z.enum(['RESOLVED', 'PARTIALLY_RESOLVED', 'FAILED']),
    rubricScore: z.number().min(0).max(100),
    rootCauseDiagnosis: z.string(),
    architecturalStrengths: z.array(z.string()),
    unmitigatedRisks: z.array(z.string()),
    industryBestPracticeComparison: z.string(),
  });

  private static readonly _AI_INTERVIEW_SIMULATOR_SCHEMA = z.object({
    stepNumber: z.number().int().min(1).max(6),
    stepCompleted: z.boolean(),
    stepScore: z.number().min(0).max(100),
    interviewerSpeech: z.string(),
    feedback: z.object({
      strengths: z.array(z.string()),
      missingConsiderations: z.array(z.string()),
      bottlenecksIdentified: z.array(z.string()),
    }),
    dimensionScores: z.object({
      scaleAwareness: z.number().min(1).max(5),
      componentSelection: z.number().min(1).max(5),
      failureHandling: z.number().min(1).max(5),
      businessAlignment: z.number().min(1).max(5),
    }),
    suggestedNextQuestions: z.array(z.string()),
  });

  private static readonly _CHAOS_ADVERSARIAL_PLAYGROUND_SCHEMA = z.object({
    exploitSucceeded: z.boolean(),
    systemFailureMode: z.enum([
      'INFINITE_AGENT_LOOP',
      'OUT_OF_MEMORY_CRASH',
      'CONTEXT_WINDOW_OVERFLOW',
      'SILENT_DATA_CORRUPTION',
      'RESILIENT_SURVIVAL',
    ]),
    blastRadiusScore: z.number().min(0).max(100),
    executionTrace: z.array(z.string()),
    circuitBreakerTriggered: z.boolean(),
    remediationRecommendations: z.array(z.string()),
  });

  private static readonly _FINOPS_CALCULATOR_SCHEMA = z.object({
    budgetViable: z.boolean(),
    projectedMonthlySpendUSD: z.number(),
    budgetVariancePercentage: z.number(),
    primaryBottleneck: z.enum([
      'MEMORY_BANDWIDTH_BOUND',
      'COMPUTE_FLOPS_BOUND',
      'NETWORK_INTERCONNECT_BOUND',
      'VRAM_CAPACITY_BOUND',
    ]),
    hardwareTradeOffAnalysis: z.string(),
    costReductionPlays: z.array(
      z.object({
        tactic: z.string(),
        projectedSavingsUSD: z.number(),
        latencyImpactMs: z.number(),
      })
    ),
  });

  private static readonly _DATA_ALIGNMENT_ENGINE_SCHEMA = z.object({
    datasetQualityScore: z.number().min(0).max(100),
    detectedBiases: z.array(
      z.object({
        biasCategory: z.string(),
        affectedProportion: z.number(),
        exampleSnippet: z.string(),
      })
    ),
    diversityEntropyScore: z.number().min(0).max(1),
    hitlGateEfficiency: z.string(),
    recommendedFilteringRules: z.array(z.string()),
  });

  private static readonly _CHAOS_MONKEY_ARGON_SCHEMA = z.object({
    adversarialCritique: z.string(),
    targetedVulnerability: z.string(),
    killerWorkloadPacket: z.object({
      trafficPattern: z.enum([
        'POISSON_BURST',
        'SKEWED_HASH_KEY_COLLISION',
        'LONG_CONTEXT_PROMPT_BOMB',
        'CONCURRENT_CACHE_EVICTION',
      ]),
      burstQPS: z.number(),
      adversarialPayloadDescription: z.string(),
      samplePayloadSnippet: z.string(),
    }),
    predictedSystemFailure: z.string(),
  });

  private static readonly _TELEMETRY_LOG_GAME_SCHEMA = z.object({
    diagnosisCorrect: z.boolean(),
    actualFailureRootCause: z.string(),
    userScore: z.number().min(0).max(100),
    technicalExplanation: z.string(),
    postMortemActionItems: z.array(z.string()),
  });

  private static readonly _REGULATORY_COMPLIANCE_SIM_SCHEMA = z.object({
    euAiActComplianceStatus: z.enum(['COMPLIANT', 'HIGH_RISK_NON_COMPLIANT', 'PROHIBITED']),
    gdprRtbfScore: z.number().min(0).max(100),
    unlearningLeakageRisks: z.array(z.string()),
    guardrailPenetrationTest: z.object({
      bypassAttemptSnippet: z.string(),
      blockedByGuardrail: z.boolean(),
      vulnerabilityNotes: z.string(),
    }),
    complianceChecklist: z.array(
      z.object({
        regulation: z.string(),
        requirement: z.string(),
        status: z.enum(['PASS', 'FAIL', 'NEEDS_REVIEW']),
      })
    ),
  });

  private static readonly _RESUME_PORTFOLIO_EXPORTER_SCHEMA = z.object({
    portfolioTitle: z.string(),
    executiveSummaryMd: z.string(),
    architecturalDecisionsMd: z.string(),
    hardwareAndUnitEconomicsMd: z.string(),
    failureModesAndChaosResilienceMd: z.string(),
    recommendedInterviewTalkingPoints: z.array(z.string()),
  });

  private static readonly _MATH_REWARD_WORKSPACE_SCHEMA = z.object({
    rewardHackingDetected: z.boolean(),
    hackingSeverity: z.enum(['NONE', 'SUBTLE', 'SEVERE', 'CATASTROPHIC']),
    degenerateAgentStrategy: z.string(),
    mathematicalFlawDiagnosis: z.string(),
    suggestedConstraintReformulation: z.string(),
  });

  private static readonly _DATA_ARCHAEOLOGY_SUITE_SCHEMA = z.object({
    decontaminationRecall: z.number().min(0).max(1),
    falsePositiveRate: z.number().min(0).max(1),
    retainedDatasetEntropy: z.number(),
    missedContaminatedSamples: z.array(z.string()),
    methodologyCritique: z.string(),
  });

  private static readonly _CAUSAL_INFERENCE_LAB_SCHEMA = z.object({
    dagValid: z.boolean(),
    backdoorConditionSatisfied: z.boolean(),
    unblockedConfoundingPaths: z.array(z.string()),
    cupedVarianceReductionPercent: z.number(),
    causalInterpretation: z.string(),
  });

  public constructor() {}

  /**
   * Retrieves the Zod schema for a designated module ID.
   */
  public getSchemaForModule(moduleId: string): z.ZodTypeAny {
    const schema = this._getSchemaMap()[moduleId];
    if (!schema) {
      throw new Error(`${ModuleExchangeSchemas._ERR_UNSUPPORTED_PREFIX}${moduleId}`);
    }
    return schema;
  }

  /**
   * Checks whether a module schema exists.
   */
  public hasSchema(moduleId: string): boolean {
    return moduleId in this._getSchemaMap();
  }

  /**
   * Returns list of all supported module IDs.
   */
  public getSupportedModuleIds(): SupportedModuleId[] {
    return Object.keys(this._getSchemaMap()) as SupportedModuleId[];
  }

  private _getSchemaMap(): ModuleSchemaMap {
    return {
      SANDBOX_BUILDER: ModuleExchangeSchemas._SANDBOX_BUILDER_SCHEMA,
      CASE_STUDY_LIBRARY: ModuleExchangeSchemas._CASE_STUDY_LIBRARY_SCHEMA,
      AI_INTERVIEW_SIMULATOR: ModuleExchangeSchemas._AI_INTERVIEW_SIMULATOR_SCHEMA,
      CHAOS_ADVERSARIAL_PLAYGROUND: ModuleExchangeSchemas._CHAOS_ADVERSARIAL_PLAYGROUND_SCHEMA,
      FINOPS_CALCULATOR: ModuleExchangeSchemas._FINOPS_CALCULATOR_SCHEMA,
      DATA_ALIGNMENT_ENGINE: ModuleExchangeSchemas._DATA_ALIGNMENT_ENGINE_SCHEMA,
      CHAOS_MONKEY_ARGON: ModuleExchangeSchemas._CHAOS_MONKEY_ARGON_SCHEMA,
      TELEMETRY_LOG_GAME: ModuleExchangeSchemas._TELEMETRY_LOG_GAME_SCHEMA,
      REGULATORY_COMPLIANCE_SIM: ModuleExchangeSchemas._REGULATORY_COMPLIANCE_SIM_SCHEMA,
      RESUME_PORTFOLIO_EXPORTER: ModuleExchangeSchemas._RESUME_PORTFOLIO_EXPORTER_SCHEMA,
      MATH_REWARD_WORKSPACE: ModuleExchangeSchemas._MATH_REWARD_WORKSPACE_SCHEMA,
      DATA_ARCHAEOLOGY_SUITE: ModuleExchangeSchemas._DATA_ARCHAEOLOGY_SUITE_SCHEMA,
      CAUSAL_INFERENCE_LAB: ModuleExchangeSchemas._CAUSAL_INFERENCE_LAB_SCHEMA,
    };
  }
}

