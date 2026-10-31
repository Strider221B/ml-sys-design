/**
 * Mathematical constants, hardware identifiers, and simulation defaults.
 * Central single source of truth for numeric and label constants across math engines.
 */
export class MathConstants {
  public static readonly PROTOCOL_GRPC = 'GRPC';
  public static readonly PROTOCOL_REST = 'REST';
  public static readonly PROTOCOL_KAFKA = 'KAFKA';
  public static readonly PROTOCOL_REDIS = 'REDIS';

  public static readonly PROTOCOL_LATENCY_GRPC_MS = 0.4;
  public static readonly PROTOCOL_LATENCY_REST_MS = 0.8;
  public static readonly PROTOCOL_LATENCY_KAFKA_MS = 2.5;
  public static readonly PROTOCOL_LATENCY_REDIS_MS = 0.3;
  public static readonly DEFAULT_EDGE_LATENCY_MS = 0.5;

  public static readonly CHIP_NVIDIA_H100_SXM5 = 'NVIDIA_H100_SXM5';
  public static readonly CHIP_NVIDIA_H200_SXM = 'NVIDIA_H200_SXM';
  public static readonly CHIP_NVIDIA_B200 = 'NVIDIA_B200';
  public static readonly CHIP_AMD_MI300X = 'AMD_MI300X';
  public static readonly CHIP_GOOGLE_TPU_V5P = 'GOOGLE_TPU_V5P';
  public static readonly CHIP_GOOGLE_TPU_V6E = 'GOOGLE_TPU_V6E';
  public static readonly CHIP_NVIDIA_L4 = 'NVIDIA_L4';

  public static readonly BOTTLENECK_MEMORY_BOUND = 'MEMORY_BOUND';
  public static readonly BOTTLENECK_COMPUTE_BOUND = 'COMPUTE_BOUND';
  public static readonly BOTTLENECK_QUEUE_SATURATED = 'QUEUE_SATURATED';

  public static readonly MAX_UTILIZATION_THRESHOLD = 0.95;
  public static readonly QUEUE_SATURATION_UTILIZATION = 1.0;
  public static readonly OVERFLOW_LATENCY_MS = 99999.0;
  public static readonly DEFAULT_CA_SQUARED = 1.0;
  public static readonly DEFAULT_CS_SQUARED = 1.0;

  public static readonly KAPPA_P50 = 1.0;
  public static readonly KAPPA_P95 = 2.0;
  public static readonly KAPPA_P99 = 3.0;

  public static readonly LN_2 = 0.69314718056;
  public static readonly LN_20 = 2.99573227355;
  public static readonly LN_100 = 4.60517018599;

  public static readonly DEFAULT_MFU_PREFILL = 0.6;
  public static readonly DEFAULT_SPECULATIVE_SPEEDUP = 1.8;
  public static readonly MIN_SPECULATIVE_SPEEDUP = 1.0;
  public static readonly DEFAULT_KV_FETCH_LATENCY_MS = 5.0;
  public static readonly DEFAULT_GATEWAY_LATENCY_MS = 10.0;
  public static readonly DEFAULT_PROMPT_CACHE_HIT_RATIO = 0.0;
  public static readonly DEFAULT_QUANTIZATION_BITS = 16;
  public static readonly DEFAULT_KV_QUANTIZATION_BITS = 16;
  public static readonly VRAM_OVERHEAD_FACTOR = 1.15;
  public static readonly DEFAULT_HEAD_DIM = 128;
  public static readonly DEFAULT_NUM_KV_HEADS = 8;
  public static readonly DEFAULT_NUM_LAYERS = 32;

  public static readonly HOURS_PER_MONTH = 730;
  public static readonly SECONDS_PER_HOUR = 3600;
  public static readonly MILLIS_PER_SECOND = 1000;
  public static readonly ONE_MILLION = 1000000;
  public static readonly ONE_THOUSAND = 1000;
  public static readonly BYTES_PER_GIGABYTE = 1000000000;
  public static readonly BITS_PER_BYTE = 8;
  public static readonly TFLOPS_TO_GFLOPS = 1000;

  public constructor() {}
}

