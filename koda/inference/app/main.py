"""
KODA - Knee Osteoarthritis Diagnostic Assistant
Servicio de inferencia: clasificacion Kellgren-Lawrence y mapa de calor Grad-CAM.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api import router
from app.api.routes.inferencia import ArchivoDemasiadoGrandeError
from app.config import settings
from app.models import crear_clasificador
from app.preprocessing.imagen import ImagenInvalidaError

log = logging.getLogger("koda.inference")


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    # El modelo se carga una sola vez al arrancar, no en cada solicitud.
    app.state.clasificador = crear_clasificador(settings.modelo)
    log.info("Clasificador activo: %s", app.state.clasificador.nombre)
    if settings.modelo == "simulado":
        log.warning(
            "Clasificador SIMULADO activo: las predicciones NO provienen de un modelo de IA."
        )
    yield


app = FastAPI(
    title=settings.app_name,
    description="Clasificación de radiografías de rodilla en la escala Kellgren-Lawrence.",
    version="0.2.0",
    lifespan=ciclo_de_vida,
)

# El servicio solo lo consume el backend (RDE-01): sin CORS para navegadores.
app.include_router(router)


@app.get("/health")
def health(request: Request) -> dict:
    return {
        "status": "ok",
        "service": "koda-inference",
        "modelo": request.app.state.clasificador.nombre,
    }


@app.exception_handler(ImagenInvalidaError)
async def imagen_invalida(_: Request, error: ImagenInvalidaError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"mensaje": str(error)})


@app.exception_handler(ArchivoDemasiadoGrandeError)
async def archivo_grande(_: Request, __: ArchivoDemasiadoGrandeError) -> JSONResponse:
    return JSONResponse(
        status_code=413,
        content={"mensaje": f"La imagen supera el tamaño máximo de {settings.tamano_maximo_mb} MB."},
    )


@app.exception_handler(Exception)
async def error_inesperado(_: Request, error: Exception) -> JSONResponse:
    # RF-17: ningun fallo del modelo tumba el servicio ni expone detalles internos.
    log.exception("Error no controlado durante la inferencia", exc_info=error)
    return JSONResponse(
        status_code=500,
        content={"mensaje": "El modelo de IA no pudo procesar la imagen."},
    )
