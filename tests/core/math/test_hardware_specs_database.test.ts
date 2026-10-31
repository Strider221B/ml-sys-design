import { describe, expect, it } from 'vitest';
import { HardwareSpecsDatabase } from '@/core/math/hardware_specs_database';
import { MathConstants } from '@/core/math/math_constants';

describe('HardwareSpecsDatabase', () => {
  it('test_getSpecs_returnsCorrectAuthoritativeH100Specs', () => {
    const db = new HardwareSpecsDatabase();
    const specs = db.getSpecs(MathConstants.CHIP_NVIDIA_H100_SXM5);

    expect(specs.chipId).toBe(MathConstants.CHIP_NVIDIA_H100_SXM5);
    expect(specs.peakTflops).toBe(1979);
    expect(specs.memoryBandwidthGbps).toBe(3350);
    expect(specs.vramCapacityGb).toBe(80);
    expect(specs.costPerHourUsd).toBe(3.5);
  });

  it('test_getSpecs_returnsTpuV5pAndMi300xSpecs', () => {
    const db = new HardwareSpecsDatabase();
    const tpu = db.getSpecs(MathConstants.CHIP_GOOGLE_TPU_V5P);
    const mi300 = db.getSpecs(MathConstants.CHIP_AMD_MI300X);

    expect(tpu.peakTflops).toBe(459);
    expect(tpu.memoryBandwidthGbps).toBe(4800);
    expect(mi300.peakTflops).toBe(2610);
    expect(mi300.memoryBandwidthGbps).toBe(5300);
  });

  it('test_getSpecs_whenUnknownChip_fallsBackToH100', () => {
    const db = new HardwareSpecsDatabase();
    const fallback = db.getSpecs('UNKNOWN_ACCELERATOR_XYZ');

    expect(fallback.chipId).toBe(MathConstants.CHIP_NVIDIA_H100_SXM5);
  });

  it('test_getSpecs_whenCatalogEmptyAndNoFallback_throwsError', () => {
    const emptyDb = new HardwareSpecsDatabase({});
    // Delete fallback from map directly by registering empty catalog
    (emptyDb as unknown as { _catalog: Map<string, unknown> })._catalog.clear();

    expect(() => emptyDb.getSpecs('CHIP_NONE')).toThrow(
      'Unknown hardware SKU: CHIP_NONE and fallback unavailable'
    );
  });

  it('test_listChips_returnsAllDefaultChips', () => {
    const db = new HardwareSpecsDatabase();
    const chips = db.listChips();

    expect(chips.length).toBeGreaterThanOrEqual(7);
    const chipIds = chips.map((c) => c.chipId);
    expect(chipIds).toContain(MathConstants.CHIP_NVIDIA_H100_SXM5);
    expect(chipIds).toContain(MathConstants.CHIP_AMD_MI300X);
    expect(chipIds).toContain(MathConstants.CHIP_NVIDIA_L4);
  });

  it('test_hasChip_detectsExistingAndMissingChips', () => {
    const db = new HardwareSpecsDatabase();

    expect(db.hasChip(MathConstants.CHIP_NVIDIA_L4)).toBe(true);
    expect(db.hasChip('NON_EXISTENT_CHIP')).toBe(false);
  });

  it('test_registerChip_registersCustomAccelerator', () => {
    const db = new HardwareSpecsDatabase();
    const customId = 'CUSTOM_CHIP_2026';
    db.registerChip({
      chipId: customId,
      name: 'Custom AI Chip',
      architecture: 'Custom',
      precision: 'FP8',
      peakTflops: 3000,
      memoryBandwidthGbps: 6000,
      vramCapacityGb: 256,
      costPerHourUsd: 4.5,
    });

    expect(db.hasChip(customId)).toBe(true);
    const customSpecs = db.getSpecs(customId);
    expect(customSpecs.peakTflops).toBe(3000);
  });

  it('test_constructor_acceptsCustomCatalogMap', () => {
    const db = new HardwareSpecsDatabase({
      SPECIAL_CHIP: {
        chipId: 'SPECIAL_CHIP',
        name: 'Special',
        architecture: 'SpecialArch',
        precision: 'FP16',
        peakTflops: 500,
        memoryBandwidthGbps: 1000,
        vramCapacityGb: 32,
        costPerHourUsd: 1.0,
      },
    });

    expect(db.hasChip('SPECIAL_CHIP')).toBe(true);
  });
});

