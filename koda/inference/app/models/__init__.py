from app.models.base import ClasificadorKL, Prediccion
from app.models.simulado import ClasificadorSimulado

# Clasificadores disponibles, seleccionables con KODA_MODELO.
CLASIFICADORES: dict[str, type[ClasificadorKL]] = {
    ClasificadorSimulado.nombre: ClasificadorSimulado,
}


def crear_clasificador(nombre: str) -> ClasificadorKL:
    try:
        return CLASIFICADORES[nombre]()
    except KeyError as error:
        disponibles = ", ".join(sorted(CLASIFICADORES))
        raise ValueError(
            f"Modelo '{nombre}' no reconocido. Disponibles: {disponibles}"
        ) from error


__all__ = ["ClasificadorKL", "Prediccion", "crear_clasificador"]
