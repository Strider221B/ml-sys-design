# Plan 08: Mathematical Alignment, Causal Inference & Data Archaeology (Pyodide WASM)

> **Phase:** 08  
> **Status:** Pending Execution  
> **Design References:**  
> - [06_data_alignment_causal_and_math_subsystems.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/06_data_alignment_causal_and_math_subsystems.md)  
> - [03_deterministic_simulation_and_worker_engine.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/03_deterministic_simulation_and_worker_engine.md)  
> - [coding_standards.md](file:///home/somesh/git_repos/ml-sys-design/documentation/prompts/coding_standards.md)  
> **Virtual Environment:** `source ~/python_envs/p313_llm/bin/activate`

---

## 1. Executive Summary & Objectives

Implement the browser-based scientific computation layer using **Pyodide WebAssembly (WASM)** and strict-OOP Python 3.13 classes, enabling users to test mathematical reward functions, uncover reward hacking, validate causal DAG d-separation, run CUPED variance reduction, and detect dataset contamination with MinHash LSH.

### Core Deliverables
1. **Pyodide Web Worker Runtime (`PyodideSandboxWorker`, `PyodideWorkerClient`)**:
   - In-browser Python 3.13 WASM execution engine isolated in a Web Worker, pre-loading `numpy` 2.0 (SIMD vectorized) and `scipy` 1.14.
   - Native ES module Web Worker bundling powered by Next.js 16.4 (`new Worker(new URL('...', import.meta.url), { type: 'module' })`).
2. **Reward Function Sandbox & Goodhart's Law Detector (`RewardSimulator`)**:
   - Executes user-authored Python reward functions against a simulated population of 1,000 synthetic agent candidates.
   - Detects reward hacking traps: length exploitation, sycophancy, repetitive token loops, and safety constraint evasion.
3. **Multi-Objective Optimization Matrix (`ParetoOptimizer`)**:
   - Computes Pareto frontiers balancing conflicting metrics (user engagement vs toxicity minimization vs compute cost).
4. **Causal Inference & Counterfactual Lab (`CausalInferenceEngine`)**:
   - Validates DAG d-separation to identify confounding variables and colliders.
   - Implements **CUPED (Controlled-experiment Using Pre-Experiment Data)** variance reduction ($\hat{\theta} = \frac{\operatorname{Cov}(Y, X)}{\operatorname{Var}(X)}$) using NumPy 2.0 array operations, and Average Treatment Effect (ATE).
5. **Data Archaeology & Contamination Auditing Suite (`MinHashAuditor`, `InformationDensityFilter`)**:
   - Detects test set leakage using 128-permutation MinHash LSH indexing.
   - Calculates Shannon entropy and n-gram frequency to prune low-density synthetic training batches.
6. **Synthetic Data Pipeline Auditor & HITL Workflow Designer (`HitlWorkflowDesigner`)**:
   - Visual canvas for designing active learning human verification gates.

---

## 2. File Inventory & Class Responsibilities

| File Path | Primary Class | Responsibility | Est. Lines |
| :--- | :--- | :--- | :--- |
| `src/workers/pyodide/math_sandbox.py` | `MathSandbox` | Python scientific calculator (CUPED, entropy, ATE) via NumPy 2.0 | ~180 |
| `src/workers/pyodide/reward_simulator.py` | `RewardSimulator` | 1,000-agent trajectory simulation and Goodhart hacking detector | ~210 |
| `src/workers/pyodide/causal_inference.py` | `CausalInferenceEngine` | DAG d-separation and backdoor criterion validator | ~190 |
| `src/workers/pyodide/minhash_auditor.py` | `MinHashAuditor` | 128-hash MinHash LSH test-set contamination scanner | ~170 |
| `src/workers/pyodide_sandbox_worker.ts` | `PyodideSandboxWorker` | Comlink Web Worker managing Pyodide WASM lifecycle | ~220 |
| `src/workers/pyodide_worker_client.ts` | `PyodideWorkerClient` | Next.js 16.4 native ES module worker instantiator and Comlink client | ~110 |
| `src/core/math/pareto_optimizer.ts` | `ParetoOptimizer` | Pareto frontier calculation for multi-objective trade-offs | ~160 |
| `src/core/data_alignment/hitl_workflow_designer.ts` | `HitlWorkflowDesigner` | Active learning human-in-the-loop queue model | ~150 |
| `src/core/math/pyodide_constants.ts` | `PyodideConstants` | Constants for Pyodide CDN URLs, package names, default agent populations | ~70 |

---

## 3. Detailed Implementation Steps

### Step 1: Implement Scientific Python Math Sandbox
- File: `src/workers/pyodide/math_sandbox.py`
- Class: `MathSandbox`
  - Strict OOP: all methods inside class, typed parameters and return values.
  - Member ordering: Class constants -> `__init__` -> Public methods -> Private methods.
  - Method bodies strictly $\le 20$ lines.
  - Public methods:
    - `compute_cuped(y_control: list[float], y_variant: list[float], x_control: list[float], x_variant: list[float]) -> dict[str, float]`
      - Computes $\theta = \frac{\operatorname{Cov}(Y, X)}{\operatorname{Var}(X)}$ and variance reduction percentage $1 - \rho^2$.
    - `compute_shannon_entropy(tokens: list[str]) -> float`
      - Computes $H(X) = -\sum p(x) \log_2 p(x)$.

### Step 2: Implement Reward Simulator & Goodhart Hacking Detector
- File: `src/workers/pyodide/reward_simulator.py`
- Class: `RewardSimulator`
  - Injects user reward code into a sandboxed execution context.
  - Simulates 1,000 synthetic agent responses spanning 4 behavior clusters:
    1. Honest & balanced responses
    2. Overly verbose / long-winded responses
    3. Sycophantic agreeableness
    4. Toxic/jailbreak edge cases
  - Public method: `evaluate_reward_function(reward_code: str) -> dict[str, Any]`
  - Emits warning if the agent population exploits length or sycophancy shortcuts.

### Step 3: Implement Causal DAG & D-Separation Engine
- File: `src/workers/pyodide/causal_inference.py`
- Class: `CausalInferenceEngine`
  - Public method: `validate_backdoor_criterion(dag_edges: list[tuple[str, str]], treatment: str, outcome: str, conditioning_set: list[str]) -> dict[str, Any]`
  - Validates that:
    1. No node in conditioning set is a descendant of treatment.
    2. Conditioning set blocks all backdoor paths between treatment and outcome.

### Step 4: Implement MinHash LSH Contamination Auditor
- File: `src/workers/pyodide/minhash_auditor.py`
- Class: `MinHashAuditor`
  - Constants: `_NUM_PERMUTATIONS = 128`, `_DEFAULT_SIMILARITY_THRESHOLD = 0.85`.
  - Public method: `scan_contamination(train_corpus: list[str], test_corpus: list[str]) -> list[dict[str, Any]]`
  - Computes 128 hash signatures per document to detect leaked test prompts in training sets.

### Step 5: Implement Pyodide Web Worker & Next.js 16.4 Worker Client
- File: `src/workers/pyodide_sandbox_worker.ts`
- Class: `PyodideSandboxWorker`
  - Comlink-exposed class loading Pyodide from CDN:
    `importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js')`.
  - Pre-loads `numpy` 2.0 and `scipy` 1.14.
  - Exposes RPC methods: `runCuped()`, `runRewardSimulation()`, `runCausalDSeparation()`, `runMinHashScan()`.
- File: `src/workers/pyodide_worker_client.ts`
- Class: `PyodideWorkerClient`
  - Manages Next.js 16.4 native ES module worker loading via `new Worker(new URL('./pyodide_sandbox_worker.ts', import.meta.url), { type: 'module' })` with Comlink RPC.

---

## 4. Class Contract & Member Ordering Example

```python
# src/workers/pyodide/math_sandbox.py
from typing import Any
import numpy as np


class MathSandbox:
    """Scientific calculations executed within Pyodide WASM."""

    # 1. Class-level constants (non-public, leading underscore)
    _MIN_VARIANCE_THRESHOLD: float = 1e-9
    _MAX_PERCENTAGE: float = 100.0

    # 2. Constructor
    def __init__(self) -> None:
        pass

    # 3. Public methods
    def compute_cuped(
        self,
        y_control: list[float],
        y_variant: list[float],
        x_control: list[float],
        x_variant: list[float],
    ) -> dict[str, float]:
        """Calculates CUPED theta and variance reduction percentage."""
        y_c, y_v = np.array(y_control), np.array(y_variant)
        x_c, x_v = np.array(x_control), np.array(x_variant)
        theta = self._calculate_theta(y_c, x_c)
        y_c_cuped = y_c - theta * (x_c - np.mean(x_c))
        y_v_cuped = y_v - theta * (x_v - np.mean(x_c))
        red_pct = self._calculate_reduction(y_c, y_c_cuped)
        return {
            "theta": float(theta),
            "original_variance": float(np.var(y_c)),
            "cuped_variance": float(np.var(y_c_cuped)),
            "reduction_percentage": float(red_pct),
        }

    # 4. Protected methods (none)

    # 5. Private methods
    def _calculate_theta(self, y: np.ndarray, x: np.ndarray) -> float:
        var_x = float(np.var(x))
        if var_x < self._MIN_VARIANCE_THRESHOLD:
            return 0.0
        cov_yx = float(np.cov(y, x)[0, 1])
        return cov_yx / var_x

    def _calculate_reduction(self, orig: np.ndarray, cuped: np.ndarray) -> float:
        var_orig = float(np.var(orig))
        if var_orig < self._MIN_VARIANCE_THRESHOLD:
            return 0.0
        return (1.0 - (float(np.var(cuped)) / var_orig)) * self._MAX_PERCENTAGE
```

---

## 5. Verification & Testing Requirements

### Test Files to Create
- `tests/workers/pyodide/test_math_sandbox.py`: Verifies CUPED theta and variance reduction with synthetic data.
- `tests/workers/pyodide/test_reward_simulator.py`: Tests length bias and sycophancy trap detection.
- `tests/workers/pyodide/test_causal_inference.py`: Tests d-separation on confounding and collider DAGs.
- `tests/workers/pyodide/test_minhash_auditor.py`: Tests detection of duplicate/near-duplicate leaked prompts.
- `tests/workers/test_pyodide_sandbox_worker.test.ts`: Tests Comlink RPC integration with Pyodide WASM.
- `tests/core/math/test_pareto_optimizer.test.ts`: Verifies non-dominated Pareto sorting.

### Coverage & Quality Gates
- **$\ge 90\%$ branch and line coverage** across both Python (`pytest`) and TypeScript (`vitest`).
- Run verification:
```bash
# Python Verification
source ~/python_envs/p313_llm/bin/activate
uv run --with ruff ruff check src/workers/pyodide tests/workers/pyodide
uv run --with mypy mypy src/workers/pyodide
uv run pytest --cov=src/workers/pyodide --cov-report=term-missing --cov-fail-under=90

# TypeScript Verification
npm run lint
npx tsc --noEmit
npm run test:cov
```

---

## 6. Execution Checklist

- [ ] Implement `PyodideConstants` in `src/core/math/pyodide_constants.ts`.
- [ ] Implement `MathSandbox` in `src/workers/pyodide/math_sandbox.py`.
- [ ] Implement `RewardSimulator` in `src/workers/pyodide/reward_simulator.py`.
- [ ] Implement `CausalInferenceEngine` in `src/workers/pyodide/causal_inference.py`.
- [ ] Implement `MinHashAuditor` in `src/workers/pyodide/minhash_auditor.py`.
- [ ] Implement `PyodideSandboxWorker` in `src/workers/pyodide_sandbox_worker.ts`.
- [ ] Implement `PyodideWorkerClient` in `src/workers/pyodide_worker_client.ts`.
- [ ] Implement `ParetoOptimizer` in `src/core/math/pareto_optimizer.ts`.
- [ ] Implement `HitlWorkflowDesigner` in `src/core/data_alignment/hitl_workflow_designer.ts`.
- [ ] Write all 6 comprehensive test suites ensuring $\ge 90\%$ branch coverage.
- [ ] Verify zero lint, type, or test errors across both Python and TypeScript.

