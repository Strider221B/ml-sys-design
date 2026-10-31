import { describe, expect, it } from 'vitest';
import {
  DeletionRequest,
  MachineUnlearningSimulator,
} from '@/core/compliance/machine_unlearning_simulator';

describe('MachineUnlearningSimulator', () => {
  it('test_calculateSisaUnlearningCost_withDefaultShardsAndSlices_calculatesCorrectFraction', () => {
    const sim = new MachineUnlearningSimulator();

    // S=10, R=10, sliceIndex=1 (worst case for shard: retrains all 10 slices)
    const worstCase = sim.calculateSisaUnlearningCost({ shardIndex: 1, sliceIndex: 1 });
    expect(worstCase.computeFraction).toBe(0.1);
    expect(worstCase.savingsPct).toBe(90.0);

    // S=10, R=10, sliceIndex=10 (best case for shard: retrains only slice 10)
    const bestCase = sim.calculateSisaUnlearningCost({ shardIndex: 1, sliceIndex: 10 });
    expect(bestCase.computeFraction).toBe(0.01);
    expect(bestCase.savingsPct).toBe(99.0);
  });

  it('test_calculateSisaUnlearningCost_withCustomConfigOverrides_appliesCorrectly', () => {
    const sim = new MachineUnlearningSimulator();
    const result = sim.calculateSisaUnlearningCost({
      shardIndex: 2,
      sliceIndex: 3,
      config: {
        shardCount: 5,
        sliceCount: 4,
        baselineTrainingHours: 200,
        costPerHourUsd: 50,
      },
    });

    // S=5, R=4, r=3 -> (1/5) * ((4 - 3 + 1)/4) = 0.2 * (2/4) = 0.1
    expect(result.computeFraction).toBe(0.1);
    expect(result.fullRetrainCostUsd).toBe(10000);
    expect(result.retrainCostUsd).toBe(1000);
    expect(result.savingsUsd).toBe(9000);
  });

  it('test_simulateVectorTombstoning_calculatesReclaimedMemoryAndLatencyBounds', () => {
    const sim = new MachineUnlearningSimulator();
    const result = sim.simulateVectorTombstoning({
      totalVectors: 1_000_000,
      deletedVectorsCount: 50_000,
      dimension: 1536,
    });

    expect(result.immediateFilterLatencyMs).toBeLessThan(5.0);
    expect(result.memoryReclaimedMb).toBeGreaterThan(0);
    expect(result.p99LatencyBeforeCompactionMs).toBeGreaterThan(result.p99LatencyAfterCompactionMs);
    expect(result.compactionDurationSec).toBeGreaterThan(0);
  });

  it('test_simulateBatchDeletion_aggregatesShardsAndComputesBatchSavings', () => {
    const sim = new MachineUnlearningSimulator();
    const requests: DeletionRequest[] = [
      { userId: 'u1', shardIndex: 1, sliceIndex: 5, vectorId: 'vec_1' },
      { userId: 'u2', shardIndex: 1, sliceIndex: 2, vectorId: 'vec_2' }, // shard 1 min slice becomes 2
      { userId: 'u3', shardIndex: 3, sliceIndex: 8 },
    ];

    const batchResult = sim.simulateBatchDeletion(requests);
    expect(batchResult.totalRequests).toBe(3);
    expect(batchResult.affectedShardsCount).toBe(2);
    expect(batchResult.tombstonedVectorsCount).toBe(2);
    expect(batchResult.aggregateComputeFraction).toBeGreaterThan(0);
    expect(batchResult.totalSavingsUsd).toBeGreaterThan(0);
  });

  it('test_simulateVectorTombstoning_whenZeroVectors_returnsZeroDeletionRatio', () => {
    const sim = new MachineUnlearningSimulator();
    const result = sim.simulateVectorTombstoning({
      totalVectors: 0,
      deletedVectorsCount: 0,
      dimension: 128,
    });
    expect(result.memoryReclaimedMb).toBe(0);
    expect(result.compactionDurationSec).toBe(1);
  });

  it('test_calculateSisaUnlearningCost_withPartialOverrides_usesDefaultsForOmitted', () => {
    const sim = new MachineUnlearningSimulator();
    const result = sim.calculateSisaUnlearningCost({
      shardIndex: 1,
      sliceIndex: 1,
      config: { shardCount: 20 }, // only shardCount specified
    });
    expect(result.computeFraction).toBe(0.05);
  });

  it('test_getDefaultSisaConfig_returnsConfigCopy', () => {
    const sim = new MachineUnlearningSimulator();
    const config = sim.getDefaultSisaConfig();
    expect(config.shardCount).toBe(10);
    expect(config.sliceCount).toBe(10);
    expect(config.baselineTrainingHours).toBe(120);
  });
});
