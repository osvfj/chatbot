"""Aprendizaje por refuerzo: Q-learning para selección de fuente de respuesta.

El estado es la intención del usuario y las acciones son las fuentes de
respuesta posibles: base de conocimiento (kb), árbol de decisión (tree) o LLM
(llm). Cada vez que el usuario califica una respuesta, se actualiza la tabla Q
según la regla Q(s,a) <- Q(s,a) + alpha * (recompensa + gamma * max_a' Q(s',a')
- Q(s,a)). Con el tiempo, el agente aprende qué fuente maximiza la satisfacción.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
Q_TABLE_PATH = DATA_DIR / "q_table.json"
FEEDBACK_PATH = DATA_DIR / "feedback.jsonl"

SOURCES = ["kb", "tree", "llm"]

ALPHA = 0.1
GAMMA = 0.9
EPSILON = 0.2


def _load_q() -> dict[str, dict[str, float]]:
    if Q_TABLE_PATH.exists():
        try:
            return json.loads(Q_TABLE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {}


def _save_q(q: dict[str, dict[str, float]]) -> None:
    Q_TABLE_PATH.write_text(json.dumps(q, ensure_ascii=False, indent=2), encoding="utf-8")


class QLearner:
    def __init__(self) -> None:
        self.q: dict[str, dict[str, float]] = _load_q()

    def choose(self, state: str) -> str:
        actions = self.q.setdefault(state, {source: 0.0 for source in SOURCES})
        if random.random() < EPSILON:
            return random.choice(SOURCES)
        return max(actions, key=actions.get)

    def update(self, state: str, action: str, reward: float) -> None:
        actions = self.q.setdefault(state, {source: 0.0 for source in SOURCES})
        q_old = actions.get(action, 0.0)
        actions[action] = q_old + ALPHA * (reward - q_old)
        _save_q(self.q)

    def record(self, state: str, action: str, reward: float) -> None:
        import datetime as dt

        FEEDBACK_PATH.parent.mkdir(parents=True, exist_ok=True)
        entry = {
            "ts": dt.datetime.now(dt.timezone.utc).isoformat(),
            "state": state,
            "action": action,
            "reward": reward,
        }
        with FEEDBACK_PATH.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=False) + "\n")
