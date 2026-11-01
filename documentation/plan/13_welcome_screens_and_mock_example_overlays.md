# Plan 13: Global Welcome Screen & Component Mock Example Overlays

> **Phase:** 13 (First-Time Onboarding & Mock Example Walkthroughs)  
> **Status:** Completed  
> **Design References:**  
> - [00_overview_and_architecture.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/00_overview_and_architecture.md) (Section 3.3.1)  
> - [04_canvas_and_ui_component_system.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/04_canvas_and_ui_component_system.md) (Section 5.4, 5.5, 5.6)  
> - [coding_standards.md](file:///home/somesh/git_repos/ml-sys-design/documentation/prompts/coding_standards.md)  
> **Python Virtual Environment:** `source ~/python_envs/p313_llm/bin/activate`

---

## 1. Executive Summary & Delta Objectives

Implement the newly introduced **Global Application Welcome Screen** (`AppWelcomeModal`) and **Component-Specific Welcome Overlays** (`ComponentWelcomeOverlay`) specified in the latest detailed design updates (`00_overview` Section 3.3.1 and `04_canvas_and_ui` Sections 5.4, 5.5, 5.6).

### Design Deltas Addressed
1. **Global Application Welcome Screen (`AppWelcomeModal`)**:
   - Automatically appears upon first application launch when `userPreferences.hasSeenAppWelcome == false`.
   - Showcases the platform's core identity ("2026 Machine Learning System Design Platform"), 3 architectural pillars (Deterministic Simulation, Zero Local Storage / Google Drive SSOT, Dual-Mode AI Gateway), and 6 workspace cards.
   - Provides prominent "Take Interactive Tour", "Skip to Canvas", and "Don't show this again" actions, with state preserved in RAM / Drive SSOT.
   - Re-triggerable at any time via `[?] Help & Guide` in the global header deck.
2. **Component-Specific Welcome Overlays (`ComponentWelcomeOverlay`)**:
   - Universal, tab-aware overlay mounted on each of the 6 workspace tabs (`Canvas`, `Interview`, `Chaos`, `Curriculum`, `Telemetry`, `FinOps`).
   - Surfaces each component's mental model, step-by-step mock example walkthrough, and interactive 1-click execution buttons:
     - **Canvas**: Hybrid Search RAG setup + **"Load Mock RAG Example"** button (populates canvas with Query Router, Vector DB, Sparse Lexical, Cross-Encoder, vLLM H100).
     - **AI Interview**: YouTube Recommendation Engine defense + **"Load Mock Transcript"** button (pre-loads candidate requirements, feature pipelines, and evaluation rubric).
     - **Chaos Sandbox**: 10x Poisson Traffic Burst attack drill + **"Simulate This Burst Attack"** button (4,000 to 40,000 QPS burst, queue saturation, PagedAttention token throttling).
     - **Curriculum Explorer**: Challenge #03 (10M QPS Streaming Fraud Detection with Flink/Kafka/Feast) + **"Load Challenge #03 Now"** button.
     - **Real-Time Telemetry**: TTFT Latency Explosion diagnosis + **"Simulate This Telemetry Spike"** button (142ms TTFT prefill latency waterfall, KV-cache fragmentation).
     - **FinOps Workspace**: Sizing 50,000 QPS Llama-3-70B inference cluster (FP16 vs INT4 AWQ saving $54,400/mo) + **"Load Mock FinOps Sizing"** button.
   - High-visibility **"Skip Guide & Start Blank"** action and **"Don't show this again"** checkbox.
   - Re-triggerable at any time via a dedicated toolbar button on each screen: `(?) Show Mock Example`.
3. **Mock Walkthrough Catalog (`MockWalkthroughCatalog`)**:
   - Authoritative, strongly-typed repository encoding scenario narratives, mental models, concrete steps, parameters, and action payloads across all 6 workspaces.
4. **Welcome Guidance Preferences State (`GuidancePreferenceManager`)**:
   - Manages dismissal flags (`hasSeenAppWelcome`, `dismissedComponentWelcomes: Record<WorkspaceTabId, boolean>`) in volatile Zustand RAM, with optional synchronization to Google Drive SSOT `manifest.json`.
   - Adheres strictly to the Zero Local Storage mandate (no localStorage, sessionStorage, or cookies).

---

## 2. File Inventory & Class Responsibilities

| File Path | Primary Class / Component | Responsibility | Est. Lines |
| :--- | :--- | :--- | :--- |
| `src/core/state/welcome_types.ts` | `WelcomeTypes` | Types for welcome modals, walkthrough steps, action payloads, and dismissal preferences | ~110 |
| `src/components/welcome/welcome_constants.ts` | `WelcomeConstants` | Constants for pillar summaries, workspace badges, action IDs, and accessibility labels | ~90 |
| `src/components/welcome/mock_walkthrough_catalog.ts` | `MockWalkthroughCatalog` | Authoritative data catalog of mock examples, steps, and parameters for all 6 tabs | ~240 |
| `src/core/state/guidance_preference_manager.ts` | `GuidancePreferenceManager` | RAM-only preference coordinator managing welcome modal dismissal and Drive sync | ~160 |
| `src/components/welcome/app_welcome_modal.tsx` | `AppWelcomeModal` | Global modal introducing platform identity, 3 pillars, 6 workspaces, and tour controls | ~230 |
| `src/components/welcome/component_welcome_overlay.tsx` | `ComponentWelcomeOverlay` | Universal workspace overlay rendering mental model, walkthrough steps, and action triggers | ~240 |
| `src/components/welcome/mock_action_dispatcher.ts` | `MockActionDispatcher` | Action handler loading mock scenarios, transcripts, and telemetry spikes into store | ~180 |

---

## 3. Detailed Implementation Steps

### Step 1: Define Welcome Contracts & Preference Types
- File: `src/core/state/welcome_types.ts`
- Encapsulate data contracts:
  - `WorkspaceTabId`: `'CANVAS' | 'INTERVIEW' | 'CHAOS' | 'CURRICULUM' | 'TELEMETRY' | 'FINOPS'`
  - `WalkthroughStep`: `{ stepNumber: number; title: string; narrative: string; highlightMetric?: string }`
  - `MockActionPayload`: `{ actionType: 'LOAD_CANVAS_RAG' | 'LOAD_INTERVIEW_YOUTUBE' | 'SIMULATE_CHAOS_BURST' | 'LOAD_CURRICULUM_FRAUD' | 'SIMULATE_TELEMETRY_SPIKE' | 'LOAD_FINOPS_LLAMA'; data?: Record<string, unknown> }`
  - `ComponentMockWalkthrough`: `{ tabId: WorkspaceTabId; componentTitle: string; mentalModel: string; scenarioTitle: string; steps: WalkthroughStep[]; primaryActionLabel: string; primaryActionPayload: MockActionPayload }`
  - `UserGuidancePreferences`: `{ hasSeenAppWelcome: boolean; dismissedComponentWelcomes: Record<WorkspaceTabId, boolean> }`

### Step 2: Implement Mock Walkthrough Catalog
- File: `src/components/welcome/welcome_constants.ts`
- Class: `WelcomeConstants`
  - Class constants for default preferences, theme classes, button texts, and ARIA labels.
- File: `src/components/welcome/mock_walkthrough_catalog.ts`
- Class: `MockWalkthroughCatalog`
  - Encapsulates the complete walkthrough specifications from Detailed Design 04 Section 5.5:
    - **Canvas (Hybrid Search RAG)**: Steps: Query Dispatcher -> Vector DB & Sparse Lexical -> Cross-Encoder -> vLLM H100 SXM5 ($p99 \le 45\text{ ms}$, $\$2,450/\text{mo}$). Action: `LOAD_CANVAS_RAG`.
    - **AI Interview (YouTube Recommendation)**: Steps: Candidate Generation -> Multitask Ranking -> Serving & Retraining. Action: `LOAD_INTERVIEW_YOUTUBE`.
    - **Chaos Sandbox (10x Poisson Burst)**: Steps: Traffic Spike ($4\text{k} \to 40\text{k}\text{ QPS}$) -> Queue Saturation ($M/G/c$ waiting time $320\text{ ms}$) -> PagedAttention Throttling. Action: `SIMULATE_CHAOS_BURST`.
    - **Curriculum Explorer (Challenge #03 Streaming Fraud)**: Steps: Select Challenge -> Ingest Pipeline -> Run Latency & Cost Verification. Action: `LOAD_CURRICULUM_FRAUD`.
    - **Real-Time Telemetry (TTFT Latency Explosion)**: Steps: Traffic Sweep -> Analyze Waterfall Chart ($142\text{ ms}$ TTFT) -> KV-cache fragmentation ($68\%$). Action: `SIMULATE_TELEMETRY_SPIKE`.
    - **FinOps Workspace (50,000 QPS Llama-3-70B Sizing)**: Steps: Workload Specs ($50\text{k QPS}$) -> Compare A100 FP16 vs H100 INT4 AWQ -> Export $\$54,400/\text{mo}$ cost reduction report. Action: `LOAD_FINOPS_LLAMA`.
  - Public method: `getWalkthrough(tabId: WorkspaceTabId): ComponentMockWalkthrough`

### Step 3: Implement Guidance Preference Coordinator
- File: `src/core/state/guidance_preference_manager.ts`
- Class: `GuidancePreferenceManager`
  - Manages `UserGuidancePreferences` in volatile Zustand memory:
    - `hasSeenAppWelcome`: defaults to `false`.
    - `dismissedComponentWelcomes`: defaults to all `false`.
  - Public methods:
    - `shouldShowAppWelcome(): boolean`
    - `shouldShowComponentWelcome(tabId: WorkspaceTabId): boolean`
    - `dismissAppWelcome(dontShowAgain: boolean): void`
    - `dismissComponentWelcome(tabId: WorkspaceTabId, dontShowAgain: boolean): void`
    - `resetAllWelcomes(): void`
  - Coordinates with `WorkspaceStore` to include preference flags in Google Drive `manifest.json` auto-sync without writing to browser localStorage.

### Step 4: Implement Global Application Welcome Modal (`AppWelcomeModal`)
- File: `src/components/welcome/app_welcome_modal.tsx`
- Class / Component: `AppWelcomeModal`
  - Renders centered dialog with dark backdrop (`bg-slate-950/80 backdrop-blur-sm`).
  - Sections:
    1. **Hero Header**: Title, subtitle, and badge.
    2. **The 3 Architectural Pillars**: Cards for Deterministic Simulation, Zero Local Persistence / Drive SSOT, and Dual-Mode AI Gateway.
    3. **The 6 Operational Workspaces**: Interactive grid linking all 6 workspace tools with the operational loop.
    4. **Action Footer**:
       - "Take Interactive Tour" -> launches slide-by-step tour.
       - "Skip to Canvas" -> dismisses modal.
       - "Don't show this again" checkbox -> commits preference to RAM / Drive SSOT.
  - Accessibility: `role="dialog"`, `aria-modal="true"`, focus trapping, `Escape` key listener.

### Step 5: Implement Component Welcome Overlay (`ComponentWelcomeOverlay`)
- File: `src/components/welcome/component_welcome_overlay.tsx`
- Class / Component: `ComponentWelcomeOverlay`
  - Docked overlay mounted over the active workspace viewport.
  - Consumes `MockWalkthroughCatalog` based on active tab ID.
  - Renders:
    - Header: Component title, badge, and mental model overview.
    - Walkthrough Content: Concrete scenario narrative and step-by-step cards with metric callouts.
    - Interactive Action Bar:
      - Primary CTA: Dynamic label (e.g. *"Load Mock RAG Example"*, *"Simulate This Burst Attack"*) dispatching action to `MockActionDispatcher`.
      - Secondary CTA: *"Skip Guide & Start Blank"* dismissing the overlay.
      - Checkbox: *"Don't show this guide again for this screen"*.
  - Accessible re-trigger button: exposed in screen header toolbar as `(?) Show Mock Example`.

### Step 6: Implement Mock Action Dispatcher (`MockActionDispatcher`)
- File: `src/components/welcome/mock_action_dispatcher.ts`
- Class: `MockActionDispatcher`
  - Public method: `dispatchMockAction(payload: MockActionPayload, store: WorkspaceStore): Promise<void>`
  - Handles 1-click loading:
    - `LOAD_CANVAS_RAG`: Injects Hybrid Search RAG nodes & edges into `CanvasSlice`.
    - `LOAD_INTERVIEW_YOUTUBE`: Sets active interview session to YouTube Recommendation with pre-filled mock notes.
    - `SIMULATE_CHAOS_BURST`: Triggers 10x burst attack in `ChaosSandbox`.
    - `LOAD_CURRICULUM_FRAUD`: Loads Challenge #03 into active workspace.
    - `SIMULATE_TELEMETRY_SPIKE`: Drives synthetic TTFT latency spike into `TelemetryRingBuffer`.
    - `LOAD_FINOPS_LLAMA`: Sets target QPS to 50k, prompt tokens to 512, and runs H100 INT4 sizing.

---

## 4. Class Contract & Member Ordering Example

```typescript
// src/components/welcome/mock_walkthrough_catalog.ts
import { ComponentMockWalkthrough, WalkthroughStep, WorkspaceTabId } from '@/core/state/welcome_types';

export class MockWalkthroughCatalog {
  // 1. Class-level constants (non-public, leading underscore)
  private static readonly _DEFAULT_TAB: WorkspaceTabId = 'CANVAS';
  private static readonly _CATALOG: Record<WorkspaceTabId, ComponentMockWalkthrough> = {
    CANVAS: {
      tabId: 'CANVAS',
      componentTitle: 'Architecture Canvas',
      mentalModel: 'Interactive drag-and-drop ML topologies with real-time M/G/c queuing latency and compute trade-offs.',
      scenarioTitle: 'Hybrid Search RAG Infrastructure',
      steps: [
        { stepNumber: 1, title: 'Ingress & Query Routing', narrative: 'User query enters Gateway and routes in parallel to Dense Vector DB and Sparse BM25 index.' },
        { stepNumber: 2, title: 'Semantic Retrieval & Fusion', narrative: 'Top-100 dense embeddings and top-100 sparse lexical matches merge via Reciprocal Rank Fusion (RRF).' },
        { stepNumber: 3, title: 'Cross-Encoder Re-Ranking', narrative: 'Cross-encoder trims candidates to top-5 highest-relevance contexts for LLM generation.' },
        { stepNumber: 4, title: 'vLLM Inference Cluster', narrative: 'Dual NVIDIA H100 SXM5 GPUs run 70B model with INT4 AWQ quantization (p99 latency <= 45ms).' },
      ],
      primaryActionLabel: 'Load Mock RAG Example',
      primaryActionPayload: { actionType: 'LOAD_CANVAS_RAG' },
    },
    INTERVIEW: {
      tabId: 'INTERVIEW',
      componentTitle: 'AI Interview Simulator',
      mentalModel: 'Practice standardized 6-step FAANG ML system design defense with real-time multimodal evaluation.',
      scenarioTitle: 'YouTube Video Recommendation Engine Defense',
      steps: [
        { stepNumber: 1, title: 'Step 1: Clarifying Requirements', narrative: 'Define scale: 2B active users, 1B hours watched/day, 50k QPS candidate retrieval budget.' },
        { stepNumber: 2, title: 'Step 2: Candidate Generation', narrative: 'Two-tower neural network retrieves top-1,000 videos from millions in <15ms.' },
        { stepNumber: 3, title: 'Step 3: Ranking & Multitask Learning', narrative: 'DLRM-style neural network scores p(CTR) and p(watch time) with calibration gates.' },
      ],
      primaryActionLabel: 'Load Mock Transcript',
      primaryActionPayload: { actionType: 'LOAD_INTERVIEW_YOUTUBE' },
    },
    CHAOS: {
      tabId: 'CHAOS',
      componentTitle: 'Chaos Sandbox',
      mentalModel: 'Stress-test architectures against real-world production incidents, agent recursion cascades, and edge failures.',
      scenarioTitle: '10x Poisson Traffic Burst & Token Throttling Drill',
      steps: [
        { stepNumber: 1, title: 'Traffic Spike Injection', narrative: 'Ingress traffic leaps instantly from 4,000 QPS to 40,000 QPS, exhausting server pools.' },
        { stepNumber: 2, title: 'Queue Saturation Observation', narrative: 'M/G/c queuing waiting time escalates to 320ms, burning 42% of monthly error budget.' },
        { stepNumber: 3, title: 'Engage Token Throttling Mitigation', narrative: 'Activating dynamic PagedAttention chunking and token rate-limiting restores p99 latency to 42ms.' },
      ],
      primaryActionLabel: 'Simulate This Burst Attack',
      primaryActionPayload: { actionType: 'SIMULATE_CHAOS_BURST' },
    },
    CURRICULUM: {
      tabId: 'CURRICULUM',
      componentTitle: 'Curriculum Explorer',
      mentalModel: 'Structured 2026 data science curriculum covering MLOps, Generative AI, and Production Engineering.',
      scenarioTitle: 'Challenge #03: 10M QPS Streaming Fraud Detection',
      steps: [
        { stepNumber: 1, title: 'Explore Challenge Specifications', narrative: 'Inspect requirements: 10M transactions/sec, p99 latency <= 8ms, zero data leakage.' },
        { stepNumber: 2, title: 'Load Starter Pipeline', narrative: 'Populate Canvas with Kafka event stream, Apache Flink enricher, Feast Redis store, and XGBoost worker.' },
      ],
      primaryActionLabel: 'Load Challenge #03 Now',
      primaryActionPayload: { actionType: 'LOAD_CURRICULUM_FRAUD' },
    },
    TELEMETRY: {
      tabId: 'TELEMETRY',
      componentTitle: 'Real-Time Telemetry & Profiler',
      mentalModel: '60 FPS WebGL2 observability console tracing latency waterfalls, KV-cache fragmentation, and error traces.',
      scenarioTitle: 'Diagnosing Time-To-First-Token (TTFT) Latency Explosion',
      steps: [
        { stepNumber: 1, title: 'Sweep Ingress Load', narrative: 'Simulate user load increase from 1,000 QPS to 8,000 QPS.' },
        { stepNumber: 2, title: 'Inspect Latency Waterfall', narrative: 'Isolate TTFT prefill latency ($142ms) as dominant bottleneck (>80% of total response time).' },
        { stepNumber: 3, title: 'Resolve KV-Cache Fragmentation', narrative: 'Enabling PagedAttention defragments VRAM memory chunks, reducing TTFT to 31ms.' },
      ],
      primaryActionLabel: 'Simulate This Telemetry Spike',
      primaryActionPayload: { actionType: 'SIMULATE_TELEMETRY_SPIKE' },
    },
    FINOPS: {
      tabId: 'FINOPS',
      componentTitle: 'FinOps Workspace',
      mentalModel: 'Calculate GPU/TPU cluster sizing, memory bandwidth bounds, and monthly infrastructure cloud expenditures.',
      scenarioTitle: 'Sizing a 50,000 QPS Llama-3-70B Production Inference Cluster',
      steps: [
        { stepNumber: 1, title: 'Workload Parameters', narrative: 'Target: 50k QPS, 512 input tokens, 128 output tokens, p99 latency <= 80ms.' },
        { stepNumber: 2, title: 'Compare Hardware Configurations', narrative: '64x A100 FP16 ($76,800/mo) vs. 16x H100 INT4 AWQ ($22,400/mo).' },
        { stepNumber: 3, title: 'Review 71% Cost Reduction', narrative: 'H100 INT4 AWQ satisfies 80ms SLA while saving $54,400/mo ($652,800/yr).' },
      ],
      primaryActionLabel: 'Load Mock FinOps Sizing',
      primaryActionPayload: { actionType: 'LOAD_FINOPS_LLAMA' },
    },
  };

  // 2. Constructor
  public constructor() {}

  // 3. Public methods
  public getWalkthrough(tabId: WorkspaceTabId): ComponentMockWalkthrough {
    return MockWalkthroughCatalog._CATALOG[tabId] || MockWalkthroughCatalog._CATALOG[MockWalkthroughCatalog._DEFAULT_TAB];
  }

  public getAllTabIds(): WorkspaceTabId[] {
    return Object.keys(MockWalkthroughCatalog._CATALOG) as WorkspaceTabId[];
  }

  // 4. Protected methods (none)

  // 5. Private methods (none needed)
}
```

---

## 5. Verification & Testing Requirements

### Test Files to Create
- `tests/components/welcome/test_mock_walkthrough_catalog.test.ts`: Verifies complete coverage of all 6 workspace mock walkthroughs, steps, and action payloads.
- `tests/core/state/test_guidance_preference_manager.test.ts`: Tests RAM-only preference defaults, dismissal flags, "Don't show again" handling, and reset.
- `tests/components/welcome/test_app_welcome_modal.test.tsx`: Tests rendering of hero header, 3 pillars, 6 workspaces, "Take Tour" click, "Skip" click, and checkbox toggle.
- `tests/components/welcome/test_component_welcome_overlay.test.tsx`: Tests rendering of mock example walkthrough per active tab, primary CTA action dispatch, dismissal, and persistent re-trigger button.
- `tests/components/welcome/test_mock_action_dispatcher.test.ts`: Tests 1-click loading of Canvas RAG, Interview YouTube defense, Chaos burst attack, Telemetry spike, and FinOps sizing into store.

### Coverage & Quality Gates
- **$\ge 90\%$ branch and line coverage** across all welcome screen and mock action components.
- Run verification:
```bash
npm run typecheck
npm test
npm run validate:ts
npm run validate:py
```

---

## 6. Execution Checklist

- [x] Define welcome types and action payload contracts in `src/core/state/welcome_types.ts`.
- [x] Implement `WelcomeConstants` in `src/components/welcome/welcome_constants.ts`.
- [x] Implement `MockWalkthroughCatalog` in `src/components/welcome/mock_walkthrough_catalog.ts`.
- [x] Implement `GuidancePreferenceManager` in `src/core/state/guidance_preference_manager.ts`.
- [x] Implement `MockActionDispatcher` in `src/components/welcome/mock_action_dispatcher.ts`.
- [x] Implement `AppWelcomeModal` in `src/components/welcome/app_welcome_modal.tsx`.
- [x] Implement `ComponentWelcomeOverlay` in `src/components/welcome/component_welcome_overlay.tsx`.
- [x] Add `(?) Show Mock Example` button to screen toolbars and integrate `ComponentWelcomeOverlay` across all 6 workspace views.
- [x] Integrate `AppWelcomeModal` into `src/app/page.tsx` with first-time launch detection.
- [x] Write all 5 comprehensive test suites ensuring $\ge 90\%$ branch coverage.
- [x] Run `npm run typecheck`, `npm test`, `npm run validate:ts`, and `npm run validate:py` to confirm zero errors.

