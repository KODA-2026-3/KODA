"""
Clasificador DIKO_Stage2 (DenseNet201 + InceptionV3), modelo elegido en el
Reporte de Seleccion del Modelo KL.

Fuente: https://www.kaggle.com/code/tahpvm/knee-osteoarthritis-classification
Framework: PyTorch. Su uso en lugar de TensorFlow/Keras requiere la aprobacion
de la directora (requerimiento RDE-02 del SRS).
"""
import threading

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image

from app.models.base import NUMERO_GRADOS_KL, ClasificadorKL, Prediccion

# Preprocesamiento con el que se entreno el modelo (notebook original, seccion 3.2).
TRANSFORMACION = transforms.Compose([
    transforms.Resize((299, 299)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


class ArquitecturaDIKO(nn.Module):
    """
    Copia de la clase DIKO_Stage2 del notebook original. Los nombres de los
    atributos deben coincidir exactamente: son las claves del archivo de pesos.

    Diferencia deliberada: los backbones se construyen sin pesos de ImageNet
    (el archivo de pesos los sobrescribe todos), para no descargar ~150 MB en
    cada arranque ni depender de internet.
    """

    def __init__(self, num_classes: int = NUMERO_GRADOS_KL):
        super().__init__()
        self.num_classes = num_classes

        self.densenet201 = models.densenet201(weights=None)
        self.densenet201_features_dim = self.densenet201.classifier.in_features

        # IMPORTANTE: con pesos de ImageNet, torchvision activa transform_input y
        # aux_logits; sin pesos, transform_input queda en False. El modelo se
        # entreno con True: si no se fuerza, carga sin errores pero predice distinto.
        self.inception_v3 = models.inception_v3(
            weights=None, aux_logits=True, transform_input=True, init_weights=False
        )
        self.inception_features_dim = self.inception_v3.fc.in_features
        self.inception_v3.fc = nn.Identity()

        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))

        self.fc0_densenet = nn.Linear(self.densenet201_features_dim, 1000)
        self.fc0_inception = nn.Linear(self.inception_features_dim, 1000)

        self.dropout0 = nn.Dropout(p=0.2)
        self.fc1 = nn.Linear(2000, 512)
        self.dropout1 = nn.Dropout(p=0.1)

        self.fc2 = nn.Linear(512, 128)
        self.dropout2 = nn.Dropout(p=0.1)

        self.output = nn.Linear(128, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        densenet_features = self.densenet201.features(x)
        inception_features = self.inception_v3(x)
        if isinstance(inception_features, tuple):
            inception_features = inception_features[0]

        densenet_features = self.avgpool(densenet_features)

        densenet_features = densenet_features.view(densenet_features.size(0), -1)
        inception_features = inception_features.view(inception_features.size(0), -1)

        densenet_features = self.fc0_densenet(densenet_features)
        inception_features = self.fc0_inception(inception_features)
        densenet_features = self.dropout0(densenet_features)
        inception_features = self.dropout0(inception_features)

        combined_features = torch.cat((densenet_features, inception_features), 1)

        out = F.relu(self.fc1(combined_features))
        out = self.dropout1(out)
        out = F.relu(self.fc2(out))
        out = self.dropout2(out)
        return self.output(out)


class ClasificadorDIKO(ClasificadorKL):
    nombre = "diko_stage2"

    def __init__(self, ruta_pesos: str):
        self._modelo = ArquitecturaDIKO()
        # weights_only=True: el archivo solo puede contener tensores, no codigo.
        estado = torch.load(ruta_pesos, map_location="cpu", weights_only=True)
        self._modelo.load_state_dict(estado, strict=True)
        self._modelo.eval()

        # Los pesos no se entrenan: solo hacen falta gradientes respecto de las
        # activaciones, para Grad-CAM. Asi no se acumulan gradientes en memoria.
        for parametro in self._modelo.parameters():
            parametro.requires_grad_(False)

        # Grad-CAM registra ganchos sobre el modelo compartido: dos solicitudes
        # simultaneas mezclarian sus activaciones. El candado las ordena.
        self._candado = threading.Lock()

    def predecir(self, imagen: Image.Image) -> Prediccion:
        with self._candado:
            return self._predecir_con_gradcam(imagen)

    def _predecir_con_gradcam(self, imagen: Image.Image) -> Prediccion:
        """
        Grad-CAM sobre la rama DenseNet201: la rama InceptionV3 no conserva la
        dimension espacial (Reporte de Seleccion, seccion 3).
        """
        capturado: dict[str, torch.Tensor] = {}

        def guardar_activacion(_modulo, _entrada, salida):
            capturado["activacion"] = salida
            salida.register_hook(lambda gradiente: capturado.__setitem__("gradiente", gradiente))

        gancho = self._modelo.densenet201.features.register_forward_hook(guardar_activacion)
        try:
            entrada = TRANSFORMACION(imagen.convert("RGB")).unsqueeze(0).requires_grad_(True)
            logits = self._modelo(entrada)

            probabilidades = torch.softmax(logits, dim=1)[0].detach()
            grado = int(torch.argmax(probabilidades).item())

            logits[0, grado].backward()
        finally:
            gancho.remove()

        activacion = capturado["activacion"][0].detach()   # (C, H, W)
        gradiente = capturado["gradiente"][0]             # (C, H, W)
        pesos = gradiente.mean(dim=(1, 2))
        mapa = torch.relu((pesos[:, None, None] * activacion).sum(dim=0))
        mapa = mapa / (mapa.max() + 1e-8)

        return Prediccion(
            grado_kl=grado,
            probabilidades=[float(p) for p in probabilidades],
            mapa_activacion=mapa.numpy().astype(np.float32),
        )
