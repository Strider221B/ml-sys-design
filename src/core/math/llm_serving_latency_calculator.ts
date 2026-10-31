import { HardwareSpecsDatabase } from '@/core/math/hardware_specs_database';
import { MathConstants } from '@/core/math/math_constants';

export interface LlmServingParams {
  activeParamsBillion: number;
  promptTokens: number;
  outputTokens: number;
  chipId: string;
  batchSize?: number | undefined;
  quantizationBits?: number | undefined;
  kvQuantizationBits?: number | undefined;
  promptCacheHitRatio?: number | undefined;
  speculativeDecoding?: boolean | undefined;
  speculativeSpeedupFactor?: number | undefined;
  numLayers?: number | undefined;
  numKvHeads?: number | undefined;
  headDim?: number | undefined;
}

export interface LlmServingMetrics {
  ttftMs: number;
  tpotMs: number;
  totalLatencyMs: number;
  tokensPerSecond: number;
  vramWeightsGb: number;
  vramKvGb: number;
  totalVramGb: number;
  maxServiceRateRps: number;
}

/**
 * High-precision LLM Serving Latency Calculator.
 * Decomposes generative inference into TTFT (prefill) and TPOT (decode) phases,
 * factoring in prompt caching hit ratios, speculative decoding, and VRAM memory footprint.
 */
export class LlmServingLatencyCalculator {
  private static readonly _BYTES_PER_PARAM_FACTOR = 1 / MathConstants.BITS_PER_BYTE;
  private static readonly _MIN_OUTPUT_TOKENS = 1;
  private static readonly _DEFAULT_BATCH_SIZE = 1;

  public constructor(private readonly _db: HardwareSpecsDatabase) {}

  /**
   * Computes prefill (TTFT), decode (TPOT), total generation latency, and VRAM footprint.
   */
  public calculateLlmLatency(params: LlmServingParams): LlmServingMetrics {
    const specs = this._db.getSpecs(params.chipId);
    const batchSize = Math.max(
      LlmServingLatencyCalculator._DEFAULT_BATCH_SIZE,
      params.batchSize ?? 1
    );
    const quantBits = params.quantizationBits ?? MathConstants.DEFAULT_QUANTIZATION_BITS;
    const kvBits = params.kvQuantizationBits ?? MathConstants.DEFAULT_KV_QUANTIZATION_BITS;
    const outputTokens = Math.max(
      LlmServingLatencyCalculator._MIN_OUTPUT_TOKENS,
      params.outputTokens
    );

    const ttftMs = this._computeTtftMs(params, specs.peakTflops, specs.memoryBandwidthGbps);
    const tpotMs = this._computeTpotMs(params, specs.memoryBandwidthGbps, quantBits, kvBits);
    const totalLatencyMs = ttftMs + outputTokens * tpotMs;
    const tokensPerSecond = (outputTokens * MathConstants.MILLIS_PER_SECOND) / totalLatencyMs;
    const vram = this._computeVram(params, batchSize);
    const maxServiceRateRps = (batchSize * MathConstants.MILLIS_PER_SECOND) / totalLatencyMs;

    return this._formatMetrics(ttftMs, tpotMs, totalLatencyMs, tokensPerSecond, vram, maxServiceRateRps);
  }

  private _formatMetrics(
    ttftMs: number,
    tpotMs: number,
    totalLatencyMs: number,
    tokensPerSecond: number,
    vram: { vramWeightsGb: number; vramKvGb: number; totalVramGb: number },
    maxServiceRateRps: number
  ): LlmServingMetrics {
    return {
      ttftMs: Math.round(ttftMs * 100) / 100,
      tpotMs: Math.round(tpotMs * 100) / 100,
      totalLatencyMs: Math.round(totalLatencyMs * 100) / 100,
      tokensPerSecond: Math.round(tokensPerSecond * 100) / 100,
      vramWeightsGb: Math.round(vram.vramWeightsGb * 100) / 100,
      vramKvGb: Math.round(vram.vramKvGb * 100) / 100,
      totalVramGb: Math.round(vram.totalVramGb * 100) / 100,
      maxServiceRateRps: Math.round(maxServiceRateRps * 100) / 100,
    };
  }

