"""Q-learning tabular sobre la selección de fuente conversacional.

El agente observa un estado por turno (intención, banda de confianza,
conocimiento recuperado y sentimiento) y elige una acción
(knowledge_guided, classification_guided o llm_guided). La recompensa llega
con la calificación del usuario (/rate) o al finalizar el flujo de
diagnóstico; entonces se aplica la actualización

    Q(s_t, a_t) <- Q(s_t, a_t) + alpha * (r + gamma * max_a Q(s_{t+1}, a) - Q(s_t, a_t))

hacia atrás por los turnos pendientes del episodio: el par calificado recibe
la recompensa como paso terminal y cada turno anterior usa como s' el estado
del turno siguiente ya observado.
"""

import datetime as dt
import json
import random
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
Q_TABLE_PATH = DATA_DIR / "q_table.json"
FEEDBACK_PATH = DATA_DIR / "feedback.jsonl"

SOURCES = ["knowledge_guided", "classification_guided", "llm_guided"]

ALPHA = 0.5
GAMMA = 0.9
EPSILON = 0.2

SOCIAL_INTENTS = ("saludo", "despedida", "agradecimiento")

# Política inicial por estado: valores previos a cualquier calificación que
# orientan el arranque frío hacia la fuente razonable (conocimiento si hay
# documento recuperado, explicación o flujo estándar si no); las recompensas
# los corrigen con el uso.
DEFAULT_POLICY = {
    "diagnostico:con_knowledge": {"knowledge_guided": 0.5},
    "diagnostico:sin_knowledge": {"llm_guided": 0.3},
    "consulta:con_knowledge": {"knowledge_guided": 0.5},
    "consulta:sin_knowledge": {"classification_guided": 0.3},
}


def conversation_state(prediccion, knowledge_result=None, deteccion=None):
    """Estado reducido del agente: fase conversacional × conocimiento disponible.

    Un espacio pequeño (6 estados) hace que pocas calificaciones basten para
    mover la política; la intención fina y el sentimiento ya condicionan otras
    partes del orquestador.
    """
    found = bool(knowledge_result and knowledge_result.get("found"))
    ensemble = str(prediccion["ensemble"])
    if ensemble in SOCIAL_INTENTS:
        fase = "social"
    elif deteccion is not None or ensemble == "analizar_foto":
        fase = "diagnostico"
    else:
        fase = "consulta"
    return f"{fase}:{'con_knowledge' if found else 'sin_knowledge'}"


def _load_q():
    if Q_TABLE_PATH.exists():
        try:
            return json.loads(Q_TABLE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {}


def _save_q(q):
    Q_TABLE_PATH.write_text(
        json.dumps(q, ensure_ascii=False, indent=2), encoding="utf-8"
    )


class QLearner:
    def __init__(self):
        self.q = _load_q()
        self._episodes = {}

    def _actions(self, state):
        priors = DEFAULT_POLICY.get(state, {})
        actions = self.q.setdefault(
            state, {source: priors.get(source, 0.0) for source in SOURCES}
        )
        for source in SOURCES:
            actions.setdefault(source, priors.get(source, 0.0))
        return actions

    def choose(self, state):
        """ε-greedy con desempate aleatorio entre acciones empatadas."""
        actions = self._actions(state)
        if random.random() < EPSILON:
            return random.choice(SOURCES)
        best = max(actions.values())
        tied = [action for action, value in actions.items() if value == best]
        return random.choice(tied)

    def update(self, state, action, reward, next_state=None):
        """Paso de Q-learning; sin next_state el paso es terminal (s' inexistente)."""
        target = reward
        if next_state is not None:
            target += GAMMA * max(self._actions(next_state).values())
        actions = self._actions(state)
        actions[action] += ALPHA * (target - actions.get(action, 0.0))
        _save_q(self.q)

    def track(self, chat_id, state, action):
        """Registra el par (estado, acción) del turno dentro de su episodio."""
        self._episodes.setdefault(chat_id, []).append((state, action))

    def reward(self, chat_id, amount, offset=-1):
        """Señal implícita sobre un par reciente sin cerrar el episodio.

        offset=-1 apunta al último turno registrado (el anterior al que se
        está procesando ahora).
        """
        pairs = self._episodes.get(chat_id) or []
        index = len(pairs) + offset
        if 0 <= index < len(pairs):
            state_t, action_t = pairs[index]
            self.update(state_t, action_t, amount)

    def finish(self, chat_id, reward=1.0):
        """Recompensa terminal por finalización del flujo de diagnóstico."""
        self._apply(chat_id, None, None, reward)

    def rate(self, state, action, reward):
        """Calificación explícita; localiza el episodio por su par más reciente."""
        for chat_id in reversed(list(self._episodes)):
            pairs = self._episodes.get(chat_id) or []
            if any(pair == (state, action) for pair in pairs):
                self._apply(chat_id, state, action, reward)
                return True
        self.update(state, action, reward)
        return False

    def forget(self, chat_id):
        self._episodes.pop(chat_id, None)

    def _apply(self, chat_id, state, action, reward):
        pairs = self._episodes.pop(chat_id, [])
        index = len(pairs) - 1
        if state is not None:
            for candidate in range(len(pairs) - 1, -1, -1):
                if pairs[candidate] == (state, action):
                    index = candidate
                    break
        if index < 0:
            return
        terminal_state, terminal_action = pairs[index]
        self.update(terminal_state, terminal_action, reward)
        # Los turnos anteriores reciben crédito descontado: r=0 y s'=estado siguiente.
        for previous in range(index - 1, -1, -1):
            state_t, action_t = pairs[previous]
            self.update(state_t, action_t, 0.0, next_state=pairs[previous + 1][0])
        remaining = pairs[index + 1 :]
        if remaining:
            self._episodes[chat_id] = remaining

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
