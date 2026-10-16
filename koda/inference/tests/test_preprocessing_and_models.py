"""Pruebas unitarias de componentes individuales de preprocesamiento, modelos y utilidades."""
import base64
from io import BytesIO

import numpy as np
import pytest
from PIL import Image

from app.gradcam.superposicion import superponer_heatmap
from app.models import crear_clasificador
from app.models.base import softmax
from app.models.simulado import ClasificadorSimulado
from app.preprocessing.imagen import ImagenInvalidaError, cargar_imagen


def generar_png(arreglo: np.ndarray) -> bytes:
    buffer = BytesIO()
    Image.fromarray(arreglo.astype(np.uint8)).save(buffer, format="PNG")
    return buffer.getvalue()


def generar_jpeg(arreglo: np.ndarray) -> bytes:
    buffer = BytesIO()
    Image.fromarray(arreglo.astype(np.uint8)).save(buffer, format="JPEG")
    return buffer.getvalue()


def test_cargar_imagen_png_valida():
    aleatorio = np.random.default_rng(42)
    datos = generar_png(aleatorio.integers(0, 255, (100, 100, 3)))
    img = cargar_imagen(datos)
    assert img.size == (100, 100)
    assert img.mode == "RGB"


def test_cargar_imagen_jpeg_valida():
    aleatorio = np.random.default_rng(42)
    datos = generar_jpeg(aleatorio.integers(0, 255, (120, 120, 3)))
    img = cargar_imagen(datos)
    assert img.size == (120, 120)
    assert img.mode == "RGB"


def test_cargar_imagen_vacia_lanza_error():
    with pytest.raises(ImagenInvalidaError, match="No se recibió ninguna imagen"):
        cargar_imagen(b"")


def test_cargar_imagen_corrupta_lanza_error():
    with pytest.raises(ImagenInvalidaError, match="no es una imagen válida"):
        cargar_imagen(b"bytes totalmente corruptos y no decodificables")


def test_cargar_imagen_demasiado_pequena_lanza_error():
    datos = generar_png(np.ones((32, 32, 3), dtype=np.uint8) * 128)
    with pytest.raises(ImagenInvalidaError, match="demasiado pequeña"):
        cargar_imagen(datos)


def test_cargar_imagen_uniforme_lanza_error():
    # Imagen de 100x100 de un solo color constante (desviacion estandar 0)
    solida = np.ones((100, 100, 3), dtype=np.uint8) * 200
    datos = generar_png(solida)
    with pytest.raises(ImagenInvalidaError, match="no contiene información suficiente"):
        cargar_imagen(datos)


def test_superponer_heatmap_genera_base64_png():
    aleatorio = np.random.default_rng(99)
    img = Image.fromarray(aleatorio.integers(0, 255, (150, 150, 3), dtype=np.uint8))
    cam = np.ones((14, 14), dtype=np.float32) * 0.7

    b64 = superponer_heatmap(img, cam)
    assert isinstance(b64, str)
    decodificado = base64.b64decode(b64)
    resultado = Image.open(BytesIO(decodificado))
    assert resultado.format == "PNG"
    assert resultado.size == (150, 150)


def test_softmax_suma_uno():
    logits = np.array([2.0, 1.0, 0.1, -1.0, 3.5])
    prob = softmax(logits)
    assert sum(prob) == pytest.approx(1.0)
    assert prob.shape == (5,)
    assert np.all(prob >= 0)


def test_clasificador_simulado_propiedades():
    clasificador = ClasificadorSimulado()
    assert clasificador.nombre == "simulado"

    aleatorio = np.random.default_rng(10)
    img = Image.fromarray(aleatorio.integers(0, 255, (100, 100, 3), dtype=np.uint8))
    pred = clasificador.predecir(img)

    assert 0 <= pred.grado_kl <= 4
    assert len(pred.probabilidades) == 5
    assert sum(pred.probabilidades) == pytest.approx(1.0)
    assert pred.confianza == max(pred.probabilidades)
    assert pred.mapa_activacion.shape == (14, 14)
    assert pred.mapa_activacion.min() >= 0.0
    assert pred.mapa_activacion.max() == pytest.approx(1.0)


def test_crear_clasificador_nombre_invalido():
    with pytest.raises(ValueError, match="no reconocido"):
        crear_clasificador("modelo_no_existente")
