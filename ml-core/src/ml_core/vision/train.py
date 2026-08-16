import json
from collections import Counter
from pathlib import Path

import kagglehub
import pandas as pd
from joblib import dump
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from .features import extraer_caracteristicas

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODELS_DIR / "vision.joblib"

EXTENSIONES = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".gif"}

PALABRAS_EXCLUIR = [
    "mask", "masks", "annotation", "annotations", "segmentation", "labelmask",
]

DATASETS = [
    "badasstechie/coffee-leaf-diseases",
    "nirmalsankalana/rocole-a-robusta-coffee-leaf-images-dataset",
    "jorgearoca/coffee-rust",
]


def buscar_imagenes(ruta):
    imagenes = []
    for archivo in Path(ruta).rglob("*"):
        if archivo.suffix.lower() in EXTENSIONES:
            imagenes.append(archivo)
    return imagenes


def normalizar_etiqueta(texto):
    texto = texto.lower().strip().replace("-", "_").replace(" ", "_")
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
    if any(p in texto for p in ["mite", "spider"]):
        return "RED_SPIDER_MITE"
    return None


def es_archivo_valido(ruta):
    texto = str(ruta).lower()
    return not any(p in texto for p in PALABRAS_EXCLUIR)


def detectar_etiqueta_desde_ruta(ruta):
    for parte in reversed(ruta.parts):
        etiqueta = normalizar_etiqueta(parte)
        if etiqueta is not None:
            return etiqueta
    return normalizar_etiqueta(ruta.stem)


def crear_registros(imagenes, source):
    registros = []
    for imagen in imagenes:
        if not es_archivo_valido(imagen):
            continue
        etiqueta = detectar_etiqueta_desde_ruta(imagen)
        if etiqueta is None:
            continue
        registros.append({"image_path": str(imagen), "source": source, "label": etiqueta})
    return registros


def entrenar(max_por_dataset=None):
    registros = []
    for dataset in DATASETS:
        ruta = kagglehub.dataset_download(dataset)
        imagenes = buscar_imagenes(ruta)
        if max_por_dataset is not None:
            imagenes = imagenes[:max_por_dataset]
        registros += crear_registros(imagenes, dataset)
        print(dataset, len(imagenes), Counter(r["label"] for r in registros))

    df = pd.DataFrame(registros)
    X = []
    y = []
    for fila in df.itertuples():
        features = extraer_caracteristicas(fila.image_path)
        if features is not None:
            X.append(features)
            y.append(fila.label)

    x_train, _x_test, y_train, _y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print("muestras:", len(x_train), "clases:", Counter(y_train))

    modelo = Pipeline([
        ("scaler", StandardScaler()),
        ("svm", SVC(kernel="rbf", C=10, gamma="scale", class_weight="balanced", probability=True)),
    ])
    modelo.fit(x_train, y_train)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    dump(modelo, MODEL_PATH)
    print("modelo guardado en", MODEL_PATH)


if __name__ == "__main__":
    entrenar()
