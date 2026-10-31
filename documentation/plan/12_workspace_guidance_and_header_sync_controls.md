# Plan 12: Workspace Guidance, Onboarding & Interactive Google Drive Sync Controls

> **Phase:** 12 (Design Deltas & Instructional UX)  
> **Status:** Pending Execution  
> **Design References:**  
> - [00_overview_and_architecture.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/00_overview_and_architecture.md) (Section 3.1, 3.2, 3.3)  
> - [01_state_management_and_gdrive_ssot.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/01_state_management_and_gdrive_ssot.md) (Section 3.2)  
> - [04_canvas_and_ui_component_system.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/04_canvas_and_ui_component_system.md) (Section 5.1, 5.2, 5.3)  
> - [coding_standards.md](file:///home/somesh/git_repos/ml-sys-design/documentation/prompts/coding_standards.md)  
> **Python Virtual Environment:** `source ~/python_envs/p313_llm/bin/activate`

---

## 1. Executive Summary & Delta Objectives

Implement the newly introduced instructional user experience, onboarding architecture, and interactive Google Drive sync controls specified in the updated detailed design suite (`00_overview`, `01_state_management`, and `04_canvas_and_ui`).

### Design Deltas Addressed
1. **Interactive Google Drive Header Control (`GDriveSyncControl`)**:
   - Replaces the static ephemeral indicator with an interactive header pill supporting 4 dynamic visual states: `UNAUTHENTICATED`, `SYNCED`, `DIRTY`, and `CONFLICT`.
   - Dispatches one-click GIS OAuth login popup, surfaces time-since-last-save, and exposes dropdown actions for manual flush ("Sync Now"), workspace switching, and session disconnection.
2. **Contextual Screen Guidance Banner (`ScreenContextBanner`)**:
   - Docked beneath the global header across all 6 workspaces (`Canvas`, `Interview`, `Chaos`, `Curriculum`, `Telemetry`, `FinOps`).
   - Surfaces workspace purpose badges, numbered quickstart checklists (1-2-3), quick-action scenario buttons, and collapsible view states.
3. **Interactive Node Inspector Drawer (`NodeInspectorDrawer`)**:
   - Slides open on node selection to provide fine-grained parameter sliders, metric explainers (`(?)` tooltips for TTFT, TPOT, recall@k), real-time live impact preview badges (e.g. VRAM/cost delta on quantization change), and node mutation actions (duplicate, disconnect, delete).
4. **Global Platform Onboarding Tour (`PlatformOnboardingModal`)**:
   - Accessible 4-slide interactive walkthrough explaining the simulation sandbox, the 6-screen operational loop, Google Drive SSOT zero-local-storage persistence, and the dual-mode AI gateway.
5. **Instructional UX Catalog & 6-Screen Operational Loop (`WorkspaceGuidanceCatalog`)**:
   - Strongly-typed catalog encoding the instructional UX matrix for all 6 workspaces, guiding engineers seamlessly through Discover -> Design -> Observe -> Stress-Test -> Optimize -> Defend.

---

## 2. File Inventory & Class Responsibilities

| File Path | Primary Class / Component | Responsibility | Est. Lines |
| :--- | :--- | :--- | :--- |
| `src/core/state/guidance_types.ts` | `GuidanceTypes` | Types for guidance banners, checklists, drawer states, and visual sync modes | ~110 |
| `src/components/guidance/guidance_constants.ts` | `GuidanceConstants` | Layout constants, slide copies, tooltips, and action IDs | ~90 |
| `src/components/guidance/workspace_guidance_catalog.ts` | `WorkspaceGuidanceCatalog` | Authoritative catalog mapping instructional matrix per workspace | ~180 |
| `src/components/navigation/gdrive_sync_control.tsx` | `GDriveSyncControl` | Interactive 4-state Google Drive login and sync status header control | ~210 |
| `src/components/navigation/header_deck.tsx` | `HeaderDeck` | Global navigation bar integrating sync control, tabs, and help trigger | ~170 |
| `src/components/guidance/screen_context_banner.tsx` | `ScreenContextBanner` | Docked collapsible guidance banner with 1-2-3 steps and quick actions | ~190 |
| `src/components/guidance/node_inspector_drawer.tsx` | `NodeInspectorDrawer` | Slide-out node configuration panel with live impact calculations | ~240 |
| `src/components/guidance/platform_onboarding_modal.tsx` | `PlatformOnboardingModal` | 4-slide accessible interactive onboarding dialog | ~200 |

---

## 3. Detailed Implementation Steps

### Step 1: Define Guidance & Sync Control Types
- File: `src/core/state/guidance_types.ts`
- Encapsulate data contracts:
  - `WorkspaceTab`: `'CANVAS' | 'INTERVIEW' | 'CHAOS' | 'CURRICULUM' | 'TELEMETRY' | 'FINOPS'`
  - `SyncVisualState`: `'UNAUTHENTICATED' | 'SYNCED' | 'DIRTY' | 'CONFLICT'`
  - `GuidanceChecklistStep`: `{ stepNumber: number; title: string; instruction: string }`
  - `QuickActionDescriptor`: `{ id: string; label: string; icon: string; actionType: string; payload?: unknown }`
  - `WorkspaceGuidanceItem`: `{ tab: WorkspaceTab; title: string; badge: string; checklist: GuidanceChecklistStep[]; quickActions: QuickActionDescriptor[] }`
  - `InspectorNodeData`: Active node metadata, parameter sliders, tooltips, and live impact computation deltas.

### Step 2: Implement Instructional Guidance Catalog
- File: `src/components/guidance/guidance_constants.ts`
- Class: `GuidanceConstants`
  - Private class-level constants for slide contents, tooltip definitions, and CSS theme classes.
- File: `src/components/guidance/workspace_guidance_catalog.ts`
- Class: `WorkspaceGuidanceCatalog`
  - Implements the complete instructional UX matrix from Detailed Design 04:
    - **Canvas**: Wire blocks, configure parameters, view live $M/G/c$ latency, advance to Telemetry.
    - **AI Interview**: Pick framework step, toggle voice recording, export canvas context, submit for rubric review.
    - **Chaos Sandbox**: Choose attack scenario, trigger failure injection, inspect error budget burn, apply mitigations.
    - **Curriculum**: Browse blueprints, load starter challenges into Canvas, track curriculum mastery.
    - **Telemetry**: Inspect 60 FPS latency waterfall, toggle metric rings, filter distributed crash logs.
    - **FinOps**: Input workload specs, select hardware chips, calculate GPU sizing and monthly cloud spend.
  - Public method: `getGuidanceForTab(tab: WorkspaceTab): WorkspaceGuidanceItem`

### Step 3: Implement Interactive Google Drive Sync Control (`GDriveSyncControl`)
- File: `src/components/navigation/gdrive_sync_control.tsx`
- Class / Component: `GDriveSyncControl`
  - Subscribes to `WorkspaceStore` (`DriveSyncSlice`) using `useShallow`.
  - Determines active visual state:
    1. `UNAUTHENTICATED`: Renders "Connect Google Drive" button with Google logo; triggers `GoogleAuthClient.requestAccessToken()`.
    2. `SYNCED`: Renders emerald badge "Synced to Drive (Xs ago)" with dropdown menu ("Sync Now", "Switch Workspace", "Disconnect").
    3. `DIRTY`: Renders pulsing amber pill "Saving changes... (N pending)".
    4. `CONFLICT`: Renders vermilion alert pill "Resolve Conflict"; triggers 3-way AST merge dialog.
  - Accessibility: `role="status"`, `aria-live="polite"`, keyboard-focusable dropdown triggers with `Enter`/`Space`/`Escape` handling.

### Step 4: Refactor Global Header Deck (`HeaderDeck`)
- File: `src/components/navigation/header_deck.tsx`
- Class / Component: `HeaderDeck`
  - Integrates brand logo, 6-tab workspace navigation buttons, `GDriveSyncControl`, export action triggers (Terraform, K8s, Manifesto), AI exchange trigger, and `[?] Help & Guide` button.
  - Emits active tab changes and modal triggers to the root application shell.

### Step 5: Implement Contextual Screen Guidance Banner (`ScreenContextBanner`)
- File: `src/components/guidance/screen_context_banner.tsx`
- Class / Component: `ScreenContextBanner`
  - Consumes `WorkspaceGuidanceCatalog` based on active tab.
  - Renders:
    - Title & purpose badge.
    - 3-step numbered quickstart cards.
    - Quick-action buttons (dispatching scenario load or simulation trigger).
    - Collapse / expand toggle button (`Collapse Guide [^]` / `Show Guide [v]`), preserving collapsed state in RAM.

### Step 6: Implement Interactive Node Inspector Drawer (`NodeInspectorDrawer`)
- File: `src/components/guidance/node_inspector_drawer.tsx`
- Class / Component: `NodeInspectorDrawer`
  - Slides open on right side when canvas node is active; closes on backdrop click or `Escape`.
  - Renders:
    - Node icon, title, and connected input/output handles.
    - Interactive parameter inputs (e.g., QPS slider, batch size, quantization radio, hardware chip selector).
    - Metric explainers with inline `(?)` hover/focus tooltips explaining TTFT, TPOT, and recall@k.
    - **Live Impact Calculation Badge**: Calls `RooflineModelProfiler` or `LlmServingLatencyCalculator` to preview VRAM savings and cost deltas in real time.
    - Action buttons: "Duplicate Node", "Disconnect Edges", "Delete Node".

### Step 7: Implement Global Onboarding Walkthrough Dialog (`PlatformOnboardingModal`)
- File: `src/components/guidance/platform_onboarding_modal.tsx`
- Class / Component: `PlatformOnboardingModal`
  - 4-slide carousel walkthrough:
    - **Slide 1**: Interactive Simulation Sandbox vs. Static Whiteboard.
    - **Slide 2**: The 6-Screen Operational Loop (Curriculum -> Canvas -> Telemetry -> Chaos -> FinOps -> Interview).
    - **Slide 3**: Google Drive SSOT & Zero Local Storage Mandate.
    - **Slide 4**: Dual-Mode AI Gateway (Direct Free API vs. Air-Gap JSON Envelope).
  - Dot indicator navigation, "Next", "Back", and "Get Started" buttons.
  - WCAG 2.1 keyboard support (ArrowLeft, ArrowRight, Escape).

---

## 4. Class Contract & Member Ordering Example

```typescript
// src/components/guidance/workspace_guidance_catalog.ts
import { GuidanceTypes, WorkspaceGuidanceItem, WorkspaceTab } from '@/core/state/guidance_types';

export class WorkspaceGuidanceCatalog {
  // 1. Class-level constants (non-public, leading underscore)
  private static readonly _DEFAULT_TAB: WorkspaceTab = 'CANVAS';
  private static readonly _CATALOG: Record<WorkspaceTab, WorkspaceGuidanceItem> = {
    CANVAS: {
      tab: 'CANVAS',
      title: 'Architecture Canvas',
      badge: 'Visual Infrastructure & Latency Simulator',
      checklist: [
        { stepNumber: 1, title: 'Add Components', instruction: 'Drag Gateways, Feature Stores, or vLLM Workers onto canvas.' },
        { stepNumber: 2, title: 'Wire Connections', instruction: 'Connect source ports to target inputs; observe port compatibility glow.' },
        { stepNumber: 3, title: 'Inspect & Tune', instruction: 'Click any node to open the Inspector Drawer and adjust QPS or quantization.' },
      ],
      quickActions: [
        { id: 'load_rag_template', label: 'Load Hybrid Search RAG', icon: 'rag', actionType: 'LOAD_TEMPLATE' },
        { id: 'load_agent_template', label: 'Load Multi-Agent Swarm', icon: 'agent', actionType: 'LOAD_TEMPLATE' },
      ],
    },
    INTERVIEW: {
      tab: 'INTERVIEW',
      title: 'AI Interview Simulator',
      badge: '2026 FAANG Whiteboard Defense',
      checklist: [
        { stepNumber: 1, title: 'Select Step', instruction: 'Proceed through the 6-step framework from requirements to monitoring.' },
        { stepNumber: 2, title: 'Voice & Canvas', instruction: 'Explain design choices verbally or export visual architecture.' },
        { stepNumber: 3, title: 'Evaluate', instruction: 'Submit to AI interviewer for real-time rubric scoring and gap feedback.' },
      ],
      quickActions: [
        { id: 'start_step1', label: 'Start Step 1: Requirements', icon: 'mic', actionType: 'START_STEP' },
      ],
    },
    CHAOS: {
      tab: 'CHAOS',
      title: 'Chaos Sandbox',
      badge: 'Adversarial Attacks & Failure Resilience',
      checklist: [
        { stepNumber: 1, title: 'Pick Perturbation', instruction: 'Select Poisson bursts, network partitions, or agent cascade loops.' },
        { stepNumber: 2, title: 'Inject Fault', instruction: 'Run failure simulation and monitor error budget burn rate.' },
        { stepNumber: 3, title: 'Apply Mitigation', instruction: 'Engage circuit breakers or autoscaling to halt degradation.' },
      ],
      quickActions: [
        { id: 'trigger_burst', label: 'Run 10x Poisson Burst', icon: 'zap', actionType: 'RUN_CHAOS' },
      ],
    },
    CURRICULUM: {
      tab: 'CURRICULUM',
      title: '2026 Core Curriculum',
      badge: 'Interactive Systems Blueprint Drills',
      checklist: [
        { stepNumber: 1, title: 'Select Track', instruction: 'Choose MLOps, Foundation Models, or Production Engineering.' },
        { stepNumber: 2, title: 'Load Challenge', instruction: 'Click Launch Scenario to populate the Canvas with starter topology.' },
        { stepNumber: 3, title: 'Pass Rubric', instruction: 'Optimize architecture to meet latency and cost SLA targets.' },
      ],
      quickActions: [
        { id: 'load_ecommerce', label: 'Load E-Commerce Ranking', icon: 'cart', actionType: 'LOAD_BLUEPRINT' },
      ],
    },
    TELEMETRY: {
      tab: 'TELEMETRY',
      title: 'Telemetry & Profiler',
      badge: '60 FPS High-Frequency Operations Dashboard',
      checklist: [
        { stepNumber: 1, title: 'Inspect Waterfall', instruction: 'Trace end-to-end p50, p95, and p99 latency distributions.' },
        { stepNumber: 2, title: 'Observe Memory', instruction: 'Check KV-cache fragmentation and GPU HBM memory saturation.' },
        { stepNumber: 3, title: 'Analyze Traces', instruction: 'Parse synthetic CUDA and NCCL crash logs to diagnose bottlenecks.' },
      ],
      quickActions: [
        { id: 'toggle_flamegraph', label: 'Toggle Flamegraph', icon: 'chart', actionType: 'TOGGLE_VIEW' },
      ],
    },
    FINOPS: {
      tab: 'FINOPS',
      title: 'FinOps Unit Economics',
      badge: 'GPU/TPU Sizing & Infrastructure Cost Calculator',
      checklist: [
        { stepNumber: 1, title: 'Define Workload', instruction: 'Input Target QPS, input prompt tokens, and completion tokens.' },
        { stepNumber: 2, title: 'Compare Hardware', instruction: 'Evaluate H100 vs. TPU v5p vs. MI300X cost and bandwidth trade-offs.' },
        { stepNumber: 3, title: 'Export Spec', instruction: 'Generate financial provisioning manifesto for engineering approval.' },
      ],
      quickActions: [
        { id: 'calculate_sizing', label: 'Calculate GPU Sizing', icon: 'calc', actionType: 'CALC_FINOPS' },
      ],
    },
  };

  // 2. Constructor
  public constructor() {}

  // 3. Public methods
  public getGuidanceForTab(tab: WorkspaceTab): WorkspaceGuidanceItem {
    return WorkspaceGuidanceCatalog._CATALOG[tab] || WorkspaceGuidanceCatalog._CATALOG[WorkspaceGuidanceCatalog._DEFAULT_TAB];
  }

  public getAllTabs(): WorkspaceTab[] {
    return Object.keys(WorkspaceGuidanceCatalog._CATALOG) as WorkspaceTab[];
  }

  // 4. Protected methods (none)

  // 5. Private methods (none needed)
}
```

---

## 5. Verification & Testing Requirements

### Test Files to Create
- `tests/components/guidance/test_workspace_guidance_catalog.test.ts`: Verifies complete coverage of all 6 workspace guidance descriptors, step checklists, and quick actions.
- `tests/components/navigation/test_gdrive_sync_control.test.tsx`: Tests rendering of `UNAUTHENTICATED`, `SYNCED`, `DIRTY`, and `CONFLICT` visual states, GIS auth click dispatch, and dropdown menu actions.
- `tests/components/navigation/test_header_deck.test.tsx`: Tests brand header rendering, tab switching events, and modal trigger propagation.
- `tests/components/guidance/test_screen_context_banner.test.tsx`: Tests dynamic title/checklist rendering per active tab, collapsible button toggling, and quick-action clicks.
- `tests/components/guidance/test_node_inspector_drawer.test.tsx`: Tests drawer opening on node selection, parameter slider updates, live impact preview badge calculation, and close action.
- `tests/components/guidance/test_platform_onboarding_modal.test.tsx`: Tests 4-slide navigation, keyboard ArrowLeft/ArrowRight/Escape interaction, and modal dismissal.

### Coverage & Quality Gates
- **$\ge 90\%$ branch and line coverage** across all guidance and navigation components.
- Run verification:
```bash
npm run typecheck
npm test
npm run validate:ts
npm run validate:py
```

---

## 6. Execution Checklist

- [ ] Define guidance and sync status contracts in `src/core/state/guidance_types.ts`.
- [ ] Implement `GuidanceConstants` in `src/components/guidance/guidance_constants.ts`.
- [ ] Implement `WorkspaceGuidanceCatalog` in `src/components/guidance/workspace_guidance_catalog.ts`.
- [ ] Implement `GDriveSyncControl` in `src/components/navigation/gdrive_sync_control.tsx`.
- [ ] Implement `HeaderDeck` in `src/components/navigation/header_deck.tsx`.
- [ ] Implement `ScreenContextBanner` in `src/components/guidance/screen_context_banner.tsx`.
- [ ] Implement `NodeInspectorDrawer` in `src/components/guidance/node_inspector_drawer.tsx`.
- [ ] Implement `PlatformOnboardingModal` in `src/components/guidance/platform_onboarding_modal.tsx`.
- [ ] Integrate `HeaderDeck`, `ScreenContextBanner`, and `NodeInspectorDrawer` into `src/app/page.tsx`.
- [ ] Write all 6 comprehensive test suites ensuring $\ge 90\%$ branch coverage.
- [ ] Run `npm run typecheck`, `npm test`, `npm run validate:ts`, and `npm run validate:py` to confirm zero errors.

