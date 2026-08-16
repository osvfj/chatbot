import heapq
import json
from pathlib import Path

from .nlp import normalize, token_overlap, tokenize

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class KnowledgeGraph:
    def __init__(self, path=DATA_DIR / "knowledge.json"):
        raw = json.loads(path.read_text(encoding="utf-8"))
        self.start = raw["start"]
        self.nodes = raw["nodes"]
        self.keyword_sets = {
            node_id: {t for kw in node["keywords"] for t in tokenize(kw)}
            for node_id, node in self.nodes.items()
        }
        self.neighbors = {node_id: [] for node_id in self.nodes}
        for edge in raw["edges"]:
            self.neighbors[edge["from"]].append((edge["to"], float(edge["weight"])))

    def _query_tokens(self, query):
        return set(tokenize(normalize(query)))

    def _goal(self, node_id, query_tokens):
        return bool(self.keyword_sets.get(node_id) & query_tokens)

    def _heuristic(self, node_id, query_tokens):
        return 1.0 - token_overlap(self.keyword_sets.get(node_id, set()), query_tokens)

    def bfs(self, query):
        query_tokens = self._query_tokens(query)
        visited = {self.start}
        queue = [[self.start]]
        while queue:
            path = queue.pop(0)
            node = path[-1]
            if self._goal(node, query_tokens):
                return {"path": path, "cost": len(path) - 1}
            for nxt, _weight in self.neighbors.get(node, []):
                if nxt not in visited:
                    visited.add(nxt)
                    queue.append(path + [nxt])
        return {"path": [], "cost": float("inf")}

    def dfs(self, query):
        query_tokens = self._query_tokens(query)
        visited = set()

        def visit(path):
            node = path[-1]
            if node in visited:
                return None
            visited.add(node)
            if self._goal(node, query_tokens):
                return {"path": path, "cost": len(path) - 1}
            for nxt, _weight in self.neighbors.get(node, []):
                found = visit(path + [nxt])
                if found is not None:
                    return found
            return None

        result = visit([self.start])
        return result if result is not None else {"path": [], "cost": float("inf")}

    def astar(self, query):
        query_tokens = self._query_tokens(query)
        frontier = [(self._heuristic(self.start, query_tokens), 0.0, self.start, [self.start])]
        heapq.heapify(frontier)
        best_g = {self.start: 0.0}

        while frontier:
            _f, g, node, path = heapq.heappop(frontier)
            if self._goal(node, query_tokens):
                return {"path": path, "cost": round(g, 4)}
            if g > best_g.get(node, float("inf")):
                continue
            for nxt, weight in self.neighbors.get(node, []):
                g2 = g + weight
                if g2 < best_g.get(nxt, float("inf")):
                    best_g[nxt] = g2
                    h = self._heuristic(nxt, query_tokens)
                    heapq.heappush(frontier, (g2 + h, g2, nxt, path + [nxt]))
        return {"path": [], "cost": float("inf")}

    def search(self, query, algorithm="astar"):
        if algorithm == "bfs":
            result = self.bfs(query)
        elif algorithm == "dfs":
            result = self.dfs(query)
        else:
            result = self.astar(query)
        path = result["path"]
        if not path:
            return {"found": False, "algorithm": algorithm, "response": None, "path": [], "cost": None}
        goal = path[-1]
        return {
            "found": True,
            "algorithm": algorithm,
            "response": self.nodes[goal]["response"],
            "node": goal,
            "path": path,
            "cost": result["cost"],
        }
