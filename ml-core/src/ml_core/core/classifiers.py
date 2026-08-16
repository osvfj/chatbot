import json
import random
from pathlib import Path

from joblib import dump, load
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.model_selection import cross_val_score
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
    def __init__(self, data_path=DATA_DIR / "intents.json"):
        records = json.loads(data_path.read_text(encoding="utf-8"))
        self.texts = [normalize(r["text"]) for r in records]
        self.labels = [r["intent"] for r in records]
        self.classes = sorted(set(self.labels))
        self.vectorizer = CountVectorizer(analyzer=tokenize, min_df=1)
        self.tree = None
        self.nb = None
        self.mlp = None
        self.feature_names = []

    def _features(self, texts):
        return self.vectorizer.fit_transform(texts)

    def train(self, force=False):
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        if not force and all(p.exists() for p in (VECTORIZER_PATH, TREE_PATH, NB_PATH, MLP_PATH)):
            self._load_models()
            return

        X = self._features(self.texts)
        y = self.labels
        self._rebuild_feature_names()

        self.tree = DecisionTreeClassifier(max_depth=None, min_samples_leaf=1, max_features="sqrt", random_state=0)
        self.nb = MultinomialNB(alpha=1.0)
        self.mlp = MLPClassifier(hidden_layer_sizes=(24, 12), max_iter=1500, random_state=0)

        self.tree.fit(X, y)
        self.nb.fit(X, y)
        self.mlp.fit(X, y)

        dump(self.vectorizer, VECTORIZER_PATH)
        dump(self.tree, TREE_PATH)
        dump(self.nb, NB_PATH)
        dump(self.mlp, MLP_PATH)

    def _load_models(self):
        self.vectorizer = load(VECTORIZER_PATH)
        self.tree = load(TREE_PATH)
        self.nb = load(NB_PATH)
        self.mlp = load(MLP_PATH)
        self._rebuild_feature_names()

    def _rebuild_feature_names(self):
        inverse = {v: k for k, v in self.vectorizer.vocabulary_.items()}
        self.feature_names = [inverse[i] for i in range(len(inverse))]

    @property
    def trained(self):
        return self.tree is not None and self.nb is not None and self.mlp is not None

    def _tree_path(self, row):
        tree = self.tree
        node = 0
        path = []
        while tree.tree_.children_left[node] != -1:
            feat = tree.tree_.feature[node]
            thr = tree.tree_.threshold[node]
            fname = self.feature_names[feat]
            value = float(row[0, feat])
            went_left = value <= thr
            path.append(f"{fname} {'<=' if went_left else '>'} {thr:.3f} ({value:.3f})")
            node = tree.tree_.children_left[node] if went_left else tree.tree_.children_right[node]
        return path

    def _top_probs(self, model, row, top=3):
        probs = model.predict_proba(row)[0]
        ranked = sorted(zip(model.classes_, probs), key=lambda p: -p[1])[:top]
        return [{"intent": c, "probability": round(float(p), 4)} for c, p in ranked]

    def predict(self, text):
        row = self.vectorizer.transform([normalize(text)])
        tree_pred = self.tree.predict(row)[0]
        tree_prob = float(self.tree.predict_proba(row)[0][list(self.tree.classes_).index(tree_pred)])
        nb_pred = self.nb.predict(row)[0]
        nb_prob = float(self.nb.predict_proba(row)[0][list(self.nb.classes_).index(nb_pred)])
        mlp_pred = self.mlp.predict(row)[0]
        mlp_prob = float(self.mlp.predict_proba(row)[0][list(self.mlp.classes_).index(mlp_pred)])
        return {
            "tree": {"intent": tree_pred, "confidence": round(tree_prob, 4), "path": self._tree_path(row)},
            "bayes": {"intent": nb_pred, "confidence": round(nb_prob, 4), "top": self._top_probs(self.nb, row)},
            "mlp": {"intent": mlp_pred, "confidence": round(mlp_prob, 4)},
            "ensemble": self._ensemble(tree_pred, nb_pred, mlp_pred),
        }

    def _ensemble(self, *labels):
        counts = {}
        for label in labels:
            counts[label] = counts.get(label, 0) + 1
        return max(counts, key=counts.get)

    def metrics(self):
        X = self.vectorizer.fit_transform(self.texts)
        results = []
        for name, model in (
            ("decision_tree", DecisionTreeClassifier(max_depth=None, min_samples_leaf=1, max_features="sqrt", random_state=0)),
            ("naive_bayes", MultinomialNB(alpha=1.0)),
            ("mlp", MLPClassifier(hidden_layer_sizes=(24, 12), max_iter=1500, random_state=0)),
        ):
            acc = cross_val_score(model, X, self.labels, cv=5, scoring="accuracy")
            f1 = cross_val_score(model, X, self.labels, cv=5, scoring="f1_macro")
            results.append(
                {
                    "model": name,
                    "accuracy": round(float(acc.mean()), 4),
                    "accuracy_std": round(float(acc.std()), 4),
                    "f1_macro": round(float(f1.mean()), 4),
                }
            )
        return results
