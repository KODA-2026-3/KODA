"""
Prepara el archivo de pesos de DIKO_Stage2 en un equipo nuevo.

Descarga DIKO.pth de la salida del notebook de los autores en Kaggle (sin
token), comprueba que sea exactamente el checkpoint con el que se hicieron las
pruebas del proyecto y lo convierte a saved_models/diko_stage2_pesos.pt con
scripts/convertir_diko.py.

Uso, desde koda/inference:
    python -m scripts.descargar_pesos
"""
import argparse
import hashlib
import subprocess
import sys
from pathlib import Path

# Version fija: la version 10 del notebook publica otros pesos, con otros
# resultados. La 9 es la del Reporte de Seleccion y las pruebas del sistema.
NOTEBOOK_KAGGLE = "tahpvm/knee-osteoarthritis-classification/versions/9"
SHA256_DIKO = "b78f4a9fe4fdcaba8904cbe0e7b523ee474817eb5ee8c2bdd0f73f9093538c86"


def huella(ruta: Path) -> str:
    sha = hashlib.sha256()
    with ruta.open("rb") as archivo:
        for bloque in iter(lambda: archivo.read(1 << 20), b""):
            sha.update(bloque)
    return sha.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--destino", default="saved_models/diko_stage2_pesos.pt")
    parser.add_argument("--forzar", action="store_true", help="regenerar aunque el archivo de pesos ya exista")
    args = parser.parse_args()
    destino = Path(args.destino)

    if destino.exists() and not args.forzar:
        print(f"{destino} ya existe. Usa --forzar para regenerarlo.")
        return 0

    import kagglehub

    print("Descargando DIKO.pth (202 MB) de Kaggle...")
    origen = Path(kagglehub.notebook_output_download(NOTEBOOK_KAGGLE, path="DIKO.pth"))

    if huella(origen) != SHA256_DIKO:
        print(f"ERROR: {origen} no es el checkpoint esperado (sha256 distinto).")
        return 1
    print("Checkpoint verificado: es el mismo de las pruebas del proyecto.\n", flush=True)

    # En un proceso aparte: convertir_diko tiene que ser el modulo principal
    # para que torch encuentre la clase __main__.DIKO_Stage2 del checkpoint.
    destino.parent.mkdir(parents=True, exist_ok=True)
    return subprocess.call([
        sys.executable, "-m", "scripts.convertir_diko",
        "--origen", str(origen), "--destino", str(destino),
    ])


if __name__ == "__main__":
    sys.exit(main())
