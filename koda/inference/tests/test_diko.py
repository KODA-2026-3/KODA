"""
Pruebas del clasificador DIKO_Stage2 real.

Se omiten si falta PyTorch o el archivo de pesos, que no se versiona (pesa
~200 MB): se descarga y genera con scripts/descargar_pesos.py.
"""
import base64
from io import BytesIO
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from app.config import settings

pytest.importorskip("torch", reason="PyTorch no instalado (requirements.txt)")
pytestmark = pytest.mark.skipif(
    not Path(settings.ruta_modelo).exists(),
    reason=f"falta {settings.ruta_modelo}: ejecutar python -m scripts.descargar_pesos",
)


@pytest.fixture(scope="module")
def cliente_diko():
    from fastapi.testclient import TestClient

    from app.main import app

    modelo_anterior = settings.modelo
    settings.modelo = "diko"
    try:
        with TestClient(app) as cliente:
            yield cliente
    finally:
        settings.modelo = modelo_anterior


def png_sintetico(semilla: int) -> bytes:
    aleatorio = np.random.default_rng(semilla)
    buffer = BytesIO()
    Image.fromarray(aleatorio.integers(0, 255, (400, 400), dtype=np.uint8)).save(buffer, format="PNG")
    return buffer.getvalue()


def test_health_informa_diko(cliente_diko):
    assert cliente_diko.get("/health").json()["modelo"] == "diko_stage2"


def test_infer_con_diko_respeta_el_contrato(cliente_diko):
    respuesta = cliente_diko.post("/infer", files={"imagen": ("rx.png", png_sintetico(1), "image/png")})
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()

    assert cuerpo["modelo"] == "diko_stage2"
    assert 0 <= cuerpo["gradoKL"] <= 4
    assert sum(cuerpo["probabilidades"]) == pytest.approx(1.0, abs=1e-5)
    assert cuerpo["confianza"] == pytest.approx(cuerpo["probabilidades"][cuerpo["gradoKL"]])

    heatmap = Image.open(BytesIO(base64.b64decode(cuerpo["heatmapBase64"])))
    assert heatmap.size == (400, 400)


def test_diko_es_determinista(cliente_diko):
    datos = png_sintetico(2)
    primera = cliente_diko.post("/infer", files={"imagen": ("a.png", datos, "image/png")}).json()
    segunda = cliente_diko.post("/infer", files={"imagen": ("b.png", datos, "image/png")}).json()
    assert primera["probabilidades"] == segunda["probabilidades"]


def test_mapa_de_activacion_de_ambas_ramas():
    from app.models.diko import ClasificadorDIKO

    clasificador = ClasificadorDIKO(settings.ruta_modelo)
    imagen = Image.open(BytesIO(png_sintetico(3))).convert("RGB")
    prediccion = clasificador.predecir(imagen)

    # Los mapas de DenseNet (9x9) e Inception (8x8) se combinan a 299x299.
    assert prediccion.mapa_activacion.shape == (299, 299)
    assert prediccion.mapa_activacion.min() >= 0
    # 1.0 si alguna zona apoya el grado predicho; 0 si ninguna lo hace.
    assert prediccion.mapa_activacion.max() in (pytest.approx(1.0), 0.0)


def test_prediccion_con_gradcam_coincide_con_el_forward():
    # El grado que explica el mapa es el mismo que da el modelo original.
    import torch

    from app.models.diko import TRANSFORMACION, ClasificadorDIKO

    clasificador = ClasificadorDIKO(settings.ruta_modelo)
    imagen = Image.open(BytesIO(png_sintetico(4))).convert("RGB")
    with torch.no_grad():
        esperado = torch.softmax(clasificador._modelo(TRANSFORMACION(imagen).unsqueeze(0)), dim=1)[0]
    prediccion = clasificador.predecir(imagen)
    assert prediccion.probabilidades == pytest.approx(esperado.tolist(), abs=1e-5)