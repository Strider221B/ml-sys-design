from __future__ import annotations

import collections
import math
from typing import Any

import numpy as np


class MathSandbox:
    """Scientific calculations executed within Pyodide WASM."""

    _MIN_VARIANCE_THRESHOLD: float = 1e-9
    _MAX_PERCENTAGE: float = 100.0
    _ZERO_FLOAT: float = 0.0
    _LOG2_BASE: float = 2.0
    _KEY_THETA: str = "theta"
    _KEY_ORIGINAL_VAR: str = "original_variance"
    _KEY_CUPED_VAR: str = "cuped_variance"
    _KEY_REDUCTION_PCT: str = "reduction_percentage"
    _KEY_TREATMENT_EFFECT: str = "treatment_effect"

    def __init__(self) -> None:
        """Initialize scientific math sandbox."""
        pass

    def compute_cuped(
        self,
        y_control: list[float],
        y_variant: list[float],
        x_control: list[float],
        x_variant: list[float],
    ) -> dict[str, float]:
        """Calculates CUPED theta and variance reduction percentage."""
        y_c, y_v = np.array(y_control, dtype=float), np.array(y_variant, dtype=float)
        x_c, x_v = np.array(x_control, dtype=float), np.array(x_variant, dtype=float)
        all_y, all_x = np.concatenate([y_c, y_v]), np.concatenate([x_c, x_v])

        theta = self._calculate_theta(all_y, all_x)
        mean_x = float(np.mean(all_x)) if len(all_x) > 0 else self._ZERO_FLOAT
        adj_c = y_c - theta * (x_c - mean_x)
        adj_v = y_v - theta * (x_v - mean_x)

        return self._format_cuped_results(theta, all_y, adj_c, adj_v)

    def compute_shannon_entropy(self, tokens: list[str]) -> float:
        """Computes Shannon entropy H(X) = -sum(p * log2(p)) for token sequence."""
        if not tokens:
            return self._ZERO_FLOAT
        counts = collections.Counter(tokens)
        total_tokens = float(len(tokens))
        entropy = self._ZERO_FLOAT
        for count in counts.values():
            prob = float(count) / total_tokens
            if prob > self._ZERO_FLOAT:
                entropy -= prob * (math.log(prob) / math.log(self._LOG2_BASE))
        return float(entropy)

    def compute_ate(self, y_control: list[float], y_variant: list[float]) -> float:
        """Computes Average Treatment Effect as difference in sample means."""
        if not y_control or not y_variant:
            return self._ZERO_FLOAT
        mean_variant = float(np.mean(y_variant))
        mean_control = float(np.mean(y_control))
        return mean_variant - mean_control

    def _format_cuped_results(
        self,
        theta: float,
        all_y: np.ndarray[Any, Any],
        adj_c: np.ndarray[Any, Any],
        adj_v: np.ndarray[Any, Any],
    ) -> dict[str, float]:
        """Formats and packs CUPED computation statistics into a dictionary."""
        raw_var = float(np.var(all_y)) if len(all_y) > 0 else self._ZERO_FLOAT
        adj_all = np.concatenate([adj_c, adj_v]) if len(adj_c) > 0 else np.array([])
        adj_var = float(np.var(adj_all)) if len(adj_all) > 0 else self._ZERO_FLOAT
        red_pct = self._calculate_reduction(raw_var, adj_var)
        lift = float(np.mean(adj_v) - np.mean(adj_c)) if len(adj_v) > 0 else self._ZERO_FLOAT

        return {
            self._KEY_THETA: float(theta),
            self._KEY_ORIGINAL_VAR: raw_var,
            self._KEY_CUPED_VAR: adj_var,
            self._KEY_REDUCTION_PCT: red_pct,
            self._KEY_TREATMENT_EFFECT: lift,
        }

    def _calculate_theta(self, all_y: np.ndarray[Any, Any], all_x: np.ndarray[Any, Any]) -> float:
        """Calculates regression coefficient theta = Cov(Y, X) / Var(X)."""
        if len(all_x) < 2 or len(all_y) < 2:
            return self._ZERO_FLOAT
        cov_matrix = np.cov(all_y, all_x)
        var_x = float(cov_matrix[1, 1])
        if var_x < self._MIN_VARIANCE_THRESHOLD:
            return self._ZERO_FLOAT
        cov_yx = float(cov_matrix[0, 1])
        return cov_yx / var_x

    def _calculate_reduction(self, raw_var: float, adj_var: float) -> float:
        """Calculates variance reduction percentage."""
        if raw_var < self._MIN_VARIANCE_THRESHOLD:
            return self._ZERO_FLOAT
        return ((raw_var - adj_var) / raw_var) * self._MAX_PERCENTAGE
