from __future__ import annotations

import math

import pytest

from src.workers.pyodide.minhash_auditor import MinhashAuditor


class TestMinhashAuditor:
    """Test suite for MinHash LSH contamination scanning and entropy filtering."""

    @pytest.fixture
    def auditor(self) -> MinhashAuditor:
        return MinhashAuditor(seed=42)

    def test_compute_minhash_signature_identicalText_producesIdenticalSignatures(
        self, auditor: MinhashAuditor
    ) -> None:
        text_a = "Solve the following math question step by step."
        text_b = "Solve the following math question step by step."

        sig_a = auditor.compute_minhash_signature(text_a)
        sig_b = auditor.compute_minhash_signature(text_b)

        assert len(sig_a) == 128
        assert sig_a == sig_b
        assert auditor.estimate_jaccard_similarity(sig_a, sig_b) == 1.0

    def test_compute_minhash_signature_differentText_producesDifferentSignatures(
        self, auditor: MinhashAuditor
    ) -> None:
        text_a = "Deep learning transformers utilize multi-head self attention mechanisms."
        text_b = "The quick brown fox jumps over the lazy dog in the forest."

        sig_a = auditor.compute_minhash_signature(text_a)
        sig_b = auditor.compute_minhash_signature(text_b)

        sim = auditor.estimate_jaccard_similarity(sig_a, sig_b)
        assert sim < 0.25

    def test_compute_minhash_signature_shortOrEmptyText_handlesGracefully(
        self, auditor: MinhashAuditor
    ) -> None:
        sig_empty = auditor.compute_minhash_signature("")
        assert len(sig_empty) == 128
        assert all(val == 0 for val in sig_empty)

        sig_short = auditor.compute_minhash_signature("Hi")
        assert len(sig_short) == 128

    def test_estimate_jaccard_similarity_edgeCases_returnsZero(
        self, auditor: MinhashAuditor
    ) -> None:
        assert auditor.estimate_jaccard_similarity([], [1, 2]) == 0.0
        assert auditor.estimate_jaccard_similarity([1, 2], [1]) == 0.0

    def test_scan_contamination_detectsIdenticalAndNearDuplicateLeakedPrompts(
        self, auditor: MinhashAuditor
    ) -> None:
        train_corpus = [
            "What is the capital of France and what is its primary landmark?",
            "Calculate the derivative of f(x) = 3*x^2 + 5*x - 7 at x = 4.",
            "Write a Python script that sorts a list using merge sort algorithm.",
        ]
        test_corpus = [
            "Calculate the derivative of f(x) = 3*x^2 + 5*x - 7 at x = 4.",
            "Explain quantum chromodynamics in standard model physics.",
        ]

        matches = auditor.scan_contamination(train_corpus, test_corpus, threshold=0.85)

        assert len(matches) == 1
        assert matches[0]["train_index"] == 1
        assert matches[0]["test_index"] == 0
        assert matches[0]["estimated_jaccard"] > 0.85
        assert matches[0]["is_contaminated"] is True

    def test_scan_contamination_cleanCorpus_returnsEmptyMatches(
        self, auditor: MinhashAuditor
    ) -> None:
        train_corpus = ["Alpha beta gamma delta epsilon zeta eta theta."]
        test_corpus = ["One two three four five six seven eight nine ten."]

        matches = auditor.scan_contamination(train_corpus, test_corpus, threshold=0.80)
        assert len(matches) == 0

    def test_compute_shannon_entropy_calculatesExpectedEntropy(
        self, auditor: MinhashAuditor
    ) -> None:
        tokens = ["word1", "word2", "word3", "word4"]
        entropy = auditor.compute_shannon_entropy(tokens)
        assert math.isclose(entropy, 2.0, rel_tol=1e-5)
        assert auditor.compute_shannon_entropy([]) == 0.0
