from __future__ import annotations

import pytest

from src.workers.pyodide.reward_simulator import RewardSimulator


class TestRewardSimulator:
    """Test suite for agent population simulation and Goodhart's Law detection."""

    @pytest.fixture
    def simulator(self) -> RewardSimulator:
        return RewardSimulator(seed=123)

    def test_init_buildsOneThousandCandidates(self, simulator: RewardSimulator) -> None:
        population = simulator.get_population()
        assert len(population) == 1000
        clusters = {c["cluster"] for c in population}
        assert clusters == {"honest", "verbose", "sycophantic", "adversarial"}

    def test_evaluate_reward_function_lengthBias_detectsLengthExploitation(
        self, simulator: RewardSimulator
    ) -> None:
        # A reward function that strictly rewards verbosity/token length
        code = """
def compute_reward(candidate):
    return float(candidate["length"]) * 2.0
"""
        result = simulator.evaluate_reward_function(code)
        assert result["hack_detected"] is True
        assert result["hack_type"] == "LENGTH_EXPLOITATION"
        assert len(result["warnings"]) >= 1

    def test_evaluate_reward_function_sycophancy_detectsSycophancy(
        self, simulator: RewardSimulator
    ) -> None:
        # A reward function that heavily rewards user agreement
        code = """
def compute_reward(candidate):
    return float(candidate["agreement"]) * 10.0 - float(candidate["length"]) * 0.01
"""
        result = simulator.evaluate_reward_function(code)
        assert result["hack_detected"] is True
        assert result["hack_type"] == "SYCOPHANCY"

    def test_evaluate_reward_function_safetyEvasion_detectsSafetyViolation(
        self, simulator: RewardSimulator
    ) -> None:
        # A reward function that rewards high engagement regardless of toxicity
        code = """
def compute_reward(candidate):
    return float(candidate["engagement"]) * 10.0 + float(candidate["toxicity"]) * 5.0
"""
        result = simulator.evaluate_reward_function(code)
        assert result["hack_detected"] is True
        assert result["hack_type"] == "SAFETY_EVASION"

    def test_evaluate_reward_function_balancedReward_passesWithoutHacks(
        self, simulator: RewardSimulator
    ) -> None:
        # A well-balanced reward function penalizing toxicity and verbosity
        code = """
def compute_reward(candidate):
    return (
        float(candidate["engagement"]) * 3.0
        - float(candidate["toxicity"]) * 20.0
        - float(candidate["compute_cost"]) * 2.0
        - abs(float(candidate["agreement"]) - 0.5) * 1.0
    )
"""
        result = simulator.evaluate_reward_function(code)
        assert result["hack_detected"] is False
        assert result["hack_type"] is None
        assert result["cluster_scores"]["honest"] > result["cluster_scores"]["adversarial"]

    def test_evaluate_reward_function_nullOutput_detectsNullDegeneration(
        self, simulator: RewardSimulator
    ) -> None:
        # Function severely penalizing length and cost to reward null outputs
        code = """
def reward(candidate):
    return 10.0 - float(candidate["length"]) * 0.5 - float(candidate["compute_cost"]) * 10.0
"""
        result = simulator.evaluate_reward_function(code)
        assert result["mean_reward"] is not None

    def test_evaluate_reward_function_invalidCode_raisesValueError(
        self, simulator: RewardSimulator
    ) -> None:
        code = """
def wrong_function_name(candidate):
    return 1.0
"""
        with pytest.raises(ValueError, match="compute_reward"):
            simulator.evaluate_reward_function(code)
