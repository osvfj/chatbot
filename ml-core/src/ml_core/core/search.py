"""Búsqueda en el espacio de estados de la conversación.

El chatbot representa los posibles caminos de un diálogo como un grafo de
intenciones. Dado el texto del usuario, busca el nodo meta (intención) usando:

- BFS: búsqueda ciega por amplitud (camino más corto en pasos).
- DFS: búsqueda ciega por profundidad.
- A*: búsqueda heurística que combina costo acumulado (g) con una heurística
  (h) basada en la similitud de tokens entre la consulta y el nodo.
"""

from __future__ import annotations

import heapq
import json
from pathlib import Path
from typing import Literal

from .nlp import normalize, token_overlap, tokenize

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

Algorithm = Literal["bfs", "dfs", "astar"]


class KnowledgeGraph:
    def __init__(self, path: Path = DATA_DIR / "knowledge.json") -> None:
        raw = json.loads(path.read_text(encoding="utf-8"))
        self.start = raw["start"]
        self.nodes: dict[str, dict] = raw["nodes"]
        self.keyword_sets: dict[str, set[str]] = {
            node_id: {t for kw in node["keywords"] for t in tokenize(kw)}
            for node_id, node in self.nodes.items()
        }
        self.neighbors: dict[str, list[tuple[str, float]]] = {node_id: [] for node_id in self.nodes}
        for edge in raw["edges"]:
            self.neighbors[edge["from"]].append((edge["to"], float(edge["weight"])))

    def _query_tokens(self, query: str) -> set[str]:
        return set(tokenize(normalize(query)))

    def _goal(self, node_id: str, query_tokens: set[str]) -> bool:
        return bool(self.keyword_sets.get(node_id) & query_tokens)

    def _heuristic(self, node_id: str, query_tokens: set[str]) -> float:
        # h = 1 - similitud de tokens: nodos con más coincidencia quedan más cerca.
        return 1.0 - token_overlap(self.keyword_sets.get(node_id, set()), query_tokens)

    def bfs(self, query: str) -> dict:
        query_tokens = self._query_tokens(query)
        visited = {self.start}
        queue: list[list[str]] = [[self.start]]
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

    def dfs(self, query: str) -> dict:
        query_tokens = self._query_tokens(query)
        visited: set[str] = set()

        def visit(path: list[str]) -> dict | None:
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

    def astar(self, query: str) -> dict:
        query_tokens = self._query_tokens(query)
        # frontera: (f, g, nodo, camino)
        frontier: list[tuple[float, float, str, list[str]]] = [
            (self._heuristic(self.start, query_tokens), 0.0, self.start, [self.start])
        ]
        heapq.heapify(frontier)
        best_g: dict[str, float] = {self.start: 0.0}

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

    def search(self, query: str, algorithm: Algorithm = "astar") -> dict:
        result = (
            self.bfs(query) if algorithm == "bfs"
            else self.dfs(query) if algorithm == "dfs"
            else self.astar(query)
        )
        path = result["path"]
        if not path:
            return {"found": False, "algorithm": algorithm, "response": None, "path": [], "cost": result["cost"]}
        goal = path[-1]
        return {
            "found": True,
            "algorithm": algorithm,
            "response": self.nodes[goal]["response"],
            "node": goal,
            "path": path,
            "cost": result["cost"],
        }
