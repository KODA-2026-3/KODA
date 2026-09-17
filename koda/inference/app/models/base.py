"""Contrato comun de los clasificadores KL."""
from abc import ABC, abstractmethod
from dataclasses import dataclass

import numpy as np
from PIL import Image

NUMERO_GRADOS_KL = 5


@dataclass(frozen=True)
class Prediccion:
    grado_kl: int
    # Probabilidades de los grados 0 a 4, en ese orden; suman 1.
    probabilidades: list[float]
    # Mapa de activacion con valores entre 0 y 1, a la resolucion del modelo.
    mapa_activacion: np.ndarray

    @property
    def confianza(self) -> float:
        """Probabilidad de la clase predicha (maximo del softmax)."""
        return self.probabilidades[self.grado_kl]


class ClasificadorKL(ABC):
    """
    Clasificador de severidad en la escala Kellgren-Lawrence.

    Cada modelo concreto (simulado, DIKO en PyTorch, uno en Keras...) implementa
    esta interfaz. El resto del servicio no depende del framework, de modo que
    cambiar de modelo es cambiar la configuracion (RNF-M2).
    """

    nombre: str

    @abstractmethod
    def predecir(self, imagen: Image.Image) -> Prediccion:
        ...


def softmax(logits: np.ndarray) -> np.ndarray:
    desplazados = logits - logits.max()
    exponentes = np.exp(desplazados)
    return exponentes / exponentes.sum()
