"""Entrenamiento local del detector visual (HOG + HSV + SVM).

Replica el flujo que antes se ejecutaba en Google Colab para que el artefacto
``vision.joblib`` pueda generarse en el equipo, igual que los clasificadores de
texto. Admite dos fuentes de datos:

- descarga de datasets públicos de Kaggle vía ``kagglehub`` (opción por defecto),
  o
- directorios locales de imágenes organizadas por carpeta/clase mediante
  ``--data-dir`` (permite entrenar sin internet y sin credenciales de Kaggle).
"""

import argparse
import os
import random
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import pandas as pd
from joblib import dump
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from .features import extraer_caracteristicas

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODELS_DIR / "vision.joblib"

EXTENSIONES = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".gif"}

PALABRAS_EXCLUIR = [
    "mask",
    "masks",
    "annotation",
    "annotations",
    "segmentation",
    "labelmask",
]

DATASETS_KAGGLE = [
    "badasstechie/coffee-leaf-diseases",
    "nirmalsankalana/rocole-a-robusta-coffee-leaf-images-dataset",
    "jorgearoca/coffee-rust",
]

DEFAULT_MAX_POR_CLASE = 2500
DEFAULT_RANDOM_STATE = 42


def _quitar_acentos(texto):
    return "".join(
        caracter
        for caracter in unicodedata.normalize("NFD", texto)
        if unicodedata.category(caracter) != "Mn"
    )


def normalizar_etiqueta(texto):
    texto = _quitar_acentos(texto).lower().strip().replace("-", "_").replace(" ", "_")
    if any(p in texto for p in ["healthy", "health", "normal"]):
        return "HEALTHY"
    if any(p in texto for p in ["rust", "roya"]):
        return "RUST"
    if any(p in texto for p in ["miner", "leaf_miner"]):
        return "MINER"
    if "phoma" in texto:
        return "PHOMA"
    if any(p in texto for p in ["cercospora", "cerscospora"]):
        return "CERCOSPORA"
    if any(p in texto for p in ["mite", "spider", "red_spider"]):
        return "RED_SPIDER_MITE"
    return None


def es_archivo_valido(ruta):
    texto = str(ruta).lower()
    return Path(ruta).suffix.lower() in EXTENSIONES and not any(
        p in texto for p in PALABRAS_EXCLUIR
    )


def buscar_imagenes(ruta):
    return [archivo for archivo in Path(ruta).rglob("*") if es_archivo_valido(archivo)]


def detectar_etiqueta_desde_ruta(ruta):
    for parte in reversed(ruta.parts):
        etiqueta = normalizar_etiqueta(parte)
        if etiqueta is not None:
            return etiqueta
    return normalizar_etiqueta(ruta.stem)


def crear_registros(imagenes, source):
    registros = []
    for imagen in imagenes:
        etiqueta = detectar_etiqueta_desde_ruta(imagen)
        if etiqueta is None:
            continue
        registros.append(
            {"image_path": str(imagen), "source": source, "label": etiqueta}
        )
    return registros


def _descargar_kaggle():
    import kagglehub

    registros = []
    for dataset in DATASETS_KAGGLE:
        ruta = kagglehub.dataset_download(dataset)
        imagenes = buscar_imagenes(ruta)
        registros += crear_registros(imagenes, dataset)
        print(dataset, len(imagenes), Counter(r["label"] for r in registros))
    return registros


def _registros_desde_directorios(directorios):
    registros = []
    for directorio in directorios:
        ruta = Path(directorio)
        if not ruta.is_dir():
            print("Directorio de datos no encontrado:", ruta)
            continue
        imagenes = buscar_imagenes(ruta)
        registros += crear_registros(imagenes, ruta.name)
        print(ruta.name, len(imagenes), Counter(r["label"] for r in registros))
    return registros


def _balancear_por_clase(registros, max_por_clase, random_state):
    por_clase = defaultdict(list)
    for registro in registros:
        por_clase[registro["label"]].append(registro)
    seleccionados = []
    rng = random.Random(random_state)
    for etiqueta in sorted(por_clase):
        items = por_clase[etiqueta]
        n = min(max_por_clase, len(items))
        seleccionados.extend(rng.sample(items, n))
    return seleccionados


def _extraer_features(df):
    X = []
    y = []
    for fila in df.itertuples():
        features = extraer_caracteristicas(fila.image_path)
        if features is not None:
            X.append(features)
            y.append(fila.label)
        if len(X) % 500 == 0:
            print("Procesadas:", len(X))
    return X, y


