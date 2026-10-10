"""
Pruebas del Grad-CAM de DIKO que no necesitan el archivo de pesos: usan la
arquitectura con pesos aleatorios, porque solo comprueban la forma del calculo.
"""
import numpy as np
import pytest
from PIL import Image

torch = pytest.importorskip("torch", reason="PyTorch no instalado (requirements.txt)")


@pytest.fixture(scope="module")
def clasificador_aleatorio():
    from app.models.diko import ArquitecturaDIKO, ClasificadorDIKO

    torch.manual_seed(0)
    clasificador = ClasificadorDIKO.__new__(ClasificadorDIKO)
    clasificador._modelo = ArquitecturaDIKO().eval()
    for parametro in clasificador._modelo.parameters():
        parametro.requires_grad_(False)
    return clasificador


def imagen_sintetica(semilla: int) -> Image.Image:
    aleatorio = np.random.default_rng(semilla)
    return Image.fromarray(aleatorio.integers(0, 255, (320, 280), dtype=np.uint8)).convert("RGB")


def test_partir_el_forward_no_cambia_los_logits(clasificador_aleatorio):
    from app.models.diko import TRANSFORMACION

    modelo = clasificador_aleatorio._modelo
    entrada = TRANSFORMACION(imagen_sintetica(1)).unsqueeze(0)
    with torch.no_grad():
        esperado = modelo(entrada)
        inter_d, inter_i, mapa_d, mapa_i = modelo.mapas_con_intermedios(entrada)
        obtenido = modelo.clasificar_mapas(mapa_d, mapa_i)

    assert inter_d.shape[1:] == (1792, 18, 18)
    assert inter_i.shape[1:] == (768, 17, 17)
    assert mapa_d.shape[1:] == (1920, 9, 9)
    assert mapa_i.shape[1:] == (2048, 8, 8)
    assert inter_d.min() >= 0 and inter_i.min() >= 0
    torch.testing.assert_close(obtenido, esperado, rtol=1e-4, atol=1e-5)


@pytest.mark.parametrize("refinado", [True, False])
def test_mapa_en_rango_con_y_sin_refinado(clasificador_aleatorio, monkeypatch, refinado):
    from app.config import settings

    monkeypatch.setattr(settings, "gradcam_refinado", refinado)
    mapa = clasificador_aleatorio.predecir(imagen_sintetica(2)).mapa_activacion

    assert mapa.shape == (299, 299)
    assert mapa.min() >= 0
    assert mapa.max() == pytest.approx(1.0) or mapa.max() == 0.0