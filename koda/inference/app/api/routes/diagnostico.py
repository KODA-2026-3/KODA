from fastapi import APIRouter, File, UploadFile

router = APIRouter()


@router.post("/predecir")
async def predecir_kl(imagen: UploadFile = File(...)):
    """
    Recibe una radiografia de rodilla y retorna:
    - grado_kl: grado en la escala Kellgren-Lawrence (0-4)
    - confianza: confianza de la prediccion
    - heatmap: mapa de calor Grad-CAM (base64)

    TODO: implementar carga del modelo entrenado y logica de inferencia.
    """
    return {
        "archivo": imagen.filename,
        "grado_kl": None,
        "confianza": None,
        "heatmap": None,
        "mensaje": "Endpoint placeholder - pendiente de integrar modelo",
    }
