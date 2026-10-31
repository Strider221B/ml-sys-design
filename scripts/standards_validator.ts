import fs from 'fs';
import path from 'path';
import ts from 'typescript';

export interface Violation {
  file: string;
  rule: string;
  message: string;
  line?: number;
}

export interface ValidationSummary {
  filesChecked: number;
  violations: Violation[];
  success: boolean;
}

/**
 * Validates TypeScript code against strict Adspire coding standards.
 */
export class StandardsValidator {
  private static readonly _MAX_FILE_LINES = 500;
  private static readonly _MAX_METHOD_LINES = 20;
  private static readonly _LEVEL_STATIC = 1;
  private static readonly _LEVEL_CONSTRUCTOR = 2;
  private static readonly _LEVEL_PUBLIC = 3;
  private static readonly _LEVEL_PROTECTED = 4;
  private static readonly _LEVEL_PRIVATE = 5;

  public constructor() {}

  /**
   * CLI runner that scans directories and exits with appropriate code.
   */
  public run(targetDirs: string[] = ['src', 'scripts']): number {
    const summary = this.validateDirectories(targetDirs);
    this._printSummary(summary);
    return summary.success ? 0 : 1;
  }

  /**
   * Validates multiple directory paths recursively.
   */
  public validateDirectories(targetDirs: string[]): ValidationSummary {
    const allViolations: Violation[] = [];
    let filesChecked = 0;

    for (const dir of targetDirs) {
      if (fs.existsSync(dir)) {
        const result = this.validateDirectory(dir);
        filesChecked += result.filesChecked;
        allViolations.push(...result.violations);
      }
    }

    return {
      filesChecked,
      violations: allViolations,
      success: allViolations.length === 0,
    };
  }

  /**
   * Validates all typescript files in a single directory.
   */
  public validateDirectory(dirPath: string): ValidationSummary {
    const files = this._collectTsFiles(dirPath);
    const violations: Violation[] = [];

    for (const file of files) {
      const fileViolations = this.validateFile(file);
      violations.push(...fileViolations);
    }

    return {
      filesChecked: files.length,
      violations,
      success: violations.length === 0,
    };
  }

  /**
   * Validates a single TypeScript file against standards.
   */
  public validateFile(filePath: string): Violation[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const violations: Violation[] = [];

    this._checkFileLength(filePath, content, violations);

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    this._checkTopLevelFunctions(filePath, sourceFile, violations);
    this._checkClassRules(filePath, sourceFile, violations);

    return violations;
  }

