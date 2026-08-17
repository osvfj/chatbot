import datetime as dt
import json
import random
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
Q_TABLE_PATH = DATA_DIR / "q_table.json"
FEEDBACK_PATH = DATA_DIR / "feedback.jsonl"

SOURCES = ["knowledge_guided", "classification_guided", "llm_guided"]

ALPHA = 0.1
GAMMA = 0.9
EPSILON = 0.2


def _load_q():
    if Q_TABLE_PATH.exists():
        try:
            return json.loads(Q_TABLE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {}


def _save_q(q):
    Q_TABLE_PATH.write_text(json.dumps(q, ensure_ascii=False, indent=2), encoding="utf-8")


class QLearner:
    def __init__(self):
        self.q = _load_q()

    def choose(self, state):
        actions = self.q.setdefault(state, {})
        for source in SOURCES:
            actions.setdefault(source, 0.0)
        if random.random() < EPSILON:
            return random.choice(SOURCES)
        return max(actions, key=actions.get)

    def update(self, state, action, reward):
        actions = self.q.setdefault(state, {source: 0.0 for source in SOURCES})
        q_old = actions.get(action, 0.0)
        actions[action] = q_old + ALPHA * (reward - q_old)
        _save_q(self.q)

    def record(self, state, action, reward):
        FEEDBACK_PATH.parent.mkdir(parents=True, exist_ok=True)
        entry = {
            "ts": dt.datetime.now(dt.timezone.utc).isoformat(),
            "state": state,
            "action": action,
            "reward": reward,
        }
        with FEEDBACK_PATH.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=False) + "\n")
