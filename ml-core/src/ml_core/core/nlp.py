import json
import re
from pathlib import Path

import spacy

nlp = spacy.load("es_core_news_sm")
STOPWORDS = nlp.Defaults.stop_words
_accent = str.maketrans("áéíóúüñ", "aeiouun")

MODISMOS_PATH = Path(__file__).resolve().parent.parent / "data" / "modismos.json"
MODISMOS = json.loads(MODISMOS_PATH.read_text(encoding="utf-8"))
_MODISMOS_ORDENADOS = sorted(MODISMOS.items(), key=lambda item: len(item[0]), reverse=True)


def normalizar_modismos(text):
    resultado = text
    for modismo, estandar in _MODISMOS_ORDENADOS:
        patron = r"\b" + re.escape(modismo) + r"\b"
        resultado = re.sub(patron, estandar, resultado, flags=re.IGNORECASE)
    return resultado


def normalize(text):
    texto_con_modismos = normalizar_modismos(text.lower())
    return texto_con_modismos.translate(_accent)


def tokenize(text, remove_stopwords=True):
    doc = nlp(normalize(text))
    tokens = []
    for tok in doc:
        if tok.is_punct or tok.is_space or tok.is_digit:
            continue
        tokens.append(tok.text)
        lemma = tok.lemma_
        if lemma != tok.text:
            tokens.append(lemma)
    if remove_stopwords:
        tokens = [t for t in tokens if t not in STOPWORDS and len(t) > 1]
    return tokens


def extract_evidence(text):
    normalized = normalize(text)
    return {
        "symptoms": sorted({term for term in ("manchas", "puntos", "telarañas", "polvo", "pustulas", "amarillamiento", "defoliacion") if term in normalized or (term == "puntos" and "punt" in normalized)}),
        "plant_parts": sorted({term for term in ("hoja", "hojas", "fruto", "frutos", "rama", "raiz") if term in normalized}),
        "colors": sorted({term for term in ("amarillo", "naranja", "cafe", "gris", "verde") if term in normalized}),
        "duration": next((match.group(0) for match in re.finditer(r"(?:hace|desde hace)\s+\w+(?:\s+\w+)?", normalized)), None),
        "severity": "high" if any(term in normalized for term in ("grave", "muchas", "se cae", "severo")) else "unknown",
    }