# Plan 10: Plug-and-Play Scenario Engine & 2026 Core Curriculum

> **Phase:** 10  
> **Status:** Pending Execution  
> **Design References:**  
> - [08_plug_and_play_schema_and_curriculum_specs.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/08_plug_and_play_schema_and_curriculum_specs.md)  
> - [01_state_management_and_gdrive_ssot.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/01_state_management_and_gdrive_ssot.md)  
> - [coding_standards.md](file:///home/somesh/git_repos/ml-sys-design/documentation/prompts/coding_standards.md)  
> **Virtual Environment:** `source ~/python_envs/p313_llm/bin/activate`

---

## 1. Executive Summary & Objectives

Implement the extensible **Plug-and-Play Scenario Engine** and load the comprehensive **2026 Core Curriculum Matrix**, enabling rapid deployment of new production architecture drills via declarative YAML/JSON schemas without modifying application code.

### Core Deliverables
1. **Plug-and-Play Scenario Loader (`ScenarioLoader`, `ScenarioPluginSchema`)**:
   - Parses and validates declarative scenario manifests against `ScenarioPluginSchema`.
   - Supports dual loading: from bundled local static files (`public/scenarios/`) and from the user's Google Drive SSOT folder (`/ML_System_Design_2026_SSOT/schemas/`).
2. **Three Production Reference Blueprints**:
   - `blueprint_ecommerce_ranking.yaml`: Personalized retrieval and cross-encoder re-ranking.
   - `blueprint_streaming_fraud.yaml`: Millisecond fraud detection with Kafka, Flink, and Feast.
   - `blueprint_enterprise_vector_rag.yaml`: Hybrid search with sparse BM25, dense embeddings, and guardrails.
3. **2026 Core Curriculum Matrix Modules 1, 2, and 3 (`CurriculumManager`)**:
   - *Module 1: Classical Data & MLOps Infrastructure*: Real-time feature stores vs batch pipelines, distributed caching, Kafka sharding.
   - *Module 2: Generative AI & Foundation Models*: High-throughput RAG, speculative decoding, vLLM routing, prompt caching, stateful agent graphs.
   - *Module 3: Production Engineering & System Metrics*: Online A/B experimentation, CUPED variance reduction, multi-armed bandits, GPU unit economics.
4. **Curriculum Progression & Mastery Tracker (`CurriculumTracker`)**:
   - Tracks scenario completion, rubric scores, and skill mastery levels.
   - Synchronizes student progress directly to `manifest.json` in Google Drive (SSOT).

---

## 2. File Inventory & Class Responsibilities

| File Path | Primary Class | Responsibility | Est. Lines |
| :--- | :--- | :--- | :--- |
| `src/core/scenarios/scenario_loader.ts` | `ScenarioLoader` | Reads, parses (YAML/JSON), and validates scenario blueprints | ~180 |
| `src/core/curriculum/curriculum_manager.ts` | `CurriculumManager` | Catalogs Modules 1, 2, and 3 and maps learning outcomes | ~210 |
| `src/core/curriculum/curriculum_tracker.ts` | `CurriculumTracker` | Manages student scores, lesson completion, and Drive state sync | ~160 |
| `src/core/scenarios/scenario_constants.ts` | `ScenarioConstants` | Curriculum module keys, difficulty tiers, schema folder names | ~70 |
| `public/scenarios/blueprint_ecommerce_ranking.yaml` | YAML Data | Production E-commerce ranking blueprint definition | ~90 |
| `public/scenarios/blueprint_streaming_fraud.yaml` | YAML Data | Production streaming fraud detection blueprint definition | ~90 |
| `public/scenarios/blueprint_enterprise_vector_rag.yaml` | YAML Data | Production enterprise vector RAG blueprint definition | ~90 |
| `src/components/curriculum/curriculum_view.tsx` | `CurriculumView` | Interactive lesson navigator and progress dashboard | ~220 |

---

## 3. Detailed Implementation Steps

### Step 1: Implement Declarative Scenario Loader
- File: `src/core/scenarios/scenario_loader.ts`
- Class: `ScenarioLoader`
  - Injects `GDriveSyncClient` and `ScenarioPluginSchema`.
  - Public methods:
    - `loadBuiltinScenario(scenarioId: string): Promise<ScenarioPlugin>`: Reads from `public/scenarios/`.
    - `loadDriveScenarios(folderId: string): Promise<ScenarioPlugin[]>`: Discovers user-contributed plugins in Google Drive.
    - `validateScenario(rawContent: string, format: 'yaml' | 'json'): ScenarioPlugin`
  - Uses `js-yaml` for YAML parsing and validates output via `ScenarioPluginSchema`.

### Step 2: Implement 3 Reference Production Blueprint Files
- Files:
  - `public/scenarios/blueprint_ecommerce_ranking.yaml`
  - `public/scenarios/blueprint_streaming_fraud.yaml`
  - `public/scenarios/blueprint_enterprise_vector_rag.yaml`
- Each YAML specifies:
  - Initial canvas node graph (types, parameters, coordinates).
  - Target constraints: max latency, min QPS, monthly budget.
  - Chaos perturbations (e.g. data drift trigger, API latency spike).
  - Passing rubric criteria.

### Step 3: Implement 2026 Core Curriculum Matrix Manager
- File: `src/core/curriculum/curriculum_manager.ts`
- Class: `CurriculumManager`
  - Structures 3 learning modules:
    - **Module 1**: Classical Data & MLOps Infrastructure (Feature stores, stream processing, Kafka).
    - **Module 2**: Generative AI & Foundation Models (Vector DBs, RAG, Speculative Decoding, Agent graphs).
    - **Module 3**: Production Engineering & System Metrics (CUPED variance reduction, GPU FinOps, latency bounds).
  - Emphasizes 2026 data science transformations:
    - Transitioning from hyperparameter tuning $\to$ Reward Function Optimization.
    - Transitioning from feature selection $\to$ Data Ingestion Alignment & Contamination Auditing.
    - Transitioning from simple correlation $\to$ Causal DAGs & CUPED Systems.

### Step 4: Implement Progression Tracker & Google Drive Sync
- File: `src/core/curriculum/curriculum_tracker.ts`
- Class: `CurriculumTracker`
  - Injects `WorkspaceStore` and `SyncManager`.
  - Public methods:
    - `recordCompletion(scenarioId: string, rubricScore: number): void`
    - `getMasteryProfile(): StudentMasteryProfile`
    - `isModuleUnlocked(moduleId: string): boolean`
  - Persists student mastery profiles to the active workspace manifest in Google Drive without local disk caching.

### Step 5: Implement Curriculum Navigator UI
- File: `src/components/curriculum/curriculum_view.tsx`
  - Interactive dashboard displaying module track progress, lesson objectives, unlocked badges, and one-click "Launch Scenario Canvas" actions.

---

## 4. Class Contract & Member Ordering Example

```typescript
// src/core/scenarios/scenario_loader.ts
import yaml from 'js-yaml';
import { ScenarioPluginSchema } from '@/schemas/scenario_plugin_schema';

export class ScenarioLoader {
  // 1. Class-level constants (non-public, leading underscore)
  private static readonly _BUILTIN_PATH = '/scenarios/';
  private static readonly _YAML_EXT = '.yaml';

  // 2. Constructor
  public constructor(private readonly _schemaValidator: ScenarioPluginSchema) {}

  // 3. Public methods
  public async loadBuiltinScenario(scenarioId: string): Promise<unknown> {
    const filePath = `${ScenarioLoader._BUILTIN_PATH}${scenarioId}${ScenarioLoader._YAML_EXT}`;
    const rawYaml = await this._fetchFile(filePath);
    return this.parseAndValidate(rawYaml);
  }

  public parseAndValidate(rawYaml: string): unknown {
    const parsed = yaml.load(rawYaml);
    return this._schemaValidator.validate(parsed);
  }

  // 4. Protected methods (none)

  // 5. Private methods
  private async _fetchFile(path: string): Promise<string> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load scenario file: ${path} (status: ${response.status})`);
    }
    return response.text();
  }
}
```

---

## 5. Verification & Testing Requirements

### Test Files to Create
- `tests/core/scenarios/test_scenario_loader.test.ts`: Tests YAML parsing, Zod validation, and error handling for malformed schemas.
- `tests/core/scenarios/test_builtin_blueprints.test.ts`: Verifies all 3 bundled YAML blueprints pass schema validation.
- `tests/core/curriculum/test_curriculum_manager.test.ts`: Tests module listing, prerequisites, and learning objectives.
- `tests/core/curriculum/test_curriculum_tracker.test.ts`: Tests completion tracking, score averaging, and Drive synchronization triggers.
- `tests/components/curriculum/test_curriculum_view.test.tsx`: Tests UI lesson card rendering and scenario launch navigation.

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

- [ ] Implement `ScenarioConstants` in `src/core/scenarios/scenario_constants.ts`.
- [ ] Implement `ScenarioLoader` in `src/core/scenarios/scenario_loader.ts`.
- [ ] Create `blueprint_ecommerce_ranking.yaml` in `public/scenarios/`.
- [ ] Create `blueprint_streaming_fraud.yaml` in `public/scenarios/`.
- [ ] Create `blueprint_enterprise_vector_rag.yaml` in `public/scenarios/`.
- [ ] Implement `CurriculumManager` in `src/core/curriculum/curriculum_manager.ts`.
- [ ] Implement `CurriculumTracker` in `src/core/curriculum/curriculum_tracker.ts`.
- [ ] Implement `CurriculumView` in `src/components/curriculum/curriculum_view.tsx`.
- [ ] Write all 5 comprehensive test suites ensuring $\ge 90\%$ branch coverage.
- [ ] Verify zero lint, type, or test errors.

