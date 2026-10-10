"""
Clasificador DIKO_Stage2 (DenseNet201 + InceptionV3), modelo elegido en el
Reporte de Seleccion del Modelo KL.

Fuente: https://www.kaggle.com/code/tahpvm/knee-osteoarthritis-classification
Framework: PyTorch (requerimiento RDE-02 del SRS).
"""
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image

from app.config import settings
from app.models.base import NUMERO_GRADOS_KL, ClasificadorKL, Prediccion

LADO_ENTRADA = 299

# Preprocesamiento con el que se entreno el modelo (notebook original, seccion 3.2).
TRANSFORMACION = transforms.Compose([
    transforms.Resize((LADO_ENTRADA, LADO_ENTRADA)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# Capas de InceptionV3 hasta Mixed_7c (2048 x 8 x 8), en el orden de su forward.
# AuxLogits se omite: torchvision solo la ejecuta en modo entrenamiento.
# Corregida esta sección el 9.10 en revisión del gradcam
CAPAS_INCEPTION_HASTA_6E = (
    "Conv2d_1a_3x3", "Conv2d_2a_3x3", "Conv2d_2b_3x3", "maxpool1",
    "Conv2d_3b_1x1", "Conv2d_4a_3x3", "maxpool2",
    "Mixed_5b", "Mixed_5c", "Mixed_5d",
    "Mixed_6a", "Mixed_6b", "Mixed_6c", "Mixed_6d", "Mixed_6e",
)

CAPAS_INCEPTION_DESDE_7A = ("Mixed_7a", "Mixed_7b", "Mixed_7c")

CAPAS_INCEPTION = CAPAS_INCEPTION_HASTA_6E + CAPAS_INCEPTION_DESDE_7A

BLOQUES_DENSENET_HASTA_3 = (
    "conv0", "norm0", "relu0", "pool0",
    "denseblock1", "transition1", "denseblock2", "transition2", "denseblock3",
)

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

    # --- El mismo calculo que forward(), partido en dos para Grad-CAM -------
    # Se usa solo en modo eval. test_diko.py comprueba que ambos caminos dan
    # exactamente los mismos logits.

    def mapas_con_intermedios(
        self, x: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        capas = self.densenet201.features
        h = x

        for nombre in BLOQUES_DENSENET_HASTA_3:
            h = getattr(capas, nombre)(h)

        transicion = capas.transition3
        intermedio_densenet = transicion.relu(transicion.norm(h))
        h = transicion.pool(transicion.conv(intermedio_densenet))
        mapa_densenet = capas.norm5(capas.denseblock4(h))

        inception = self.inception_v3
        h = inception._transform_input(x)

        for nombre in CAPAS_INCEPTION_HASTA_6E:
            h = getattr(inception, nombre)(h)

        intermedio_inception = h

        for nombre in CAPAS_INCEPTION_DESDE_7A:
            h = getattr(inception, nombre)(h)

        mapa_inception = h

        return (
            intermedio_densenet,
            intermedio_inception,
            mapa_densenet,
            mapa_inception,
        )


def mapas_de_caracteristicas(
    self, x: torch.Tensor
) -> tuple[torch.Tensor, torch.Tensor]:
    _, _, mapa_densenet, mapa_inception = self.mapas_con_intermedios(x)
    return mapa_densenet, mapa_inception


def clasificar_mapas(
    self,
    mapa_densenet: torch.Tensor,
    mapa_inception: torch.Tensor,
) -> torch.Tensor:
    densenet_features = torch.flatten(self.avgpool(mapa_densenet), 1)
    inception_features = torch.flatten(
        self.inception_v3.avgpool(mapa_inception), 1
    )

    densenet_features = self.dropout0(
        self.fc0_densenet(densenet_features)
    )
    inception_features = self.dropout0(
        self.fc0_inception(inception_features)
    )

    combined_features = torch.cat(
        (densenet_features, inception_features), 1
    )

    out = self.dropout1(F.relu(self.fc1(combined_features)))
    out = self.dropout2(F.relu(self.fc2(out)))

    return self.output(out)

    def clasificar_mapas(self, mapa_densenet: torch.Tensor, mapa_inception: torch.Tensor) -> torch.Tensor:
        """Logits a partir de los mapas de mapas_de_caracteristicas()."""
        densenet_features = torch.flatten(self.avgpool(mapa_densenet), 1)
        # Dropout de InceptionV3 y fc (Identity) no cambian nada en modo eval.
        inception_features = torch.flatten(self.inception_v3.avgpool(mapa_inception), 1)

        densenet_features = self.dropout0(self.fc0_densenet(densenet_features))
        inception_features = self.dropout0(self.fc0_inception(inception_features))
        combined_features = torch.cat((densenet_features, inception_features), 1)

        out = self.dropout1(F.relu(self.fc1(combined_features)))
        out = self.dropout2(F.relu(self.fc2(out)))
        return self.output(out)


def grad_cam(mapa: torch.Tensor, gradiente: torch.Tensor) -> torch.Tensor:
    """
    Grad-CAM de una rama, interpolado a la resolucion de entrada (299x299).

    Los pesos de canal usan la SUMA de los gradientes (no la media, como el
    Grad-CAM original). Dentro de una rama da el mismo mapa salvo una escala,
    pero asi el promedio del mapa (antes de la ReLU) es igual a lo que esa
    rama aporta al logit: los mapas de DenseNet (9x9) e Inception (8x8)
    quedan en la misma escala y se pueden sumar sin favorecer a ninguno.
    """
    pesos = gradiente.sum(dim=(2, 3), keepdim=True)
    cam = torch.relu((pesos * mapa).sum(dim=1, keepdim=True))
    return _a_resolucion_de_entrada(cam)


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

        # Sin ganchos ni estado compartido (cada solicitud calcula sus propios
        # gradientes con torch.autograd.grad), por eso no hace falta un candado.

    def predecir(self, imagen: Image.Image) -> Prediccion:
        entrada = (
            TRANSFORMACION(imagen.convert("RGB"))
            .unsqueeze(0)
            .requires_grad_(True)
        )

        (
            intermedio_densenet,
            intermedio_inception,
            mapa_densenet,
            mapa_inception,
        ) = self._modelo.mapas_con_intermedios(entrada)

        logits = self._modelo.clasificar_mapas(
            mapa_densenet, mapa_inception
        )

        probabilidades = torch.softmax(logits, dim=1)[0].detach()
        grado = int(torch.argmax(probabilidades).item())

        tensores = (
            mapa_densenet,
            mapa_inception,
            intermedio_densenet,
            intermedio_inception,
        )

        gradientes = torch.autograd.grad(logits[0, grado], tensores)

        g_densenet, g_inception, g_inter_densenet, g_inter_inception = gradientes

        mapa = _normalizar(
            grad_cam(mapa_densenet.detach(), g_densenet)
            + grad_cam(mapa_inception.detach(), g_inception)
        )

        if settings.gradcam_refinado and mapa.amax() > 0:
            detalle = 0.5 * (
                layer_cam(
                    intermedio_densenet.detach(), g_inter_densenet
                )
                + layer_cam(
                    intermedio_inception.detach(), g_inter_inception
                )
            )

            refinado = mapa * detalle

            if refinado.amax() > 0.05 * mapa.amax() * detalle.amax():
                mapa = _normalizar(refinado)

        mapa = mapa[0, 0]

        return Prediccion(
            grado_kl=grado,
            probabilidades=[float(p) for p in probabilidades],
            mapa_activacion=mapa.numpy().astype(np.float32),
        )