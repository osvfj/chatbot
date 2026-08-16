"""Clasificadores de aprendizaje supervisado (scikit-learn).

- Árbol de decisión: clasificación interpretable con trazabilidad (camino de
  decisiones recorrido para cada consulta).
- Naive Bayes multinomial: inferencia de la intención más probable dado el
  conjunto de tokens (evidencia).
- MLP / perceptrón multicapa: clasificación por red neuronal.

Los modelos se entrenan sobre el dataset de intenciones en español dominicano
y se persisten con joblib. `metrics()` devuelve la comparativa de accuracy para
el informe.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from joblib import dump, load
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.neural_network import MLPClassifier
from sklearn.tree import DecisionTreeClassifier

from .nlp import normalize, tokenize

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
VECTORIZER_PATH = MODELS_DIR / "vectorizer.joblib"
TREE_PATH = MODELS_DIR / "tree.joblib"
NB_PATH = MODELS_DIR / "nb.joblib"
MLP_PATH = MODELS_DIR / "mlp.joblib"

random.seed(0)


class ClassifierBundle:
    def __init__(self, data_path: Path = DATA_DIR / "intents.json") -> None:
        records = json.loads(data_path.read_text(encoding="utf-8"))
        self.texts = [normalize(r["text"]) for r in records]
        self.labels = [r["intent"] for r in records]
        self.classes = sorted(set(self.labels))

        self.vectorizer = CountVectorizer(analyzer=tokenize, ngram_range=(1, 2), min_df=1)
        self.tree: DecisionTreeClassifier | None = None
        self.nb: MultinomialNB | None = None
        self.mlp: MLPClassifier | None = None

    def _features(self, texts: list[str]):
        return self.vectorizer.fit_transform(texts)

    def train(self, force: bool = False) -> None:
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        if not force and all(p.exists() for p in (VECTORIZER_PATH, TREE_PATH, NB_PATH, MLP_PATH)):
            self._load_models()
            return

        X = self._features(self.texts)
        y = self.labels

        self.tree = DecisionTreeClassifier(max_depth=6, min_samples_leaf=1, random_state=0)
        self.nb = MultinomialNB(alpha=1.0)
        self.mlp = MLPClassifier(hidden_layer_sizes=(24, 12), max_iter=1500, random_state=0)

        self.tree.fit(X, y)
        self.nb.fit(X, y)
        self.mlp.fit(X, y)

        dump(self.vectorizer, VECTORIZER_PATH)
        dump(self.tree, TREE_PATH)
        dump(self.nb, NB_PATH)
        dump(self.mlp, MLP_PATH)

    def _load_models(self) -> None:
        self.vectorizer = load(VECTORIZER_PATH)
        self.tree = load(TREE_PATH)
        self.nb = load(NB_PATH)
        self.mlp = load(MLP_PATH)

    @property
    def trained(self) -> bool:
        return self.tree is not None and self.nb is not None and self.mlp is not None

    def _tree_path(self, row) -> list[str]:
        tree = self.tree  # type: ignore[union-attr]
        names = self.vectorizer.get_feature_names_out()
        node = 0
        path: list[str] = []
        while tree.tree_.children_left[node] != -1:
            feat = tree.tree_.feature[node]
            thr = tree.tree_.threshold[node]
            fname = names[feat]
            value = float(row[feat])
            went_left = value <= thr
            path.append(f"{fname} {'<=' if went_left else '>'} {thr:.3f} ({value:.3f})")
            node = tree.tree_.children_left[node] if went_left else tree.tree_.children_right[node]
        return path

    def _top_probs(self, model, row, top: int = 3) -> list[dict]:
        probs = model.predict_proba(row)[0]  # type: ignore[union-attr]
        ranked = sorted(zip(model.classes_, probs), key=lambda p: -p[1])[:top]
        return [{"intent": c, "probability": round(float(p), 4)} for c, p in ranked]

    def predict(self, text: str) -> dict:
        row = self.vectorizer.transform([normalize(text)])
        tree_pred = self.tree.predict(row)[0]  # type: ignore[union-attr]
        tree_prob = float(self.tree.predict_proba(row)[0][list(self.tree.classes_).index(tree_pred)])  # type: ignore[union-attr]
        nb_pred = self.nb.predict(row)[0]  # type: ignore[union-attr]
        nb_prob = float(self.nb.predict_proba(row)[0][list(self.nb.classes_).index(nb_pred)])  # type: ignore[union-attr]
        mlp_pred = self.mlp.predict(row)[0]  # type: ignore[union-attr]
        mlp_prob = float(self.mlp.predict_proba(row)[0][list(self.mlp.classes_).index(mlp_pred)])  # type: ignore[union-attr]

        return {
            "tree": {"intent": tree_pred, "confidence": round(tree_prob, 4), "path": self._tree_path(row)},
            "bayes": {
                "intent": nb_pred,
                "confidence": round(nb_prob, 4),
                "top": self._top_probs(self.nb, row),
            },
            "mlp": {"intent": mlp_pred, "confidence": round(mlp_prob, 4)},
            "ensemble": self._ensemble(tree_pred, nb_pred, mlp_pred),
        }

    def _ensemble(self, *labels: str) -> str:
        counts: dict[str, int] = {}
        for label in labels:
            counts[label] = counts.get(label, 0) + 1
        return max(counts, key=counts.get)

    def metrics(self) -> list[dict]:
        X = self.vectorizer.fit_transform(self.texts)
        X_train, X_test, y_train, y_test = train_test_split(
            X, self.labels, test_size=0.25, stratify=self.labels, random_state=0
        )
        results = []
        for name, model in (
            ("decision_tree", DecisionTreeClassifier(max_depth=6, random_state=0)),
            ("naive_bayes", MultinomialNB(alpha=1.0)),
            ("mlp", MLPClassifier(hidden_layer_sizes=(24, 12), max_iter=1500, random_state=0)),
        ):
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            results.append(
                {
                    "model": name,
                    "accuracy": round(accuracy_score(y_test, preds), 4),
                    "f1_macro": round(f1_score(y_test, preds, average="macro"), 4),
                }
            )
        return results
