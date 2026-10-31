# Plan 07: Chaos Engineering & Failure Sandbox

> **Phase:** 07  
> **Status:** Pending Execution  
> **Design References:**  
> - [05_interview_chaos_and_case_study_subsystems.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/05_interview_chaos_and_case_study_subsystems.md)  
> - [02_dual_mode_ai_gateway_and_exchange_spec.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/02_dual_mode_ai_gateway_and_exchange_spec.md)  
> - [coding_standards.md](file:///home/somesh/git_repos/ml-sys-design/documentation/prompts/coding_standards.md)  
> **Virtual Environment:** `source ~/python_envs/p313_llm/bin/activate`

---

## 1. Executive Summary & Objectives

Implement the **Chaos Engineering & Failure Sandbox**, challenging engineers with real-time adversarial attacks, infinite agent recursion loops, edge quantization trade-offs, and gamified production incident roulette.

### Core Deliverables
1. **Adversarial Playground & Fault Injector (`FaultInjectionEngine`)**:
   - Injects network partitions, token-limit overflows, and race conditions into the architecture canvas graph.
   - Connects directly to interactive edge cable badges (`InteractiveInfraEdge`) enabling single-click fault injection on target communication channels.
2. **"Gemini Argon" Adversarial Reviewer (`GeminiArgonReviewer`)**:
   - Analyzes canvas graphs to detect hidden single-points-of-failure and generates custom **Killer Workload Packets** (e.g. adversarial prompts, skewed embedding clusters) designed to trigger cascading crashes.
3. **Agent Cascading Loop Simulator (`AgentCircuitBreaker`, `AgentCascadeSimulator`)**:
   - Simulates multi-agent systems entering infinite recursive execution loops within nested agent swarm subflows (`AgentSwarmGroupNode`), draining API token budgets.
   - Enables users to configure deterministic circuit breakers: maximum loop depth, budget ceilings, and loopback cycle detectors.
4. **Edge & Quantization Debugger (`EdgeQuantizationDebugger`)**:
   - Models mobile/embedded memory ceilings, thermal throttling clock drops, and perplexity degradation across FP32, FP16, INT8, and INT4 quantization.
5. **Production Incident Roulette & Chaos Monkey (`IncidentRouletteEngine`)**:
   - Real-time incident generator burning down error budgets ($SLA = 99.9\%$) while presenting users with dynamic remediation choices before the system halts.

---

## 2. File Inventory & Class Responsibilities

| File Path | Primary Class | Responsibility | Est. Lines |
| :--- | :--- | :--- | :--- |
| `src/core/chaos/fault_injection_engine.ts` | `FaultInjectionEngine` | Simulates network partitions, dropped packets, and latency spikes | ~190 |
| `src/core/chaos/gemini_argon_reviewer.ts` | `GeminiArgonReviewer` | Red-teams architectures and generates targeted killer workload packets | ~210 |
| `src/core/chaos/agent_circuit_breaker.ts` | `AgentCircuitBreaker` | Enforces loop depth, API budget ceilings, and agent trip conditions | ~160 |
| `src/core/chaos/agent_cascade_simulator.ts` | `AgentCascadeSimulator` | Simulates multi-agent recursion and budget depletion | ~180 |
| `src/core/chaos/edge_quantization_debugger.ts` | `EdgeQuantizationDebugger` | Models memory footprints, thermal throttling, and INT4 precision loss | ~190 |
| `src/core/chaos/incident_roulette_engine.ts` | `IncidentRouletteEngine` | Real-time incident countdown and error budget burn calculator | ~210 |
| `src/core/chaos/chaos_constants.ts` | `ChaosConstants` | Failure types, default error budgets, quantization perplexity curves | ~80 |
| `src/components/chaos/chaos_sandbox_workspace.tsx` | `ChaosSandboxWorkspace` | Interactive failure injection and incident response console | ~240 |
| `src/components/chaos/chaos_guidance_panel.tsx` | `ChaosGuidancePanel` | Runbook guidance panel detailing attack goals, steps, and mitigation tips | ~150 |

---

## 3. Detailed Implementation Steps

### Step 1: Implement Fault Injection Engine
- File: `src/core/chaos/fault_injection_engine.ts`
- Class: `FaultInjectionEngine`
  - Injects perturbations into canvas edges and nodes:
    - `NETWORK_PARTITION`: Drops communication across selected edge boundaries.
    - `TOKEN_OVERFLOW`: Exceeds context window limits (e.g. 128k tokens).
    - `RACE_CONDITION`: Injects asynchronous jitter and out-of-order writes.
  - Public method: `injectFault(graph: CanvasGraph, fault: FaultDescriptor): PerturbedGraph`

### Step 2: Implement Gemini Argon Adversarial Reviewer
- File: `src/core/chaos/gemini_argon_reviewer.ts`
- Class: `GeminiArgonReviewer`
  - Injects `LLMOrchestrator` using module key `CHAOS_MONKEY_ARGON`.
  - Public method: `analyzeVulnerabilities(graph: CanvasGraph): Promise<ArgonReviewResult>`
  - Generates killer workload packets:
    - High-entropy adversarial token sequences.
    - Embedding queries triggering dense vector search worst-case hops.
  - Supports automatic air-gap JSON prompt export if Gemini Free Tier is rate-limited.

### Step 3: Implement Agent Cascading Loop Simulator & Circuit Breakers
- File: `src/core/chaos/agent_circuit_breaker.ts`
- Class: `AgentCircuitBreaker`
  - Constants: `_DEFAULT_MAX_DEPTH = 5`, `_DEFAULT_BUDGET_USD = 10.0`.
  - Public methods:
    - `recordCall(agentId: string, tokensUsed: number, costUsd: number): CircuitStatus`
    - `isTripped(): boolean`
    - `reset(): void`
- File: `src/core/chaos/agent_cascade_simulator.ts`
- Class: `AgentCascadeSimulator`
  - Simulates supervisor $\leftrightarrow$ subagent ping-pong recursion.
  - Demonstrates unmitigated cascade vs protected circuit breaker execution.

### Step 4: Implement Edge & Quantization Debugger
- File: `src/core/chaos/edge_quantization_debugger.ts`
- Class: `EdgeQuantizationDebugger`
  - Mathematical memory footprint formula:
    $$M = \frac{P \times B}{8} \times 1.25\text{ (KV/runtime overhead)}$$
    where $P$ is parameter count (e.g. 7B, 13B), $B$ is bits per weight (FP32=32, FP16=16, INT8=8, INT4=4).
  - Models thermal throttling clock drops as sustained load heats mobile SoC.
  - Computes perplexity penalty: $\Delta\text{Perplexity} \propto \frac{1}{\sqrt{B}}$.
  - Public method: `simulateEdgeDeployment(modelParams: EdgeModelParams): EdgeSimResult`

### Step 5: Implement Incident Roulette & Error Budget Burn Engine
- File: `src/core/chaos/incident_roulette_engine.ts`
- Class: `IncidentRouletteEngine`
  - Tracks monthly error budget: e.g. for $99.9\%$ SLA, error budget is 43.2 minutes/month.
  - Simulates active disaster countdowns with ticking clock.
  - Public methods:
    - `triggerRandomIncident(): IncidentEvent`
    - `applyMitigation(choiceId: string): MitigationResult`
    - `getErrorBudgetRemaining(): number`

---

## 4. Class Contract & Member Ordering Example

```typescript
// src/core/chaos/agent_circuit_breaker.ts

export class AgentCircuitBreaker {
  // 1. Class-level constants (non-public, leading underscore)
  private static readonly _DEFAULT_MAX_CALLS = 10;
  private static readonly _DEFAULT_MAX_BUDGET_USD = 5.0;

  // 2. Constructor
  public constructor(
    private readonly _maxCalls: number = AgentCircuitBreaker._DEFAULT_MAX_CALLS,
    private readonly _maxBudgetUsd: number = AgentCircuitBreaker._DEFAULT_MAX_BUDGET_USD,
    private _callCount: number = 0,
    private _accumulatedBudgetUsd: number = 0,
    private _isTripped: boolean = false
  ) {}

  // 3. Public methods
  public recordCall(costUsd: number): { isTripped: boolean; reason?: string } {
    if (this._isTripped) {
      return { isTripped: true, reason: 'Circuit already tripped.' };
    }
    this._callCount++;
    this._accumulatedBudgetUsd += costUsd;
    if (this._exceedsLimits()) {
      this._isTripped = true;
      return { isTripped: true, reason: this._formatTripReason() };
    }
    return { isTripped: false };
  }

  public get isTripped(): boolean {
    return this._isTripped;
  }

  public reset(): void {
    this._callCount = 0;
    this._accumulatedBudgetUsd = 0;
    this._isTripped = false;
  }

  // 4. Protected methods (none)

  // 5. Private methods
  private _exceedsLimits(): boolean {
    return this._callCount >= this._maxCalls || this._accumulatedBudgetUsd >= this._maxBudgetUsd;
  }

  private _formatTripReason(): string {
    return this._callCount >= this._maxCalls ? 'Call depth limit exceeded' : 'Budget limit exceeded';
  }
}
```

---

## 5. Verification & Testing Requirements

### Test Files to Create
- `tests/core/chaos/test_fault_injection_engine.test.ts`: Verifies edge drops and partition simulation.
- `tests/core/chaos/test_gemini_argon_reviewer.test.ts`: Tests killer workload packet generation and air-gap export.
- `tests/core/chaos/test_agent_circuit_breaker.test.ts`: Tests call depth tripping and budget ceiling trips.
- `tests/core/chaos/test_agent_cascade_simulator.test.ts`: Verifies infinite recursion detection.
- `tests/core/chaos/test_edge_quantization_debugger.test.ts`: Validates INT4 memory footprint and thermal drop formulas.
- `tests/core/chaos/test_incident_roulette_engine.test.ts`: Tests error budget countdown and remediation outcomes.

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

- [ ] Implement `ChaosConstants` in `src/core/chaos/chaos_constants.ts`.
- [ ] Implement `FaultInjectionEngine` in `src/core/chaos/fault_injection_engine.ts`.
- [ ] Implement `GeminiArgonReviewer` in `src/core/chaos/gemini_argon_reviewer.ts`.
- [ ] Implement `AgentCircuitBreaker` in `src/core/chaos/agent_circuit_breaker.ts`.
- [ ] Implement `AgentCascadeSimulator` in `src/core/chaos/agent_cascade_simulator.ts`.
- [ ] Implement `EdgeQuantizationDebugger` in `src/core/chaos/edge_quantization_debugger.ts`.
- [ ] Implement `IncidentRouletteEngine` in `src/core/chaos/incident_roulette_engine.ts`.
- [ ] Implement `ChaosSandboxWorkspace` in `src/components/chaos/chaos_sandbox_workspace.tsx`.
- [ ] Implement `ChaosGuidancePanel` in `src/components/chaos/chaos_guidance_panel.tsx`.
- [ ] Write all 7 comprehensive unit test suites ensuring $\ge 90\%$ branch coverage.
- [ ] Verify zero lint, type, or test errors.

