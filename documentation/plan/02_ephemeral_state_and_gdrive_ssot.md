# Plan 02: Ephemeral State & Google Drive SSOT

> **Phase:** 02  
> **Status:** Pending Execution  
> **Design References:**  
> - [01_state_management_and_gdrive_ssot.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/01_state_management_and_gdrive_ssot.md)  
> - [00_overview_and_architecture.md](file:///home/somesh/git_repos/ml-sys-design/documentation/design/detailed/00_overview_and_architecture.md)  
> - [coding_standards.md](file:///home/somesh/git_repos/ml-sys-design/documentation/prompts/coding_standards.md)  
> **Virtual Environment:** `source ~/python_envs/p313_llm/bin/activate`

---

## 1. Executive Summary & Objectives

Implement the platform's core state architecture adhering strictly to the **Zero Permanent Local State** rule and establishing **Google Drive as the Single Source of Truth (SSOT)**.

### Core Deliverables
1. **Runtime `StorageSanitizer`**: Intercepts and replaces `window.localStorage`, `window.sessionStorage`, and `window.indexedDB` with trapped no-op/throwing proxies to prevent any writes to the client disk.
2. **Volatile RAM Zustand 5.0 Store**: Modular state slices managed purely in memory without persistence middleware:
   - `CanvasSlice` (Nodes, Edges, Viewport)
   - `DriveSyncSlice` (Folder ID, Active File ID, ETag, Dirty Flag, Last Synced Timestamp)
   - `InterviewSlice` (Step Machine 1-6, Rubric Scores)
   - `FinOpsSlice` (Hardware allocations, target QPS, monthly budget)
   - **Modern Zustand 5.0 & React 19.3 Capabilities**:
     - Concurrency safety & zero-tearing via `useSyncExternalStore` for atomic reads during background calculations.
     - Granular shallow selectors via `useShallow` (`zustand/react/shallow`) preventing redundant component re-renders.
     - Transient telemetry subscriptions bypassing React DOM via `.subscribe(selector, callback)` to feed WebGL2/Canvas2D buffers directly at 60 FPS.
     - Optimistic cloud sync UI indicators powered by React 19 `useOptimistic` with automatic rollback on sync failure or HTTP 412 conflict.
3. **Google Drive REST API v3 Client (`GDriveSyncClient`)**: Authenticates via OAuth2 Bearer token, discovers or initializes the `/ML_System_Design_2026_SSOT/` directory tree, performs conditional `PATCH` requests with `If-Match` ETags.
4. **Sync Coordinator & Conflict Engine (`SyncManager`, `ConflictResolver`)**: Debounces graph mutations (1500ms), manages in-RAM retry queues with exponential backoff (1s, 2s, 4s), and resolves HTTP 412 conflicts via 3-way vector timestamp merge.
5. **Stateless Google OAuth PKCE Edge Route**: `/api/auth/google/callback` exchanging PKCE code for access tokens directly to browser memory.

---

## 2. File Inventory & Class Responsibilities

| File Path | Primary Class | Responsibility | Est. Lines |
| :--- | :--- | :--- | :--- |
| `src/core/state/storage_sanitizer.ts` | `StorageSanitizer` | Intercepts and neutralizes persistent browser storage APIs | ~110 |
| `src/core/state/workspace_store.ts` | `WorkspaceStore` | Factory and coordinator for RAM-only Zustand store slices | ~180 |
| `src/core/gdrive/gdrive_sync_client.ts` | `GDriveSyncClient` | Google Drive REST API v3 HTTP client with multipart upload | ~240 |
| `src/core/gdrive/sync_manager.ts` | `SyncManager` | Debounced auto-sync coordinator and RAM dirty queue manager | ~220 |
| `src/core/gdrive/conflict_resolver.ts` | `ConflictResolver` | 3-way merge resolver for concurrent Drive updates (HTTP 412) | ~150 |
| `src/app/api/auth/google/callback/route.ts` | `GoogleAuthEdgeHandler` | Stateless Edge route exchanging Google OAuth PKCE auth code | ~130 |
| `src/core/gdrive/gdrive_constants.ts` | `GDriveConstants` | Non-magic string/number constants for Drive paths, timeouts, errors | ~70 |

---

## 3. Detailed Implementation Steps

### Step 1: Implement Runtime `StorageSanitizer`
- File: `src/core/state/storage_sanitizer.ts`
- Class: `StorageSanitizer`
  - Member ordering: Constants -> `__init__` / constructor -> Public methods -> Private methods.
  - Public method: `installSanitizer(): void`
    - Traps `window.localStorage` and `window.sessionStorage` via `Object.defineProperty` throwing a custom error on `.setItem()`.
    - Neutralizes `window.indexedDB.open()` by returning an aborting request.
  - Method bodies strictly $\le 20$ lines (split into `_sanitizeLocalStorage()`, `_sanitizeSessionStorage()`, `_sanitizeIndexedDb()`).

### Step 2: Implement In-Memory Zustand 5.0 Workspace Store
- File: `src/core/state/workspace_store.ts`
- Class: `WorkspaceStore`
  - Encapsulates Zustand 5.0 vanilla store creation without `persist` middleware.
  - Leverages React 19's `useSyncExternalStore` for tear-free atomic reads across concurrent state transitions.
  - Exposes `useShallow` hooks for granular UI slice subscriptions (`CanvasSlice`, `InterviewSlice`, `FinOpsSlice`, `DriveSyncSlice`).
  - Supports transient telemetry subscriptions via `getStore().subscribe(selector, callback)` bypassing React DOM reconciliation.
  - Public methods:
    - `getStore(): StoreApi<WorkspaceState>`
    - `updateCanvas(nodes: CanvasNode[], edges: CanvasEdge[]): void`
    - `markDirty(): void`
    - `markClean(etag: string, timestampIso: string): void`
    - `resetToGuest(): void`

### Step 3: Implement Google Drive REST API v3 Client
- File: `src/core/gdrive/gdrive_sync_client.ts`
- Class: `GDriveSyncClient`
  - Accepts `accessToken: string` via constructor injection.
  - Public methods:
    - `ensureRootFolder(): Promise<string>`: Locates `/ML_System_Design_2026_SSOT/` or creates it.
    - `fetchManifest(folderId: string): Promise<WorkspaceManifest>`
    - `fetchWorkspace(fileId: string): Promise<WorkspaceDocument>`
    - `saveWorkspace(fileId: string, doc: WorkspaceDocument, etag?: string): Promise<SaveResult>`
  - Handles multipart/related upload for updating metadata and media contents.
  - Decomposes HTTP request generation into private helpers ($\le 20$ lines each).

### Step 4: Implement Debounced Sync Manager & Conflict Resolver
- File: `src/core/gdrive/sync_manager.ts`
- Class: `SyncManager`
  - Constants: `_DEBOUNCE_MS = 1500`, `_MAX_RETRIES = 3`, `_BASE_BACKOFF_MS = 1000`.
  - Public methods:
    - `enqueueSync(doc: WorkspaceDocument): void`
    - `flushSync(): Promise<void>`
    - `cancelPending(): void`
  - On HTTP 412 Precondition Failed, delegates to `ConflictResolver`.
- File: `src/core/gdrive/conflict_resolver.ts`
- Class: `ConflictResolver`
  - Public method: `resolve(localDoc: WorkspaceDocument, remoteDoc: WorkspaceDocument): MergeResult`
  - Compares node/edge modified timestamps and produces an amalgamated graph or prompts user merge resolution.

### Step 5: Implement Google OAuth PKCE Edge Handler
- File: `src/app/api/auth/google/callback/route.ts`
- Class: `GoogleAuthEdgeHandler`
  - Public method: `handlePost(req: NextRequest): Promise<NextResponse>`
  - Verifies `code`, `codeVerifier`, and `redirectUri`.
  - Fetches tokens from `https://oauth2.googleapis.com/token` and returns JSON payload without persistent cookies or server disk writes.

---

## 4. Class Contract & Member Ordering Example

```typescript
// src/core/state/storage_sanitizer.ts

export class StorageSanitizer {
  // 1. Class-level constants (non-public, leading underscore)
  private static readonly _ERROR_MSG = 'Persistence violation: Local storage is disabled by architectural mandate.';

  // 2. Constructor
  public constructor() {}

  // 3. Public methods
  public installSanitizer(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this._trapStorage('localStorage');
    this._trapStorage('sessionStorage');
    this._trapIndexedDb();
  }

  // 4. Protected methods (none)

  // 5. Private methods
  private _trapStorage(type: 'localStorage' | 'sessionStorage'): void {
    const mockStorage = {
      getItem: (): string | null => null,
      setItem: (): void => { throw new Error(StorageSanitizer._ERROR_MSG); },
      removeItem: (): void => {},
      clear: (): void => {},
      key: (): string | null => null,
      length: 0,
    };
    try {
      Object.defineProperty(window, type, { value: mockStorage, configurable: true, writable: false });
    } catch {
      // Ignored if environment locks property
    }
  }

  private _trapIndexedDb(): void {
    if (!window.indexedDB) return;
    try {
      Object.defineProperty(window, 'indexedDB', {
        value: { open: () => { throw new Error(StorageSanitizer._ERROR_MSG); } },
        configurable: true,
        writable: false,
      });
    } catch {
      // Ignored if environment locks property
    }
  }
}
```

---

## 5. Verification & Testing Requirements

### Test Files to Create
- `tests/core/state/test_storage_sanitizer.test.ts`: Asserts calling `localStorage.setItem` throws `Error`.
- `tests/core/state/test_workspace_store.test.ts`: Verifies in-memory mutations, dirty flags, and reset.
- `tests/core/gdrive/test_gdrive_sync_client.test.ts`: Mocks `fetch` to verify folder creation, GET, conditional PATCH, and error handling.
- `tests/core/gdrive/test_sync_manager.test.ts`: Tests 1500ms debounce timer, retry backoff, and dirty queue in RAM.
- `tests/core/gdrive/test_conflict_resolver.test.ts`: Tests 3-way merge on HTTP 412 conflicts.
- `tests/app/api/auth/test_google_auth_edge_handler.test.ts`: Tests PKCE token exchange handler.

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

- [ ] Implement `StorageSanitizer` in `src/core/state/storage_sanitizer.ts`.
- [ ] Implement `WorkspaceStore` in `src/core/state/workspace_store.ts`.
- [ ] Implement `GDriveConstants` in `src/core/gdrive/gdrive_constants.ts`.
- [ ] Implement `GDriveSyncClient` in `src/core/gdrive/gdrive_sync_client.ts`.
- [ ] Implement `ConflictResolver` in `src/core/gdrive/conflict_resolver.ts`.
- [ ] Implement `SyncManager` in `src/core/gdrive/sync_manager.ts`.
- [ ] Implement `GoogleAuthEdgeHandler` in `src/app/api/auth/google/callback/route.ts`.
- [ ] Write all 6 comprehensive unit test suites ensuring $\ge 90\%$ branch coverage.
- [ ] Verify zero linter errors, zero type errors, and full test suite passage.

