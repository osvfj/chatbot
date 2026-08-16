import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "dialogue_questions.json"
CATALOG = json.loads(DATA_PATH.read_text(encoding="utf-8"))
ALIASES = {
    "leaf-rust": "RUST",
    "red-spider-mite": "RED_SPIDER_MITE",
    "healthy": "HEALTHY",
}


def question(question_id="visual_symptom_confirmation", number=1):
    options = CATALOG[question_id]
    return {
        "id": question_id,
        "text": "¿Qué observas principalmente en las hojas o en la planta?",
        "options": [{"id": o["id"], "label": o["label"]} for o in options],
        "allow_free_text": True,
        "question_number": number,
        "max_questions": 3,
    }


def update(hypotheses, answer_id, free_text=""):
    options = CATALOG["visual_symptom_confirmation"]
    selected = next((o for o in options if o["id"] == answer_id), None)
    scores = {ALIASES.get(key, key): float(value) for key, value in hypotheses.items()}
    if selected is not None:
        for key, value in selected["evidence"].items():
            scores[key] = scores.get(key, 0.0) + float(value)
    if free_text.strip():
        text = free_text.casefold()
        if "naranja" in text or "amarillo" in text or "óxido" in text:
            scores["RUST"] = scores.get("RUST", 0.0) + 1.5
        if "telara" in text or "punto" in text or "ácar" in text:
            scores["RED_SPIDER_MITE"] = scores.get("RED_SPIDER_MITE", 0.0) + 1.5
    minimum = min(scores.values(), default=0.0)
    weights = {key: max(value - minimum + 0.1, 0.1) for key, value in scores.items()}
    total = sum(weights.values())
    probabilities = {key: round(value / total, 4) for key, value in weights.items()}
    top = max(probabilities, key=probabilities.get)
    return probabilities, top, probabilities[top]
