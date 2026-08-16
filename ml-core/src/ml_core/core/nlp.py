"""Tokenización en español con un toque dominicano (léxico del cafeto)."""

from __future__ import annotations

import re

SPANISH_STOPWORDS = frozenset(
    {
        "de", "la", "que", "el", "en", "y", "a", "los", "del", "se", "las",
        "por", "un", "para", "con", "no", "una", "su", "al", "lo", "como",
        "más", "pero", "sus", "le", "ya", "o", "este", "si", "porque", "esta",
        "entre", "cuando", "muy", "sin", "sobre", "también", "me", "hasta",
        "hay", "donde", "quien", "desde", "todo", "nos", "durante", "todos",
        "uno", "les", "ni", "contra", "otros", "ese", "eso", "ante", "ellos",
        "e", "esto", "mí", "antes", "algunos", "qué", "unos", "yo", "otro",
        "otras", "otra", "él", "tanto", "esa", "estos", "mucho", "quienes",
        "nada", "muchos", "cual", "poco", "ella", "estar", "estas", "algunas",
        "algo", "nosotros", "mi", "mis", "tú", "te", "ti", "tu", "tus", "ellas",
        "nosotras", "vosotros", "vosotras", "os", "mío", "mía", "tuyo", "tuya",
        "suyo", "suya", "nuestro", "nuestra", "vuestro", "vuestra", "esos",
        "esas", "estoy", "estás", "está", "estamos", "están", "sea", "seas",
        "sean", "ser", "fue", "fui", "somos", "son", "eres", "es", "hay", "ha",
    }
)

_ACCENTS = {
    "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u",
    "ü": "u", "ñ": "n",
}

_TOKEN_RE = re.compile(r"[a-záéíóúüñ0-9]+")


def normalize(text: str) -> str:
    """Normaliza el texto: minúsculas y sin acentos."""
    lowered = text.lower()
    return "".join(_ACCENTS.get(ch, ch) for ch in lowered)


def tokenize(text: str, remove_stopwords: bool = True) -> list[str]:
    """Fragmenta el texto en tokens (palabras o subpalabras) normalizados."""
    tokens = _TOKEN_RE.findall(normalize(text))
    if not remove_stopwords:
        return tokens
    return [t for t in tokens if t not in SPANISH_STOPWORDS and len(t) > 1]


def token_overlap(a: set[str], b: set[str]) -> float:
    """Jaccard entre dos conjuntos de tokens."""
    if not a and not b:
        return 0.0
    return len(a & b) / len(a | b)
