"""Endpoint de inferencia consumido por el backend (RestModuloIAAdapter)."""
from fastapi import APIRouter, File, Request, UploadFile
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.config import settings
from app.gradcam.superposicion import superponer_heatmap
from app.preprocessing.imagen import ImagenInvalidaError, cargar_imagen

router = APIRouter()


class RespuestaInferencia(BaseModel):
    """Contrato de respuesta: coincide con PrediccionDTO del backend."""

    gradoKL: int
    probabilidades: list[float]
    confianza: float
    heatmapBase64: str
    modelo: str


class ArchivoDemasiadoGrandeError(Exception):
    pass


@router.post("/infer", response_model=RespuestaInferencia)
async def inferir(request: Request, imagen: UploadFile = File(...)) -> RespuestaInferencia:
    datos = await imagen.read()
    if len(datos) > settings.tamano_maximo_mb * 1024 * 1024:
        raise ArchivoDemasiadoGrandeError()

    radiografia = cargar_imagen(datos)
    clasificador = request.app.state.clasificador

    # La inferencia ocupa la CPU varios segundos: fuera del hilo principal, para
    # que el servicio siga atendiendo otras solicitudes (como /health) mientras tanto.
    def analizar() -> RespuestaInferencia:
        prediccion = clasificador.predecir(radiografia)
        return RespuestaInferencia(
            gradoKL=prediccion.grado_kl,
            probabilidades=prediccion.probabilidades,
            confianza=prediccion.confianza,
            heatmapBase64=superponer_heatmap(radiografia, prediccion.mapa_activacion),
            modelo=clasificador.nombre,
        )

    return await run_in_threadpool(analizar)


__all__ = ["router", "ArchivoDemasiadoGrandeError", "ImagenInvalidaError"]
