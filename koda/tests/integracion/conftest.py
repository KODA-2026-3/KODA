"""
Pruebas de integracion KODA (seccion 2.3, casos I-01 a I-10).

Se ejecutan contra el stack real de docker-compose.yml (servicios "backend",
"db" e "inference"). Toda la configuracion se lee de variables de entorno; los
valores por defecto son los de docker-compose.yml y DatosIniciales.java.

Los datos de prueba se aislan: los medicos se crean con correos
it-<aleatorio>@koda.test y todos los analisis que generan se eliminan al final,
aunque alguna prueba falle.
"""
from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import re
import subprocess
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path

import httpx
import psycopg
import pytest

# --------------------------------------------------------------------------
# Configuracion (P5)
# --------------------------------------------------------------------------
RAIZ_KODA = Path(__file__).resolve().parents[2]  # carpeta koda/ (docker-compose.yml)

API_URL = os.getenv("KODA_API_URL", "http://localhost:8080/api").rstrip("/")
COMPOSE_DIR = Path(os.getenv("KODA_COMPOSE_DIR", str(RAIZ_KODA)))
SERVICIO_INFERENCIA = os.getenv("KODA_SERVICIO_INFERENCIA", "inference")
SERVICIO_BACKEND = os.getenv("KODA_SERVICIO_BACKEND", "backend")

DB_PARAMS = dict(
    host=os.getenv("KODA_DB_HOST", "localhost"),
    port=int(os.getenv("KODA_DB_PORT", "5432")),
    dbname=os.getenv("KODA_DB_NAME", "koda_db"),
    user=os.getenv("KODA_DB_USER", "koda_user"),
    password=os.getenv("KODA_DB_PASSWORD", "koda_pass"),
)

# Cuenta con rol ADMIN (crea los medicos de prueba). Por defecto, la sembrada.
ADMIN_EMAIL = os.getenv("KODA_ADMIN_EMAIL", "cmendez@hospital.org")
ADMIN_PASSWORD = os.getenv("KODA_ADMIN_PASSWORD", "OsteoKnee2026!")

# Limites documentados en el plan de pruebas (se contrastan con la config real).
LIMITE_RESPUESTA_S = float(os.getenv("KODA_LIMITE_RESPUESTA_S", "30"))
TAMANO_GRANDE_BYTES = int(10.5 * 1024 * 1024)

# Radiografias del split de test publico (Kaggle, shashwatwork/knee-osteoarthritis-
# dataset-with-severity v1), las mismas que lista inference/datos/test_balanceado.csv.
IMG_VALIDA = os.getenv("KODA_IMG_VALIDA")
IMG_VALIDA_2 = os.getenv("KODA_IMG_VALIDA_2")
DATASET_KAGGLE = "shashwatwork/knee-osteoarthritis-dataset-with-severity/versions/1"
IMAGENES_DATASET = [
    ("test/2/9797850R.png", "9bd873be77db76ce82841522132ff82c"),
    ("test/3/9556464L.png", "727bf2cba1ac095eb6541f9e98f9530e"),
]

TIMEOUT_HTTP = httpx.Timeout(90.0, connect=5.0)

# Indicios de informacion tecnica que no debe ver el medico.
PATRONES_TECNICOS = re.compile(
    r"exception|java\.|org\.springframework|com\.koda|traceback|\.java|\.py\b|"
    r"/app/|stack|http://|inference:5000|sockettimeout|resttemplate|restclient|"
    r"jdbc|sql|null\b|error \d{3}|internal server",
    re.IGNORECASE,
)
PALABRAS_ES = re.compile(
    r"\b(el|la|los|las|de|del|no|un|una|en|por|favor|archivo|imagen|servicio|"
    r"análisis|intente|tamaño|formato|está|momento|nuevamente)\b",
    re.IGNORECASE,
)


# --------------------------------------------------------------------------
# Evidencia: cada prueba registra lo observado; se guarda en resultados/.
# --------------------------------------------------------------------------
EVIDENCIA: dict[str, dict] = {}


def evidencia(caso: str, **datos) -> None:
    EVIDENCIA.setdefault(caso, {}).update(datos)
    print(f"\n[{caso}] " + json.dumps(datos, ensure_ascii=False, default=str))


