import { MathConstants } from '@/core/math/math_constants';

export interface ChipSpecs {
  chipId: string;
  name: string;
  architecture: string;
  precision: string;
  peakTflops: number;
  memoryBandwidthGbps: number;
  vramCapacityGb: number;
  costPerHourUsd: number;
}

/**
 * Authoritative hardware catalog for 2026 AI accelerators.
 * Provides memory bandwidth, peak FLOPS, VRAM capacity, and hourly cloud rates.
 */
export class HardwareSpecsDatabase {
  private static readonly _FALLBACK_CHIP_ID = MathConstants.CHIP_NVIDIA_H100_SXM5;

  public constructor(customCatalog?: Record<string, ChipSpecs>) {
    this._catalog = new Map<string, ChipSpecs>();
    this._initializeDefaultCatalog();
    if (customCatalog) {
      for (const [id, specs] of Object.entries(customCatalog)) {
        this._catalog.set(id, specs);
      }
    }
  }

  /**
   * Retrieves chip specifications by accelerator ID, falling back to H100 SXM5 if not found.
   */
  public getSpecs(chipId: string): ChipSpecs {
    const found = this._catalog.get(chipId);
    if (found) {
      return found;
    }
    const fallback = this._catalog.get(HardwareSpecsDatabase._FALLBACK_CHIP_ID);
    if (fallback) {
      return fallback;
    }
    throw new Error(`Unknown hardware SKU: ${chipId} and fallback unavailable`);
  }

  /**
   * Returns list of all accelerator specifications in catalog.
   */
  public listChips(): ChipSpecs[] {
    return Array.from(this._catalog.values());
  }

  /**
   * Returns whether specified chip exists in database.
   */
  public hasChip(chipId: string): boolean {
    return this._catalog.has(chipId);
  }

  /**
   * Registers or updates a chip specification.
   */
  public registerChip(specs: ChipSpecs): void {
    this._catalog.set(specs.chipId, specs);
  }

  private readonly _catalog: Map<string, ChipSpecs>;

  private _initializeDefaultCatalog(): void {
    this._addHopperChips();
    this._addBlackwellAndAmdChips();
    this._addTpuChips();
    this._addEdgeChips();
  }

  private _addHopperChips(): void {
    this._catalog.set(MathConstants.CHIP_NVIDIA_H100_SXM5, {
      chipId: MathConstants.CHIP_NVIDIA_H100_SXM5,
      name: 'NVIDIA H100 SXM5',
      architecture: 'Hopper',
      precision: 'FP16/BF16',
      peakTflops: 1979,
      memoryBandwidthGbps: 3350,
      vramCapacityGb: 80,
      costPerHourUsd: 3.5,
    });
    this._catalog.set(MathConstants.CHIP_NVIDIA_H200_SXM, {
      chipId: MathConstants.CHIP_NVIDIA_H200_SXM,
      name: 'NVIDIA H200 SXM',
      architecture: 'Hopper',
      precision: 'FP16/BF16',
      peakTflops: 1979,
      memoryBandwidthGbps: 4800,
      vramCapacityGb: 141,
      costPerHourUsd: 4.1,
    });
  }

  private _addBlackwellAndAmdChips(): void {
    this._catalog.set(MathConstants.CHIP_NVIDIA_B200, {
      chipId: MathConstants.CHIP_NVIDIA_B200,
      name: 'NVIDIA B200',
      architecture: 'Blackwell',
      precision: 'FP16',
      peakTflops: 2250,
      memoryBandwidthGbps: 8000,
      vramCapacityGb: 192,
      costPerHourUsd: 5.5,
    });
    this._catalog.set(MathConstants.CHIP_AMD_MI300X, {
      chipId: MathConstants.CHIP_AMD_MI300X,
      name: 'AMD Instinct MI300X',
      architecture: 'CDNA 3',
      precision: 'FP16/BF16',
      peakTflops: 2610,
      memoryBandwidthGbps: 5300,
      vramCapacityGb: 192,
      costPerHourUsd: 3.0,
    });
  }

  private _addTpuChips(): void {
    this._catalog.set(MathConstants.CHIP_GOOGLE_TPU_V5P, {
      chipId: MathConstants.CHIP_GOOGLE_TPU_V5P,
      name: 'Google TPU v5p',
      architecture: 'Systolic Array',
      precision: 'BF16',
      peakTflops: 459,
      memoryBandwidthGbps: 4800,
      vramCapacityGb: 95,
      costPerHourUsd: 3.2,
    });
    this._catalog.set(MathConstants.CHIP_GOOGLE_TPU_V6E, {
      chipId: MathConstants.CHIP_GOOGLE_TPU_V6E,
      name: 'Google TPU v6e (Trillium)',
      architecture: 'Tensor Core',
      precision: 'BF16/FP8',
      peakTflops: 918,
      memoryBandwidthGbps: 4200,
      vramCapacityGb: 128,
      costPerHourUsd: 2.75,
    });
  }

  private _addEdgeChips(): void {
    this._catalog.set(MathConstants.CHIP_NVIDIA_L4, {
      chipId: MathConstants.CHIP_NVIDIA_L4,
      name: 'NVIDIA L4',
      architecture: 'Ada Lovelace',
      precision: 'FP16',
      peakTflops: 120,
      memoryBandwidthGbps: 300,
      vramCapacityGb: 24,
      costPerHourUsd: 0.75,
    });
  }
}
