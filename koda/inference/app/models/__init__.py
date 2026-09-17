from collections.abc import Callable

from app.config import settings
from app.models.base import ClasificadorKL, Prediccion
from app.models.simulado import ClasificadorSimulado


def _crear_diko() -> ClasificadorKL:
    # Importacion diferida: PyTorch solo se carga si se elige este modelo, asi el
    # clasificador simulado sigue funcionando sin instalar requirements-diko.txt.
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
