from __future__ import annotations

import math

import pytest

from src.workers.pyodide.math_sandbox import MathSandbox


class TestMathSandbox:
    """Test suite for scientific calculations in MathSandbox."""

    @pytest.fixture
    def sandbox(self) -> MathSandbox:
        return MathSandbox()

    def test_compute_cuped_correlatedData_reducesVariance(self, sandbox: MathSandbox) -> None:
        # Pre-experiment metric X, post-experiment metric Y with correlation
        x_c = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]
        y_c = [1.2, 2.1, 2.9, 4.2, 4.8, 6.1, 7.0, 8.2, 8.9, 10.1]
        x_v = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]
        y_v = [1.5, 2.4, 3.2, 4.5, 5.1, 6.4, 7.3, 8.5, 9.2, 10.4]

        result = sandbox.compute_cuped(y_c, y_v, x_c, x_v)

        assert result["theta"] > 0.8
        assert result["reduction_percentage"] > 80.0
        assert result["cuped_variance"] < result["original_variance"]
        assert result["treatment_effect"] > 0.0

    def test_compute_cuped_zeroVarianceX_returnsZeroTheta(self, sandbox: MathSandbox) -> None:
        x_c = [5.0, 5.0, 5.0]
        y_c = [1.0, 2.0, 3.0]
        x_v = [5.0, 5.0, 5.0]
        y_v = [2.0, 3.0, 4.0]

        result = sandbox.compute_cuped(y_c, y_v, x_c, x_v)

        assert result["theta"] == 0.0
        assert result["reduction_percentage"] == 0.0

    def test_compute_cuped_emptyAndSingleElement_returnsZeroGracefully(
        self, sandbox: MathSandbox
    ) -> None:
        result_empty = sandbox.compute_cuped([], [], [], [])
        assert result_empty["theta"] == 0.0
        assert result_empty["reduction_percentage"] == 0.0

        result_single = sandbox.compute_cuped([1.0], [2.0], [1.0], [2.0])
        assert "theta" in result_single

    def test_compute_shannon_entropy_uniformDistribution_returnsExpectedBits(
        self, sandbox: MathSandbox
    ) -> None:
        # 4 distinct tokens equal probability: log2(4) = 2.0 bits
        tokens = ["a", "b", "c", "d"]
        entropy = sandbox.compute_shannon_entropy(tokens)
        assert math.isclose(entropy, 2.0, rel_tol=1e-5)

    def test_compute_shannon_entropy_singleToken_returnsZeroEntropy(
        self, sandbox: MathSandbox
    ) -> None:
        tokens = ["same", "same", "same", "same"]
        entropy = sandbox.compute_shannon_entropy(tokens)
        assert entropy == 0.0

    def test_compute_shannon_entropy_emptyList_returnsZero(
        self, sandbox: MathSandbox
    ) -> None:
        assert sandbox.compute_shannon_entropy([]) == 0.0

    def test_compute_ate_positiveLift_returnsAccurateDifference(
        self, sandbox: MathSandbox
    ) -> None:
        control = [10.0, 12.0, 14.0]
        variant = [15.0, 17.0, 19.0]
        ate = sandbox.compute_ate(control, variant)
        assert math.isclose(ate, 5.0, rel_tol=1e-5)

    def test_compute_ate_emptyInputs_returnsZero(self, sandbox: MathSandbox) -> None:
        assert sandbox.compute_ate([], [1.0, 2.0]) == 0.0
        assert sandbox.compute_ate([1.0, 2.0], []) == 0.0
