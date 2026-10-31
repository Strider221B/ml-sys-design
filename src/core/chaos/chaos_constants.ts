/**
 * Canonical constants, fault descriptors, error budgets, and quantization curves for the Chaos Sandbox.
 */
export class ChaosConstants {
  public static readonly FAULT_NETWORK_PARTITION = 'NETWORK_PARTITION';
  public static readonly FAULT_TOKEN_OVERFLOW = 'TOKEN_OVERFLOW';
  public static readonly FAULT_RACE_CONDITION = 'RACE_CONDITION';
  public static readonly FAULT_CLOCK_SKEW = 'CLOCK_SKEW';

  public static readonly FAILURE_INFINITE_AGENT_LOOP = 'INFINITE_AGENT_LOOP';
  public static readonly FAILURE_OUT_OF_MEMORY = 'OUT_OF_MEMORY_CRASH';
  public static readonly FAILURE_CONTEXT_OVERFLOW = 'CONTEXT_WINDOW_OVERFLOW';
  public static readonly FAILURE_DATA_CORRUPTION = 'SILENT_DATA_CORRUPTION';
  public static readonly FAILURE_RESILIENT_SURVIVAL = 'RESILIENT_SURVIVAL';

  public static readonly PATTERN_POISSON_BURST = 'POISSON_BURST';
  public static readonly PATTERN_SKEWED_HASH_KEY = 'SKEWED_HASH_KEY_COLLISION';
  public static readonly PATTERN_LONG_CONTEXT_PROMPT = 'LONG_CONTEXT_PROMPT_BOMB';
  public static readonly PATTERN_CONCURRENT_CACHE_EVICTION = 'CONCURRENT_CACHE_EVICTION';

  public static readonly PRECISION_FP32 = 'FP32';
  public static readonly PRECISION_FP16 = 'FP16';
  public static readonly PRECISION_INT8 = 'INT8';
  public static readonly PRECISION_INT4 = 'INT4';

  public static readonly BITS_PER_WEIGHT_FP32 = 32;
  public static readonly BITS_PER_WEIGHT_FP16 = 16;
  public static readonly BITS_PER_WEIGHT_INT8 = 8;
  public static readonly BITS_PER_WEIGHT_INT4 = 4;

  public static readonly KV_RUNTIME_OVERHEAD_MULTIPLIER = 1.25;
  public static readonly DEFAULT_EDGE_MEMORY_CEILING_GB = 4.0;
  public static readonly THERMAL_THROTTLE_THRESHOLD_SEC = 30;
  public static readonly THERMAL_THROTTLE_CLOCK_DROP_PCT = 0.45;

  public static readonly DEFAULT_SLA_RATIO = 0.999;
  public static readonly MINUTES_PER_MONTH = 43200;
  public static readonly DEFAULT_ERROR_BUDGET_MINUTES = 43.2;

  public static readonly DEFAULT_MAX_AGENT_DEPTH = 5;
  public static readonly DEFAULT_MAX_BUDGET_USD = 10.0;
  public static readonly DEFAULT_SIMILARITY_THRESHOLD = 0.95;

  public static readonly MODULE_CHAOS_ARGON = 'CHAOS_MONKEY_ARGON';
  public static readonly MODULE_CHAOS_PLAYGROUND = 'CHAOS_ADVERSARIAL_PLAYGROUND';

  public constructor() {}

  /**
   * Returns supported quantization precision identifiers.
   */
  public getSupportedPrecisions(): readonly string[] {
    return [
      ChaosConstants.PRECISION_FP32,
      ChaosConstants.PRECISION_FP16,
      ChaosConstants.PRECISION_INT8,
      ChaosConstants.PRECISION_INT4,
    ];
  }

  /**
   * Returns supported killer workload patterns.
   */
  public getSupportedWorkloadPatterns(): readonly string[] {
    return [
      ChaosConstants.PATTERN_POISSON_BURST,
      ChaosConstants.PATTERN_SKEWED_HASH_KEY,
      ChaosConstants.PATTERN_LONG_CONTEXT_PROMPT,
      ChaosConstants.PATTERN_CONCURRENT_CACHE_EVICTION,
    ];
  }
}

