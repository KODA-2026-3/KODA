import base64
from io import BytesIO

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app


@pytest.fixture(scope="module")
def cliente():
    with TestClient(app) as c:
        yield c


def png(arreglo: np.ndarray) -> bytes:
    buffer = BytesIO()
    Image.fromarray(arreglo.astype(np.uint8)).save(buffer, format="PNG")
    return buffer.getvalue()


def radiografia_sintetica(semilla: int = 7) -> bytes:
    aleatorio = np.random.default_rng(semilla)
    return png(aleatorio.integers(0, 255, size=(256, 256), dtype=np.uint8))


def test_health_informa_el_modelo_activo(cliente):
    respuesta = cliente.get("/health")
    assert respuesta.status_code == 200
    assert respuesta.json()["modelo"] == "simulado"


def test_infer_respeta_el_contrato(cliente):
    respuesta = cliente.post("/infer", files={"imagen": ("rx.png", radiografia_sintetica(), "image/png")})
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()

    assert 0 <= cuerpo["gradoKL"] <= 4
    assert len(cuerpo["probabilidades"]) == 5
    assert sum(cuerpo["probabilidades"]) == pytest.approx(1.0)
    assert cuerpo["confianza"] == pytest.approx(max(cuerpo["probabilidades"]))
    assert cuerpo["confianza"] == pytest.approx(cuerpo["probabilidades"][cuerpo["gradoKL"]])
    assert cuerpo["modelo"] == "simulado"

    heatmap = Image.open(BytesIO(base64.b64decode(cuerpo["heatmapBase64"])))
    assert heatmap.format == "PNG"


def test_misma_imagen_da_el_mismo_resultado(cliente):
    datos = radiografia_sintetica(semilla=3)
    primera = cliente.post("/infer", files={"imagen": ("a.png", datos, "image/png")}).json()
    segunda = cliente.post("/infer", files={"imagen": ("b.png", datos, "image/png")}).json()
    assert primera["probabilidades"] == segunda["probabilidades"]


def test_rechaza_archivo_que_no_es_imagen(cliente):
    respuesta = cliente.post("/infer", files={"imagen": ("x.pdf", b"%PDF-1.4 no soy imagen", "application/pdf")})
    assert respuesta.status_code == 422
    assert "no es una imagen válida" in respuesta.json()["mensaje"]


def test_rechaza_imagen_en_negro(cliente):
    negra = png(np.zeros((256, 256)))
    respuesta = cliente.post("/infer", files={"imagen": ("negra.png", negra, "image/png")})
    assert respuesta.status_code == 422
    assert "información suficiente" in respuesta.json()["mensaje"]


def test_rechaza_imagen_demasiado_pequena(cliente):
    chica = png(np.random.default_rng(1).integers(0, 255, size=(20, 20)))
    respuesta = cliente.post("/infer", files={"imagen": ("chica.png", chica, "image/png")})
    assert respuesta.status_code == 422
    assert "demasiado pequeña" in respuesta.json()["mensaje"]


def test_heatmap_grande_se_reduce(cliente):
    grande = png(np.random.default_rng(5).integers(0, 255, size=(2400, 1800)))
    cuerpo = cliente.post("/infer", files={"imagen": ("g.png", grande, "image/png")}).json()
    heatmap = Image.open(BytesIO(base64.b64decode(cuerpo["heatmapBase64"])))
    assert max(heatmap.size) == 1024
