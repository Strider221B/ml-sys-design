from __future__ import annotations

import pytest

from src.workers.pyodide.causal_inference import CausalInference


class TestCausalInference:
    """Test suite for DAG d-separation and causal inference."""

    @pytest.fixture
    def engine(self) -> CausalInference:
        return CausalInference()

    def test_validate_backdoor_criterion_confounderConditioned_isValid(
        self, engine: CausalInference
    ) -> None:
        # Classical confounder DAG: Z -> X, Z -> Y, X -> Y
        edges = [("Z", "X"), ("Z", "Y"), ("X", "Y")]
        result = engine.validate_backdoor_criterion(
            dag_edges=edges, treatment="X", outcome="Y", conditioning_set=["Z"]
        )
        assert result["valid"] is True
        assert result["is_descendant_violation"] is False
        assert len(result["unblocked_paths"]) == 0

    def test_validate_backdoor_criterion_confounderUnconditioned_isInvalid(
        self, engine: CausalInference
    ) -> None:
        edges = [("Z", "X"), ("Z", "Y"), ("X", "Y")]
        result = engine.validate_backdoor_criterion(
            dag_edges=edges, treatment="X", outcome="Y", conditioning_set=[]
        )
        assert result["valid"] is False
        assert len(result["unblocked_paths"]) == 1

    def test_validate_backdoor_criterion_descendantConditioned_returnsViolation(
        self, engine: CausalInference
    ) -> None:
        # X -> M -> Y, where M is a mediator/descendant of X
        edges = [("X", "M"), ("M", "Y")]
        result = engine.validate_backdoor_criterion(
            dag_edges=edges, treatment="X", outcome="Y", conditioning_set=["M"]
        )
        assert result["valid"] is False
        assert result["is_descendant_violation"] is True

    def test_validate_backdoor_criterion_colliderConditioned_opensCollider(
        self, engine: CausalInference
    ) -> None:
        # Backdoor path containing a collider: X <- A -> C <- B -> Y
        # By default, path is blocked by collider C.
        # Conditioning on collider C opens the path!
        edges = [("A", "X"), ("A", "C"), ("B", "C"), ("B", "Y")]
        result_unconditioned = engine.validate_backdoor_criterion(
            dag_edges=edges, treatment="X", outcome="Y", conditioning_set=[]
        )
        assert result_unconditioned["valid"] is True

        result_opened = engine.validate_backdoor_criterion(
            dag_edges=edges, treatment="X", outcome="Y", conditioning_set=["C"]
        )
        assert result_opened["valid"] is False
        assert "C" in result_opened["colliders_opened"]

    def test_compute_stratified_ate_withConfounder_adjustsEstimate(
        self, engine: CausalInference
    ) -> None:
        # Stratum 0: Effect is 2.0 (T=1: 4.0, T=0: 2.0)
        # Stratum 1: Effect is 2.0 (T=1: 12.0, T=0: 10.0)
        # Raw difference would be biased due to imbalance
        data = [
            {"T": 0, "Y": 2.0, "Z": 0},
            {"T": 0, "Y": 2.0, "Z": 0},
            {"T": 1, "Y": 4.0, "Z": 0},
            {"T": 0, "Y": 10.0, "Z": 1},
            {"T": 1, "Y": 12.0, "Z": 1},
            {"T": 1, "Y": 12.0, "Z": 1},
        ]
        result = engine.compute_stratified_ate(data, treatment="T", outcome="Y", confounder="Z")
        assert result["ate"] == 2.0
        assert result["unadjusted_effect"] != 2.0

    def test_compute_stratified_ate_emptyData_returnsZero(
        self, engine: CausalInference
    ) -> None:
        res = engine.compute_stratified_ate([], "T", "Y", "Z")
        assert res["ate"] == 0.0
        assert res["unadjusted_effect"] == 0.0
