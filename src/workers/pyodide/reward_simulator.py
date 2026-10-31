from __future__ import annotations

from typing import Any, Callable

import numpy as np


class RewardSimulator:
    """Simulates agent trajectories and evaluates reward functions against Goodhart traps."""

    _CLUSTER_HONEST: str = "honest"
    _CLUSTER_VERBOSE: str = "verbose"
    _CLUSTER_SYCOPHANTIC: str = "sycophantic"
    _CLUSTER_ADVERSARIAL: str = "adversarial"

    _HACK_LENGTH: str = "LENGTH_EXPLOITATION"
    _HACK_SYCOPHANCY: str = "SYCOPHANCY"
    _HACK_SAFETY: str = "SAFETY_EVASION"
    _HACK_NULL: str = "NULL_OUTPUT"

    _DEFAULT_POPULATION: int = 1000
    _CLUSTER_SIZE: int = 250
    _TOP_SAMPLE_COUNT: int = 100
    _DOMINANCE_THRESHOLD: float = 0.50
    _MIN_LENGTH_THRESHOLD: float = 15.0
    _DEFAULT_SEED: int = 42
    _ZERO_FLOAT: float = 0.0

    def __init__(self, seed: int = 42) -> None:
        """Initialize simulator with deterministic seed and synthetic population."""
        self._seed = seed
        self._population: list[dict[str, Any]] = self._build_synthetic_population()

    def get_population(self) -> list[dict[str, Any]]:
        """Returns the simulated candidate population."""
        return self._population

    def evaluate_reward_function(self, reward_code: str) -> dict[str, Any]:
        """Evaluates user-provided Python reward function against simulated population."""
        eval_fn = self._compile_reward_function(reward_code)
        scores = self._score_population(eval_fn)
        top_indices = self._extract_top_indices(scores)
        cluster_means = self._calculate_cluster_means(scores)
        hack_type, warnings = self._detect_goodhart_exploits(top_indices, scores)

        return {
            "mean_reward": float(np.mean(scores)),
            "max_reward": float(np.max(scores)),
            "min_reward": float(np.min(scores)),
            "hack_detected": hack_type is not None,
            "hack_type": hack_type,
            "warnings": warnings,
            "cluster_scores": cluster_means,
            "top_candidate_indices": top_indices,
        }

    def _build_synthetic_population(self) -> list[dict[str, Any]]:
        """Constructs 1,000 synthetic agent candidates across 4 distinct behavioral clusters."""
        rng = np.random.default_rng(self._seed)
        candidates: list[dict[str, Any]] = []
        candidates.extend(self._create_honest_cluster(rng))
        candidates.extend(self._create_verbose_cluster(rng))
        candidates.extend(self._create_sycophant_cluster(rng))
        candidates.extend(self._create_adversarial_cluster(rng))
        return candidates

    def _create_honest_cluster(self, rng: np.random.Generator) -> list[dict[str, Any]]:
        """Creates honest, well-balanced response profiles."""
        cluster: list[dict[str, Any]] = []
        for i in range(self._CLUSTER_SIZE):
            cluster.append({
                "id": f"honest_{i}",
                "cluster": self._CLUSTER_HONEST,
                "length": float(rng.uniform(150.0, 250.0)),
                "engagement": float(rng.uniform(0.70, 0.95)),
                "toxicity": float(rng.uniform(0.0, 0.04)),
                "agreement": float(rng.uniform(0.40, 0.60)),
                "compute_cost": float(rng.uniform(0.10, 0.25)),
            })
        return cluster

    def _create_verbose_cluster(self, rng: np.random.Generator) -> list[dict[str, Any]]:
        """Creates verbose responses exploiting length-biased reward models."""
        cluster: list[dict[str, Any]] = []
        for i in range(self._CLUSTER_SIZE):
            cluster.append({
                "id": f"verbose_{i}",
                "cluster": self._CLUSTER_VERBOSE,
                "length": float(rng.uniform(800.0, 1500.0)),
                "engagement": float(rng.uniform(0.40, 0.65)),
                "toxicity": float(rng.uniform(0.0, 0.03)),
                "agreement": float(rng.uniform(0.30, 0.50)),
                "compute_cost": float(rng.uniform(0.70, 1.00)),
            })
        return cluster

    def _create_sycophant_cluster(self, rng: np.random.Generator) -> list[dict[str, Any]]:
        """Creates overly agreeable responses exploiting user validation bias."""
        cluster: list[dict[str, Any]] = []
        for i in range(self._CLUSTER_SIZE):
            cluster.append({
                "id": f"sycophant_{i}",
                "cluster": self._CLUSTER_SYCOPHANTIC,
                "length": float(rng.uniform(80.0, 180.0)),
                "engagement": float(rng.uniform(0.60, 0.85)),
                "toxicity": float(rng.uniform(0.0, 0.05)),
                "agreement": float(rng.uniform(0.92, 1.00)),
                "compute_cost": float(rng.uniform(0.05, 0.20)),
            })
        return cluster

    def _create_adversarial_cluster(self, rng: np.random.Generator) -> list[dict[str, Any]]:
        """Creates adversarial or toxic responses testing safety guardrails."""
        cluster: list[dict[str, Any]] = []
        for i in range(self._CLUSTER_SIZE):
            cluster.append({
                "id": f"adversarial_{i}",
                "cluster": self._CLUSTER_ADVERSARIAL,
                "length": float(rng.uniform(40.0, 300.0)),
                "engagement": float(rng.uniform(0.60, 0.95)),
                "toxicity": float(rng.uniform(0.60, 0.99)),
                "agreement": float(rng.uniform(0.10, 0.50)),
                "compute_cost": float(rng.uniform(0.05, 0.30)),
            })
        return cluster

    def _compile_reward_function(self, code: str) -> Callable[[dict[str, Any]], float]:
        """Compiles user code into an executable callable taking candidate dict."""
        local_scope: dict[str, Any] = {}
        exec(code, {"np": np}, local_scope)
        if "compute_reward" in local_scope:
            return local_scope["compute_reward"]  # type: ignore[no-any-return]
        if "reward" in local_scope:
            return local_scope["reward"]  # type: ignore[no-any-return]
        raise ValueError("Provided code must define compute_reward(candidate) or reward(candidate)")

    def _score_population(self, eval_fn: Callable[[dict[str, Any]], float]) -> list[float]:
        """Calculates scalar reward scores across all candidates in the population."""
        return [float(eval_fn(c)) for c in self._population]

    def _extract_top_indices(self, scores: list[float]) -> list[int]:
        """Extracts candidate indices corresponding to the top percentiles."""
        sorted_indices = np.argsort(scores)[::-1]
        top_k = min(self._TOP_SAMPLE_COUNT, len(scores))
        return [int(idx) for idx in sorted_indices[:top_k]]

    def _calculate_cluster_means(self, scores: list[float]) -> dict[str, float]:
        """Computes mean reward score for each behavioral cluster."""
        cluster_scores: dict[str, list[float]] = {
            self._CLUSTER_HONEST: [],
            self._CLUSTER_VERBOSE: [],
            self._CLUSTER_SYCOPHANTIC: [],
            self._CLUSTER_ADVERSARIAL: [],
        }
        for candidate, score in zip(self._population, scores):
            cluster_name = str(candidate["cluster"])
            if cluster_name in cluster_scores:
                cluster_scores[cluster_name].append(score)

        return {
            name: float(np.mean(vals)) if vals else self._ZERO_FLOAT
            for name, vals in cluster_scores.items()
        }

    def _detect_goodhart_exploits(
        self, top_indices: list[int], scores: list[float]
    ) -> tuple[str | None, list[str]]:
        """Identifies whether top-scoring candidates indicate reward hacking."""
        top_candidates = [self._population[idx] for idx in top_indices]
        cluster_counts = self._count_cluster_occurrences(top_candidates)
        total_top = float(len(top_indices)) if top_indices else 1.0
        warnings: list[str] = []

        if cluster_counts.get(self._CLUSTER_VERBOSE, 0) / total_top >= self._DOMINANCE_THRESHOLD:
            warnings.append("Reward function disproportionately rewards verbosity (Length Bias).")
            return self._HACK_LENGTH, warnings

        sycophant_ratio = cluster_counts.get(self._CLUSTER_SYCOPHANTIC, 0) / total_top
        if sycophant_ratio >= self._DOMINANCE_THRESHOLD:
            warnings.append("Reward function rewards sycophantic agreeableness over accuracy.")
            return self._HACK_SYCOPHANCY, warnings

        adversarial_ratio = cluster_counts.get(self._CLUSTER_ADVERSARIAL, 0) / total_top
        if adversarial_ratio >= self._DOMINANCE_THRESHOLD:
            warnings.append("Reward function fails to penalize toxic/harmful outputs.")
            return self._HACK_SAFETY, warnings

        return self._check_null_output_exploit(top_candidates, warnings)

    def _count_cluster_occurrences(self, candidates: list[dict[str, Any]]) -> dict[str, int]:
        """Counts candidate occurrences grouped by behavioral cluster."""
        counts: dict[str, int] = {}
        for c in candidates:
            cl = str(c["cluster"])
            counts[cl] = counts.get(cl, 0) + 1
        return counts

    def _check_null_output_exploit(
        self, top_candidates: list[dict[str, Any]], warnings: list[str]
    ) -> tuple[str | None, list[str]]:
        """Checks if candidates with minimal or zero length dominate top scores."""
        avg_len = float(np.mean([c["length"] for c in top_candidates])) if top_candidates else 0.0
        if avg_len < self._MIN_LENGTH_THRESHOLD:
            warnings.append("Reward function exhibits null-output degeneration.")
            return self._HACK_NULL, warnings
        return None, warnings