def pytest_sessionfinish(session, exitstatus):
    salida = Path(os.getenv("KODA_EVIDENCIA", str(Path(__file__).parent / "resultados" / "evidencia.json")))
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(json.dumps(EVIDENCIA, ensure_ascii=False, indent=2, default=str), encoding="utf-8")


# --------------------------------------------------------------------------
# Utilidades
# --------------------------------------------------------------------------
def compose(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["docker", "compose", *args], cwd=COMPOSE_DIR, capture_output=True, text=True, check=check
    )


def salud() -> tuple[int, dict]:
    try:
        r = httpx.get(f"{API_URL}/actuator/health", timeout=10)
        return r.status_code, r.json()
    except (httpx.HTTPError, ValueError):
        return 0, {}


def esperar_stack_saludable(timeout_s: float = 240) -> dict:
    """Backend arriba, BD conectada y modulo de IA alcanzable (P2)."""
    limite = time.monotonic() + timeout_s
    ultimo: dict = {}
    while time.monotonic() < limite:
        _, ultimo = salud()
        comp = ultimo.get("components", {})
        if comp.get("db", {}).get("status") == "UP" and comp.get("moduloIA", {}).get("status") == "UP":
            return ultimo
        time.sleep(2)
    raise TimeoutError(f"El stack no quedo saludable en {timeout_s} s: {ultimo}")


def verificar_mensaje_controlado(respuesta: httpx.Response) -> str:
    """Error en espanol, en el cuerpo uniforme {"mensaje": ...}, sin detalles tecnicos."""
    cuerpo = respuesta.json()
    assert set(cuerpo) == {"mensaje"}, f"Cuerpo de error inesperado: {cuerpo}"
    mensaje = cuerpo["mensaje"]
    assert mensaje and PALABRAS_ES.search(mensaje), f"Mensaje sin indicios de espanol: {mensaje!r}"
    assert not PATRONES_TECNICOS.search(mensaje), f"Mensaje expone detalles tecnicos: {mensaje!r}"
    return mensaje


def login(email: str, password: str) -> httpx.Response:
    return httpx.post(f"{API_URL}/auth/login", json={"email": email, "password": password}, timeout=TIMEOUT_HTTP)


def cliente_autenticado(email: str, password: str) -> httpx.Client:
    r = login(email, password)
    assert r.status_code == 200, f"Login fallido para {email}: {r.status_code} {r.text}"
    token = r.json()["accessToken"]
    return httpx.Client(base_url=API_URL, headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT_HTTP)


@dataclass
class Medico:
    id: str
    correo: str
    contrasena: str
    cliente: httpx.Client


@dataclass
class Registro:
    """Ids de todo lo creado durante la sesion, para limpiarlo al final."""
    analisis: set[int] = field(default_factory=set)
    medicos: set[str] = field(default_factory=set)


# --------------------------------------------------------------------------
# Fixtures (P6)
# --------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def stack_saludable():
    estado = esperar_stack_saludable()
    evidencia("P2", health=estado)
    return estado


@pytest.fixture(scope="session")
def db():
    with psycopg.connect(**DB_PARAMS, autocommit=True) as conexion:
        yield conexion


def consultar(db, sql: str, params=()) -> list[tuple]:
    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall() if cur.description else []


@pytest.fixture(scope="session")
def registro(db):
    reg = Registro()
    yield reg
    # Limpieza (R5): primero los analisis (la FK es ON DELETE SET NULL y dejaria
    # registros sin medico), luego las cuentas de prueba.
    ids_medicos = list(reg.medicos) + [
        f[0] for f in consultar(db, "SELECT id FROM usuarios WHERE correo LIKE 'it-%%@koda.test'")
    ]
    if ids_medicos:
        consultar(db, "DELETE FROM metadatos_analisis WHERE usuario_id = ANY(%s)", (ids_medicos,))
    if reg.analisis:
        consultar(db, "DELETE FROM metadatos_analisis WHERE id = ANY(%s)", (list(reg.analisis),))
    consultar(db, "DELETE FROM usuarios WHERE correo LIKE 'it-%%@koda.test'")


@pytest.fixture(scope="session")
def admin():
    try:
        cliente = cliente_autenticado(ADMIN_EMAIL, ADMIN_PASSWORD)
    except AssertionError as e:
        pytest.fail(f"No se pudo autenticar la cuenta ADMIN (defina KODA_ADMIN_EMAIL/PASSWORD): {e}")
    yield cliente
    cliente.close()


