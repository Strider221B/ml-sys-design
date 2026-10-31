from __future__ import annotations

import os
import shutil
import tempfile
from collections.abc import Generator

import pytest

from scripts.standards_validator import StandardsValidator


class TestStandardsValidatorPy:
    """Test suite for Python AST standards validator."""

    _CLEAN_CLASS_CONTENT: str = """class SampleWorker:
    _MAX_RETRIES: int = 3

    def __init__(self) -> None:
        pass

    def run(self) -> int:
        return self._compute()

    def _compute(self) -> int:
        return self._MAX_RETRIES
"""

    _FREE_FUNCTION_CONTENT: str = """def freestanding_worker() -> None:
    pass
"""

    _MULTI_CLASS_CONTENT: str = """class FirstWorker:
    pass

class SecondWorker:
    pass
"""

    _MISMATCH_NAME_CONTENT: str = """class MismatchedWorker:
    pass
"""

    _ORDERING_VIOLATION_CONTENT: str = """class OrderViolator:
    def _private_first(self) -> None:
        pass

    def public_second(self) -> None:
        pass
"""

    _LONG_METHOD_CONTENT: str = """class LongWorker:
    def execute(self) -> None:
        a0 = 0
        a1 = 1
        a2 = 2
        a3 = 3
        a4 = 4
        a5 = 5
        a6 = 6
        a7 = 7
        a8 = 8
        a9 = 9
        b0 = 10
        b1 = 11
        b2 = 12
        b3 = 13
        b4 = 14
        b5 = 15
        b6 = 16
        b7 = 17
        b8 = 18
        b9 = 19
        c0 = 20
        c1 = 21
"""

    _INVALID_IF_CONTENT: str = """if 1 + 1 == 2:
    pass
"""

    _VALID_IF_MAIN_CONTENT: str = """class MainApp:
    def run(self) -> int:
        return 0

if __name__ == "__main__":
    pass
"""

    @pytest.fixture
    def temp_dir(self) -> Generator[str, None, None]:
        """Provide a temporary directory for test files."""
        dir_path = tempfile.mkdtemp()
        try:
            yield dir_path
        finally:
            shutil.rmtree(dir_path, ignore_errors=True)

    def test_validate_file_withCompliantClass_returnsNoViolations(self, temp_dir: str) -> None:
        """Verify compliant single-class file passes with zero violations."""
        validator = StandardsValidator()
        target_file = os.path.join(temp_dir, "sample_worker.py")
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(self._CLEAN_CLASS_CONTENT)

        violations = validator.validate_file(target_file)
        assert len(violations) == 0

    def test_validate_file_withFreeStandingFunction_reportsStrictOopViolation(
        self, temp_dir: str
    ) -> None:
        """Verify top-level function raises STRICT_OOP violation."""
        validator = StandardsValidator()
        target_file = os.path.join(temp_dir, "free_worker.py")
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(self._FREE_FUNCTION_CONTENT)

        violations = validator.validate_file(target_file)
        assert any(v["rule"] == "STRICT_OOP" for v in violations)

    def test_validate_file_withMultipleClasses_reportsOneClassViolation(
        self, temp_dir: str
    ) -> None:
        """Verify multiple classes in one file raises ONE_CLASS_PER_FILE violation."""
        validator = StandardsValidator()
        target_file = os.path.join(temp_dir, "multi_worker.py")
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(self._MULTI_CLASS_CONTENT)

        violations = validator.validate_file(target_file)
        assert any(v["rule"] == "ONE_CLASS_PER_FILE" for v in violations)

    def test_validate_file_withMismatchedClassName_reportsOneClassViolation(
        self, temp_dir: str
    ) -> None:
        """Verify mismatched class name against file basename raises violation."""
        validator = StandardsValidator()
        target_file = os.path.join(temp_dir, "expected_worker.py")
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(self._MISMATCH_NAME_CONTENT)

        violations = validator.validate_file(target_file)
        assert any(v["rule"] == "ONE_CLASS_PER_FILE" for v in violations)

    def test_validate_file_withMemberOrderingViolation_reportsOrderingViolation(
        self, temp_dir: str
    ) -> None:
        """Verify non-public methods before public methods raises MEMBER_ORDERING."""
        validator = StandardsValidator()
        target_file = os.path.join(temp_dir, "order_violator.py")
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(self._ORDERING_VIOLATION_CONTENT)

        violations = validator.validate_file(target_file)
        assert any(v["rule"] == "MEMBER_ORDERING" for v in violations)

    def test_validate_file_withLongMethod_reportsMethodLengthViolation(
        self, temp_dir: str
    ) -> None:
        """Verify method exceeding 20 logical lines raises METHOD_LENGTH violation."""
        validator = StandardsValidator()
        target_file = os.path.join(temp_dir, "long_worker.py")
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(self._LONG_METHOD_CONTENT)

        violations = validator.validate_file(target_file)
        assert any(v["rule"] == "METHOD_LENGTH" for v in violations)

    def test_validate_file_withFileLengthOverLimit_reportsFileLengthViolation(
        self, temp_dir: str
    ) -> None:
        """Verify file exceeding 500 lines raises FILE_LENGTH violation."""
        validator = StandardsValidator()
        target_file = os.path.join(temp_dir, "huge_worker.py")
        lines = ["# comment line\n"] * 505
        with open(target_file, "w", encoding="utf-8") as f:
            f.writelines(lines)

        violations = validator.validate_file(target_file)
        assert any(v["rule"] == "FILE_LENGTH" for v in violations)

    def test_validate_file_withSyntaxError_reportsSyntaxErrorViolation(
        self, temp_dir: str
    ) -> None:
        """Verify unparseable Python syntax raises SYNTAX_ERROR violation."""
        validator = StandardsValidator()
        target_file = os.path.join(temp_dir, "syntax_err.py")
        with open(target_file, "w", encoding="utf-8") as f:
            f.write("def broken_syntax(:\n")

        violations = validator.validate_file(target_file)
        assert any(v["rule"] == "SYNTAX_ERROR" for v in violations)

    def test_validate_directory_and_run_returnsExpectedExitCodes(
        self, temp_dir: str
    ) -> None:
        """Verify directory scan and run() return 0 on clean code and 1 on violations."""
        validator = StandardsValidator()
        clean_file = os.path.join(temp_dir, "sample_worker.py")
        with open(clean_file, "w", encoding="utf-8") as f:
            f.write(self._CLEAN_CLASS_CONTENT)

        summary = validator.validate_directory(temp_dir)
        assert summary["files_checked"] == 1
        assert summary["success"] is True

        exit_code_clean = validator.run([temp_dir])
        assert exit_code_clean == 0

        bad_file = os.path.join(temp_dir, "bad_worker.py")
        with open(bad_file, "w", encoding="utf-8") as f:
            f.write(self._FREE_FUNCTION_CONTENT)

        exit_code_bad = validator.run([temp_dir])
        assert exit_code_bad == 1

    def test_validate_file_withModuleIfStatements_checksAllowedForms(
        self, temp_dir: str
    ) -> None:
        """Verify module-level conditional validation allows only if-main."""
        validator = StandardsValidator()
        valid_file = os.path.join(temp_dir, "main_app.py")
        with open(valid_file, "w", encoding="utf-8") as f:
            f.write(self._VALID_IF_MAIN_CONTENT)

        valid_violations = validator.validate_file(valid_file)
        assert len(valid_violations) == 0

        invalid_file = os.path.join(temp_dir, "invalid_if.py")
        with open(invalid_file, "w", encoding="utf-8") as f:
            f.write(self._INVALID_IF_CONTENT)

        invalid_violations = validator.validate_file(invalid_file)
        assert any(v["rule"] == "STRICT_OOP" for v in invalid_violations)

    def test_validate_directories_withNonExistentPath_handlesGracefully(self) -> None:
        """Verify non-existent directory paths are handled without throwing."""
        validator = StandardsValidator()
        result = validator.validate_directories(["/non_existent_path_xyz_123"])
        assert result["files_checked"] == 0
        assert result["success"] is True