def entrenar(
    data_dirs=None,
    max_por_clase=DEFAULT_MAX_POR_CLASE,
    random_state=DEFAULT_RANDOM_STATE,
    force=False,
):
    """Entrena el detector visual y guarda ``vision.joblib``.

    - ``data_dirs``: lista de rutas locales de imágenes. Si es ``None``, se
      descargan los datasets de Kaggle.
    - ``max_por_clase``: límite de ejemplos por clase (balanceo).
    - ``random_state``: semilla para balanceo, split y SVM.
    - ``force``: re-entrenar aunque ya exista ``vision.joblib``.
    """
    if not force and MODEL_PATH.exists():
        print("El modelo de visión ya existe:", MODEL_PATH)
        return {"created": False, "reason": "exists"}

    if data_dirs:
        registros = _registros_desde_directorios(data_dirs)
    else:
        registros = _descargar_kaggle()

    if not registros:
        raise RuntimeError(
            "No se encontraron imágenes etiquetadas. "
            "Proporciona --data-dir o revisa la conexión/configuración de Kaggle."
        )

    registros = _balancear_por_clase(registros, max_por_clase, random_state)
    df = pd.DataFrame(registros)
    print("Registros tras balanceo:", len(df))
    print(df["label"].value_counts())
    print(df.groupby(["source", "label"]).size())

    if df["label"].nunique() < 2:
        raise RuntimeError("Se necesitan al menos dos clases etiquetadas para entrenar")

    por_clase = df["label"].value_counts()
    if (por_clase < 2).any():
        descartar = set(por_clase[por_clase < 2].index)
        df = df[~df["label"].isin(descartar)]
        print("Clases descartadas por tener una sola muestra:", sorted(descartar))
        if df["label"].nunique() < 2:
            raise RuntimeError(
                "Se necesitan al menos dos clases etiquetadas para entrenar"
            )

    X, y = _extraer_features(df)
    X = np.asarray(X)
    y = np.asarray(y)
    print("Features:", X.shape)
    print("Etiquetas:", Counter(y))

    if len(np.unique(y)) < 2:
        raise RuntimeError("Se necesitan al menos dos clases etiquetadas para entrenar")

    x_train, x_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=random_state,
        stratify=y,
    )
    print("Entrenamiento:", x_train.shape, "Prueba:", x_test.shape)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    modelo = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "svm",
                SVC(
                    kernel="rbf",
                    C=10,
                    gamma="scale",
                    class_weight="balanced",
                    probability=True,
                    random_state=random_state,
                ),
            ),
        ]
    )
    modelo.fit(x_train, y_train)

    predicciones = modelo.predict(x_test)
    print("Accuracy:", round(accuracy_score(y_test, predicciones), 4))
    print(classification_report(y_test, predicciones, zero_division=0))
    print("Classes del modelo:", [c for c in modelo.classes_])

    dump(modelo, MODEL_PATH, compress=3)
    print("Modelo guardado:", MODEL_PATH)
    return {"created": True, "model": str(MODEL_PATH)}


def ensure_trained():
    """Genera el modelo en el arranque si falta, sin bloquear la API.

    Si ``vision.joblib`` no existe, asume que hay internet y descarga/entrena
    automáticamente. Si se configuró ``ML_CORE_VISION_DATA_DIR``, usa ese
    directorio local antes de intentar descargar de Kaggle. Nunca lanza: si el
    entrenamiento falla, avisa y deja la visión deshabilitada.
    """
    if MODEL_PATH.exists():
        return {"created": False, "reason": "exists"}

    data_dir = os.environ.get("ML_CORE_VISION_DATA_DIR")
    if data_dir:
        ruta = Path(data_dir)
        if ruta.is_dir():
            try:
                return entrenar(data_dirs=[ruta])
            except Exception as exc:  # noqa: BLE001
                print("visión: falló el entrenamiento desde datos locales:", exc)
                return {"created": False, "reason": "local_error", "detail": str(exc)}
        print("ML_CORE_VISION_DATA_DIR configurado pero no existe:", ruta)

    try:
        return entrenar()
    except Exception as exc:  # noqa: BLE001
        print("visión: sin modelo y no se pudo descargar/entrenar:", exc)
        return {"created": False, "reason": "error", "detail": str(exc)}


def main():
    parser = argparse.ArgumentParser(
        description="Entrena el detector visual de Cafebot"
    )
    parser.add_argument(
        "--data-dir",
        action="append",
        default=[],
        help="Directorio local con imágenes etiquetadas por carpeta. Repetible.",
    )
    parser.add_argument(
        "--max-per-class",
        type=int,
        default=DEFAULT_MAX_POR_CLASE,
        help="Límite de ejemplos por clase (balanceo)",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=DEFAULT_RANDOM_STATE,
        help="Semilla aleatoria para balanceo, split y SVM",
    )
    parser.add_argument(
        "--force", action="store_true", help="Re-entrenar aunque exista el modelo"
    )
    args = parser.parse_args()
    entrenar(
        data_dirs=args.data_dir or None,
        max_por_clase=args.max_per_class,
        random_state=args.random_state,
        force=args.force,
    )


if __name__ == "__main__":
    main()
