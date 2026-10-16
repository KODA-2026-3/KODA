"""Superposicion del mapa de activacion (Grad-CAM) sobre la radiografia."""
import base64

import cv2
import numpy as np
from PIL import Image

from app.config import settings


def superponer_heatmap(imagen: Image.Image, cam: np.ndarray) -> str:
    """
    Colorea el mapa de activacion (valores 0-1, cualquier resolucion), lo
    superpone sobre la radiografia y devuelve el resultado como PNG en Base64.

    La opacidad de cada pixel es proporcional a su relevancia: las zonas que no
    aportan a la prediccion (por debajo del umbral) muestran la radiografia
    intacta, en vez de quedar tenidas de azul, y las mas relevantes se ven con
    la opacidad maxima.
    """
    base = np.asarray(imagen.convert("RGB"))[:, :, ::-1]  # RGB -> BGR para OpenCV
    alto, ancho = base.shape[:2]

    escala = settings.lado_maximo_heatmap_px / max(alto, ancho)
    if escala < 1:
        ancho, alto = int(ancho * escala), int(alto * escala)
        base = cv2.resize(base, (ancho, alto), interpolation=cv2.INTER_AREA)

    # El modelo ve la imagen estirada a un cuadrado: al redimensionar el mapa a
    # las proporciones originales, cada zona vuelve a su sitio en la radiografia.
    cam = np.clip(cam.astype(np.float32), 0.0, 1.0)
    cam = np.clip(cv2.resize(cam, (ancho, alto), interpolation=cv2.INTER_LINEAR), 0.0, 1.0)

    # TURBO en lugar de JET: misma lectura (azul = poco, rojo = mucho), pero sin
    # bandas falsas de brillo que hacen parecer bordes donde no los hay.
    color = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_TURBO)

    umbral = settings.umbral_heatmap
    alfa = np.clip((cam - umbral) / (1.0 - umbral), 0.0, 1.0) * settings.opacidad_heatmap
    alfa = alfa[:, :, None]

    mezcla = (base * (1.0 - alfa) + color * alfa).round().astype(np.uint8)
    exito, png = cv2.imencode(".png", mezcla)
    if not exito:
        raise RuntimeError("No se pudo codificar el mapa de calor.")
    return base64.b64encode(png.tobytes()).decode("ascii")