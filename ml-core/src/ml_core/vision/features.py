import cv2
import numpy as np
from skimage.feature import hog

TAMANO = (128, 128)


def extraer_caracteristicas_imagen(imagen):
    imagen = cv2.resize(imagen, TAMANO)
    gris = cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY)
    hog_features = hog(
        gris,
        orientations=9,
        pixels_per_cell=(16, 16),
        cells_per_block=(2, 2),
        block_norm="L2-Hys",
        feature_vector=True,
    )
    hsv = cv2.cvtColor(imagen, cv2.COLOR_BGR2HSV)
    color_features = []
    for canal in range(3):
        hist = cv2.calcHist([hsv], [canal], None, [32], [0, 256])
        hist = cv2.normalize(hist, hist).flatten()
        color_features.extend(hist)
    return np.concatenate([hog_features, color_features])


def extraer_caracteristicas(ruta):
    imagen = cv2.imread(str(ruta))
    if imagen is None:
        return None
    return extraer_caracteristicas_imagen(imagen)