  private _computeTtftMs(
    params: LlmServingParams,
    peakTflops: number,
    bandwidthGbps: number
  ): number {
    const pActive = params.activeParamsBillion * MathConstants.BYTES_PER_GIGABYTE;
    const hitRatio = Math.min(
      1.0,
      Math.max(0, params.promptCacheHitRatio ?? MathConstants.DEFAULT_PROMPT_CACHE_HIT_RATIO)
    );
    const effPrompt = params.promptTokens * (1 - hitRatio);
    const peakFlops = peakTflops * MathConstants.BYTES_PER_GIGABYTE * MathConstants.ONE_THOUSAND;
    const computeSec = (2 * pActive * effPrompt) / (peakFlops * MathConstants.DEFAULT_MFU_PREFILL);
    const weightBytes =
      pActive *
      (params.quantizationBits ?? MathConstants.DEFAULT_QUANTIZATION_BITS) *
      LlmServingLatencyCalculator._BYTES_PER_PARAM_FACTOR;
    const memSec = weightBytes / (bandwidthGbps * MathConstants.BYTES_PER_GIGABYTE);
    const basePrefillMs = (computeSec + memSec) * MathConstants.MILLIS_PER_SECOND;
    return (
      basePrefillMs +
      MathConstants.DEFAULT_GATEWAY_LATENCY_MS +
      MathConstants.DEFAULT_KV_FETCH_LATENCY_MS
    );
  }

  private _computeTpotMs(
    params: LlmServingParams,
    bandwidthGbps: number,
    quantBits: number,
    kvBits: number
  ): number {
    const pActive = params.activeParamsBillion * MathConstants.BYTES_PER_GIGABYTE;
    const weightBytes = pActive * (quantBits * LlmServingLatencyCalculator._BYTES_PER_PARAM_FACTOR);
    const kvBytesPerToken = this._computeKvBytesPerToken(params, kvBits);
    const totalBytesPerStep = weightBytes + kvBytesPerToken;
    const bandwidthBytesPerSec = bandwidthGbps * MathConstants.BYTES_PER_GIGABYTE;
    const baseDecodeSec = totalBytesPerStep / bandwidthBytesPerSec;
    const speedup = params.speculativeDecoding
      ? (params.speculativeSpeedupFactor ?? MathConstants.DEFAULT_SPECULATIVE_SPEEDUP)
      : MathConstants.MIN_SPECULATIVE_SPEEDUP;
    return (baseDecodeSec / speedup) * MathConstants.MILLIS_PER_SECOND;
  }

  private _computeKvBytesPerToken(params: LlmServingParams, kvBits: number): number {
    const layers = params.numLayers ?? MathConstants.DEFAULT_NUM_LAYERS;
    const kvHeads = params.numKvHeads ?? MathConstants.DEFAULT_NUM_KV_HEADS;
    const headDim = params.headDim ?? MathConstants.DEFAULT_HEAD_DIM;
    const seqLen = params.promptTokens + params.outputTokens / 2;
    const bytesPerElement = kvBits * LlmServingLatencyCalculator._BYTES_PER_PARAM_FACTOR;
    return 2 * layers * kvHeads * headDim * seqLen * bytesPerElement;
  }

  private _computeVram(
    params: LlmServingParams,
    batchSize: number
  ): { vramWeightsGb: number; vramKvGb: number; totalVramGb: number } {
    const pActive = params.activeParamsBillion * MathConstants.BYTES_PER_GIGABYTE;
    const quantBits = params.quantizationBits ?? MathConstants.DEFAULT_QUANTIZATION_BITS;
    const kvBits = params.kvQuantizationBits ?? MathConstants.DEFAULT_KV_QUANTIZATION_BITS;
    const weightBytes = pActive * (quantBits * LlmServingLatencyCalculator._BYTES_PER_PARAM_FACTOR);
    const vramWeightsGb =
      (weightBytes / MathConstants.BYTES_PER_GIGABYTE) * MathConstants.VRAM_OVERHEAD_FACTOR;
    const kvBytes = this._computeKvBytesPerToken(params, kvBits) * batchSize;
    const vramKvGb = kvBytes / MathConstants.BYTES_PER_GIGABYTE;
    return {
      vramWeightsGb,
      vramKvGb,
      totalVramGb: vramWeightsGb + vramKvGb,
    };
  }
}
