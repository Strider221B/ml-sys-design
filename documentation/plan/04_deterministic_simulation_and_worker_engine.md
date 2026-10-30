# Plan 04: Deterministic Simulation & Web Worker Engine

> **Phase:** 04  
> **Status:** Pending Execution  
> **Design References:**  
> - [03_deterministic_simulation_and_worker_engine.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/03_deterministic_simulation_and_worker_engine.md)  
> - [00_overview_and_architecture.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/00_overview_and_architecture.md)  
> - [coding_standards.md](file:///home/somesh/git_repos/ml-sys-design/documentation/prompts/coding_standards.md)  
> **Virtual Environment:** `source ~/python_envs/p313_llm/bin/activate`

---

## 1. Executive Summary & Objectives

Implement the high-performance **Deterministic Simulation & Web Worker Engine** that powers real-time trade-off matrices, hardware bottleneck profiling, and FinOps unit economics directly in the client browser.

### Core Deliverables
1. **$<100\text{ ms}$ Execution SLA**: Decouple numerical graph calculations from the main UI thread by executing inside dedicated Web Workers via `Comlink` RPC.
2. **Queuing Theory Latency Engine (`QueuingTheoryModel`)**: Implements $M/G/c$ multi-server queuing approximations (Kingman's / Allen-Cunneen formula) and Pollaczek-Khinchine formulations to calculate end-to-end p50, p95, and p99 DAG latencies.
3. **LLM Serving Latency Calculator (`LlmServingLatencyCalculator`)**: Computes Time-to-First-Byte (TTFT) and Time-Per-Output-Token (TPOT) accounting for prompt length, parameter count, KV-cache footprint, and speculative decoding speedups.
4. **Roofline Hardware Profiler (`RooflineModelProfiler`)**: Models operational intensity ($I = \text{FLOPs} / \text{Byte}$) against peak FLOPS and HBM bandwidth across NVIDIA H100 SXM5, Google TPU v5p, AMD MI300X, and NVIDIA L4.
5. **FinOps & Hardware Unit Economics Calculator (`FinOpsCalculator`)**: Evaluates monthly infrastructure burn against target QPS, comparing open-source hosting (vLLM) vs proprietary API routing vs prompt caching.
6. **Benchmark Validation Suite**: Automated performance assertions ensuring simulations complete in $<15\text{ ms}$ (well under the $100\text{ ms}$ user requirement).

---

## 2. File Inventory & Class Responsibilities

| File Path | Primary Class | Responsibility | Est. Lines |
| :--- | :--- | :--- | :--- |
| `src/core/math/queuing_theory_model.ts` | `QueuingTheoryModel` | Analytical $M/G/c$ and $M/M/c$ queuing latency and percentile engine | ~180 |
| `src/core/math/llm_serving_latency_calculator.ts` | `LlmServingLatencyCalculator` | Computes TTFT and TPOT memory bandwidth bounds | ~160 |
| `src/core/math/roofline_model_profiler.ts` | `RooflineModelProfiler` | Hardware arithmetic intensity and bottleneck classification | ~190 |
| `src/core/math/finops_calculator.ts` | `FinOpsCalculator` | Monthly compute, GPU instance sizing, and token economics | ~170 |
| `src/core/math/hardware_specs_database.ts` | `HardwareSpecsDatabase` | Authoritative specifications for H100, TPU v5p, MI300X, etc. | ~150 |
| `src/workers/deterministic_sim_worker.ts` | `DeterministicSimWorker` | Web Worker implementation processing DAG graphs via Comlink | ~210 |
| `src/workers/sim_worker_controller.ts` | `SimWorkerController` | Main thread proxy managing Web Worker lifecycle and RPC calls | ~140 |
| `src/core/math/math_constants.ts` | `MathConstants` | Mathematical constants, default hardware profiles, cost rates | ~80 |

---

## 3. Detailed Implementation Steps

### Step 1: Implement Authoritative Hardware Specs Database
- File: `src/core/math/hardware_specs_database.ts`
- Class: `HardwareSpecsDatabase`
  - In-memory database of 2026 hardware accelerators:
    - `NVIDIA_H100_SXM5`: 3,350 GB/s HBM3, 1,979 TFLOPS FP16, \$3.50/hr
    - `GOOGLE_TPU_V5P`: 4,800 GB/s HBM, 459 TFLOPS BF16, \$3.20/hr
    - `AMD_MI300X`: 5,300 GB/s HBM3, 2,610 TFLOPS FP16, \$3.00/hr
    - `NVIDIA_L4`: 300 GB/s GDDR6, 120 TFLOPS FP16, \$0.75/hr
  - Public method: `getSpecs(chipId: string): ChipSpecs`

### Step 2: Implement Queuing Theory Latency Engine
- File: `src/core/math/queuing_theory_model.ts`
- Class: `QueuingTheoryModel`
  - Mathematical formula for Allen-Cunneen $M/G/c$ waiting time:
    $$W_q \approx \left(\frac{C_a^2 + C_s^2}{2}\right) \frac{\rho^{\sqrt{2(c+1)}-1}}{c(1-\rho)} \cdot \frac{1}{\mu}$$
  - Public method: `calculateLatency(params: QueuingParams): QueuingResult`
  - Public method: `estimatePercentiles(meanWaitMs: number, serviceMs: number): LatencyPercentiles`
  - Handles boundary conditions ($\rho \ge 1.0 \implies \infty$ queue overflow).

### Step 3: Implement LLM Serving Latency Calculator
- File: `src/core/math/llm_serving_latency_calculator.ts`
- Class: `LlmServingLatencyCalculator`
  - Mathematical formulation:
    $$\text{TTFT} = \text{QueueDelay} + \frac{2 \cdot P \cdot L_{\text{prompt}}}{\text{MemoryBandwidth}} + \frac{2 \cdot P \cdot L_{\text{prompt}}}{\text{PeakFLOPS}}$$
    $$\text{TPOT} = \frac{2 \cdot P}{\text{MemoryBandwidth}}$$
  - Public method: `calculateLlmLatency(params: LlmServingParams): LlmServingMetrics`
  - Incorporates prompt caching hit ratios ($L_{\text{effective}} = L_{\text{prompt}} \times (1 - \text{CacheHit})$) and speculative decoding speedups.

### Step 4: Implement Roofline Hardware Profiler & FinOps Calculator
- File: `src/core/math/roofline_model_profiler.ts`
- Class: `RooflineModelProfiler`
  - Computes operational intensity: $I = \frac{\text{TotalFLOPs}}{\text{BytesTransferred}}$.
  - Compares against knee point: $I_{\text{knee}} = \frac{P_{\max}}{B_{\max}}$.
  - Classifies bottleneck as `MEMORY_BOUND` or `COMPUTE_BOUND`.
  - Public method: `profileWorkload(workload: WorkloadDescriptor, chipId: string): RooflineResult`
- File: `src/core/math/finops_calculator.ts`
- Class: `FinOpsCalculator`
  - Public method: `calculateMonthlyCost(qps: number, chipId: string, instanceCount: number): FinOpsSummary`
  - Public method: `recommendOptimizedAllocation(targetQps: number, monthlyBudgetUSD: number): AllocationRecommendation`

### Step 5: Implement Web Worker & Main Thread Controller
- File: `src/workers/deterministic_sim_worker.ts`
- Class: `DeterministicSimWorker`
  - Comlink-exposed class running in browser Web Worker thread.
  - Injects `QueuingTheoryModel`, `LlmServingLatencyCalculator`, `RooflineModelProfiler`, `FinOpsCalculator`.
  - Public method: `evaluateGraph(nodes: CanvasNode[], edges: CanvasEdge[], globalParams: GlobalSimParams): SimEvaluationResult`
  - Decomposes DAG traversal into topological sort and node evaluation helper methods ($\le 20$ lines each).
- File: `src/workers/sim_worker_controller.ts`
- Class: `SimWorkerController`
  - Spawns Web Worker, initializes Comlink proxy, handles worker crashes and automatic restart.

---

## 4. Class Contract & Member Ordering Example

```typescript
// src/core/math/roofline_model_profiler.ts
import { HardwareSpecsDatabase } from './hardware_specs_database';

export class RooflineModelProfiler {
  // 1. Class-level constants (non-public, leading underscore)
  private static readonly _MEMORY_BOUND_LABEL = 'MEMORY_BOUND';
  private static readonly _COMPUTE_BOUND_LABEL = 'COMPUTE_BOUND';

  // 2. Constructor
  public constructor(private readonly _db: HardwareSpecsDatabase) {}

  // 3. Public methods
  public profileWorkload(flops: number, bytesTransferred: number, chipId: string): {
    operationalIntensity: number;
    kneeIntensity: number;
    attainableGflops: number;
    bottleneck: 'MEMORY_BOUND' | 'COMPUTE_BOUND';
  } {
    const specs = this._db.getSpecs(chipId);
    const intensity = this._computeIntensity(flops, bytesTransferred);
    const knee = this._computeKnee(specs.peakTflops, specs.memoryBandwidthGbps);
    const attainable = this._computeAttainable(intensity, specs.peakTflops, specs.memoryBandwidthGbps);
    const bottleneck = intensity < knee ? RooflineModelProfiler._MEMORY_BOUND_LABEL : RooflineModelProfiler._COMPUTE_BOUND_LABEL;
    return { operationalIntensity: intensity, kneeIntensity: knee, attainableGflops: attainable, bottleneck };
  }

  // 4. Protected methods (none)

  // 5. Private methods
  private _computeIntensity(flops: number, bytes: number): number {
    return bytes <= 0 ? 0 : flops / bytes;
  }

  private _computeKnee(peakTflops: number, bandwidthGbps: number): number {
    return bandwidthGbps <= 0 ? 0 : (peakTflops * 1000) / bandwidthGbps;
  }

  private _computeAttainable(intensity: number, peakTflops: number, bandwidthGbps: number): number {
    const peakGflops = peakTflops * 1000;
    const bandwidthBound = intensity * bandwidthGbps;
    return Math.min(peakGflops, bandwidthBound);
  }
}
```

---

## 5. Verification & Testing Requirements

### Test Files to Create
- `tests/core/math/test_hardware_specs_database.test.ts`: Verifies specs lookup and chip constants.
- `tests/core/math/test_queuing_theory_model.test.ts`: Validates analytical $M/G/c$ values against queuing textbook test cases.
- `tests/core/math/test_llm_serving_latency_calculator.test.ts`: Tests TTFT and TPOT across various parameter and prompt sizes.
- `tests/core/math/test_roofline_model_profiler.test.ts`: Asserts correct classification of memory-bound vs compute-bound workloads.
- `tests/core/math/test_finops_calculator.test.ts`: Verifies budget allocation and instance count calculations.
- `tests/workers/test_deterministic_sim_worker.test.ts`: Benchmarks graph execution time, asserting completion in $<15\text{ ms}$ for 100-node graphs.

### Coverage & Quality Gates
- **$\ge 90\%$ branch and line coverage**.
- Run verification:
```bash
npm run lint
npx tsc --noEmit
npm run test:cov
```

---

## 6. Execution Checklist

- [ ] Implement `MathConstants` in `src/core/math/math_constants.ts`.
- [ ] Implement `HardwareSpecsDatabase` in `src/core/math/hardware_specs_database.ts`.
- [ ] Implement `QueuingTheoryModel` in `src/core/math/queuing_theory_model.ts`.
- [ ] Implement `LlmServingLatencyCalculator` in `src/core/math/llm_serving_latency_calculator.ts`.
- [ ] Implement `RooflineModelProfiler` in `src/core/math/roofline_model_profiler.ts`.
- [ ] Implement `FinOpsCalculator` in `src/core/math/finops_calculator.ts`.
- [ ] Implement `DeterministicSimWorker` in `src/workers/deterministic_sim_worker.ts`.
- [ ] Implement `SimWorkerController` in `src/workers/sim_worker_controller.ts`.
- [ ] Write all 6 comprehensive test suites ensuring $\ge 90\%$ branch coverage and $<15\text{ ms}$ SLA.
- [ ] Verify zero lint, type, or test errors.

