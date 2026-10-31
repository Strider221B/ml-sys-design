import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StandardsValidator } from '../../scripts/standards_validator';

describe('StandardsValidator', () => {
  const validator = new StandardsValidator();
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validator_ts_test_'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('test_validateFile_withCompliantClass_returnsNoViolations', () => {
    const filePath = path.join(tempDir, 'sample_service.ts');
    const content = `
export class SampleService {
  private static readonly _MAX_RETRIES = 3;

  public constructor() {}

  public compute(): number {
    return this._helper();
  }

  private _helper(): number {
    return SampleService._MAX_RETRIES;
  }
}
`;
    fs.writeFileSync(filePath, content.trim(), 'utf-8');
    const violations = validator.validateFile(filePath);

    expect(violations).toHaveLength(0);
  });

  it('test_validateFile_withFreeStandingFunction_reportsStrictOopViolation', () => {
    const filePath = path.join(tempDir, 'free_function.ts');
    const content = `
export function computeTotal(): number {
  return 42;
}
`;
    fs.writeFileSync(filePath, content.trim(), 'utf-8');
    const violations = validator.validateFile(filePath);

    expect(violations.some((v) => v.rule === 'STRICT_OOP')).toBe(true);
  });

  it('test_validateFile_withTopLevelArrowFunction_reportsStrictOopViolation', () => {
    const filePath = path.join(tempDir, 'arrow_function.ts');
    const content = `
export const computeTotal = (): number => {
  return 42;
};
`;
    fs.writeFileSync(filePath, content.trim(), 'utf-8');
    const violations = validator.validateFile(filePath);

    expect(violations.some((v) => v.rule === 'STRICT_OOP')).toBe(true);
  });

  it('test_validateFile_withMultipleClasses_reportsOneClassPerFileViolation', () => {
    const filePath = path.join(tempDir, 'dual_class.ts');
    const content = `
export class FirstClass {}
export class SecondClass {}
`;
    fs.writeFileSync(filePath, content.trim(), 'utf-8');
    const violations = validator.validateFile(filePath);

    expect(violations.some((v) => v.rule === 'ONE_CLASS_PER_FILE')).toBe(true);
  });

  it('test_validateFile_withMismatchedClassName_reportsOneClassPerFileViolation', () => {
    const filePath = path.join(tempDir, 'user_service.ts');
    const content = `
export class AccountService {}
`;
    fs.writeFileSync(filePath, content.trim(), 'utf-8');
    const violations = validator.validateFile(filePath);

    expect(violations.some((v) => v.rule === 'ONE_CLASS_PER_FILE')).toBe(true);
  });

  it('test_validateFile_withMemberOrderingViolation_reportsMemberOrdering', () => {
    const filePath = path.join(tempDir, 'order_violator.ts');
    const content = `
export class OrderViolator {
  private _privateFirst(): void {}
  public publicSecond(): void {}
}
`;
    fs.writeFileSync(filePath, content.trim(), 'utf-8');
    const violations = validator.validateFile(filePath);

    expect(violations.some((v) => v.rule === 'MEMBER_ORDERING')).toBe(true);
  });

  it('test_validateFile_withLongMethod_reportsMethodLengthViolation', () => {
    const filePath = path.join(tempDir, 'long_method_class.ts');
    const statements = Array.from({ length: 25 }, (_, i) => `    const x${i} = ${i};`).join('\n');
    const content = `
export class LongMethodClass {
  public longMethod(): void {
${statements}
  }
}
`;
    fs.writeFileSync(filePath, content.trim(), 'utf-8');
    const violations = validator.validateFile(filePath);

    expect(violations.some((v) => v.rule === 'METHOD_LENGTH')).toBe(true);
  });

  it('test_validateFile_withLongFile_reportsFileLengthViolation', () => {
    const filePath = path.join(tempDir, 'huge_file.ts');
    const lines = Array.from({ length: 505 }, () => '// blank line').join('\n');
    fs.writeFileSync(filePath, lines, 'utf-8');
    const violations = validator.validateFile(filePath);

    expect(violations.some((v) => v.rule === 'FILE_LENGTH')).toBe(true);
  });

  it('test_validateDirectory_processesAllTsFiles', () => {
    const subDir = path.join(tempDir, 'nested');
    fs.mkdirSync(subDir);
    const validPath = path.join(subDir, 'first_item.ts');
    fs.writeFileSync(validPath, 'export class FirstItem {}', 'utf-8');

    const result = validator.validateDirectory(tempDir);
    expect(result.filesChecked).toBe(1);
    expect(result.success).toBe(true);
  });

  it('test_run_returnsExpectedExitCode', () => {
    const validPath = path.join(tempDir, 'run_item.ts');
    fs.writeFileSync(validPath, 'export class RunItem {}', 'utf-8');

    const exitCodeClean = validator.run([tempDir]);
    expect(exitCodeClean).toBe(0);

    const badPath = path.join(tempDir, 'bad_function.ts');
    fs.writeFileSync(badPath, 'export function bad() {}', 'utf-8');

    const exitCodeBad = validator.run([tempDir]);
    expect(exitCodeBad).toBe(1);
  });
});
