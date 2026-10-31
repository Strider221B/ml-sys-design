# Plan 11: Isomorphic Deployment & CI/CD Quality Pipeline

> **Phase:** 11  
> **Status:** Pending Execution  
> **Design References:**  
> - [09_isomorphic_deployment_and_ci_cd.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/09_isomorphic_deployment_and_ci_cd.md)  
> - [00_overview_and_architecture.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/00_overview_and_architecture.md)  
> - [coding_standards.md](file:///home/somesh/git_repos/ml-sys-design/documentation/prompts/coding_standards.md)  
> **Virtual Environment:** `source ~/python_envs/p313_llm/bin/activate`

---

## 1. Executive Summary & Objectives

Finalize the isomorphic deployment packaging, containerization, serverless edge routing, and continuous integration pipeline for the platform. This ensures identical execution behavior on developer workstations (`localhost:3000` via Node.js or Docker) and in production on **Vercel's Edge Network**, backed by automated quality gates enforcing **$\ge 90\%$ test coverage**.

### Core Deliverables
1. **Containerized Local Deployment (`Dockerfile`, `docker-compose.yml`)**:
   - Multi-stage Node.js 24 Alpine build producing lightweight, production-ready standalone output.
   - One-command execution via `docker compose up`.
2. **Vercel Serverless & Edge Configuration (`vercel.json`)**:
   - Configures headers for Content-Security-Policy (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
   - Enables `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` to support high-performance Web Workers and Pyodide WebAssembly.
3. **Stateless Edge Handlers**:
   - `/api/auth/github/callback`: Stateless GitHub OAuth broker for portfolio publishing.
   - `/api/gemini/proxy`: Optional token-bucket edge proxy sanitizing and forwarding requests to the Gemini Free Tier API.
4. **Automated CI/CD Quality Pipeline (`.github/workflows/ci.yml`)**:
   - Mirrors mandatory local CI stages across linting, type-checking, and test coverage thresholds ($\ge 90\%$).
5. **Local CI Run Script (`scripts/run_local_ci.sh`)**:
   - Single-command local gatekeeper verifying all three stages before PR submission.

---

## 2. File Inventory & Class Responsibilities

| File Path | Primary Class / Config | Responsibility | Est. Lines |
| :--- | :--- | :--- | :--- |
| `Dockerfile` | Multi-Stage Build | Node 24 Alpine builder and standalone runner | ~45 |
| `docker-compose.yml` | Container Compose | Orchestrates local dev and production container instances | ~35 |
| `vercel.json` | Edge Config | Security headers, CSP, COOP/COEP for Web Workers/WASM | ~50 |
| `src/app/api/auth/github/callback/route.ts` | `GitHubAuthEdgeHandler` | Stateless Edge route exchanging GitHub OAuth code | ~130 |
| `src/app/api/gemini/proxy/route.ts` | `GeminiProxyEdgeHandler` | Edge proxy route enforcing token-bucket rate limits | ~140 |
| `.github/workflows/ci.yml` | GitHub Actions | Automated CI pipeline running ruff, mypy, pytest, tsc, and vitest | ~80 |
| `scripts/local_ci_runner.ts` | `LocalCiRunner` | Orchestrates local execution of all lint, type, and test stages | ~160 |
| `scripts/run_local_ci.sh` | Shell Wrapper | Executable bash script invoking `LocalCiRunner` | ~30 |

---

## 3. Detailed Implementation Steps

### Step 1: Implement Multi-Stage Production Dockerfile & Compose
- File: `Dockerfile`
  - Multi-stage build:
    - Stage 1 `builder`: `FROM node:24-alpine`, install dependencies (`npm ci`), run build (`npm run build`).
    - Stage 2 `runner`: `FROM node:24-alpine`, copy standalone `.next` artifact, expose port 3000, start `node server.js`.
- File: `docker-compose.yml`
  - Defines service `ml_sys_design_2026`, passes environment variables for Google Client ID and Gemini API Key.

### Step 2: Implement Vercel Deployment Configuration
- File: `vercel.json`
  - Sets security headers:
    - `Content-Security-Policy`: restricts origins to `self`, Google APIs, and GitHub.
    - `Cross-Origin-Opener-Policy`: `same-origin`.
    - `Cross-Origin-Embedder-Policy`: `credentialless`.
  - Configures Edge runtime for `/api/auth/*` and `/api/gemini/*`.

### Step 3: Implement GitHub OAuth & Gemini Edge Routes
- File: `src/app/api/auth/github/callback/route.ts`
- Class: `GitHubAuthEdgeHandler`
  - Public method: `handlePost(req: NextRequest): Promise<NextResponse>`
  - Exchanges GitHub code for access token via `https://github.com/login/oauth/access_token`.
  - Returns token to client RAM; writes zero data to server disk.
- File: `src/app/api/gemini/proxy/route.ts`
- Class: `GeminiProxyEdgeHandler`
  - Public method: `handlePost(req: NextRequest): Promise<NextResponse>`
  - Validates request payload against `ExchangeEnvelopeSchema`.
  - Proxies inference to `generativelanguage.googleapis.com`.

### Step 4: Implement Local CI Runner Script
- File: `scripts/local_ci_runner.ts`
- Class: `LocalCiRunner`
  - Public method: `runAllStages(): Promise<boolean>`
  - Stage 1: Runs ESLint (`npm run lint`) and Ruff (`uv run --with ruff ruff check .`).
  - Stage 2: Runs TypeScript (`npx tsc --noEmit`) and Mypy (`uv run --with mypy mypy src/workers/pyodide`).
  - Stage 3: Runs Vitest (`npm run test:cov`) and Pytest (`uv run pytest`).
  - Verifies $\ge 90\%$ branch coverage across all modules.
- File: `scripts/run_local_ci.sh`
  - Bash wrapper making `npx tsx scripts/local_ci_runner.ts` directly executable.

### Step 5: Implement GitHub Actions CI Workflow
- File: `.github/workflows/ci.yml`
  - Sets up Node.js 24 and Python 3.13.
  - Runs caching for npm and uv.
  - Executes the three verification stages sequentially, blocking PR merge if any stage fails or coverage falls below 90%.

---

## 4. Class Contract & Member Ordering Example

```typescript
// scripts/local_ci_runner.ts
import { execSync } from 'child_process';

export class LocalCiRunner {
  // 1. Class-level constants (non-public, leading underscore)
  private static readonly _STAGE_1_CMD = 'npm run lint && uv run --with ruff ruff check .';
  private static readonly _STAGE_2_CMD = 'npx tsc --noEmit && uv run --with mypy mypy src/workers/pyodide';
  private static readonly _STAGE_3_CMD = 'npm run test:cov && uv run pytest';

  // 2. Constructor
  public constructor() {}

  // 3. Public methods
  public async runAllStages(): Promise<boolean> {
    const stage1Ok = this._runStage('Stage 1: Linting', LocalCiRunner._STAGE_1_CMD);
    if (!stage1Ok) return false;

    const stage2Ok = this._runStage('Stage 2: Strict Type Checking', LocalCiRunner._STAGE_2_CMD);
    if (!stage2Ok) return false;

    const stage3Ok = this._runStage('Stage 3: Tests with Coverage (>=90%)', LocalCiRunner._STAGE_3_CMD);
    return stage3Ok;
  }

  // 4. Protected methods (none)

  // 5. Private methods
  private _runStage(title: string, cmd: string): boolean {
    console.log(`\n========================================\nRunning ${title}...\n========================================`);
    try {
      execSync(cmd, { stdio: 'inherit' });
      console.log(`[PASS] ${title}`);
      return true;
    } catch {
      console.error(`[FAIL] ${title}`);
      return false;
    }
  }
}
```

---

## 5. Verification & Testing Requirements

### Test Files to Create
- `tests/app/api/auth/test_github_auth_edge_handler.test.ts`: Verifies GitHub OAuth code exchange.
- `tests/app/api/gemini/test_gemini_proxy_edge_handler.test.ts`: Tests payload sanitization and request proxying.
- `tests/scripts/test_local_ci_runner.test.ts`: Tests stage execution failure detection and reporting.
- `tests/deployment/test_docker_build.test.ts`: Tests Dockerfile build completion and image startup.

### Coverage & Quality Gates
- **$\ge 90\%$ branch and line coverage**.
- Run verification:
```bash
./scripts/run_local_ci.sh
```

---

## 6. Execution Checklist

- [ ] Create `Dockerfile` with multi-stage build.
- [ ] Create `docker-compose.yml`.
- [ ] Create `vercel.json` with security and COOP/COEP headers.
- [ ] Implement `GitHubAuthEdgeHandler` in `src/app/api/auth/github/callback/route.ts`.
- [ ] Implement `GeminiProxyEdgeHandler` in `src/app/api/gemini/proxy/route.ts`.
- [ ] Implement `LocalCiRunner` in `scripts/local_ci_runner.ts`.
- [ ] Create `scripts/run_local_ci.sh` executable wrapper.
- [ ] Implement `.github/workflows/ci.yml`.
- [ ] Write all 4 comprehensive unit test suites ensuring $\ge 90\%$ branch coverage.
- [ ] Run `./scripts/run_local_ci.sh` locally and confirm 100% passage across all three stages.

