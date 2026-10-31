from __future__ import annotations

import collections
from typing import Any


class CausalInference:
    """Causal inference engine for DAG d-separation and backdoor criterion validation."""

    _KEY_VALID: str = "valid"
    _KEY_DESCENDANT_VIOLATION: str = "is_descendant_violation"
    _KEY_UNBLOCKED_PATHS: str = "unblocked_paths"
    _KEY_COLLIDERS_OPENED: str = "colliders_opened"
    _KEY_EXPLANATION: str = "explanation"
    _ZERO_FLOAT: float = 0.0

    def __init__(self) -> None:
        """Initialize causal inference engine."""
        pass

    def validate_backdoor_criterion(
        self,
        dag_edges: list[tuple[str, str]],
        treatment: str,
        outcome: str,
        conditioning_set: list[str],
    ) -> dict[str, Any]:
        """Validates whether conditioning_set satisfies Pearl's backdoor criterion."""
        adj_forward, _ = self._build_adjacency_maps(dag_edges)
        descendants = self._find_descendants(treatment, adj_forward)
        cond_set = set(conditioning_set)

        descendant_violations = cond_set.intersection(descendants)
        if descendant_violations:
            violators = list(descendant_violations)
            msg = f"Violation: conditioning set contains treatment descendant: {violators}"
            return self._build_validation_result(False, True, [], [], msg)

        return self._evaluate_backdoor_paths(dag_edges, treatment, outcome, cond_set, adj_forward)

    def compute_stratified_ate(
        self,
        data: list[dict[str, Any]],
        treatment: str,
        outcome: str,
        confounder: str,
    ) -> dict[str, float]:
        """Calculates Average Treatment Effect weighted across confounder strata."""
        if not data:
            return {"ate": self._ZERO_FLOAT, "unadjusted_effect": self._ZERO_FLOAT}
        strata = self._group_data_by_stratum(data, confounder)
        total_count = float(len(data))
        weighted_ate = self._ZERO_FLOAT

        for group in strata.values():
            weight = float(len(group)) / total_count
            stratum_diff = self._calculate_stratum_difference(group, treatment, outcome)
            weighted_ate += weight * stratum_diff

        raw_diff = self._calculate_stratum_difference(data, treatment, outcome)
        return {"ate": float(weighted_ate), "unadjusted_effect": float(raw_diff)}

    def _evaluate_backdoor_paths(
        self,
        dag_edges: list[tuple[str, str]],
        treatment: str,
        outcome: str,
        cond_set: set[str],
        adj_forward: dict[str, list[str]],
    ) -> dict[str, Any]:
        """Finds and evaluates blocking on all backdoor paths."""
        paths = self._find_backdoor_paths(dag_edges, treatment, outcome)
        unblocked, opened = self._evaluate_paths_blocking(paths, dag_edges, cond_set, adj_forward)
        is_valid = len(unblocked) == 0
        count = len(unblocked)
        exp = "Backdoor criterion satisfied." if is_valid else f"Found {count} unblocked path(s)."
        return self._build_validation_result(is_valid, False, unblocked, opened, exp)

    def _build_adjacency_maps(
        self, edges: list[tuple[str, str]]
    ) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
        """Builds forward and backward directed adjacency maps."""
        forward: dict[str, list[str]] = collections.defaultdict(list)
        reverse: dict[str, list[str]] = collections.defaultdict(list)
        for u, v in edges:
            forward[u].append(v)
            reverse[v].append(u)
        return forward, reverse

    def _find_descendants(self, root: str, forward: dict[str, list[str]]) -> set[str]:
        """Finds all directed descendants of a given root node."""
        descendants: set[str] = set()
        queue = collections.deque(forward.get(root, []))
        while queue:
            curr = queue.popleft()
            if curr not in descendants:
                descendants.add(curr)
                queue.extend(forward.get(curr, []))
        return descendants

    def _find_backdoor_paths(
        self, edges: list[tuple[str, str]], treatment: str, outcome: str
    ) -> list[list[str]]:
        """Finds all simple paths between treatment and outcome with an edge entering treatment."""
        undirected: dict[str, set[str]] = collections.defaultdict(set)
        for u, v in edges:
            undirected[u].add(v)
            undirected[v].add(u)

        raw_paths = self._find_simple_paths(treatment, outcome, undirected)
        parents_of_treatment = {u for u, v in edges if v == treatment}
        return [p for p in raw_paths if len(p) >= 2 and p[1] in parents_of_treatment]

    def _find_simple_paths(
        self, start: str, target: str, graph: dict[str, set[str]]
    ) -> list[list[str]]:
        """Finds all acyclic undirected paths from start to target."""
        paths: list[list[str]] = []
        stack: list[tuple[str, list[str]]] = [(start, [start])]
        while stack:
            curr, path = stack.pop()
            if curr == target:
                paths.append(path)
                continue
            for neighbor in graph.get(curr, set()):
                if neighbor not in path:
                    stack.append((neighbor, path + [neighbor]))
        return paths

    def _evaluate_paths_blocking(
        self,
        paths: list[list[str]],
        edges: list[tuple[str, str]],
        conditioning_set: set[str],
        adj_forward: dict[str, list[str]],
    ) -> tuple[list[list[str]], list[str]]:
        """Evaluates d-separation blocking across all paths."""
        directed_edge_set = set(edges)
        unblocked: list[list[str]] = []
        colliders_opened: set[str] = set()

        for path in paths:
            is_blocked, opened = self._is_path_blocked(
                path, directed_edge_set, conditioning_set, adj_forward
            )
            if not is_blocked:
                unblocked.append(path)
            colliders_opened.update(opened)

        return unblocked, list(colliders_opened)

    def _is_path_blocked(
        self,
        path: list[str],
        edges: set[tuple[str, str]],
        cond_set: set[str],
        adj_forward: dict[str, list[str]],
    ) -> tuple[bool, list[str]]:
        """Determines if a single undirected path is d-separated given conditioning set."""
        opened_colliders: list[str] = []
        for i in range(1, len(path) - 1):
            prev_node, curr_node, next_node = path[i - 1], path[i], path[i + 1]
            is_collider = (prev_node, curr_node) in edges and (next_node, curr_node) in edges

            if is_collider:
                curr_descendants = self._find_descendants(curr_node, adj_forward) | {curr_node}
                if not (curr_descendants & cond_set):
                    return True, opened_colliders
                opened_colliders.append(curr_node)
            else:
                if curr_node in cond_set:
                    return True, opened_colliders

        return False, opened_colliders

    def _group_data_by_stratum(
        self, data: list[dict[str, Any]], confounder: str
    ) -> dict[Any, list[dict[str, Any]]]:
        """Groups data rows by unique confounder stratum values."""
        groups: dict[Any, list[dict[str, Any]]] = collections.defaultdict(list)
        for row in data:
            groups[row.get(confounder)].append(row)
        return groups

    def _calculate_stratum_difference(
        self, rows: list[dict[str, Any]], treatment: str, outcome: str
    ) -> float:
        """Calculates difference in means between treatment and control in a single group."""
        treated = [float(r[outcome]) for r in rows if r.get(treatment) == 1]
        control = [float(r[outcome]) for r in rows if r.get(treatment) == 0]
        if not treated or not control:
            return self._ZERO_FLOAT
        return float(sum(treated) / len(treated)) - float(sum(control) / len(control))

    def _build_validation_result(
        self,
        valid: bool,
        descendant_violation: bool,
        unblocked: list[list[str]],
        colliders_opened: list[str],
        explanation: str,
    ) -> dict[str, Any]:
        """Constructs standardized backdoor criterion result dictionary."""
        return {
            self._KEY_VALID: valid,
            self._KEY_DESCENDANT_VIOLATION: descendant_violation,
            self._KEY_UNBLOCKED_PATHS: unblocked,
            self._KEY_COLLIDERS_OPENED: colliders_opened,
            self._KEY_EXPLANATION: explanation,
        }


CausalInferenceEngine = CausalInference
