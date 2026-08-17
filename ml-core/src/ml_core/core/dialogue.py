import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "dialogue_questions.json"
CATALOG = json.loads(DATA_PATH.read_text(encoding="utf-8"))
ALIASES = {
    "leaf-rust": "RUST",
    "red-spider-mite": "RED_SPIDER_MITE",
    "healthy": "HEALTHY",
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


def update(hypotheses, answer_id, free_text="", question_id="visual_symptom_confirmation"):
    options = CATALOG[question_id]
    selected = next((o for o in options if o["id"] == answer_id), None)
    scores = {ALIASES.get(key, key): float(value) for key, value in hypotheses.items()}
    if selected is not None:
        for key, value in selected["evidence"].items():
            scores[key] = scores.get(key, 0.0) + float(value)
    if free_text.strip():
        text = free_text.casefold()
        if "naranja" in text or "amarillo" in text or "oxido" in text:
            scores["RUST"] = scores.get("RUST", 0.0) + 0.8
        if "telara" in text or "punto" in text or "acar" in text:
            scores["RED_SPIDER_MITE"] = scores.get("RED_SPIDER_MITE", 0.0) + 0.8
    minimum = min(scores.values(), default=0.0)
    weights = {key: max(value - minimum + 0.1, 0.1) for key, value in scores.items()}
    total = sum(weights.values())
    probabilities = {key: round(value / total, 4) for key, value in weights.items()}
    top = max(probabilities, key=probabilities.get)
    return probabilities, top, probabilities[top]


def discrepancy(first, current):
    keys = set(first) | set(current)
    return round(sum(abs(float(first.get(key, 0.0)) - float(current.get(key, 0.0))) for key in keys) / 2, 4)
