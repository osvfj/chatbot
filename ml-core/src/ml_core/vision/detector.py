import json
import os
from pathlib import Path

import cv2
import numpy as np
from joblib import load

from .features import extraer_caracteristicas_imagen

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODELS_DIR / "vision.joblib"
CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "catalog.json"

LABEL_MAP = {
    "HEALTHY": "healthy",
    "RUST": "leaf-rust",
    "MINER": "leaf-miner",
    "PHOMA": "phoma",
    "CERCOSPORA": "cercospora",
    "RED_SPIDER_MITE": "red-spider-mite",
}

_model = None
MIN_CONFIDENCE = float(os.environ.get("ML_CORE_VISION_MIN_CONFIDENCE", "0.55"))


def _get_model():
    global _model
    if _model is None and MODEL_PATH.exists():
        _model = load(MODEL_PATH)
    return _model


def available():
    return MODEL_PATH.exists()


def detect(bytes_data):
    model = _get_model()
    if model is None:
        return None
    arr = np.frombuffer(bytes_data, np.uint8)
    imagen = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if imagen is None:
        return None
    features = extraer_caracteristicas_imagen(imagen)
    prediccion = model.predict([features])[0]
    probs = model.predict_proba([features])[0]
    indice = list(model.classes_).index(prediccion)
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    ranked = sorted(zip(model.classes_, probs), key=lambda item: -item[1])
    top_predictions = []
    for label, probability in ranked[:3]:
        mapped_id = LABEL_MAP.get(label)
        info = catalog.get(mapped_id, {}) if mapped_id is not None else {}
        top_predictions.append(
            {
                "disease_id": mapped_id or label.lower(),
                "disease_name": info.get("name", label),
                "confidence": round(float(probability), 4),
            }
        )
    disease_id = LABEL_MAP.get(prediccion)
    confidence = round(float(probs[indice]), 4)
    if disease_id is None or confidence < MIN_CONFIDENCE:
        return {
            "detector_status": "uncertain",
            "disease_id": "uncertain",
            "disease_name": "Resultado no concluyente",
            "description": "El modelo no alcanzó la confianza mínima para confirmar una enfermedad.",
            "confidence": confidence,
            "severity": "none",
            "advice": "Toma otra foto con buena iluminación y muestra la hoja completa; el resultado requiere revisión.",
            "top_predictions": top_predictions,
        }
    info = catalog.get(disease_id, {})
    return {
        "detector_status": "detected",
        "disease_id": disease_id,
        "disease_name": info.get("name", disease_id),
        "description": info.get("description", ""),
        "confidence": confidence,
        "severity": info.get("severity"),
        "advice": info.get("advice"),
        "top_predictions": top_predictions,
    }
