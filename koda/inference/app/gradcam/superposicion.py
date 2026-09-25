"""Superposicion del mapa de activacion (Grad-CAM) sobre la radiografia."""
import base64

import cv2
import numpy as np
from PIL import Image

from app.config import settings


def superponer_heatmap(imagen: Image.Image, cam: np.ndarray, opacidad: float = 0.45) -> str:
    """
    Colorea el mapa de activacion (valores 0-1, cualquier resolucion), lo
    superpone sobre la radiografia y devuelve el resultado como PNG en Base64.
    """
    base = np.asarray(imagen.convert("RGB"))[:, :, ::-1]  # RGB -> BGR para OpenCV
    alto, ancho = base.shape[:2]

    escala = settings.lado_maximo_heatmap_px / max(alto, ancho)
    if escala < 1:
        ancho, alto = int(ancho * escala), int(alto * escala)
        base = cv2.resize(base, (ancho, alto), interpolation=cv2.INTER_AREA)

    cam = np.clip(cam.astype(np.float32), 0.0, 1.0)
    cam = cv2.resize(cam, (ancho, alto), interpolation=cv2.INTER_LINEAR)
    color = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)

    mezcla = cv2.addWeighted(base, 1.0 - opacidad, color, opacidad, 0)
    exito, png = cv2.imencode(".png", mezcla)
    if not exito:
        raise RuntimeError("No se pudo codificar el mapa de calor.")
    return base64.b64encode(png.tobytes()).decode("ascii")
