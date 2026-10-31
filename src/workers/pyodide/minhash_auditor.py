from __future__ import annotations

import collections
import hashlib
import math
from typing import Any

import numpy as np


class MinhashAuditor:
    """MinHash LSH test-set contamination auditor and Shannon entropy filter."""

    _NUM_PERMUTATIONS: int = 128
    _DEFAULT_THRESHOLD: float = 0.85
    _K_SHINGLE_SIZE: int = 5
    _NUM_BANDS: int = 16
    _ROWS_PER_BAND: int = 8
    _PRIME_MODULUS: int = 4294967311
    _LARGE_INIT_HASH: int = 4294967311
    _DEFAULT_SEED: int = 1337
    _LOG2_BASE: float = 2.0
    _ZERO_FLOAT: float = 0.0

    _KEY_TRAIN_IDX: str = "train_index"
    _KEY_TEST_IDX: str = "test_index"
    _KEY_EST_JACCARD: str = "estimated_jaccard"
    _KEY_IS_CONTAMINATED: str = "is_contaminated"

    def __init__(self, seed: int = 1337) -> None:
        """Initialize MinHash auditor with deterministic linear hash coefficients."""
        self._seed = seed
        rng = np.random.default_rng(self._seed)
        a_arr = rng.integers(1, self._PRIME_MODULUS - 1, size=self._NUM_PERMUTATIONS)
        b_arr = rng.integers(0, self._PRIME_MODULUS - 1, size=self._NUM_PERMUTATIONS)
        self._a_coeffs = [int(x) for x in a_arr]
        self._b_coeffs = [int(x) for x in b_arr]

    def compute_minhash_signature(self, text: str) -> list[int]:
        """Computes 128-element MinHash signature using k-shingles."""
        shingles = self._extract_shingles(text)
        if not shingles:
            return [0] * self._NUM_PERMUTATIONS

        shingle_hashes = [self._hash_string_to_int(s) for s in shingles]
        signature: list[int] = []
        for a, b in zip(self._a_coeffs, self._b_coeffs):
            min_val = min((a * h + b) % self._PRIME_MODULUS for h in shingle_hashes)
            signature.append(int(min_val))
        return signature

    def estimate_jaccard_similarity(self, sig_a: list[int], sig_b: list[int]) -> float:
        """Estimates Jaccard similarity as fraction of matching signature elements."""
        if not sig_a or not sig_b or len(sig_a) != len(sig_b):
            return self._ZERO_FLOAT
        matches = sum(1 for a, b in zip(sig_a, sig_b) if a == b)
        return float(matches) / float(len(sig_a))

    def scan_contamination(
        self,
        train_corpus: list[str],
        test_corpus: list[str],
        threshold: float = 0.85,
    ) -> list[dict[str, Any]]:
        """Scans train corpus against test corpus to detect contaminated test prompts."""
        train_sigs = [self.compute_minhash_signature(doc) for doc in train_corpus]
        test_sigs = [self.compute_minhash_signature(doc) for doc in test_corpus]
        lsh_buckets = self._index_into_lsh_buckets(train_sigs)
        candidates = self._find_lsh_candidates(test_sigs, lsh_buckets)

        matches: list[dict[str, Any]] = []
        for test_idx, train_candidates in candidates.items():
            for train_idx in train_candidates:
                sim = self.estimate_jaccard_similarity(train_sigs[train_idx], test_sigs[test_idx])
                if sim >= threshold:
                    matches.append(self._format_match(train_idx, test_idx, sim, True))

        return matches

    def compute_shannon_entropy(self, tokens: list[str]) -> float:
        """Calculates Shannon entropy in bits per token."""
        if not tokens:
            return self._ZERO_FLOAT
        counts = collections.Counter(tokens)
        total = float(len(tokens))
        entropy = self._ZERO_FLOAT
        for count in counts.values():
            prob = float(count) / total
            if prob > self._ZERO_FLOAT:
                entropy -= prob * (math.log(prob) / math.log(self._LOG2_BASE))
        return float(entropy)

    def _extract_shingles(self, text: str) -> set[str]:
        """Extracts character k-shingles from normalized text."""
        cleaned = text.strip().lower()
        if len(cleaned) < self._K_SHINGLE_SIZE:
            return {cleaned} if cleaned else set()
        return {
            cleaned[i : i + self._K_SHINGLE_SIZE]
            for i in range(len(cleaned) - self._K_SHINGLE_SIZE + 1)
        }

    def _hash_string_to_int(self, value: str) -> int:
        """Hashes string to non-negative 32-bit integer."""
        digest = hashlib.md5(value.encode("utf-8")).hexdigest()
        return int(digest[:8], 16)

    def _index_into_lsh_buckets(
        self, signatures: list[list[int]]
    ) -> dict[tuple[int, tuple[int, ...]], list[int]]:
        """Indexes train signatures into LSH band buckets."""
        buckets: dict[tuple[int, tuple[int, ...]], list[int]] = collections.defaultdict(list)
        for doc_idx, sig in enumerate(signatures):
            for band_idx in range(self._NUM_BANDS):
                start = band_idx * self._ROWS_PER_BAND
                band_slice = tuple(sig[start : start + self._ROWS_PER_BAND])
                buckets[(band_idx, band_slice)].append(doc_idx)
        return buckets

    def _find_lsh_candidates(
        self,
        test_sigs: list[list[int]],
        buckets: dict[tuple[int, tuple[int, ...]], list[int]],
    ) -> dict[int, set[int]]:
        """Finds candidate training documents colliding in at least one band with test docs."""
        candidates: dict[int, set[int]] = collections.defaultdict(set)
        for test_idx, sig in enumerate(test_sigs):
            for band_idx in range(self._NUM_BANDS):
                start = band_idx * self._ROWS_PER_BAND
                band_slice = tuple(sig[start : start + self._ROWS_PER_BAND])
                if (band_idx, band_slice) in buckets:
                    candidates[test_idx].update(buckets[(band_idx, band_slice)])
        return candidates

    def _format_match(
        self, train_idx: int, test_idx: int, sim: float, is_contam: bool
    ) -> dict[str, Any]:
        """Formats contamination match dictionary."""
        return {
            self._KEY_TRAIN_IDX: train_idx,
            self._KEY_TEST_IDX: test_idx,
            self._KEY_EST_JACCARD: float(sim),
            self._KEY_IS_CONTAMINATED: is_contam,
        }


MinHashAuditor = MinhashAuditor

