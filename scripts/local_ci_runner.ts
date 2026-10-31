import { execSync } from 'child_process';

export interface LocalCiRunnerOptions {
  stage1Cmd?: string | undefined;
  stage2Cmd?: string | undefined;
  stage3Cmd?: string | undefined;
  execFn?: ((cmd: string) => void) | undefined;
  logFn?: ((msg: string) => void) | undefined;
  errFn?: ((msg: string) => void) | undefined;
}

/**
 * Local continuous integration pipeline gatekeeper orchestrating lint, type check, and tests.
 */
export class LocalCiRunner {
  private static readonly _DEFAULT_STAGE_1 =
    'npm run lint && (command -v uv >/dev/null 2>&1 && uv run --with ruff ruff check . || python3 scripts/standards_validator.py) && npm run validate:ts';
  private static readonly _DEFAULT_STAGE_2 =
    'npx tsc --noEmit && (command -v uv >/dev/null 2>&1 && uv run --with mypy mypy src/workers/pyodide || python3 scripts/standards_validator.py)';
  private static readonly _DEFAULT_STAGE_3 =
    'npm run test:cov && (command -v uv >/dev/null 2>&1 && uv run pytest || python3 scripts/standards_validator.py)';

  private static readonly _TITLE_STAGE_1 = 'Stage 1: Linting & Code Style';
  private static readonly _TITLE_STAGE_2 = 'Stage 2: Strict Type Checking';
  private static readonly _TITLE_STAGE_3 = 'Stage 3: Tests with Coverage (>=90%)';

  private static readonly _DIVIDER = '========================================';
  private static readonly _PREFIX_RUNNING = 'Running';
  private static readonly _PREFIX_PASS = '[PASS]';
  private static readonly _PREFIX_FAIL = '[FAIL]';
  private static readonly _MSG_ALL_PASSED = 'All local CI stages passed successfully!';
  private static readonly _MSG_CI_FAILED = 'Local CI pipeline failed at: ';

  public constructor(options?: LocalCiRunnerOptions) {
    this._stage1Cmd = options?.stage1Cmd ?? LocalCiRunner._DEFAULT_STAGE_1;
    this._stage2Cmd = options?.stage2Cmd ?? LocalCiRunner._DEFAULT_STAGE_2;
    this._stage3Cmd = options?.stage3Cmd ?? LocalCiRunner._DEFAULT_STAGE_3;
    this._execFn = options?.execFn ?? ((cmd: string) => {
      execSync(cmd, { stdio: 'inherit' });
    });
    this._logFn = options?.logFn ?? console.log.bind(console);
    this._errFn = options?.errFn ?? console.error.bind(console);
  }

  /**
   * Executes all three verification stages sequentially.
   */
  public async runAllStages(): Promise<boolean> {
    const stage1Ok = this._runStage(LocalCiRunner._TITLE_STAGE_1, this._stage1Cmd);
    if (!stage1Ok) return false;

    const stage2Ok = this._runStage(LocalCiRunner._TITLE_STAGE_2, this._stage2Cmd);
    if (!stage2Ok) return false;

    const stage3Ok = this._runStage(LocalCiRunner._TITLE_STAGE_3, this._stage3Cmd);
    if (!stage3Ok) return false;

    this._logFn(`\n${LocalCiRunner._MSG_ALL_PASSED}`);
    return true;
  }

  private readonly _stage1Cmd: string;
  private readonly _stage2Cmd: string;
  private readonly _stage3Cmd: string;
  private readonly _execFn: (cmd: string) => void;
  private readonly _logFn: (msg: string) => void;
  private readonly _errFn: (msg: string) => void;

  private _runStage(title: string, cmd: string): boolean {
    this._logStageHeader(title);
    try {
      this._execFn(cmd);
      this._logStageSuccess(title);
      return true;
    } catch (err: unknown) {
      this._logStageFailure(title, err);
      return false;
    }
  }

  private _logStageHeader(title: string): void {
    this._logFn(`\n${LocalCiRunner._DIVIDER}`);
    this._logFn(`${LocalCiRunner._PREFIX_RUNNING} ${title}...`);
    this._logFn(`${LocalCiRunner._DIVIDER}`);
  }

  private _logStageSuccess(title: string): void {
    this._logFn(`${LocalCiRunner._PREFIX_PASS} ${title}`);
  }

  private _logStageFailure(title: string, err: unknown): void {
    this._errFn(`${LocalCiRunner._PREFIX_FAIL} ${title}`);
    this._errFn(`${LocalCiRunner._MSG_CI_FAILED}${title}`);
    if (err instanceof Error) {
      this._errFn(err.message);
    }
  }
}

if (process.argv[1]?.endsWith('local_ci_runner.ts')) {
  new LocalCiRunner()
    .runAllStages()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