def crear_medico(admin: httpx.Client, registro: Registro, etiqueta: str) -> tuple[httpx.Response, dict]:
    sufijo = uuid.uuid4().hex[:10]
    datos = {
        "nombre": f"Medico Prueba {etiqueta}",
        "correo": f"it-{etiqueta.lower()}-{sufijo}@koda.test",
        "usuario": f"it-{etiqueta.lower()}-{sufijo}",
        "contrasenaTemporal": f"Prueba-{sufijo}!",
        "telefono": None,
        "institucion": "Institucion de prueba",
    }
    r = admin.post("/medicos", json=datos)
    if r.status_code == 201:
        registro.medicos.add(r.json()["id"])
    return r, datos


def _medico(admin, registro, etiqueta) -> Medico:
    r, datos = crear_medico(admin, registro, etiqueta)
    assert r.status_code == 201, f"No se pudo crear el medico de prueba: {r.status_code} {r.text}"
    cliente = cliente_autenticado(datos["correo"], datos["contrasenaTemporal"])
    return Medico(r.json()["id"], datos["correo"], datos["contrasenaTemporal"], cliente)


@pytest.fixture(scope="session")
def medico_a(admin, registro) -> Medico:
    m = _medico(admin, registro, "A")
    yield m
    m.cliente.close()


@pytest.fixture(scope="session")
def medico_b(admin, registro) -> Medico:
    m = _medico(admin, registro, "B")
    yield m
    m.cliente.close()


@pytest.fixture
def inferencia_restaurada():
    """Garantiza que el servicio de inferencia quede activo aunque la prueba falle."""
    yield
    compose("unpause", SERVICIO_INFERENCIA, check=False)
    compose("start", SERVICIO_INFERENCIA, check=False)
    esperar_stack_saludable()


# --------------------------------------------------------------------------
# Archivos de prueba (P4)
# --------------------------------------------------------------------------
def _ruta_dataset(relativa: str, md5: str) -> Path:
    import kagglehub  # mismo mecanismo que inference/scripts/evaluar_test.py

    ruta = Path(kagglehub.dataset_download(DATASET_KAGGLE, path=relativa))
    assert hashlib.md5(ruta.read_bytes()).hexdigest() == md5, f"{relativa} no coincide con su MD5"
    return ruta


@pytest.fixture(scope="session")
def png_valido() -> tuple[str, bytes]:
    ruta = Path(IMG_VALIDA) if IMG_VALIDA else _ruta_dataset(*IMAGENES_DATASET[0])
    return ruta.name, ruta.read_bytes()


@pytest.fixture(scope="session")
def png_valido_2() -> tuple[str, bytes]:
    ruta = Path(IMG_VALIDA_2) if IMG_VALIDA_2 else _ruta_dataset(*IMAGENES_DATASET[1])
    return ruta.name, ruta.read_bytes()


@pytest.fixture(scope="session")
def pdf_como_png() -> tuple[str, bytes]:
    pdf = (
        b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n"
        b"trailer<</Root 1 0 R>>\n%%EOF\n"
    )
    return "documento.png", pdf


@pytest.fixture(scope="session")
def png_negro() -> tuple[str, bytes]:
    from PIL import Image

    buf = io.BytesIO()
    Image.new("L", (512, 512), 0).save(buf, format="PNG")
    return "negra.png", buf.getvalue()


@pytest.fixture(scope="session")
def png_grande(png_valido) -> tuple[str, bytes]:
    """PNG valido (la radiografia) con relleno al final hasta 10,5 MiB exactos."""
    _, datos = png_valido
    return "grande.png", datos + b"\0" * (TAMANO_GRANDE_BYTES - len(datos))


def enviar_predict(cliente: httpx.Client, archivo: tuple[str, bytes], lateralidad: str = "IZQUIERDA",
                   tipo: str = "image/png") -> tuple[httpx.Response, float]:
    nombre, datos = archivo
    inicio = time.perf_counter()
    r = cliente.post("/predict", files={"imagen": (nombre, datos, tipo)}, data={"lateralidad": lateralidad})
    return r, time.perf_counter() - inicio


def heatmap_png(b64: str):
    from PIL import Image

    img = Image.open(io.BytesIO(base64.b64decode(b64)))
    img.load()
    return img
