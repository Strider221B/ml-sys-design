# Plan 09: Telemetry Dashboard, Compliance & Portfolio Exporter

> **Phase:** 09  
> **Status:** Completed  
> **Design References:**  
> - [07_telemetry_compliance_and_portfolio_exporter.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/07_telemetry_compliance_and_portfolio_exporter.md)  
> - [04_canvas_and_ui_component_system.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/04_canvas_and_ui_component_system.md)  
> - [02_dual_mode_ai_gateway_and_exchange_spec.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/02_dual_mode_ai_gateway_and_exchange_spec.md)  
> - [coding_standards.md](file:///home/somesh/git_repos/ml-sys-design/documentation/prompts/coding_standards.md)  
> **Virtual Environment:** `source ~/python_envs/p313_llm/bin/activate`

---

## 1. Executive Summary & Objectives

Implement the platform's operational telemetry, legal compliance simulator, and career translation systems: the **60 FPS Telemetry Dashboard**, the **Log Trace Analysis Game**, the **Regulatory & AI Safety Simulator (EU AI Act, GDPR SISA)**, and the **Resume-Builder Portfolio Exporter (Terraform, Kubernetes, GitHub Pages)**.

### Core Deliverables
1. **$60\text{ FPS}$ Visual Telemetry Profiler (`TelemetryRingBuffer`, `TelemetryProfilerRenderer`)**:
   - Decoupled from React renders via WebGL2/Canvas2D `OffscreenCanvas` and typed `Float32Array` ring buffers.
   - Fed directly via Zustand 5.0 transient subscriptions (`getStore().subscribe(selector, callback)`) bypassing React DOM reconciliation.
   - Embeddable within dynamic resizable canvas nodes via `@xyflow/react` `<NodeResizer>` controls.
   - Visualizes live time-series: p99 latency, TTFT, GPU memory fragmentation, and queue lag.
2. **Log Trace Analysis Game (`LogTraceIncidentEngine`, `LogTerminalUI`)**:
   - Simulates real-world messy production crash logs: CUDA Out-Of-Memory, NCCL ring deadlocks, gRPC timeouts, and vector shard starvation.
   - Interactive terminal allowing candidates to filter logs, isolate the root cause, and submit diagnoses.
3. **Regulatory, Compliance & AI Safety Simulator (`ComplianceAuditEngine`, `MachineUnlearningSimulator`)**:
   - Evaluates architectures against the **EU AI Act** High-Risk AI System obligations.
   - Simulates **GDPR Right-to-be-Forgotten (RTBF)** using **SISA (Sharded, Isolated, Sliced, Aggregated)** unlearning and Vector Tombstoning.
   - Tests copyright ingestion filters and semantic prompt injection guardrails.
4. **Interactive Resume-Builder & Portfolio Exporter (`TerraformHclExporter`, `KubernetesManifestExporter`, `ProductionManifestoGenerator`, `GitHubPublisher`)**:
   - Compiles visual canvas graphs into production-ready **Terraform HCL** and **Kubernetes manifests**.
   - Generates a polished Markdown **Production Manifesto** detailing architecture rationale, unit economics, and chaos safeguards.
   - Publishes static interactive portfolios directly to **GitHub Pages** via the GitHub REST API.

---

## 2. File Inventory & Class Responsibilities

| File Path | Primary Class | Responsibility | Est. Lines |
| :--- | :--- | :--- | :--- |
| `src/core/telemetry/telemetry_ring_buffer.ts` | `TelemetryRingBuffer` | High-frequency circular buffer for time-series metrics | ~140 |
| `src/core/telemetry/telemetry_profiler_renderer.ts` | `TelemetryProfilerRenderer` | 60 FPS OffscreenCanvas WebGL2 / Canvas2D rendering loop | ~210 |
| `src/core/telemetry/log_trace_incident_engine.ts` | `LogTraceIncidentEngine` | Generates multi-tier synthetic log streams with injected faults | ~200 |
| `src/core/compliance/compliance_audit_engine.ts` | `ComplianceAuditEngine` | Evaluates EU AI Act compliance and copyright guardrails | ~190 |
| `src/core/compliance/machine_unlearning_simulator.ts` | `MachineUnlearningSimulator` | SISA retraining cost and Vector Tombstoning model | ~170 |
| `src/core/exporters/terraform_hcl_exporter.ts` | `TerraformHclExporter` | Compiles canvas nodes and edges to Terraform AWS/GCP HCL | ~210 |
| `src/core/exporters/kubernetes_manifest_exporter.ts` | `KubernetesManifestExporter` | Compiles canvas to Kubernetes Deployments, Services, and CRDs | ~190 |
| `src/core/exporters/production_manifesto_generator.ts` | `ProductionManifestoGenerator` | Generates structured Markdown architectural whitepapers | ~180 |
| `src/core/exporters/github_publisher.ts` | `GitHubPublisher` | Deploys static portfolio artifacts to GitHub Pages via REST API | ~170 |
| `src/core/telemetry/telemetry_constants.ts` | `TelemetryConstants` | Buffer sizes, target FPS, log incident definitions, compliance rules | ~80 |

---

## 3. Detailed Implementation Steps

### Step 1: Implement 60 FPS Telemetry Profiler & Ring Buffer
- File: `src/core/telemetry/telemetry_ring_buffer.ts`
- Class: `TelemetryRingBuffer`
  - In-memory circular buffer with `Float32Array` backing store.
  - Public methods: `push(val: number): void`, `getSnapshot(): Float32Array`, `getLatest(): number`.
- File: `src/core/telemetry/telemetry_profiler_renderer.ts`
- Class: `TelemetryProfilerRenderer`
  - Renders to `HTMLCanvasElement` or `OffscreenCanvas`.
  - Uses `requestAnimationFrame` maintaining $16.6\text{ ms}$ render ticks.

### Step 2: Implement Log Trace Analysis Game
- File: `src/core/telemetry/log_trace_incident_engine.ts`
- Class: `LogTraceIncidentEngine`
  - Generates realistic, timestamped, noisy multi-system logs:
    - Envoy gateway ingress logs
    - PyTorch / vLLM worker logs (e.g. `RuntimeError: CUDA out of memory. Tried to allocate 2.40 GiB`)
    - NCCL distributed collective logs (e.g. `NCCL WARN Call to connect returned Connection refused`)
    - Qdrant / Milvus vector shard logs
  - Public method: `generateIncidentTrace(failureScenario: IncidentType): LogStream`
  - Public method: `validateDiagnosis(incidentId: string, candidateRootCause: string): boolean`

### Step 3: Implement EU AI Act & GDPR Machine Unlearning Simulator
- File: `src/core/compliance/compliance_audit_engine.ts`
- Class: `ComplianceAuditEngine`
  - Injects `LLMOrchestrator` using module key `REGULATORY_COMPLIANCE_SIM`.
  - Evaluates system architecture against EU AI Act Articles 9-15 (Risk Management, Data Governance, Technical Documentation, Human Oversight, Robustness & Cybersecurity).
- File: `src/core/compliance/machine_unlearning_simulator.ts`
- Class: `MachineUnlearningSimulator`
  - Models **SISA** architecture: partitions training dataset into $S$ shards and each shard into $R$ slices.
  - Retraining cost for user deletion is bounded by $\frac{1}{S \times R}$ of full retraining compute.
  - Models Vector Tombstoning: soft-deletes embeddings and sets filtered cosine similarity masks.

### Step 4: Implement Terraform & Kubernetes AST Exporters
- File: `src/core/exporters/terraform_hcl_exporter.ts`
- Class: `TerraformHclExporter`
  - Maps canvas nodes to cloud resources:
    - `InferenceGatewayNode` $\to$ `aws_lb`, `aws_lb_target_group`
    - `ModelWorkerNode` $\to$ `aws_instance` (e.g. `g5.12xlarge`, `p4de.24xlarge`) with vLLM user data script
    - `VectorDatabaseNode` $\to$ `helm_release` (Qdrant / Milvus)
    - `FeatureStoreNode` $\to$ `aws_elasticache_cluster` (Redis)
  - Public method: `exportHcl(graph: CanvasGraph): string`
- File: `src/core/exporters/kubernetes_manifest_exporter.ts`
- Class: `KubernetesManifestExporter`
  - Compiles canvas into multi-document Kubernetes YAML manifests: Deployment, Service, HorizontalPodAutoscaler, and NetworkPolicy.

### Step 5: Implement Production Manifesto & GitHub Pages Publisher
- File: `src/core/exporters/production_manifesto_generator.ts`
- Class: `ProductionManifestoGenerator`
  - Injects `LLMOrchestrator` using module key `RESUME_PORTFOLIO_EXPORTER`.
  - Generates comprehensive technical write-up: Problem Statement, Sizing Calculations, Hardware Unit Economics, Chaos Mitigations, Compliance Architecture.
- File: `src/core/exporters/github_publisher.ts`
- Class: `GitHubPublisher`
  - Uses candidate GitHub OAuth access token.
  - Commits generated static site bundle to candidate repository `gh-pages` branch via GitHub REST API.

---

## 4. Class Contract & Member Ordering Example

```typescript
// src/core/telemetry/telemetry_ring_buffer.ts

export class TelemetryRingBuffer {
  // 1. Class-level constants (non-public, leading underscore)
  private static readonly _DEFAULT_CAPACITY = 300; // 5 seconds at 60 Hz

  // 2. Constructor
  public constructor(
    private readonly _capacity: number = TelemetryRingBuffer._DEFAULT_CAPACITY,
    private readonly _buffer: Float32Array = new Float32Array(_capacity),
    private _head: number = 0,
    private _size: number = 0
  ) {}

  // 3. Public methods
  public push(value: number): void {
    this._buffer[this._head] = value;
    this._head = (this._head + 1) % this._capacity;
    if (this._size < this._capacity) {
      this._size++;
    }
  }

  public getSnapshot(): Float32Array {
    const snapshot = new Float32Array(this._size);
    this._copyOrderedValues(snapshot);
    return snapshot;
  }

  public getLatest(): number {
    if (this._size === 0) return 0;
    const lastIndex = (this._head - 1 + this._capacity) % this._capacity;
    return this._buffer[lastIndex];
  }

  // 4. Protected methods (none)

  // 5. Private methods
  private _copyOrderedValues(target: Float32Array): void {
    const start = (this._head - this._size + this._capacity) % this._capacity;
    for (let i = 0; i < this._size; i++) {
      target[i] = this._buffer[(start + i) % this._capacity];
    }
  }
}
```

---

## 5. Verification & Testing Requirements

### Test Files to Create
- `tests/core/telemetry/test_telemetry_ring_buffer.test.ts`: Verifies circular wrapping and snapshot order.
- `tests/core/telemetry/test_telemetry_profiler_renderer.test.ts`: Tests canvas draw loop and FPS timing.
- `tests/core/telemetry/test_log_trace_incident_engine.test.ts`: Tests CUDA OOM and NCCL log generation and diagnosis checks.
- `tests/core/compliance/test_compliance_audit_engine.test.ts`: Tests EU AI Act checks and air-gap prompt export.
- `tests/core/compliance/test_machine_unlearning_simulator.test.ts`: Validates SISA compute bound equations.
- `tests/core/exporters/test_terraform_hcl_exporter.test.ts`: Validates generated Terraform HCL syntax.
- `tests/core/exporters/test_kubernetes_manifest_exporter.test.ts`: Validates generated YAML manifests.
- `tests/core/exporters/test_github_publisher.test.ts`: Mocks GitHub REST API for `gh-pages` deployment.

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

- [x] Implement `TelemetryConstants` in `src/core/telemetry/telemetry_constants.ts`.
- [x] Implement `TelemetryRingBuffer` in `src/core/telemetry/telemetry_ring_buffer.ts`.
- [x] Implement `TelemetryProfilerRenderer` in `src/core/telemetry/telemetry_profiler_renderer.ts`.
- [x] Implement `LogTraceIncidentEngine` in `src/core/telemetry/log_trace_incident_engine.ts`.
- [x] Implement `ComplianceAuditEngine` in `src/core/compliance/compliance_audit_engine.ts`.
- [x] Implement `MachineUnlearningSimulator` in `src/core/compliance/machine_unlearning_simulator.ts`.
- [x] Implement `TerraformHclExporter` in `src/core/exporters/terraform_hcl_exporter.ts`.
- [x] Implement `KubernetesManifestExporter` in `src/core/exporters/kubernetes_manifest_exporter.ts`.
- [x] Implement `ProductionManifestoGenerator` in `src/core/exporters/production_manifesto_generator.ts`.
- [x] Implement `GithubPublisher` in `src/core/exporters/github_publisher.ts`.
- [x] Write all comprehensive unit test suites ensuring $\ge 90\%$ branch coverage.
- [x] Verify zero lint, type, or test errors.

