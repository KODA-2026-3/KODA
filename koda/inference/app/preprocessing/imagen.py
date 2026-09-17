"""Carga y validacion de la radiografia recibida."""
from io import BytesIO

import numpy as np
from PIL import Image, UnidentifiedImageError

from app.config import settings

FORMATOS_ADMITIDOS = {"PNG", "JPEG"}


class ImagenInvalidaError(Exception):
    """La imagen no puede analizarse. El mensaje se muestra al usuario."""


def cargar_imagen(datos: bytes) -> Image.Image:
    """Decodifica la imagen y verifica que sea apta para el analisis."""
    if not datos:
        raise ImagenInvalidaError("No se recibió ninguna imagen.")

    try:
        imagen = Image.open(BytesIO(datos))
        formato = imagen.format
        imagen = imagen.convert("RGB")
    except (UnidentifiedImageError, OSError) as error:
        raise ImagenInvalidaError(
            "El archivo no es una imagen válida o está dañado."
        ) from error

    if formato not in FORMATOS_ADMITIDOS:
        raise ImagenInvalidaError("El formato de la imagen no es compatible. Use PNG o JPEG.")

    ancho, alto = imagen.size
    if min(ancho, alto) < settings.lado_minimo_px:
        raise ImagenInvalidaError(
            f"La imagen es demasiado pequeña para analizarla "
            f"(mínimo {settings.lado_minimo_px}×{settings.lado_minimo_px} píxeles)."
        )

    gris = np.asarray(imagen.convert("L"), dtype=np.float32)
    if float(gris.std()) < settings.desviacion_minima:
        raise ImagenInvalidaError(
            "La imagen no contiene información suficiente para el análisis "
            "(parece estar en blanco, en negro o vacía)."
        )

    return imagen
