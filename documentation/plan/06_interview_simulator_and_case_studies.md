# Plan 06: AI Interview Simulator & Interactive Case-Study Library

> **Phase:** 06  
> **Status:** Pending Execution  
> **Design References:**  
> - [05_interview_chaos_and_case_study_subsystems.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/05_interview_chaos_and_case_study_subsystems.md)  
> - [08_plug_and_play_schema_and_curriculum_specs.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/08_plug_and_play_schema_and_curriculum_specs.md)  
> - [02_dual_mode_ai_gateway_and_exchange_spec.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/02_dual_mode_ai_gateway_and_exchange_spec.md)  
> - [coding_standards.md](file:///home/somesh/git_repos/ml-sys-design/documentation/prompts/coding_standards.md)  
> **Virtual Environment:** `source ~/python_envs/p313_llm/bin/activate`

---

## 1. Executive Summary & Objectives

Implement the **AI Interview Simulator (2026 Standard)** and the **Interactive Case-Study Library**, delivering realistic machine learning systems design interviews with voice/canvas evaluation and step-by-step breakdowns of production architectures.

### Core Deliverables
1. **6-Step Framework State Machine (`InterviewStateMachine`)**:
   - Enforces sequential progression:
     1. Clarifying Requirements
     2. Data Ingestion & Feature Engineering
     3. Model Selection & Training
     4. Model Evaluation (Offline vs Online A/B testing)
     5. Serving & Scalability
     6. Monitoring & Retraining Loops
2. **Multimodal Evaluation Engine (`MultimodalInputProcessor`, `VoiceInputHandler`)**:
   - Captures spoken explanations via browser Web Speech API.
   - Serializes visual canvas topology into structured JSON context for the AI interviewer.
3. **Dynamic Whiteboard Interviewer & Rubric Evaluator (`InterviewRubricEvaluator`)**:
   - Scores candidate submissions across technical rigor, scale estimation, trade-off clarity, and failure awareness.
   - Powered by `LLMOrchestrator` with seamless Direct Gemini API execution or Air-Gap manual export/import.
4. **Interactive Case-Study Library (`CaseStudyManager`)**:
   - *E-Commerce Blueprint*: Real-time two-stage candidate retrieval + cross-encoder re-ranking.
   - *Security Blueprint*: Streaming fraud detection with Kafka, Flink, and low-latency Feast feature store.
   - *GenAI Blueprint*: Enterprise hybrid search RAG combining sparse BM25 and dense vector embeddings.
5. **Interactive Failure Mode Drills**:
   - Introduces sudden data drift, training-serving skew, or hallucination spikes, testing candidate remediation.

---

## 2. File Inventory & Class Responsibilities

| File Path | Primary Class | Responsibility | Est. Lines |
| :--- | :--- | :--- | :--- |
| `src/core/interview/interview_state_machine.ts` | `InterviewStateMachine` | Strict state transitions across the 6 interview framework steps | ~180 |
| `src/core/interview/multimodal_input_processor.ts` | `MultimodalInputProcessor` | Combines voice transcriptions and canvas graphs into prompt context | ~160 |
| `src/core/interview/voice_input_handler.ts` | `VoiceInputHandler` | Web Speech API speech-to-text wrapper with fallback | ~140 |
| `src/core/interview/interview_rubric_evaluator.ts` | `InterviewRubricEvaluator` | Scores interview step submissions and generates gap analysis | ~210 |
| `src/core/case_studies/case_study_manager.ts` | `CaseStudyManager` | Loads, tracks, and validates interactive case-study blueprints | ~190 |
| `src/core/case_studies/failure_mode_simulator.ts` | `FailureModeSimulator` | Injects drift, skew, or hallucination spikes into blueprints | ~170 |
| `src/core/interview/interview_constants.ts` | `InterviewConstants` | Step names, rubric score weights, default prompts, voice configs | ~80 |
| `src/components/interview/interview_workspace.tsx` | `InterviewWorkspace` | Main terminal UI pairing whiteboard canvas with AI chat | ~240 |

---

## 3. Detailed Implementation Steps

### Step 1: Implement 6-Step Interview Framework State Machine
- File: `src/core/interview/interview_state_machine.ts`
- Class: `InterviewStateMachine`
  - Defines 6 distinct lifecycle steps:
    `STEP_1_CLARIFYING_REQUIREMENTS`  
    `STEP_2_DATA_INGESTION_FEATURES`  
    `STEP_3_MODEL_SELECTION_TRAINING`  
    `STEP_4_MODEL_EVALUATION`  
    `STEP_5_SERVING_SCALABILITY`  
    `STEP_6_MONITORING_RETRAINING`  
  - Public methods:
    - `getCurrentStep(): InterviewStep`
    - `canTransitionTo(step: InterviewStep): boolean`
    - `transitionToNext(stepSubmission: StepSubmission): TransitionResult`
    - `resetSession(): void`
  - Prevents skipping steps without a validated rubric score.

### Step 2: Implement Multimodal Input Processor & Voice Handler
- File: `src/core/interview/voice_input_handler.ts`
- Class: `VoiceInputHandler`
  - Uses `window.webkitSpeechRecognition` or `window.SpeechRecognition`.
  - Public methods: `startListening(): void`, `stopListening(): void`, `getTranscript(): string`.
- File: `src/core/interview/multimodal_input_processor.ts`
- Class: `MultimodalInputProcessor`
  - Injects `ArchitectureCanvas` graph state and voice/text transcripts.
  - Public method: `buildEvaluationPayload(step: InterviewStep, text: string, graph: CanvasGraph): InterviewPayload`

### Step 3: Implement Rubric Evaluator with Dual-Mode AI Gateway
- File: `src/core/interview/interview_rubric_evaluator.ts`
- Class: `InterviewRubricEvaluator`
  - Injects `LLMOrchestrator`.
  - Public method: `evaluateStep(payload: InterviewPayload): Promise<RubricEvaluationResult>`
  - Uses module key `AI_INTERVIEW_SIMULATOR`.
  - If direct Gemini API call rate-limits, yields `LLMExchangeEnvelope` to trigger air-gap export modal.
  - Scores 0-100 on:
    - Metric definition & scale estimation (QPS, storage, latency)
    - Architecture completeness & pipeline data flow
    - Trade-off justification (e.g. why H100 vs TPU, streaming vs batch)
    - Failure mode handling (drift, retry, circuit breakers)

### Step 4: Implement Interactive Case-Study Library & Failure Drills
- File: `src/core/case_studies/case_study_manager.ts`
- Class: `CaseStudyManager`
  - Loads 3 comprehensive blueprints:
    1. `ECOMMERCE_RANKING`: User profile -> Candidate generator (ANN vector search) -> LightGBM/Cross-Encoder ranker -> Business logic re-ranker.
    2. `STREAMING_FRAUD`: Payment ingress -> Kafka event stream -> Flink stream enricher -> Feast Redis feature lookup -> XGBoost fraud model -> Decision engine.
    3. `ENTERPRISE_VECTOR_RAG`: Document chunker -> Hybrid Sparse/Dense index -> Vector DB -> LLM contextual generator -> Guardrail.
  - Public method: `getBlueprint(blueprintId: string): CaseStudyBlueprint`
- File: `src/core/case_studies/failure_mode_simulator.ts`
- Class: `FailureModeSimulator`
  - Public method: `injectFailure(blueprintId: string, failureType: 'DATA_DRIFT' | 'TRAIN_SERVE_SKEW' | 'HALLUCINATION_SPIKE'): FailureScenario`

### Step 5: Implement Interview & Case-Study UI Workspace
- File: `src/components/interview/interview_workspace.tsx`
  - Renders side-by-side view: interactive canvas on left, interviewer chat & step timeline on right.
  - Displays step progression, rubric scorecards, and air-gap exchange button.

---

## 4. Class Contract & Member Ordering Example

```typescript
// src/core/interview/interview_state_machine.ts

export class InterviewStateMachine {
  // 1. Class-level constants (non-public, leading underscore)
  private static readonly _STEPS = [
    'CLARIFYING_REQUIREMENTS',
    'DATA_INGESTION_FEATURES',
    'MODEL_SELECTION_TRAINING',
    'MODEL_EVALUATION',
    'SERVING_SCALABILITY',
    'MONITORING_RETRAINING',
  ] as const;
  private static readonly _MIN_PASSING_SCORE = 70;

  // 2. Constructor
  public constructor(private _currentStepIndex: number = 0) {}

  // 3. Public methods
  public getCurrentStep(): string {
    return InterviewStateMachine._STEPS[this._currentStepIndex];
  }

  public get currentStepIndex(): number {
    return this._currentStepIndex;
  }

  public canTransition(score: number): boolean {
    return score >= InterviewStateMachine._MIN_PASSING_SCORE && this._currentStepIndex < InterviewStateMachine._STEPS.length - 1;
  }

  public advanceStep(score: number): { success: boolean; nextStep?: string; error?: string } {
    if (!this.canTransition(score)) {
      return { success: false, error: 'Cannot advance: score below threshold or already at final step.' };
    }
    this._currentStepIndex++;
    return { success: true, nextStep: this.getCurrentStep() };
  }

  public reset(): void {
    this._currentStepIndex = 0;
  }

  // 4. Protected methods (none)

  // 5. Private methods (none needed here)
}
```

---

## 5. Verification & Testing Requirements

### Test Files to Create
- `tests/core/interview/test_interview_state_machine.test.ts`: Verifies strict step transitions, rejection of low scores, and reset.
- `tests/core/interview/test_multimodal_input_processor.test.ts`: Tests merging of graph JSON and voice text.
- `tests/core/interview/test_voice_input_handler.test.ts`: Mocks SpeechRecognition API events and transcript accumulation.
- `tests/core/interview/test_interview_rubric_evaluator.test.ts`: Tests grading logic and fallback envelope creation on 429.
- `tests/core/case_studies/test_case_study_manager.test.ts`: Validates completeness of E-commerce, Fraud, and RAG blueprints.
- `tests/core/case_studies/test_failure_mode_simulator.test.ts`: Tests drift/skew/hallucination failure scenarios.

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

- [ ] Implement `InterviewConstants` in `src/core/interview/interview_constants.ts`.
- [ ] Implement `InterviewStateMachine` in `src/core/interview/interview_state_machine.ts`.
- [ ] Implement `VoiceInputHandler` in `src/core/interview/voice_input_handler.ts`.
- [ ] Implement `MultimodalInputProcessor` in `src/core/interview/multimodal_input_processor.ts`.
- [ ] Implement `InterviewRubricEvaluator` in `src/core/interview/interview_rubric_evaluator.ts`.
- [ ] Implement `CaseStudyManager` in `src/core/case_studies/case_study_manager.ts`.
- [ ] Implement `FailureModeSimulator` in `src/core/case_studies/failure_mode_simulator.ts`.
- [ ] Implement `InterviewWorkspace` in `src/components/interview/interview_workspace.tsx`.
- [ ] Write all 6 comprehensive unit test suites ensuring $\ge 90\%$ branch coverage.
- [ ] Verify zero lint, type, or test errors.