  private _collectTsFiles(dirPath: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.next') {
          results.push(...this._collectTsFiles(fullPath));
        }
      } else if (this._isCandidateTsFile(entry.name)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  private _isCandidateTsFile(fileName: string): boolean {
    return (
      (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) &&
      !fileName.endsWith('.d.ts') &&
      !fileName.endsWith('.test.ts') &&
      !fileName.endsWith('.test.tsx')
    );
  }

  private _checkFileLength(filePath: string, content: string, violations: Violation[]): void {
    const lineCount = content.split('\n').length;
    if (lineCount > StandardsValidator._MAX_FILE_LINES) {
      violations.push({
        file: filePath,
        rule: 'FILE_LENGTH',
        message: `File exceeds maximum line limit (${lineCount} > ${StandardsValidator._MAX_FILE_LINES})`,
      });
    }
  }

  private _checkTopLevelFunctions(
    filePath: string,
    sourceFile: ts.SourceFile,
    violations: Violation[]
  ): void {
    for (const statement of sourceFile.statements) {
      if (ts.isFunctionDeclaration(statement)) {
        violations.push({
          file: filePath,
          rule: 'STRICT_OOP',
          message: `Free-standing function '${statement.name?.text ?? 'anonymous'}' is not allowed`,
        });
      } else if (ts.isVariableStatement(statement)) {
        this._checkVariableForFunctions(filePath, statement, violations);
      }
    }
  }

  private _checkVariableForFunctions(
    filePath: string,
    stmt: ts.VariableStatement,
    violations: Violation[]
  ): void {
    for (const decl of stmt.declarationList.declarations) {
      if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
        violations.push({
          file: filePath,
          rule: 'STRICT_OOP',
          message: `Top-level function assignment '${decl.name.getText()}' is not allowed`,
        });
      }
    }
  }

  private _checkClassRules(
    filePath: string,
    sourceFile: ts.SourceFile,
    violations: Violation[]
  ): void {
    const classDecls = sourceFile.statements.filter(ts.isClassDeclaration);
    if (classDecls.length === 0) {
      return;
    }
    if (classDecls.length > 1) {
      violations.push({
        file: filePath,
        rule: 'ONE_CLASS_PER_FILE',
        message: `File contains ${classDecls.length} classes, expected exactly 1`,
      });
    }
    const mainClass = classDecls[0];
    if (mainClass) {
      this._checkClassNameMatchesFile(filePath, mainClass, violations);
      this._checkClassMembers(filePath, sourceFile, mainClass, violations);
    }
  }

  private _checkClassNameMatchesFile(
    filePath: string,
    classDecl: ts.ClassDeclaration,
    violations: Violation[]
  ): void {
    const className = classDecl.name?.text;
    if (!className) return;

    const baseName = path.basename(filePath, path.extname(filePath));
    const normalizedClass = className.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    const normalizedBase = baseName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

    if (normalizedClass !== normalizedBase) {
      violations.push({
        file: filePath,
        rule: 'ONE_CLASS_PER_FILE',
        message: `Class name '${className}' does not match file name '${baseName}'`,
      });
    }
  }

  private _checkClassMembers(
    filePath: string,
    sourceFile: ts.SourceFile,
    classDecl: ts.ClassDeclaration,
    violations: Violation[]
  ): void {
    let lastLevel = 0;

    for (const member of classDecl.members) {
      const currentLevel = this._determineMemberLevel(member);
      if (currentLevel < lastLevel) {
        violations.push({
          file: filePath,
          rule: 'MEMBER_ORDERING',
          message: `Member order violation: non-public or lower-ranked member appears before higher-ranked member`,
        });
      }
      lastLevel = Math.max(lastLevel, currentLevel);

      if (ts.isMethodDeclaration(member)) {
        this._checkMethodLength(filePath, sourceFile, member, violations);
      }
    }
  }

  private _determineMemberLevel(member: ts.ClassElement): number {
    const modifiers = ts.canHaveModifiers(member) ? ts.getModifiers(member) : undefined;
    const isStatic = modifiers?.some((m: ts.Modifier) => m.kind === ts.SyntaxKind.StaticKeyword);
    if (isStatic) return StandardsValidator._LEVEL_STATIC;
    if (ts.isConstructorDeclaration(member)) return StandardsValidator._LEVEL_CONSTRUCTOR;

    const isPrivate =
      modifiers?.some((m: ts.Modifier) => m.kind === ts.SyntaxKind.PrivateKeyword) ||
      member.name?.getText().startsWith('_');
    const isProtected = modifiers?.some(
      (m: ts.Modifier) => m.kind === ts.SyntaxKind.ProtectedKeyword
    );

    if (isProtected) return StandardsValidator._LEVEL_PROTECTED;
    if (isPrivate) return StandardsValidator._LEVEL_PRIVATE;
    return StandardsValidator._LEVEL_PUBLIC;
  }

  private _checkMethodLength(
    filePath: string,
    sourceFile: ts.SourceFile,
    method: ts.MethodDeclaration,
    violations: Violation[]
  ): void {
    if (!method.body) return;

    const bodyText = method.body.getText(sourceFile);
    const lines = bodyText.split('\n').slice(1, -1);
    const logicalLines = lines.filter((l) => {
      const t = l.trim();
      return t.length > 0 && !t.startsWith('//') && !t.startsWith('/*') && !t.startsWith('*');
    });

    if (logicalLines.length > StandardsValidator._MAX_METHOD_LINES) {
      violations.push({
        file: filePath,
        rule: 'METHOD_LENGTH',
        message: `Method '${method.name.getText()}' exceeds 20 logical lines (${logicalLines.length})`,
      });
    }
  }

  private _printSummary(summary: ValidationSummary): void {
    console.log(`Scanned ${summary.filesChecked} files.`);
    if (summary.violations.length === 0) {
      console.log('✅ All TypeScript coding standards passed!');
      return;
    }
    console.error(`❌ Found ${summary.violations.length} violations:`);
    for (const v of summary.violations) {
      console.error(`  [${v.rule}] ${v.file}: ${v.message}`);
    }
  }
}

if (process.argv[1]?.endsWith('standards_validator.ts')) {
  const code = new StandardsValidator().run();
  process.exit(code);
}
