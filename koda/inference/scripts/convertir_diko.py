"""
Convierte el checkpoint original DIKO.pth a un archivo de solo pesos.

DIKO.pth se guardo con torch.save(model): contiene el objeto completo, registrado
como "__main__.DIKO_Stage2". Cargarlo exige weights_only=False, que permite
ejecutar codigo arbitrario desde el archivo, y depende de las versiones con que
se guardo. Este script lo carga una sola vez, guarda solo los tensores y
comprueba que el modelo reconstruido produzca exactamente las mismas salidas.

Uso, desde koda/inference:
    .venv\\Scripts\\python.exe -m scripts.convertir_diko
"""
import argparse
import hashlib
import sys
from pathlib import Path

import torch
import torchvision

from app.models.diko import ArquitecturaDIKO

# Para deserializar el checkpoint, la clase tiene que existir con su nombre
# original en el modulo principal.
DIKO_Stage2 = ArquitecturaDIKO

TOLERANCIA = 1e-4


def huella(ruta: Path) -> str:
    sha = hashlib.sha256()
    with ruta.open("rb") as archivo:
        for bloque in iter(lambda: archivo.read(1 << 20), b""):
            sha.update(bloque)
    return sha.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--origen", default="saved_models/DIKO.pth")
    parser.add_argument("--destino", default="saved_models/diko_stage2_pesos.pt")
    args = parser.parse_args()
    origen, destino = Path(args.origen), Path(args.destino)

    print(f"torch {torch.__version__} | torchvision {torchvision.__version__}")
    print(f"Origen:  {origen} ({origen.stat().st_size:,} bytes)")
    print(f"         sha256={huella(origen)}")

    # Unico lugar donde se usa weights_only=False, sobre el archivo publicado por los autores.
    original = torch.load(origen, map_location="cpu", weights_only=False)
    if not isinstance(original, ArquitecturaDIKO):
        print(f"ERROR: el archivo contiene {type(original).__name__}, no DIKO_Stage2")
        return 1
    original.eval()
    print(f"transform_input del original: {original.inception_v3.transform_input} | "
          f"aux_logits: {original.inception_v3.aux_logits}")

    torch.save(original.state_dict(), destino)
    print(f"Destino: {destino} ({destino.stat().st_size:,} bytes)")
    print(f"         sha256={huella(destino)}")

    reconstruido = ArquitecturaDIKO()
    reconstruido.load_state_dict(torch.load(destino, weights_only=True), strict=True)
    reconstruido.eval()

    torch.manual_seed(0)
    entrada = torch.randn(4, 3, 299, 299)
    with torch.no_grad():
        salida_original = original(entrada)
        diferencia = (salida_original - reconstruido(entrada)).abs().max().item()

        # Control negativo: la comprobacion debe detectar el error de transform_input.
        reconstruido.inception_v3.transform_input = False
        diferencia_sin_transform = (salida_original - reconstruido(entrada)).abs().max().item()

    print(f"\nDiferencia maxima con el original:          {diferencia:.2e}")
    print(f"Diferencia si se olvida transform_input=True: {diferencia_sin_transform:.2e}")

    if diferencia < TOLERANCIA < diferencia_sin_transform:
        print("\nCONVERSION CORRECTA: el archivo de pesos reproduce el modelo original.")
        return 0

    print("\nERROR: las salidas no coinciden. No uses el archivo generado.")
    destino.unlink(missing_ok=True)
    return 1


if __name__ == "__main__":
    sys.exit(main())
