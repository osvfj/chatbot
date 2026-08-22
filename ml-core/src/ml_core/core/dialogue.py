"""Preguntas de confirmación visual e inferencia bayesiana del diagnóstico.

La actualización de hipótesis sigue la recursión de Bayes ingenuo: las
respuestas del usuario son evidencia condicionalmente independiente dado
el estado de la hoja, y los pesos de cada opción en
``dialogue_questions.json`` se interpretan como log-verosimilitudes
``log P(respuesta | hipótesis)`` (cualquier constante por opción se
cancela al normalizar):

    P(h | E1..Ek) ∝ P(h) × Π exp(w_i[h])

Acumular en espacio logarítmico hace la actualización intercambiable:
el orden de las respuestas no altera el posterior, y el efecto de cada
evidencia es un factor multiplicativo constante con independencia del prior.
"""

import json
import math
import re
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "dialogue_questions.json"
CATALOG = json.loads(DATA_PATH.read_text(encoding="utf-8"))
ALIASES = {
    "leaf-rust": "RUST",
    "red-spider-mite": "RED_SPIDER_MITE",
    "healthy": "HEALTHY",
}
HYPOTHESES = ("RUST", "RED_SPIDER_MITE", "HEALTHY")
MIN_PRIOR = 1e-6

# Evidencia del texto libre: prefijos comparados al inicio de palabra sobre
# el texto sin tildes ni eñes; así "óxido" coincide con "oxid" y "Telarañas"
# con "telara", mientras que "apunta" no dispara el prefijo "punt". Cada
# hipótesis recibe una sola vez su log-verosimilitud por turno: el nivel
# strong corresponde a signos específicos de la plaga y el weak a
# observaciones genéricas compatibles con varias hipótesis.
FREE_TEXT_LLR = {"strong": 1.5, "weak": 0.6}

_FREE_TEXT_EVIDENCE = {
    "RUST": {
        "strong": (
            "roya",
            "pustul",
            "herrumb",
            "oxid",
            "polv",
            "espor",
            "naranja",
            "anaranj",
        ),
        "weak": ("amarill", "cloros", "manch", "defoli", "cae"),
    },
    "RED_SPIDER_MITE": {
        "strong": ("telara", "aran", "acar", "puntea"),
        "weak": ("punto", "punti", "manch"),
    },
}
_ACENTOS = str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunaeiouun")
_FREE_TEXT_PATTERNS = {
    hypothesis: {
        level: tuple(re.compile(r"\b" + stem) for stem in stems)
        for level, stems in levels.items()
    }
    for hypothesis, levels in _FREE_TEXT_EVIDENCE.items()
}


QUESTION_TEXT = {
    "visual_symptom_confirmation": "¿Qué observas principalmente en las hojas o en la planta?",
    "rust_confirmation": "Para verificar la posibilidad de roya, ¿dónde están principalmente las manchas?",
    "mite_confirmation": "Para verificar la posibilidad de arañita roja, ¿observas telarañas o punteado fino?",
    "healthy_confirmation": "Para confirmar que la hoja está sana, ¿conserva un color verde uniforme y no presenta daños visibles?",
    "severity_followup": "¿El problema se está extendiendo por más hojas o ramas?",
    "photo_followup": "La descripción y la primera imagen no coinciden. Para verificarlo, toma otra foto del envés de una hoja afectada con buena iluminación.",
}


def question(question_id="visual_symptom_confirmation", number=1):
    options = CATALOG[question_id]
    return {
        "id": question_id,
        "text": QUESTION_TEXT[question_id],
        "options": [{"id": o["id"], "label": o["label"]} for o in options],
        "allow_free_text": True,
        "question_number": number,
        "max_questions": 3,
    }


def choose_question(evidence, number, answer_id="", hypotheses=None):
    if number >= 3:
        return "severity_followup"
    if hypotheses:
        top = max(hypotheses, key=hypotheses.get)
        if top == "HEALTHY":
            return "healthy_confirmation"
        if top == "RUST":
            return "rust_confirmation"
        if top == "RED_SPIDER_MITE":
            return "mite_confirmation"
    if answer_id == "orange_powder":
        return "rust_confirmation"
    if answer_id == "webbing":
        return "mite_confirmation"
    symptoms = set(evidence.get("symptoms", []))
    colors = set(evidence.get("colors", []))
    if "telarañas" in symptoms or "puntos" in symptoms:
        return "mite_confirmation"
    if "polvo" in symptoms or "naranja" in colors or "amarillo" in colors:
        return "rust_confirmation"
    return "severity_followup"


def _log_priors(hypotheses):
    """Distribución inicial sobre todas las hipótesis, en espacio logarítmico.

    Las claves ausentes (p. ej. el detector solo reportó una clase) reciben
    una parte uniforme de la masa restante, para que ninguna hipótesis
    desaparezca del posterior.
    """
    normalized = {
        ALIASES.get(key, key): min(max(float(value), 0.0), 1.0)
        for key, value in hypotheses.items()
    }
    shares = {hypothesis: normalized.get(hypothesis, 0.0) for hypothesis in HYPOTHESES}
    missing = [hypothesis for hypothesis in HYPOTHESES if hypothesis not in normalized]
    remainder = max(1.0 - sum(shares.values()), 0.0)
    if missing and remainder > 0.0:
        share = remainder / len(missing)
        for hypothesis in missing:
            shares[hypothesis] += share
    total = sum(shares.values())
    if total <= 0.0:
        shares = {hypothesis: 1.0 / len(HYPOTHESES) for hypothesis in HYPOTHESES}
        total = 1.0
    return {
        hypothesis: math.log(max(shares[hypothesis] / total, MIN_PRIOR))
        for hypothesis in HYPOTHESES
    }


def _softmax(log_scores):
    # Sin redondeo: el posterior se persiste con precisión completa para que
    # la recursión del turno siguiente no pierda la evidencia acumulada.
    peak = max(log_scores.values())
    weights = {key: math.exp(value - peak) for key, value in log_scores.items()}
    total = sum(weights.values())
    return {key: value / total for key, value in weights.items()}


def update(
    hypotheses, answer_id, free_text="", question_id="visual_symptom_confirmation"
):
    """Aplica la recursión bayesiana y devuelve el posterior normalizado.

    ``hypotheses`` son probabilidades del turno anterior (o confianzas del
    detector); internamente se convierten a log-prior, se suma la
    log-verosimilitud de la respuesta y del texto libre, y se normaliza
    con softmax.
    """
    log_scores = _log_priors(hypotheses)
    options = CATALOG[question_id]
    selected = next((o for o in options if o["id"] == answer_id), None)
    if selected is not None:
        for key, weight in selected["evidence"].items():
            hypothesis = ALIASES.get(key, key)
            log_scores[hypothesis] += float(weight)
    if free_text.strip():
        text = free_text.casefold().translate(_ACENTOS)
        for hypothesis, levels in _FREE_TEXT_PATTERNS.items():
            for level, patterns in levels.items():
                if any(pattern.search(text) for pattern in patterns):
                    log_scores[hypothesis] += FREE_TEXT_LLR[level]
    probabilities = _softmax(log_scores)
    top = max(probabilities, key=probabilities.get)
    return probabilities, top, probabilities[top]


def discrepancy(first, current):
    first_scores = {ALIASES.get(key, key): float(value) for key, value in first.items()}
    keys = set(first_scores) | set(current)
    distance = sum(
        abs(first_scores.get(key, 0.0) - float(current.get(key, 0.0))) for key in keys
    )
    return round(distance / 2, 4)
