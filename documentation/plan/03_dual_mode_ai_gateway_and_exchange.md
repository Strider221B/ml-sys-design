# Plan 03: Dual-Mode Hybrid AI Gateway & Exchange Engine

> **Phase:** 03  
> **Status:** Completed  
> **Design References:**  
> - [02_dual_mode_ai_gateway_and_exchange_spec.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/02_dual_mode_ai_gateway_and_exchange_spec.md)  
> - [00_overview_and_architecture.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/00_overview_and_architecture.md)  
> - [coding_standards.md](file:///home/somesh/git_repos/ml-sys-design/documentation/prompts/coding_standards.md)  
> **Virtual Environment:** `source ~/python_envs/p313_llm/bin/activate`

---

## 1. Executive Summary & Objectives

Implement the platform's **Dual-Mode AI Gateway & Exchange Engine**, which ensures 100% operational continuity even when operating under the severe rate limits (15 RPM, 1,500 RPD) or transient downtime of the **Google Gemini Free Tier API**.

### Core Deliverables
1. **Unified `LLMOrchestrator`**: Single execution pipeline routing inference requests through either **Direct API Mode** or **Manual Air-Gap Mode**.
2. **Direct Gemini Free Tier Client (`DirectGeminiClient`)**:
   - Token-bucket rate limiter matching Free Tier quotas.
   - Exponential backoff retry mechanism (1s, 2s, 4s).
   - Seamless automatic fallback to Manual Air-Gap Mode on persistent `HTTP 429 Too Many Requests` or `HTTP 503`.
3. **Structured Prompt Envelope Exporter (`PromptEnvelopeFactory`)**:
   - Generates standardized `LLMExchangeEnvelope` containing system instructions, structured JSON context, and target schemas.
   - Exports both machine-readable JSON envelopes and human-readable Markdown prompt bundles ready to paste into external LLMs (Google AI Studio, Claude, ChatGPT).
4. **Schema-Validated Response Importer (`ResponseValidator`)**:
   - Strips Markdown code fences (` ```json ` ... ` ``` `).
   - Corrects structural flaws using `jsonrepair`.
   - Validates outputs against module-specific Zod schemas across all 13 platform modules.
   - Generates automated **Schema Repair Prompts** highlighting validation diffs if parsing fails.
5. **Air-Gap Exchange UI Modal (`AiExchangeModal`)**:
   - Accessible modal dialog for copying prompts, downloading JSON packages, and importing/validating responses.

---

## 2. File Inventory & Class Responsibilities

| File Path | Primary Class | Responsibility | Est. Lines |
| :--- | :--- | :--- | :--- |
| `src/core/ai_gateway/llm_orchestrator.ts` | `LLMOrchestrator` | Central router executing direct inference or triggering air-gap fallback | ~220 |
| `src/core/ai_gateway/direct_gemini_client.ts` | `DirectGeminiClient` | Direct caller for Gemini Free Tier with rate-limiting and retry | ~240 |
| `src/core/ai_gateway/prompt_envelope_factory.ts` | `PromptEnvelopeFactory` | Packages system prompts, schemas, and context into JSON/Markdown bundles | ~180 |
| `src/core/ai_gateway/response_validator.ts` | `ResponseValidator` | Strips fences, runs `jsonrepair`, validates Zod schemas, builds repair prompts | ~250 |
| `src/core/ai_gateway/token_bucket_limiter.ts` | `TokenBucketLimiter` | In-memory token bucket rate limiter enforcing Free Tier quotas | ~130 |
| `src/core/ai_gateway/ai_gateway_constants.ts` | `AiGatewayConstants` | Constants for endpoints, models, rate limits, retry counts, error messages | ~90 |
| `src/schemas/module_exchange_schemas.ts` | `ModuleExchangeSchemas` | Zod schemas and type definitions for all 13 modules | ~320 |
| `src/components/ai_exchange/ai_exchange_modal.tsx` | `AiExchangeModal` | React modal component for copy prompt, upload JSON, and validation preview | ~220 |

---

## 3. Detailed Implementation Steps

### Step 1: Define Schemas for All 13 Modules
- File: `src/schemas/module_exchange_schemas.ts`
- Class: `ModuleExchangeSchemas`
  - Encapsulates Zod schemas for all 13 functional modules:
    1. `SANDBOX_BUILDER`: Architecture recommendation schema
    2. `CASE_STUDY_LIBRARY`: Blueprint gap analysis schema
    3. `AI_INTERVIEW_SIMULATOR`: 6-step rubric evaluation schema
    4. `CHAOS_ADVERSARIAL_PLAYGROUND`: Fault injection schema
    5. `FINOPS_CALCULATOR`: SKU recommendation schema
    6. `DATA_ALIGNMENT_ENGINE`: Bias report schema
    7. `CHAOS_MONKEY_ARGON`: Killer workload packet schema
    8. `TELEMETRY_LOG_GAME`: Synthetic messy log trace schema
    9. `REGULATORY_COMPLIANCE_SIM`: EU AI Act & GDPR audit schema
    10. `RESUME_PORTFOLIO_EXPORTER`: Production manifesto schema
    11. `MATH_REWARD_WORKSPACE`: Goodhart's law critique schema
    12. `DATA_ARCHAEOLOGY_SUITE`: Contamination audit schema
    13. `CAUSAL_INFERENCE_LAB`: Confounder critique schema
  - Public method: `getSchemaForModule(moduleId: string): z.ZodTypeAny`

### Step 2: Implement Rate Limiter & Direct Gemini Client
- File: `src/core/ai_gateway/token_bucket_limiter.ts`
- Class: `TokenBucketLimiter`
  - Class constants: `_CAPACITY = 15`, `_REFILL_RATE_PER_SEC = 0.25` (15 RPM).
  - Public method: `acquireToken(): Promise<boolean>`
- File: `src/core/ai_gateway/direct_gemini_client.ts`
- Class: `DirectGeminiClient`
  - Constructor accepts `apiKey: string`, `rateLimiter: TokenBucketLimiter`.
  - Public method: `executeDirect(prompt: string, systemInstruction: string): Promise<string>`
  - Handles exponential backoff on HTTP 429/503 (delays: 1000ms, 2000ms, 4000ms).
  - Method bodies strictly $\le 20$ lines (split into `_buildRequestBody()`, `_sendHttpRequest()`, `_handleHttpErrors()`).

### Step 3: Implement Prompt Envelope Factory
- File: `src/core/ai_gateway/prompt_envelope_factory.ts`
- Class: `PromptEnvelopeFactory`
  - Public method: `createEnvelope<T>(moduleId: string, context: T, systemInstruction: string, targetSchema: Record<string, unknown>): LLMExchangeEnvelope`
  - Public method: `formatMarkdownInstructions(envelope: LLMExchangeEnvelope): string`
  - Generates clear, copyable Markdown prompt instructions containing target JSON schema and system instructions.

### Step 4: Implement Response Validator & JSON Repair Engine
- File: `src/core/ai_gateway/response_validator.ts`
- Class: `ResponseValidator`
  - Public method: `validateResponse<T>(moduleId: string, rawText: string): ValidationResult<T>`
  - Strips Markdown code fences (` ```json ... ``` `).
  - Executes `jsonrepair` to fix common syntax issues (unquoted keys, missing brackets).
  - Executes Zod schema parse.
  - Public method: `buildRepairPrompt(moduleId: string, rawText: string, errorDescription: string): string`
  - Decomposes parsing pipeline into private helpers ($\le 20$ lines each).

### Step 5: Implement Unified Orchestrator & Exchange UI Modal
- File: `src/core/ai_gateway/llm_orchestrator.ts`
- Class: `LLMOrchestrator`
  - Injects `DirectGeminiClient`, `PromptEnvelopeFactory`, `ResponseValidator`.
  - Public method: `execute(moduleId: string, context: unknown, options?: ExecutionOptions): Promise<OrchestratorResult>`
  - If direct execution fails or is disabled, transitions state to `MANUAL_FALLBACK_REQUIRED` and supplies envelope.
- File: `src/components/ai_exchange/ai_exchange_modal.tsx`
  - Class-based React component or controller encapsulating UI interactions:
    - Copy Markdown prompt to clipboard.
    - Download `.envelope.json` file.
    - Textarea for pasting raw LLM response.
    - File upload drop-zone for importing JSON files.
    - Validation error banner with "Generate Schema Repair Prompt" button.

---

## 4. Class Contract & Member Ordering Example

```typescript
// src/core/ai_gateway/response_validator.ts
import { jsonrepair } from 'jsonrepair';
import { ModuleExchangeSchemas } from '@/schemas/module_exchange_schemas';

export class ResponseValidator {
  // 1. Class-level constants (non-public, leading underscore)
  private static readonly _FENCE_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  private static readonly _MAX_SNIPPET_LENGTH = 300;

  // 2. Constructor
  public constructor(private readonly _schemas: ModuleExchangeSchemas) {}

  // 3. Public methods
  public validateResponse<T>(moduleId: string, rawText: string): { success: boolean; data?: T; error?: string } {
    const cleaned = this._stripFences(rawText);
    const repaired = this._attemptRepair(cleaned);
    return this._parseSchema<T>(moduleId, repaired);
  }

  public buildRepairPrompt(moduleId: string, rawText: string, errorDescription: string): string {
    const snippet = rawText.slice(0, ResponseValidator._MAX_SNIPPET_LENGTH);
    return this._formatRepairInstructions(moduleId, snippet, errorDescription);
  }

  // 4. Protected methods (none)

  // 5. Private methods
  private _stripFences(text: string): string {
    const match = ResponseValidator._FENCE_REGEX.exec(text);
    return match && match[1] ? match[1].trim() : text.trim();
  }

  private _attemptRepair(text: string): string {
    try {
      return jsonrepair(text);
    } catch {
      return text;
    }
  }

  private _parseSchema<T>(moduleId: string, jsonStr: string): { success: boolean; data?: T; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      const schema = this._schemas.getSchemaForModule(moduleId);
      const validated = schema.parse(parsed) as T;
      return { success: true, data: validated };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown validation error' };
    }
  }

  private _formatRepairInstructions(moduleId: string, snippet: string, error: string): string {
    return `CRITICAL JSON SCHEMA ERROR for module ${moduleId}:\n` +
      `Your previous response failed validation: ${error}\n` +
      `Original output snippet: ${snippet}\n` +
      `Please output ONLY raw valid JSON conforming strictly to the requested schema.`;
  }
}
```

---

## 5. Verification & Testing Requirements

### Test Files to Create
- `tests/core/ai_gateway/test_token_bucket_limiter.test.ts`: Verifies quota exhaustion and token refill.
- `tests/core/ai_gateway/test_direct_gemini_client.test.ts`: Mocks Gemini API, tests 429 backoff and HTTP 200 success.
- `tests/core/ai_gateway/test_prompt_envelope_factory.test.ts`: Verifies JSON and Markdown generation.
- `tests/core/ai_gateway/test_response_validator.test.ts`: Tests fence stripping, `jsonrepair` fix of malformed JSON, and schema repair prompt generation.
- `tests/core/ai_gateway/test_llm_orchestrator.test.ts`: Tests end-to-end failover from direct mode to air-gap fallback on HTTP 429.
- `tests/components/ai_exchange/test_ai_exchange_modal.test.tsx`: Tests UI interactions, copy button, paste import, and validation alerts.

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

- [x] Implement `ModuleExchangeSchemas` in `src/schemas/module_exchange_schemas.ts`.
- [x] Implement `AiGatewayConstants` in `src/core/ai_gateway/ai_gateway_constants.ts`.
- [x] Implement `TokenBucketLimiter` in `src/core/ai_gateway/token_bucket_limiter.ts`.
- [x] Implement `DirectGeminiClient` in `src/core/ai_gateway/direct_gemini_client.ts`.
- [x] Implement `PromptEnvelopeFactory` in `src/core/ai_gateway/prompt_envelope_factory.ts`.
- [x] Implement `ResponseValidator` in `src/core/ai_gateway/response_validator.ts`.
- [x] Implement `LLMOrchestrator` in `src/core/ai_gateway/llm_orchestrator.ts`.
- [x] Implement `AiExchangeModal` in `src/components/ai_exchange/ai_exchange_modal.tsx`.
- [x] Write all 6 comprehensive unit/integration test suites ensuring $\ge 90\%$ branch coverage.
- [x] Verify zero lint, type, or test errors.

