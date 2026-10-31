import { TelemetryConstants } from '@/core/telemetry/telemetry_constants';

export interface SisaConfig {
  shardCount: number;
  sliceCount: number;
  baselineTrainingHours: number;
  costPerHourUsd: number;
}

export interface SisaParams {
  shardIndex: number;
  sliceIndex: number;
  config?: Partial<SisaConfig>;
}

export interface SisaCostAnalysis {
  computeFraction: number;
  retrainHours: number;
  retrainCostUsd: number;
  fullRetrainCostUsd: number;
  savingsUsd: number;
  savingsPct: number;
}

export interface VectorTombstoneParams {
  totalVectors: number;
  deletedVectorsCount: number;
  dimension: number;
  hnswM?: number;
}

export interface VectorTombstoneResult {
  immediateFilterLatencyMs: number;
  memoryReclaimedMb: number;
  compactionDurationSec: number;
  p99LatencyBeforeCompactionMs: number;
  p99LatencyAfterCompactionMs: number;
}

export interface DeletionRequest {
  userId: string;
  shardIndex: number;
  sliceIndex: number;
  vectorId?: string;
}

export interface BatchDeletionResult {
  totalRequests: number;
  affectedShardsCount: number;
  aggregateComputeFraction: number;
  totalSavingsUsd: number;
  tombstonedVectorsCount: number;
}

/**
 * Simulates GDPR RTBF Machine Unlearning (SISA) compute savings and Vector DB Tombstoning.
 */
export class MachineUnlearningSimulator {
  private static readonly _DEFAULT_SHARDS = TelemetryConstants.DEFAULT_SISA_SHARDS;
  private static readonly _DEFAULT_SLICES = TelemetryConstants.DEFAULT_SISA_SLICES;
  private static readonly _DEFAULT_BASELINE_HOURS = 120;
  private static readonly _DEFAULT_COST_PER_HOUR = 32.5;
  private static readonly _BYTES_PER_FP32 = 4;
  private static readonly _BYTES_PER_MB = 1048576;
  private static readonly _IMMEDIATE_FILTER_LATENCY_MS = 2.4;
  private static readonly _COMPACT_RATE_VECTORS_PER_SEC = 25000;
  private static readonly _BASE_LATENCY_MS = 12.0;

  private static readonly _DEFAULT_CONFIG: SisaConfig = {
    shardCount: MachineUnlearningSimulator._DEFAULT_SHARDS,
    sliceCount: MachineUnlearningSimulator._DEFAULT_SLICES,
    baselineTrainingHours: MachineUnlearningSimulator._DEFAULT_BASELINE_HOURS,
    costPerHourUsd: MachineUnlearningSimulator._DEFAULT_COST_PER_HOUR,
  };

  public constructor(
    private readonly _config: SisaConfig = MachineUnlearningSimulator._DEFAULT_CONFIG
  ) {}

  /**
   * Calculates SISA retraining compute fraction and monetary savings for a single slice deletion.
   */
  public calculateSisaUnlearningCost(params: SisaParams): SisaCostAnalysis {
    const config = this._resolveConfig(params.config);
    const S = Math.max(1, config.shardCount);
    const R = Math.max(1, config.sliceCount);
    const r = Math.min(R, Math.max(1, params.sliceIndex));

    const computeFraction = (1 / S) * ((R - r + 1) / R);
    const retrainHours = config.baselineTrainingHours * computeFraction;
    const retrainCostUsd = retrainHours * config.costPerHourUsd;
    const fullRetrainCostUsd = config.baselineTrainingHours * config.costPerHourUsd;
    const savingsUsd = fullRetrainCostUsd - retrainCostUsd;
    const savingsPct = (savingsUsd / fullRetrainCostUsd) * 100;

    return {
      computeFraction: Number(computeFraction.toFixed(4)),
      retrainHours: Number(retrainHours.toFixed(2)),
      retrainCostUsd: Number(retrainCostUsd.toFixed(2)),
      fullRetrainCostUsd: Number(fullRetrainCostUsd.toFixed(2)),
      savingsUsd: Number(savingsUsd.toFixed(2)),
      savingsPct: Number(savingsPct.toFixed(2)),
    };
  }

