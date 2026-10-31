import { HardwareSpecsDatabase } from '@/core/math/hardware_specs_database';
import { MathConstants } from '@/core/math/math_constants';

export interface FinOpsSummary {
  chipId: string;
  instanceCount: number;
  hourlyCostUSD: number;
  monthlyCostUSD: number;
  totalMonthlyRequests: number;
  costPerMillionRequestsUSD: number;
}

export interface AllocationRecommendation {
  recommendedChipId: string;
  instanceCount: number;
  monthlyCostUSD: number;
  isWithinBudget: boolean;
  maxSupportedQps: number;
  costPerMillionRequestsUSD: number;
  comparison: FinOpsSummary[];
}

/**
 * Cloud FinOps and Hardware Unit Economics Calculator.
 * Models infrastructure burn, monthly spend, token economics, and optimal GPU cluster sizing.
 */
export class FinopsCalculator {
  private static readonly _DEFAULT_REQUESTS_PER_CHIP_QPS = 15;
  private static readonly _MIN_INSTANCES = 1;
  private static readonly _ROUNDING_FACTOR = 100;

  public constructor(private readonly _db: HardwareSpecsDatabase) {}

  /**
   * Calculates monthly compute cost, hourly burn, and unit economics per million queries.
   */
  public calculateMonthlyCost(
    qps: number,
    chipId: string,
    instanceCount: number
  ): FinOpsSummary {
    const specs = this._db.getSpecs(chipId);
    const count = Math.max(FinopsCalculator._MIN_INSTANCES, instanceCount);
    const hourlyCostUSD = count * specs.costPerHourUsd;
    const monthlyCostUSD = hourlyCostUSD * MathConstants.HOURS_PER_MONTH;
    const safeQps = Math.max(0, qps);
    const totalMonthlyRequests =
      safeQps * MathConstants.HOURS_PER_MONTH * MathConstants.SECONDS_PER_HOUR;
    const costPerMillion =
      totalMonthlyRequests > 0
        ? (monthlyCostUSD / totalMonthlyRequests) * MathConstants.ONE_MILLION
        : 0;

    return {
      chipId: specs.chipId,
      instanceCount: count,
      hourlyCostUSD: Math.round(hourlyCostUSD * FinopsCalculator._ROUNDING_FACTOR) / 100,
      monthlyCostUSD: Math.round(monthlyCostUSD * FinopsCalculator._ROUNDING_FACTOR) / 100,
      totalMonthlyRequests,
      costPerMillionRequestsUSD: Math.round(costPerMillion * FinopsCalculator._ROUNDING_FACTOR) / 100,
    };
  }

  /**
   * Evaluates available chip SKUs to recommend cluster allocation staying within monthly budget.
   */
  public recommendOptimizedAllocation(
    targetQps: number,
    monthlyBudgetUSD: number,
    defaultChipId?: string
  ): AllocationRecommendation {
    const chips = this._db.listChips();
    const comparisons: FinOpsSummary[] = [];

    for (const chip of chips) {
      const neededInstances = this._computeNeededInstances(targetQps, chip.peakTflops);
      const summary = this.calculateMonthlyCost(targetQps, chip.chipId, neededInstances);
      comparisons.push(summary);
    }

    return this._selectBestRecommendation(
      comparisons,
      targetQps,
      monthlyBudgetUSD,
      defaultChipId
    );
  }

  private _computeCapacityPerChip(peakTflops: number): number {
    const scaleFactor = Math.max(0.5, peakTflops / 1000);
    return FinopsCalculator._DEFAULT_REQUESTS_PER_CHIP_QPS * scaleFactor;
  }

  private _computeNeededInstances(targetQps: number, peakTflops: number): number {
    const capacityPerChip = this._computeCapacityPerChip(peakTflops);
    return Math.max(FinopsCalculator._MIN_INSTANCES, Math.ceil(targetQps / capacityPerChip));
  }

  private _selectBestRecommendation(
    comparisons: FinOpsSummary[],
    targetQps: number,
    monthlyBudgetUSD: number,
    defaultChipId?: string
  ): AllocationRecommendation {
    const viable = comparisons.filter((c) => c.monthlyCostUSD <= monthlyBudgetUSD);
    const chosen = viable.length > 0 ? this._findLowestCost(viable) : this._findLowestCost(comparisons);
    const selected = defaultChipId
      ? (comparisons.find((c) => c.chipId === defaultChipId) ?? chosen)
      : chosen;
    const specs = this._db.getSpecs(selected.chipId);
    const maxQps = selected.instanceCount * this._computeCapacityPerChip(specs.peakTflops);

    return {
      recommendedChipId: selected.chipId,
      instanceCount: selected.instanceCount,
      monthlyCostUSD: selected.monthlyCostUSD,
      isWithinBudget: selected.monthlyCostUSD <= monthlyBudgetUSD,
      maxSupportedQps: Math.round(maxQps * FinopsCalculator._ROUNDING_FACTOR) / 100,
      costPerMillionRequestsUSD: selected.costPerMillionRequestsUSD,
      comparison: comparisons,
    };
  }

  private _findLowestCost(list: FinOpsSummary[]): FinOpsSummary {
    let best = list[0];
    for (let i = 1; i < list.length; i++) {
      if (list[i].monthlyCostUSD < best.monthlyCostUSD) {
        best = list[i];
      }
    }
    return best;
  }
}

export { FinopsCalculator as FinOpsCalculator };
