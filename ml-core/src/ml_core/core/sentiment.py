"""Análisis de sentimiento basado en léxico (español dominicano).

El sistema evalúa el tono del mensaje y lo clasifica como positivo, negativo o
neutro, permitiendo al chatbot adaptar el tono de su respuesta.
"""

from __future__ import annotations

from .nlp import normalize, tokenize

POSITIVE = frozenset(
    {
        "gracias", "bueno", "bien", "excelente", "perfecto", "genial", "buena",
        "mejor", "mejoro", "mejora", "sano", "sana", "resuelto", "resolvio",
        "feliz", "contento", "contenta", "exito", "facil", "claro", "rapido",
        "funciona", "solucion", "ayuda", "ayudo", "apoyo", "positivo", "sirve",
    }
)

NEGATIVE = frozenset(
    {
        "enfermo", "enferma", "enfermedad", "roya", "broca", "plaga", "muerto",
        "muerta", "seco", "seca", "perdida", "perdi", "perder", "mal", "mala",
        "peor", "triste", "preocupado", "preocupada", "grave", "danado",
        "dolor", "problema", "urge", "urgente", "emergencia", "no", "nunca",
        "jamás", "nada", "tengo miedo", "fracaso", "perdida", "quemo", "marchito",
    }
)

NEGATIONS = frozenset({"no", "nunca", "jamás", "tampoco", "sin"})

INTENSIFIERS = frozenset({"muy", "bastante", "mucho", "super", "bien", "bien de"})


def analyze(text: str) -> dict:
    """Clasifica el sentimiento del texto.

    Devuelve `{"label": "positivo"|"negativo"|"neutro", "score": float,
    "confidence": float}`.
    """
    normalized = normalize(text)
    tokens = tokenize(normalized, remove_stopwords=False)
    score = 0.0
    negated = False

    for i, token in enumerate(tokens):
        if token in NEGATIONS:
            negated = True
            continue
        intensity = 2.0 if (i > 0 and tokens[i - 1] in INTENSIFIERS) else 1.0
        if token in POSITIVE:
            score += intensity if not negated else -intensity
            negated = False
        elif token in NEGATIVE:
            score -= intensity if not negated else -intensity
            negated = False

    label = "neutro"
    if score > 0.3:
        label = "positivo"
    elif score < -0.3:
        label = "negativo"

    confidence = min(1.0, abs(score))
    return {"label": label, "score": round(score, 4), "confidence": round(confidence, 4)}