  /**
   * Simulates immediate metadata filtering and compaction reclamation for vector embeddings.
   */
  public simulateVectorTombstoning(params: VectorTombstoneParams): VectorTombstoneResult {
    const bytesPerVector = params.dimension * MachineUnlearningSimulator._BYTES_PER_FP32;
    const memoryReclaimedMb =
      (params.deletedVectorsCount * bytesPerVector) / MachineUnlearningSimulator._BYTES_PER_MB;
    const compactionDurationSec = Math.max(
      1,
      params.totalVectors / MachineUnlearningSimulator._COMPACT_RATE_VECTORS_PER_SEC
    );

    const deletionRatio = params.totalVectors > 0 ? params.deletedVectorsCount / params.totalVectors : 0;
    const p99Before = MachineUnlearningSimulator._BASE_LATENCY_MS * (1 + deletionRatio * 1.5);
    const p99After = MachineUnlearningSimulator._BASE_LATENCY_MS;

    return {
      immediateFilterLatencyMs: MachineUnlearningSimulator._IMMEDIATE_FILTER_LATENCY_MS,
      memoryReclaimedMb: Number(memoryReclaimedMb.toFixed(2)),
      compactionDurationSec: Number(compactionDurationSec.toFixed(2)),
      p99LatencyBeforeCompactionMs: Number(p99Before.toFixed(2)),
      p99LatencyAfterCompactionMs: Number(p99After.toFixed(2)),
    };
  }

  /**
   * Simulates batch processing of GDPR deletion requests aggregated across SISA shards.
   */
  public simulateBatchDeletion(
    deletionRequests: DeletionRequest[],
    customConfig?: SisaConfig
  ): BatchDeletionResult {
    const config = customConfig ?? this._config;
    const shardMinSlices = new Map<number, number>();
    let tombstoneCount = 0;

    for (const req of deletionRequests) {
      if (req.vectorId) tombstoneCount++;
      const currentMin = shardMinSlices.get(req.shardIndex) ?? config.sliceCount;
      shardMinSlices.set(req.shardIndex, Math.min(currentMin, req.sliceIndex));
    }

    return this._calculateBatchMetrics(shardMinSlices, config, deletionRequests.length, tombstoneCount);
  }

  /**
   * Returns current default SISA configuration parameters.
   */
  public getDefaultSisaConfig(): SisaConfig {
    return { ...this._config };
  }

  private _resolveConfig(overrides?: Partial<SisaConfig>): SisaConfig {
    if (!overrides) return this._config;
    return {
      shardCount: overrides.shardCount ?? this._config.shardCount,
      sliceCount: overrides.sliceCount ?? this._config.sliceCount,
      baselineTrainingHours: overrides.baselineTrainingHours ?? this._config.baselineTrainingHours,
      costPerHourUsd: overrides.costPerHourUsd ?? this._config.costPerHourUsd,
    };
  }

  private _calculateBatchMetrics(
    shardMinSlices: Map<number, number>,
    config: SisaConfig,
    requestCount: number,
    tombstoneCount: number
  ): BatchDeletionResult {
    let aggregateFraction = 0;
    for (const minSlice of shardMinSlices.values()) {
      const sliceFraction = (config.sliceCount - minSlice + 1) / config.sliceCount;
      aggregateFraction += (1 / config.shardCount) * sliceFraction;
    }

    const fullCost = config.baselineTrainingHours * config.costPerHourUsd;
    const actualCost = fullCost * aggregateFraction;
    const totalSavingsUsd = Math.max(0, fullCost - actualCost);

    return {
      totalRequests: requestCount,
      affectedShardsCount: shardMinSlices.size,
      aggregateComputeFraction: Number(aggregateFraction.toFixed(4)),
      totalSavingsUsd: Number(totalSavingsUsd.toFixed(2)),
      tombstonedVectorsCount: tombstoneCount,
    };
  }
}

