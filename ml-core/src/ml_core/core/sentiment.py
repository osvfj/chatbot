_analyzer = None

_LABELS = {"POS": "positivo", "NEG": "negativo", "NEU": "neutro"}


def _get_analyzer():
    global _analyzer
    if _analyzer is None:
        from pysentimiento import create_analyzer

        _analyzer = create_analyzer(task="sentiment", lang="es")
    return _analyzer


def analyze(text):
    result = _get_analyzer().predict(text)
    label = _LABELS.get(result.output, "neutro")
    probas = {_LABELS.get(k, k): round(float(v), 4) for k, v in result.probas.items()}
    confidence = round(float(result.probas.get(result.output, 0.0)), 4)
    return {"label": label, "probas": probas, "confidence": confidence}


def warmup():
    """Load the Spanish model during startup instead of the first user request."""
    _get_analyzer()
