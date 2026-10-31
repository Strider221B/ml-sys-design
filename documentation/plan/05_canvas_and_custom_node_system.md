# Plan 05: Architecture Canvas & Custom Node Topology

> **Phase:** 05  
> **Status:** Completed  
> **Design References:**  
> - [04_canvas_and_ui_component_system.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/04_canvas_and_ui_component_system.md)  
> - [00_overview_and_architecture.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/00_overview_and_architecture.md)  
> - [coding_standards.md](file:///home/somesh/git_repos/ml-sys-design/documentation/prompts/coding_standards.md)  
> **Virtual Environment:** `source ~/python_envs/p313_llm/bin/activate`

---

## 1. Executive Summary & Objectives

Implement the platform's visual presentation core: the **Interactive Architecture Canvas**, featuring customized ML infrastructure block topologies, DAG topological validation, pre-configured architectural templates, and **WCAG 2.1 AA/AAA keyboard accessibility**.

### Core Deliverables
1. **Interactive Drag-and-Drop Canvas (`ArchitectureCanvas`)**: Built with `@xyflow/react` (v12.12+), wired directly to the RAM-only Zustand 5.0 store and the background `DeterministicSimWorker`.
   - Utilizes `useNodesData()` for localized reactive node subscriptions without global re-renders.
   - Leverages `useConnection()` for real-time edge connection validation and port compatibility hints.
   - Employs `<EdgeLabelRenderer>` and `<BaseEdge>` for interactive latency and protocol badges directly on cables.
   - Supports subflows (`parentId`) for grouping multi-agent swarms and distributed GPU clusters.
   - Supports `<NodeResizer>` for dynamic telemetry widget expansion.
2. **2026 Custom Infrastructure Node Topologies**:
   - `InferenceGatewayNode`: Manages ingress routing, load balancing, and rate limiting.
   - `ModelWorkerNode`: Visualizes vLLM/TensorRT-LLM execution, GPU memory usage, and quantization (FP16, INT8, INT4).
   - `VectorDatabaseNode`: Models HNSW/IVF indexing, vector dimensions, top-k recall, and memory footprint.
   - `FeatureStoreNode`: Models Redis/Feast online p99 read latencies and offline batch ingestion.
   - `AgentSupervisorNode`: Orchestrates multi-agent state machines, tool loopbacks, and consensus gates.
   - `SemanticGuardrailNode`: Configures prompt injection filters, toxic content blocking, and latency overhead.
   - `MessageQueueNode`: Visualizes Kafka streaming queues, partition saturation, and lag.
3. **DAG Topology Validator (`GraphTopologyValidator`)**: Executes Kahn's algorithm in real time to detect graph cycles, validate connection compatibility, and trace critical latency paths.
4. **Pre-Built Architecture Templates (`TemplateCatalog`)**:
   - *Multi-Agent Orchestration*: Supervisor router with tool workers and consensus hooks.
   - *Hybrid Search RAG*: Sparse BM25 + Dense Vector retrieval with re-ranking.
   - *LLM Guardrail Routing*: Dual-tier safety classification with circuit breakers.
5. **WCAG 2.1 AA/AAA Accessibility Engine (`CanvasKeyboardNavigator`, `AriaLiveAnnouncer`)**:
   - Complete keyboard traversal (Arrow keys for navigation, Tab for handles, Enter for connection, Delete for node removal).
   - Screen reader announcements updating status and simulation results via `aria-live`.

---

## 2. File Inventory & Class Responsibilities

| File Path | Primary Class | Responsibility | Est. Lines |
| :--- | :--- | :--- | :--- |
| `src/components/canvas/architecture_canvas.tsx` | `ArchitectureCanvas` | React component managing `@xyflow/react` 12.12 canvas, subflows, and interaction | ~230 |
| `src/components/canvas/graph_topology_validator.ts` | `GraphTopologyValidator` | Kahn's algorithm DAG cycle detection and connection validation | ~160 |
| `src/components/canvas/canvas_keyboard_navigator.ts` | `CanvasKeyboardNavigator` | Keyboard navigation and focus manager complying with WCAG 2.1 | ~190 |
| `src/components/canvas/aria_live_announcer.ts` | `AriaLiveAnnouncer` | Screen reader audio and live region publisher | ~120 |
| `src/components/canvas/template_catalog.ts` | `TemplateCatalog` | Factory loading Multi-Agent, RAG, and Guardrail blueprints | ~180 |
| `src/components/canvas/edges/interactive_infra_edge.tsx` | `InteractiveInfraEdge` | `<BaseEdge>` + `<EdgeLabelRenderer>` wire badges & inline chaos fault trigger | ~140 |
| `src/components/canvas/nodes/inference_gateway_node.tsx` | `InferenceGatewayNode` | Gateway infrastructure block with reactive `useNodesData` bindings | ~140 |
| `src/components/canvas/nodes/model_worker_node.tsx` | `ModelWorkerNode` | vLLM / TensorRT compute block with `<NodeResizer>` expansion | ~160 |
| `src/components/canvas/nodes/vector_database_node.tsx` | `VectorDatabaseNode` | Vector Database block with memory footprint and recall badges | ~140 |
| `src/components/canvas/nodes/feature_store_node.tsx` | `FeatureStoreNode` | Feature Store block with online p99 read latencies | ~130 |
| `src/components/canvas/nodes/agent_supervisor_node.tsx` | `AgentSupervisorNode` | Visual component for Agent Supervisor block | ~140 |
| `src/components/canvas/nodes/semantic_guardrail_node.tsx` | `SemanticGuardrailNode` | Visual component for Safety Guardrail block | ~130 |
| `src/components/canvas/subflows/agent_swarm_group_node.tsx` | `AgentSwarmGroupNode` | Hierarchical subflow container (`parentId`, `extent: 'parent'`) for multi-agents | ~140 |
| `src/components/canvas/subflows/vllm_cluster_group_node.tsx` | `VllmClusterGroupNode` | Hierarchical subflow container for distributed GPU worker replicas | ~140 |
| `src/components/canvas/canvas_constants.ts` | `CanvasConstants` | Layout constants, handle IDs, colors, accessible aria labels | ~80 |

---

## 3. Detailed Implementation Steps

### Step 1: Implement Graph Topology Validator
- File: `src/components/canvas/graph_topology_validator.ts`
- Class: `GraphTopologyValidator`
  - Encapsulates Kahn's topological sort algorithm:
    - Calculates in-degrees for all nodes.
    - Enqueues nodes with zero in-degree.
    - If processed count $\ne$ total nodes, cycle detected.
  - Public method: `validateGraph(nodes: CanvasNode[], edges: CanvasEdge[]): ValidationResult`
  - Public method: `canConnect(sourceType: string, targetType: string): boolean`
  - Supports live connection validation used by `@xyflow/react`'s `useConnection()` (providing emerald glow for compatible tensor shapes and vermilion warning for incompatible links).
  - Method bodies strictly $\le 20$ lines (split into `_calculateInDegrees()`, `_processQueue()`, `_checkTypeCompatibility()`).

### Step 2: Implement Custom Infrastructure Nodes & Hierarchical Subflows
- Files in `src/components/canvas/nodes/` and `src/components/canvas/subflows/`:
  - Each node wraps `@xyflow/react` node props and utilizes `useNodesData<T>()` to subscribe directly to connected upstream node data in $<5\text{ ms}$ without full canvas re-renders.
  - Telemetry-heavy nodes (e.g. `ModelWorkerNode`) integrate `<NodeResizer>` / `<NodeResizeControl>` to expand embedded flame graphs and memory fragmentation charts.
  - Subflow nodes (`AgentSwarmGroupNode`, `VllmClusterGroupNode`) support nested child node containment using `parentId` and `extent: 'parent'`.
  - Features high-contrast borders, WCAG 2.1 color palettes (`colorMode="system" | "dark" | "light"`), and accessible ARIA attributes.
  - Method/function bodies strictly $\le 20$ lines.

### Step 3: Implement Interactive Edge Overlays (`InteractiveInfraEdge`)
- File: `src/components/canvas/edges/interactive_infra_edge.tsx`
- Component / Class: `InteractiveInfraEdge`
  - Leverages `@xyflow/react` `<BaseEdge>` and `<EdgeLabelRenderer>` HTML portals.
  - Renders cable latency badges (`gRPC (0.3ms)`), bandwidth utilization bars, and an interactive **"Inject Chaos Fault"** button directly on the cable without SVG text measurement performance penalties.
  - Dispatches fault injection actions to the chaos engineering engine upon click.

### Step 4: Implement WCAG 2.1 AA/AAA Accessibility Engine
- File: `src/components/canvas/canvas_keyboard_navigator.ts`
- Class: `CanvasKeyboardNavigator`
  - Handles `keydown` events:
    - `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight`: Navigate node focus.
    - `Tab` / `Shift+Tab`: Navigate source/target connection handles.
    - `Enter`: Select handle or initiate edge connection.
    - `Delete` / `Backspace`: Remove selected node or edge.
    - `Escape`: Cancel pending edge connection.
- File: `src/components/canvas/aria_live_announcer.ts`
- Class: `AriaLiveAnnouncer`
  - Public method: `announce(message: string, politeness?: 'polite' | 'assertive'): void`
  - Announces node selections, graph validation errors, and updated simulation metrics to screen readers.

### Step 5: Implement Pre-Built Architecture Templates Catalog
- File: `src/components/canvas/template_catalog.ts`
- Class: `TemplateCatalog`
  - Public method: `getTemplate(templateId: string): ArchitectureTemplate`
  - Implement 3 templates:
    1. `MULTI_AGENT_ORCHESTRATION`: Supervisor + Code Generator + QA Validator + Guardrail.
    2. `HYBRID_SEARCH_RAG`: Query Router + BM25 Shard + Vector DB + Cross-Encoder Ranker.
    3. `LLM_GUARDRAIL_ROUTING`: Ingress Gateway + Semantic Classifier + vLLM Node.

### Step 6: Implement Architecture Canvas Component
- File: `src/components/canvas/architecture_canvas.tsx`
- Class / Component: `ArchitectureCanvas`
  - Integrates `@xyflow/react` with custom node registration (`nodeTypes`) and custom edge registration (`edgeTypes`).
  - Sets `colorMode="system"` for native dark/light/system theme adaptation.
  - Connects canvas change callbacks (`onNodesChange`, `onEdgesChange`, `onConnect`) to `WorkspaceStore`.
  - Dispatches graph deltas to `SimWorkerController` maintaining $<100\text{ ms}$ feedback.

---

## 4. Class Contract & Member Ordering Example

```typescript
// src/components/canvas/graph_topology_validator.ts

export class GraphTopologyValidator {
  // 1. Class-level constants (non-public, leading underscore)
  private static readonly _CYCLE_ERROR = 'Topological error: Directed cycle detected in architecture graph.';
  private static readonly _SELF_CONNECT_ERROR = 'Validation error: Self-connections are prohibited.';

  // 2. Constructor
  public constructor() {}

  // 3. Public methods
  public validateGraph(nodeIds: string[], edges: Array<{ source: string; target: string }>): { isValid: boolean; error?: string } {
    if (this._hasSelfConnections(edges)) {
      return { isValid: false, error: GraphTopologyValidator._SELF_CONNECT_ERROR };
    }
    const hasCycle = this._detectCycleKahn(nodeIds, edges);
    if (hasCycle) {
      return { isValid: false, error: GraphTopologyValidator._CYCLE_ERROR };
    }
    return { isValid: true };
  }

  // 4. Protected methods (none)

  // 5. Private methods
  private _hasSelfConnections(edges: Array<{ source: string; target: string }>): boolean {
    return edges.some(edge => edge.source === edge.target);
  }

  private _detectCycleKahn(nodeIds: string[], edges: Array<{ source: string; target: string }>): boolean {
    const inDegree = this._calculateInDegree(nodeIds, edges);
    const queue = nodeIds.filter(id => (inDegree.get(id) || 0) === 0);
    let visitedCount = 0;
    while (queue.length > 0) {
      const node = queue.shift()!;
      visitedCount++;
      const outgoing = edges.filter(e => e.source === node);
      for (const edge of outgoing) {
        const nextDegree = (inDegree.get(edge.target) || 1) - 1;
        inDegree.set(edge.target, nextDegree);
        if (nextDegree === 0) queue.push(edge.target);
      }
    }
    return visitedCount !== nodeIds.length;
  }

  private _calculateInDegree(nodeIds: string[], edges: Array<{ source: string; target: string }>): Map<string, number> {
    const map = new Map<string, number>();
    nodeIds.forEach(id => map.set(id, 0));
    edges.forEach(edge => map.set(edge.target, (map.get(edge.target) || 0) + 1));
    return map;
  }
}
```

---

## 5. Verification & Testing Requirements

### Test Files to Create
- `tests/components/canvas/test_graph_topology_validator.test.ts`: Tests acyclic DAGs, cycle detection, live connection validation, and self-loops.
- `tests/components/canvas/test_interactive_infra_edge.test.tsx`: Tests `<BaseEdge>` path rendering, `<EdgeLabelRenderer>` portal badges, and fault injection click callbacks.
- `tests/components/canvas/test_canvas_subflows.test.tsx`: Tests nested child nodes within `AgentSwarmGroupNode` and `VllmClusterGroupNode` (`parentId`, bounds clamping).
- `tests/components/canvas/test_canvas_keyboard_navigator.test.ts`: Simulates Arrow keys, Tab, Enter, and Delete key events.
- `tests/components/canvas/test_aria_live_announcer.test.ts`: Tests screen reader message dispatch.
- `tests/components/canvas/test_template_catalog.test.ts`: Verifies validity and completeness of the 3 templates.
- `tests/components/canvas/test_architecture_canvas.test.tsx`: Tests node rendering, `@xyflow/react` edge connection, reactive `useNodesData`, and store synchronization.

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

- [x] Implement `CanvasConstants` in `src/components/canvas/canvas_constants.ts`.
- [x] Implement `GraphTopologyValidator` in `src/components/canvas/graph_topology_validator.ts`.
- [x] Implement `InteractiveInfraEdge` in `src/components/canvas/edges/interactive_infra_edge.tsx`.
- [x] Implement all custom node components in `src/components/canvas/nodes/`.
- [x] Implement subflow group nodes in `src/components/canvas/subflows/`.
- [x] Implement `AriaLiveAnnouncer` in `src/components/canvas/aria_live_announcer.ts`.
- [x] Implement `CanvasKeyboardNavigator` in `src/components/canvas/canvas_keyboard_navigator.ts`.
- [x] Implement `TemplateCatalog` in `src/components/canvas/template_catalog.ts`.
- [x] Implement `ArchitectureCanvas` in `src/components/canvas/architecture_canvas.tsx`.
- [x] Write all 7 comprehensive test suites ensuring $\ge 90\%$ branch coverage.
- [x] Verify zero lint, type, or test errors.

