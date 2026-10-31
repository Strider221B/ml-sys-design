import { describe, expect, it } from 'vitest';
import { FinopsCalculator } from '@/core/math/finops_calculator';
import { HardwareSpecsDatabase } from '@/core/math/hardware_specs_database';
import { MathConstants } from '@/core/math/math_constants';

describe('FinopsCalculator', () => {
  it('test_calculateMonthlyCost_8InstancesH100_computesAccurateSpend', () => {
    const db = new HardwareSpecsDatabase();
    const calculator = new FinopsCalculator(db);

    const summary = calculator.calculateMonthlyCost(100, MathConstants.CHIP_NVIDIA_H100_SXM5, 8);

    expect(summary.instanceCount).toBe(8);
    expect(summary.hourlyCostUSD).toBe(28); // 8 * 3.5
    expect(summary.monthlyCostUSD).toBe(20440); // 28 * 730
    expect(summary.totalMonthlyRequests).toBe(100 * 730 * 3600);
    expect(summary.costPerMillionRequestsUSD).toBeGreaterThan(0);
  });

  it('test_calculateMonthlyCost_zeroQps_returnsZeroPerMillionCost', () => {
    const db = new HardwareSpecsDatabase();
    const calculator = new FinopsCalculator(db);

    const summary = calculator.calculateMonthlyCost(0, MathConstants.CHIP_NVIDIA_L4, 2);

    expect(summary.hourlyCostUSD).toBe(1.5);
    expect(summary.monthlyCostUSD).toBe(1095);
    expect(summary.totalMonthlyRequests).toBe(0);
    expect(summary.costPerMillionRequestsUSD).toBe(0);
  });

  it('test_recommendOptimizedAllocation_withinBudget_findsValidCluster', () => {
    const db = new HardwareSpecsDatabase();
    const calculator = new FinopsCalculator(db);

    // Budget $10,000 / month, target 50 QPS
    const recommendation = calculator.recommendOptimizedAllocation(50, 10000);

    expect(recommendation.isWithinBudget).toBe(true);
    expect(recommendation.monthlyCostUSD).toBeLessThanOrEqual(10000);
    expect(recommendation.maxSupportedQps).toBeGreaterThanOrEqual(50);
    expect(recommendation.comparison.length).toBeGreaterThanOrEqual(4);
  });

  it('test_recommendOptimizedAllocation_exceedsBudget_flagsWithinBudgetFalse', () => {
    const db = new HardwareSpecsDatabase();
    const calculator = new FinopsCalculator(db);

    // 1000 QPS with small $100 budget
    const recommendation = calculator.recommendOptimizedAllocation(1000, 100);

    expect(recommendation.isWithinBudget).toBe(false);
    expect(recommendation.instanceCount).toBeGreaterThan(1);
  });

  it('test_recommendOptimizedAllocation_withDefaultChipId_prefersSpecifiedChip', () => {
    const db = new HardwareSpecsDatabase();
    const calculator = new FinopsCalculator(db);

    const recommendation = calculator.recommendOptimizedAllocation(
      20,
      5000,
      MathConstants.CHIP_GOOGLE_TPU_V5P
    );

    expect(recommendation.recommendedChipId).toBe(MathConstants.CHIP_GOOGLE_TPU_V5P);
  });
});

