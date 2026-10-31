import { describe, expect, it } from 'vitest';
import { LocalCiRunner } from '../../scripts/local_ci_runner';

describe('LocalCiRunner', () => {
  it('test_runAllStages_whenAllStagesSucceed_returnsTrueAndLogsPass', async () => {
    const executedCommands: string[] = [];
    const logMessages: string[] = [];

    const runner = new LocalCiRunner({
      stage1Cmd: 'echo stage1',
      stage2Cmd: 'echo stage2',
      stage3Cmd: 'echo stage3',
      execFn: (cmd: string) => {
        executedCommands.push(cmd);
      },
      logFn: (msg: string) => {
        logMessages.push(msg);
      },
    });

    const success = await runner.runAllStages();

    expect(success).toBe(true);
    expect(executedCommands).toEqual(['echo stage1', 'echo stage2', 'echo stage3']);
    expect(logMessages.some((m) => m.includes('[PASS] Stage 1: Linting'))).toBe(true);
    expect(logMessages.some((m) => m.includes('[PASS] Stage 2: Strict Type Checking'))).toBe(true);
    expect(logMessages.some((m) => m.includes('[PASS] Stage 3: Tests with Coverage'))).toBe(true);
    expect(logMessages.some((m) => m.includes('All local CI stages passed successfully!'))).toBe(true);
  });

  it('test_runAllStages_whenStage1Fails_returnsFalseAndAbortsEarly', async () => {
    const executedCommands: string[] = [];
    const errorMessages: string[] = [];

    const runner = new LocalCiRunner({
      stage1Cmd: 'fail_cmd',
      stage2Cmd: 'should_not_run',
      stage3Cmd: 'should_not_run',
      execFn: (cmd: string) => {
        executedCommands.push(cmd);
        throw new Error('Lint syntax error in module.ts');
      },
      logFn: () => {},
      errFn: (msg: string) => {
        errorMessages.push(msg);
      },
    });

    const success = await runner.runAllStages();

    expect(success).toBe(false);
    expect(executedCommands).toEqual(['fail_cmd']);
    expect(errorMessages.some((m) => m.includes('[FAIL] Stage 1: Linting'))).toBe(true);
    expect(errorMessages.some((m) => m.includes('Lint syntax error in module.ts'))).toBe(true);
  });

  it('test_runAllStages_whenStage2Fails_returnsFalseAndAbortsBeforeStage3', async () => {
    const executedCommands: string[] = [];
    const errorMessages: string[] = [];

    const runner = new LocalCiRunner({
      stage1Cmd: 'pass_1',
      stage2Cmd: 'fail_2',
      stage3Cmd: 'pass_3',
      execFn: (cmd: string) => {
        executedCommands.push(cmd);
        if (cmd === 'fail_2') {
          throw new Error('Type error TS2322');
        }
      },
      logFn: () => {},
      errFn: (msg: string) => {
        errorMessages.push(msg);
      },
    });

    const success = await runner.runAllStages();

    expect(success).toBe(false);
    expect(executedCommands).toEqual(['pass_1', 'fail_2']);
    expect(errorMessages.some((m) => m.includes('[FAIL] Stage 2: Strict Type Checking'))).toBe(true);
  });

  it('test_runAllStages_whenStage3Fails_returnsFalse', async () => {
    const executedCommands: string[] = [];
    const errorMessages: string[] = [];

    const runner = new LocalCiRunner({
      stage1Cmd: 'pass_1',
      stage2Cmd: 'pass_2',
      stage3Cmd: 'fail_3',
      execFn: (cmd: string) => {
        executedCommands.push(cmd);
        if (cmd === 'fail_3') {
          throw new Error('Coverage below 90%');
        }
      },
      logFn: () => {},
      errFn: (msg: string) => {
        errorMessages.push(msg);
      },
    });

    const success = await runner.runAllStages();

    expect(success).toBe(false);
    expect(executedCommands).toEqual(['pass_1', 'pass_2', 'fail_3']);
    expect(errorMessages.some((m) => m.includes('[FAIL] Stage 3: Tests with Coverage'))).toBe(true);
  });

  it('test_runAllStages_whenExceptionNotInstanceOfError_handlesGracefully', async () => {
    const errorMessages: string[] = [];

    const runner = new LocalCiRunner({
      stage1Cmd: 'fail_cmd',
      execFn: () => {
        throw 'Raw string failure without Error instance';
      },
      logFn: () => {},
      errFn: (msg: string) => {
        errorMessages.push(msg);
      },
    });

    const success = await runner.runAllStages();

    expect(success).toBe(false);
    expect(errorMessages.some((m) => m.includes('[FAIL] Stage 1: Linting'))).toBe(true);
  });

  it('test_constructor_defaultsToStandardEnvironmentCommands', () => {
    const runner = new LocalCiRunner();
    expect(runner).toBeDefined();
  });
});
