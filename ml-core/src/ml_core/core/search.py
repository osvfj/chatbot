import json
from pathlib import Path

import networkx as nx

from .nlp import normalize, tokenize

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class KnowledgeGraph:
    def __init__(self, path=DATA_DIR / "knowledge.json"):
        raw = json.loads(path.read_text(encoding="utf-8"))
        self.start = raw["start"]
        self.nodes = raw["nodes"]
        self.documents = {
            node_id: (DATA_DIR / "knowledge" / node["document"]).read_text(encoding="utf-8")
            for node_id, node in self.nodes.items()
            if node.get("document")
        }
        self.keyword_sets = {
            node_id: {t for kw in node["keywords"] for t in tokenize(kw)}
            for node_id, node in self.nodes.items()
        }
        self.graph = nx.DiGraph()
        self.graph.add_nodes_from(self.nodes)
        for edge in raw["edges"]:
            self.graph.add_edge(edge["from"], edge["to"], weight=float(edge["weight"]))

    def _query_tokens(self, query):
        return set(tokenize(normalize(query)))

    def _goal_nodes(self, query_tokens):
        return [n for n in self.nodes if self.keyword_sets[n] & query_tokens]

    def _heuristic(self, node, query_tokens):
        keywords = self.keyword_sets[node]
        if not keywords and not query_tokens:
            return 1.0
        return 1.0 - len(keywords & query_tokens) / max(1.0, len(keywords | query_tokens))

    def bfs(self, query):
        query_tokens = self._query_tokens(query)
        goals = self._goal_nodes(query_tokens)
        for node in nx.bfs_tree(self.graph, self.start):
            if node in goals:
                path = nx.shortest_path(self.graph, self.start, node)
                return {"path": path, "cost": len(path) - 1}
        return {"path": [], "cost": None}

    def dfs(self, query):
        query_tokens = self._query_tokens(query)
        goals = self._goal_nodes(query_tokens)
        tree = nx.dfs_tree(self.graph, self.start)
        for node in nx.dfs_preorder_nodes(self.graph, self.start):
            if node in goals:
                path = nx.shortest_path(tree, self.start, node)
                return {"path": path, "cost": len(path) - 1}
        return {"path": [], "cost": None}

    def astar(self, query):
        query_tokens = self._query_tokens(query)
        goals = self._goal_nodes(query_tokens)
        if not goals:
            return {"path": [], "cost": None}
        goal = min(goals, key=lambda n: self._heuristic(n, query_tokens))
        path = nx.astar_path(
            self.graph,
            self.start,
            goal,
            heuristic=lambda n, _target: self._heuristic(n, query_tokens),
        )
        cost = sum(self.graph[u][v]["weight"] for u, v in zip(path, path[1:]))
        return {"path": path, "cost": round(cost, 4)}

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
            "response": self.documents.get(goal, self.nodes[goal]["response"]),
            "node": goal,
            "path": path,
            "cost": result["cost"],
        }
