from __future__ import annotations

import ast
import os
import re
import sys
from typing import Any


class StandardsValidator:
    """AST validator enforcing strict Adspire coding standards on Python files."""

    _MAX_FILE_LINES: int = 500
    _MAX_METHOD_LINES: int = 20
    _LEVEL_CLASS_VAR: int = 1
    _LEVEL_INIT: int = 2
    _LEVEL_PUBLIC: int = 3
    _LEVEL_PROTECTED: int = 4
    _LEVEL_PRIVATE: int = 5

    _RULE_SYNTAX: str = "SYNTAX_ERROR"
    _RULE_LENGTH: str = "FILE_LENGTH"
    _RULE_OOP: str = "STRICT_OOP"
    _RULE_ONE_CLASS: str = "ONE_CLASS_PER_FILE"
    _RULE_ORDERING: str = "MEMBER_ORDERING"
    _RULE_METHOD_LEN: str = "METHOD_LENGTH"

    _EXCLUDED_DIRS: tuple[str, ...] = ("venv", "node_modules", ".git")
    _DEFAULT_DIRS: list[str] = ["scripts", "src"]

    def __init__(self) -> None:
        """Initialize validator instance."""
        pass

    def run(self, target_dirs: list[str] | None = None) -> int:
        """Run validation on target directories and return exit code."""
        dirs = target_dirs if target_dirs is not None else self._DEFAULT_DIRS
        summary = self.validate_directories(dirs)
        self._print_summary(summary)
        return 0 if summary["success"] else 1

    def validate_directories(self, target_dirs: list[str]) -> dict[str, Any]:
        """Validate multiple directory paths recursively."""
        all_violations: list[dict[str, Any]] = []
        files_checked = 0

        for target_dir in target_dirs:
            if os.path.exists(target_dir):
                result = self.validate_directory(target_dir)
                files_checked += int(result["files_checked"])
                all_violations.extend(result["violations"])

        return {
            "files_checked": files_checked,
            "violations": all_violations,
            "success": len(all_violations) == 0,
        }

    def validate_directory(self, dir_path: str) -> dict[str, Any]:
        """Validate all Python files under a single directory."""
        files = self._collect_py_files(dir_path)
        violations: list[dict[str, Any]] = []

        for file_path in files:
            violations.extend(self.validate_file(file_path))

        return {
            "files_checked": len(files),
            "violations": violations,
            "success": len(violations) == 0,
        }

    def validate_file(self, file_path: str) -> list[dict[str, Any]]:
        """Validate a single Python file against coding standards."""
        violations: list[dict[str, Any]] = []
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        self._check_file_length(file_path, content, violations)
        try:
            tree = ast.parse(content, filename=file_path)
        except SyntaxError as err:
            err_line = err.lineno or 0
            violations.append(
                self._create_violation(file_path, self._RULE_SYNTAX, str(err), err_line)
            )
            return violations

        self._check_module_level_statements(file_path, tree, violations)
        self._check_class_declarations(file_path, content, tree, violations)
        return violations

    def _collect_py_files(self, dir_path: str) -> list[str]:
        """Find all Python files in directory excluding virtual environments and tests."""
        py_files: list[str] = []
        for root, dirs, files in os.walk(dir_path):
            dirs[:] = [
                d for d in dirs
                if not d.startswith(".") and d not in self._EXCLUDED_DIRS
            ]
            for file_name in files:
                if file_name.endswith(".py") and not file_name.startswith("test_"):
                    py_files.append(os.path.join(root, file_name))
        return py_files

    def _check_file_length(
        self, file_path: str, content: str, violations: list[dict[str, Any]]
    ) -> None:
        """Assert file does not exceed maximum line count."""
        line_count = len(content.splitlines())
        if line_count > self._MAX_FILE_LINES:
            msg = f"File exceeds maximum line limit ({line_count} > {self._MAX_FILE_LINES})"
            violations.append(
                self._create_violation(file_path, self._RULE_LENGTH, msg, 1)
            )

    def _check_module_level_statements(
        self, file_path: str, tree: ast.Module, violations: list[dict[str, Any]]
    ) -> None:
        """Ensure no free-standing functions or executable statements exist at module level."""
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                msg = f"Free-standing function '{node.name}' is not allowed outside a class"
                violations.append(
                    self._create_violation(file_path, self._RULE_OOP, msg, node.lineno)
                )
            elif isinstance(node, ast.If):
                self._check_module_if_main(file_path, node, violations)

    def _check_module_if_main(
        self, file_path: str, node: ast.If, violations: list[dict[str, Any]]
    ) -> None:
        """Allow only if __name__ == '__main__': at module level."""
        test_src = ast.unparse(node.test)
        if "__name__" not in test_src or "__main__" not in test_src:
            msg = (
                "Module-level conditional code is forbidden; "
                "only if __name__ == '__main__': is allowed"
            )
            violations.append(
                self._create_violation(file_path, self._RULE_OOP, msg, node.lineno)
            )

    def _check_class_declarations(
        self,
        file_path: str,
        content: str,
        tree: ast.Module,
        violations: list[dict[str, Any]],
    ) -> None:
        """Verify single class per file and member ordering."""
        classes = [node for node in tree.body if isinstance(node, ast.ClassDef)]
        if not classes:
            return
        if len(classes) > 1:
            msg = f"File contains {len(classes)} classes, expected exactly 1"
            violations.append(
                self._create_violation(file_path, self._RULE_ONE_CLASS, msg, classes[1].lineno)
            )
        self._check_class_name(file_path, classes[0], violations)
        self._check_class_members(file_path, content, classes[0], violations)

    def _check_class_name(
        self, file_path: str, class_node: ast.ClassDef, violations: list[dict[str, Any]]
    ) -> None:
        """Assert class name matches file base name."""
        base_name = os.path.splitext(os.path.basename(file_path))[0]
        snake_class = re.sub(r"(?<!^)(?=[A-Z])", "_", class_node.name).lower()
        if snake_class != base_name.lower():
            msg = f"Class '{class_node.name}' does not match file name '{base_name}'"
            violations.append(
                self._create_violation(file_path, self._RULE_ONE_CLASS, msg, class_node.lineno)
            )

    def _check_class_members(
        self,
        file_path: str,
        content: str,
        class_node: ast.ClassDef,
        violations: list[dict[str, Any]],
    ) -> None:
        """Verify strict ordering and method length limits inside class."""
        last_level = 0
        file_lines = content.splitlines()

        for member in class_node.body:
            level = self._get_member_level(member)
            if level > 0:
                if level < last_level:
                    msg = "Member ordering violation: public must appear before non-public members"
                    violations.append(
                        self._create_violation(file_path, self._RULE_ORDERING, msg, member.lineno)
                    )
                last_level = max(last_level, level)

            if isinstance(member, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self._check_method_length(file_path, member, file_lines, violations)

    def _get_member_level(self, member: ast.AST) -> int:
        """Determine hierarchy level of class member."""
        if isinstance(member, (ast.Assign, ast.AnnAssign)):
            return self._LEVEL_CLASS_VAR
        if isinstance(member, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if member.name == "__init__":
                return self._LEVEL_INIT
            if member.name.startswith("__") and not member.name.endswith("__"):
                return self._LEVEL_PRIVATE
            if member.name.startswith("_"):
                return self._LEVEL_PROTECTED
            return self._LEVEL_PUBLIC
        return 0

    def _check_method_length(
        self,
        file_path: str,
        method: ast.FunctionDef | ast.AsyncFunctionDef,
        file_lines: list[str],
        violations: list[dict[str, Any]],
    ) -> None:
        """Assert method body does not exceed maximum logical line threshold."""
        logical_count = self._count_logical_lines(method, file_lines)
        if logical_count > self._MAX_METHOD_LINES:
            msg = f"Method '{method.name}' exceeds {self._MAX_METHOD_LINES} logical lines"
            violations.append(
                self._create_violation(file_path, self._RULE_METHOD_LEN, msg, method.lineno)
            )

    def _count_logical_lines(
        self, method: ast.FunctionDef | ast.AsyncFunctionDef, file_lines: list[str]
    ) -> int:
        """Count logical body lines excluding def line, docstrings, blank lines, and comments."""
        start_line = method.lineno
        end_line = getattr(method, "end_lineno", start_line)
        method_lines = file_lines[start_line:end_line]
        docstring = ast.get_docstring(method)
        docstring_lines = set(docstring.splitlines()) if docstring else set()

        count = 0
        for raw_line in method_lines:
            line = raw_line.strip()
            if line and not line.startswith("#") and line not in docstring_lines:
                count += 1
        return count

    def _create_violation(
        self, file_path: str, rule: str, message: str, line: int
    ) -> dict[str, Any]:
        """Construct standard violation dictionary."""
        return {
            "file": file_path,
            "rule": rule,
            "message": message,
            "line": line,
        }

    def _print_summary(self, summary: dict[str, Any]) -> None:
        """Print validation summary to console."""
        print(f"Scanned {summary['files_checked']} Python files.")
        if summary["success"]:
            print("✅ All Python coding standards passed!")
            return
        print(f"❌ Found {len(summary['violations'])} violations:")
        for v in summary["violations"]:
            print(f"  [{v['rule']}] {v['file']}:{v['line']} - {v['message']}")


StandardsValidatorPy = StandardsValidator

if __name__ == "__main__":
    validator = StandardsValidator()
    sys.exit(validator.run())
