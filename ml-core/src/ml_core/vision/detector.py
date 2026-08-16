import json
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
    disease_id = LABEL_MAP.get(prediccion)
    if disease_id is None:
        return None
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    info = catalog.get(disease_id, {})
    return {
        "disease_id": disease_id,
        "disease_name": info.get("name", disease_id),
        "description": info.get("description", ""),
        "confidence": round(float(probs[indice]), 4),
        "severity": info.get("severity"),
        "advice": info.get("advice"),
    }
