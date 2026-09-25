from collections.abc import Callable
from pathlib import Path

from app.config import settings
from app.models.base import ClasificadorKL, Prediccion
from app.models.simulado import ClasificadorSimulado


def _crear_diko() -> ClasificadorKL:
    # Los pesos no se versionan: sin este aviso el servicio caeria al arrancar
    # con un FileNotFoundError de PyTorch que no dice como generarlos.
    if not Path(settings.ruta_modelo).exists():
        raise FileNotFoundError(
            f"No se encontro {settings.ruta_modelo}. Generarlo con "
            "'python -m scripts.convertir_diko' o arrancar con KODA_MODELO=simulado."
        )

    # Importacion diferida: PyTorch solo se carga si se elige este modelo.
    from app.models.diko import ClasificadorDIKO

    return ClasificadorDIKO(settings.ruta_modelo)


# Clasificadores disponibles, seleccionables con KODA_MODELO.
CLASIFICADORES: dict[str, Callable[[], ClasificadorKL]] = {
    "simulado": ClasificadorSimulado,
    "diko": _crear_diko,
}


def crear_clasificador(nombre: str) -> ClasificadorKL:
    try:
        fabrica = CLASIFICADORES[nombre]
    except KeyError as error:
        disponibles = ", ".join(sorted(CLASIFICADORES))
        raise ValueError(f"Modelo '{nombre}' no reconocido. Disponibles: {disponibles}") from error
    return fabrica()


__all__ = ["ClasificadorKL", "Prediccion", "crear_clasificador"]
