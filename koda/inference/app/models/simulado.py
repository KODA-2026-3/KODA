"""
Clasificador SIMULADO. No ejecuta ningun modelo de IA.

Genera predicciones plausibles pero sin ningun valor diagnostico, para poder
integrar y probar el flujo completo (frontend -> backend -> servicio) mientras
el equipo cierra la decision sobre el modelo definitivo. Cada respuesta lleva
modelo="simulado" para que nadie la confunda con un resultado real.
"""
import hashlib

import numpy as np
from PIL import Image

from app.models.base import NUMERO_GRADOS_KL, ClasificadorKL, Prediccion, softmax

LADO_MAPA = 14


class ClasificadorSimulado(ClasificadorKL):
    nombre = "simulado"

    def predecir(self, imagen: Image.Image) -> Prediccion:
        # Semilla derivada de los pixeles: la misma imagen da siempre el mismo
        # resultado, lo que hace reproducibles las pruebas.
        semilla = int.from_bytes(hashlib.sha256(imagen.tobytes()).digest()[:8], "big")
        aleatorio = np.random.default_rng(semilla)

        logits = aleatorio.normal(0.0, 1.6, NUMERO_GRADOS_KL)
        probabilidades = softmax(logits)
        grado = int(np.argmax(probabilidades))

        return Prediccion(
            grado_kl=grado,
            probabilidades=[float(p) for p in probabilidades],
            mapa_activacion=self._mapa_articulacion(aleatorio),
        )

    @staticmethod
    def _mapa_articulacion(aleatorio: np.random.Generator) -> np.ndarray:
        """Mancha gaussiana cerca del centro, donde suele quedar la articulacion."""
        centro_x = 0.5 + aleatorio.uniform(-0.08, 0.08)
        centro_y = 0.5 + aleatorio.uniform(-0.08, 0.08)
        eje = np.linspace(0.0, 1.0, LADO_MAPA)
        x, y = np.meshgrid(eje, eje)
        mapa = np.exp(-(((x - centro_x) ** 2) / 0.02 + ((y - centro_y) ** 2) / 0.03))
        return mapa / mapa.max()
