"""
Mide el clasificador DIKO_Stage2 sobre un split del dataset de Kaggle
(shashwatwork/knee-osteoarthritis-dataset-with-severity), con carpetas 0..4
por grado KL.

Usa la misma carga de imagen (cargar_imagen) y la misma transformacion que el
servicio, pero sin Grad-CAM y por lotes: el grado predicho es el mismo que
devuelve /infer, en una fraccion del tiempo.

Uso, desde koda/inference:
    # Test balanceado (351 imagenes), descargadas de Kaggle sin token:
    python -m scripts.evaluar_test --kaggle --lista datos/test_balanceado.csv

    # Un split completo de una copia local del dataset:
    python -m scripts.evaluar_test --dataset C:\\ruta\\archive --split test

Con --kaggle solo se descargan las imagenes de la lista (unos 6 MB para el
test balanceado), a la cache de kagglehub (~/.cache/kagglehub). Una segunda
corrida no vuelve a descargarlas.
"""
import argparse
import csv
import hashlib
import json
import time
from pathlib import Path

import numpy as np
import torch

from app.config import settings
from app.models.base import NUMERO_GRADOS_KL
from app.models.diko import TRANSFORMACION, ClasificadorDIKO
from app.preprocessing.imagen import cargar_imagen


def kappa_cuadratico(matriz: np.ndarray) -> float:
    """Kappa de Cohen con pesos cuadraticos: penaliza mas errar por varios grados."""
    n = matriz.shape[0]
    pesos = np.array([[(i - j) ** 2 for j in range(n)] for i in range(n)]) / (n - 1) ** 2
    esperada = np.outer(matriz.sum(axis=1), matriz.sum(axis=0)) / matriz.sum()
    return float(1 - (pesos * matriz).sum() / (pesos * esperada).sum())


# Version fija: las mismas imagenes siempre, aunque el autor publique otra version.
DATASET_KAGGLE = "shashwatwork/knee-osteoarthritis-dataset-with-severity/versions/1"


def descargar_de_kaggle(filas: list[dict], split: str) -> list[tuple[Path, int]]:
    """Descarga solo los archivos de la lista y verifica que sean los esperados."""
    import kagglehub

    muestras = []
    for n, fila in enumerate(filas, 1):
        relativa = f"{split}/{fila['grado']}/{fila['archivo']}"
        # Una por una y con reintentos: sin token, Kaggle rechaza las rafagas de
        # solicitudes anonimas (responde 404). Lo ya descargado sale de la cache.
        for intento in range(5):
            try:
                ruta = Path(kagglehub.dataset_download(DATASET_KAGGLE, path=relativa))
                break
            except Exception:
                if intento == 4:
                    raise
                time.sleep(2 ** intento)
        # La huella confirma que Kaggle entrego exactamente la imagen de la lista.
        if hashlib.md5(ruta.read_bytes()).hexdigest() != fila["md5"]:
            raise RuntimeError(f"{fila['archivo']} no coincide con la huella de la lista")
        muestras.append((ruta, int(fila["grado"])))
        print(f"\r{n}/{len(filas)} descargadas", end="", flush=True)
    print()
    return muestras


def main() -> None:
    parser = argparse.ArgumentParser()
    origen = parser.add_mutually_exclusive_group(required=True)
    origen.add_argument("--dataset", type=Path, help="copia local del dataset, con carpetas <split>/0..4")
    origen.add_argument("--kaggle", action="store_true", help="descargar de Kaggle las imagenes de --lista")
    parser.add_argument("--lista", type=Path, help="CSV archivo,grado,md5 con las imagenes a evaluar")
    parser.add_argument("--split", default="test")
    parser.add_argument("--lote", type=int, default=16)
    parser.add_argument("--salida", type=Path, help="archivo JSON con las metricas")
    args = parser.parse_args()

    filas = list(csv.DictReader(args.lista.open(encoding="utf-8"))) if args.lista else None
    if args.kaggle:
        if filas is None:
            parser.error("--kaggle requiere --lista")
        print(f"Descargando {len(filas)} imagenes de Kaggle...")
        muestras = descargar_de_kaggle(filas, args.split)
    elif filas is not None:
        muestras = [(args.dataset / args.split / f["grado"] / f["archivo"], int(f["grado"])) for f in filas]
    else:
        muestras = [
            (ruta, grado)
            for grado in range(NUMERO_GRADOS_KL)
            for ruta in sorted((args.dataset / args.split / str(grado)).glob("*.png"))
        ]
    print(f"{len(muestras)} imagenes en {args.split}")

    modelo = ClasificadorDIKO(settings.ruta_modelo)._modelo
    reales, predichos, confianzas = [], [], []
    inicio = time.perf_counter()

    with torch.inference_mode():
        for i in range(0, len(muestras), args.lote):
            lote = muestras[i : i + args.lote]
            entrada = torch.stack(
                [TRANSFORMACION(cargar_imagen(ruta.read_bytes()).convert("RGB")) for ruta, _ in lote]
            )
            probabilidades = torch.softmax(modelo(entrada), dim=1)
            confianza, grado = probabilidades.max(dim=1)
            reales += [g for _, g in lote]
            predichos += grado.tolist()
            confianzas += confianza.tolist()
            print(f"\r{len(predichos)}/{len(muestras)}", end="", flush=True)

    segundos = time.perf_counter() - inicio
    reales, predichos, confianzas = np.array(reales), np.array(predichos), np.array(confianzas)

    matriz = np.zeros((NUMERO_GRADOS_KL, NUMERO_GRADOS_KL), dtype=int)
    for r, p in zip(reales, predichos):
        matriz[r, p] += 1

    aciertos = reales == predichos
    por_grado = []
    for g in range(NUMERO_GRADOS_KL):
        tp = matriz[g, g]
        por_grado.append({
            "grado": g,
            "imagenes": int(matriz[g].sum()),
            "recall": float(tp / matriz[g].sum()) if matriz[g].sum() else 0.0,
            "precision": float(tp / matriz[:, g].sum()) if matriz[:, g].sum() else 0.0,
        })

    metricas = {
        "modelo": ClasificadorDIKO.nombre,
        "split": args.split,
        "lista": args.lista.name if args.lista else None,
        "imagenes": int(len(reales)),
        "exactitud": float(aciertos.mean()),
        "exactitud_mas_menos_1": float((np.abs(reales - predichos) <= 1).mean()),
        "kappa_cuadratico": kappa_cuadratico(matriz),
        "confianza_media_aciertos": float(confianzas[aciertos].mean()),
        "confianza_media_errores": float(confianzas[~aciertos].mean()),
        "errores_con_confianza_mayor_90": int(((~aciertos) & (confianzas > 0.9)).sum()),
        "por_grado": por_grado,
        "matriz_confusion": matriz.tolist(),
        "segundos": round(segundos, 1),
    }

    print(f"\n\nExactitud: {metricas['exactitud']:.1%}  (±1 grado: {metricas['exactitud_mas_menos_1']:.1%})")
    print(f"Kappa cuadratico: {metricas['kappa_cuadratico']:.3f}")
    print("Matriz de confusion (filas = real, columnas = predicho):")
    for g, fila in enumerate(matriz):
        print(f"  {g}: {fila.tolist()}")
    if args.salida:
        args.salida.write_text(json.dumps(metricas, indent=2), encoding="utf-8")
        print(f"Metricas guardadas en {args.salida}")


if __name__ == "__main__":
    main()
