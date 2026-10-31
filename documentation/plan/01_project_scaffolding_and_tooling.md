# Plan 01: Project Foundation, Tooling & Coding Standards Enforcement

> **Phase:** 01  
> **Status:** Completed  
> **Design References:**  
> - [00_overview_and_architecture.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/00_overview_and_architecture.md)  
> - [09_isomorphic_deployment_and_ci_cd.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/09_isomorphic_deployment_and_ci_cd.md)  
> - [coding_standards.md](file:///home/somesh/git_repos/ml-sys-design/documentation/prompts/coding_standards.md)  
> **Virtual Environment:** `source ~/python_envs/p313_llm/bin/activate`

---

## 1. Executive Summary & Objectives

Establish the complete project foundation, isomorphic directory structure, static analysis toolchains, and strict coding standards enforcement scripts across both the Next.js (TypeScript) runtime and the Python 3.13 scientific runtime.

### Core Deliverables
1. **Next.js 16.4+ App Router & TypeScript Configuration**: Strict `tsconfig.json` (`noImplicitAny`, `strictNullChecks`, `exactOptionalPropertyTypes`), Tailwind CSS 3.4, and path aliases (`@/*`).
2. **Python Scientific & Worker Toolchain**: `pyproject.toml` configured with `ruff` (line length 100, rules `E`, `W`, `F`, `I`), `mypy` (`strict = true`), and `pytest` (`--cov`, `fail_under = 90`).
3. **Coding Standards Verification Scripts**: Automated AST linters in TypeScript and Python that strictly enforce:
   - One Class Per File (file name matches class name)
   - Strict OOP (Zero free-standing functions)
   - Method length limit ($\le 20$ logical lines of code)
   - File length limit ($\le 500$ lines)
   - Strict member ordering (Class constants -> Constructor -> Public -> Protected -> Private)
   - No magic strings/numbers
4. **Core Shared Types & Schemas**: Standardized Zod schemas and TypeScript types for `ScenarioPluginSchema`, `LLMExchangeEnvelope`, and `WorkspaceDocument`.

---

## 2. File Inventory & Class Responsibilities

| File Path | Primary Class / Type | Responsibility | Est. Lines |
| :--- | :--- | :--- | :--- |
| `package.json` | Manifest | NPM dependencies (Next.js 16.4, React 19.3, Zustand 5, Zod 3, Comlink, Lucide, Tailwind 3.4, Vitest) | ~70 |
| `tsconfig.json` | Config | Strict TypeScript configuration with path aliases | ~35 |
| `pyproject.toml` | Config | Python packaging, dependencies (numpy, scipy, pytest, ruff, mypy), coverage config | ~80 |
| `scripts/standards_validator.ts` | `StandardsValidator` | AST validator for TypeScript files verifying class-per-file, ordering, method length | ~220 |
| `scripts/standards_validator.py` | `StandardsValidatorPy` | Python AST validator verifying strict OOP, member ordering, method length ($\le 20$ lines) | ~190 |
| `src/schemas/exchange_envelope_schema.ts` | `ExchangeEnvelopeSchema` | Zod schema validator for `LLMExchangeEnvelope` | ~120 |
| `src/schemas/scenario_plugin_schema.ts` | `ScenarioPluginSchema` | Zod schema validator for YAML/JSON scenario blueprints | ~160 |
| `src/core/state/workspace_types.ts` | `WorkspaceTypes` | TypeScript type declarations for RAM-only workspace state | ~140 |
| `vitest.config.ts` | Config | Vitest test runner configuration with branch coverage enabled | ~40 |

---

## 3. Detailed Implementation Steps

### Step 1: Scaffolding Package Manifests & Tooling
- Initialize `package.json` with dependencies:
  - Core: `next@^16.4.3`, `react@^19.3.1`, `react-dom@^19.3.1`, `zustand@^5.0.16`, `zod@^3.23.8`, `comlink@^4.4.1`, `@xyflow/react@^12.12.0`, `jsonrepair@^3.8.0`, `lucide-react@^1.65.0`, `js-yaml@^4.1.0`.
  - Dev: `typescript@^5.6.3`, `vitest@^2.1.3`, `@testing-library/react@^16.0.0`, `@testing-library/jest-dom@^6.5.0`, `eslint@^9.13.0`, `prettier@^3.3.3`, `tailwindcss@^3.4.19`.
- Initialize `pyproject.toml` with:
  - `[project]` dependencies: `numpy>=2.0.0`, `scipy>=1.14.0`.
  - `[tool.ruff]`: `line-length = 100`, `lint.select = ["E", "W", "F", "I"]`.
  - `[tool.mypy]`: `strict = true`, `disallow_untyped_defs = true`.
  - `[tool.pytest.ini_options]`: `addopts = "--cov=src/workers/pyodide --cov-report=term-missing --cov-fail-under=90"`.

### Step 2: Coding Standards AST Enforcement Scripts
- Implement `StandardsValidator` in `scripts/standards_validator.ts`:
  - **Single Class Check**: Parse TypeScript files via `ts-morph` or `@babel/parser`. Ensure exactly 1 class declaration per `.ts`/`.tsx` file (excluding interfaces/types).
  - **File Name Check**: Assert class name matches camel/snake case of the file basename.
  - **Member Ordering Check**: Validate AST member node order:
    1. Static / Class-level variables
    2. Constructor
    3. Public methods
    4. Protected methods (`_`)
    5. Private methods (`__` or `#`)
  - **Method Body Length Check**: Count logical AST statements in method bodies (excluding comments/docstrings/blank lines); raise error if $>20$.
  - **File Length Check**: Assert total file lines $\le 500$.
- Implement `StandardsValidatorPy` in `scripts/standards_validator.py`:
  - Mirror all the above checks for Python files using the native `ast` module.

### Step 3: Core Schemas & Types Definition
- Implement `ExchangeEnvelopeSchema` (`src/schemas/exchange_envelope_schema.ts`):
  - Encapsulate Zod schema in class `ExchangeEnvelopeSchema`:
    - `validateEnvelope(input: unknown): LLMExchangeEnvelope`
    - `createEmptyEnvelope(moduleId: string, executionMode: 'DIRECT' | 'MANUAL_AIR_GAP'): LLMExchangeEnvelope`
- Implement `ScenarioPluginSchema` (`src/schemas/scenario_plugin_schema.ts`):
  - Encapsulate scenario schema in class `ScenarioPluginSchema`:
    - Validates `scenarioVersion`, `scenarioId`, `metadata`, `canvasTemplate`, `operationalConstraints`, `chaosPerturbations`, `evaluationRubric`.
- Implement `WorkspaceTypes` in `src/core/state/workspace_types.ts`:
  - Types for node models, edge models, sync states, telemetry ring buffers, and active curriculum indices.

---

## 4. Class Design & Coding Standards Compliance

```typescript
// Example: src/schemas/exchange_envelope_schema.ts
import { z } from 'zod';

export class ExchangeEnvelopeSchema {
  // 1. Class-level constants (non-public, leading underscore)
  private static readonly _SCHEMA_VERSION = '2026.1';
  private static readonly _ENVELOPE_SCHEMA = z.object({
    envelopeVersion: z.literal(ExchangeEnvelopeSchema._SCHEMA_VERSION),
    moduleId: z.string().min(1),
    timestampIso: z.string().datetime(),
    executionMode: z.enum(['DIRECT', 'MANUAL_AIR_GAP']),
    promptPackage: z.object({
      systemInstruction: z.string(),
      userContext: z.record(z.unknown()),
      targetJsonSchema: z.record(z.unknown()),
      markdownPromptInstructions: z.string(),
    }),
    responsePayload: z.record(z.unknown()).nullable(),
    verificationSignature: z.string().nullable(),
  });

  // 2. Constructor
  public constructor() {}

  // 3. Public methods
  public get schemaVersion(): string {
    return ExchangeEnvelopeSchema._SCHEMA_VERSION;
  }

  public validateEnvelope(input: unknown): z.infer<typeof ExchangeEnvelopeSchema._ENVELOPE_SCHEMA> {
    return ExchangeEnvelopeSchema._ENVELOPE_SCHEMA.parse(input);
  }

  public createEmptyEnvelope(
    moduleId: string,
    executionMode: 'DIRECT' | 'MANUAL_AIR_GAP',
    systemInstruction: string,
    userContext: Record<string, unknown>,
    targetJsonSchema: Record<string, unknown>,
    markdownPromptInstructions: string
  ): z.infer<typeof ExchangeEnvelopeSchema._ENVELOPE_SCHEMA> {
    return this._buildEnvelope(moduleId, executionMode, systemInstruction, userContext, targetJsonSchema, markdownPromptInstructions);
  }

  // 4. Protected methods (none needed here)

  // 5. Private methods
  private _buildEnvelope(
    moduleId: string,
    executionMode: 'DIRECT' | 'MANUAL_AIR_GAP',
    systemInstruction: string,
    userContext: Record<string, unknown>,
    targetJsonSchema: Record<string, unknown>,
    markdownPromptInstructions: string
  ) {
    return {
      envelopeVersion: ExchangeEnvelopeSchema._SCHEMA_VERSION,
      moduleId,
      timestampIso: new Date().toISOString(),
      executionMode,
      promptPackage: {
        systemInstruction,
        userContext,
        targetJsonSchema,
        markdownPromptInstructions,
      },
      responsePayload: null,
      verificationSignature: null,
    };
  }
}
```

---

## 5. Verification & Testing Requirements

### Test Files to Create
- `tests/schemas/test_exchange_envelope_schema.test.ts`
- `tests/schemas/test_scenario_plugin_schema.test.ts`
- `tests/scripts/test_standards_validator.test.ts`
- `tests/scripts/test_standards_validator_py.py`

### Coverage & Quality Gates
- **100% Branch Coverage** on schemas and validation scripts.
- **Verification Commands**:
```bash
npm run lint
npx tsc --noEmit
npm run test:cov
python3 -m pytest tests/scripts/test_standards_validator_py.py
```

---

## 6. Execution Checklist

- [x] Initialize `package.json` with Next.js, React 19, Zustand, Vitest, and Zod dependencies.
- [x] Initialize `tsconfig.json` with strict mode enabled.
- [x] Initialize `pyproject.toml` with ruff, mypy strict, and pytest coverage thresholds.
- [x] Implement `StandardsValidator` in `scripts/standards_validator.ts`.
- [x] Implement `StandardsValidatorPy` in `scripts/standards_validator.py`.
- [x] Implement `ExchangeEnvelopeSchema` in `src/schemas/exchange_envelope_schema.ts`.
- [x] Implement `ScenarioPluginSchema` in `src/schemas/scenario_plugin_schema.ts`.
- [x] Define shared workspace interfaces in `src/core/state/workspace_types.ts`.
- [x] Add unit test suites with $\ge 90\%$ branch coverage.
- [x] Execute CI pipeline stages locally and confirm all checks pass cleanly.

