#!/usr/bin/env python3

from __future__ import annotations

import argparse
import base64
import datetime as dt
import json
import os
import struct
import sys
import time
import uuid
import zlib
from dataclasses import dataclass, field
from pathlib import Path

try:
    import requests
except ImportError:  # pragma: no cover
    sys.exit("Falta la libreria requests: pip install requests")

# Cuentas sembradas por DatosIniciales.java
ADMIN = ("cmendez@hospital.org", "OsteoKnee2026!")
MEDICO = ("mgarcia@hospital.org", "OsteoKnee2026!")

MENSAJE_SIN_RODILLA = "Indique si la radiografía es de la rodilla izquierda o derecha."
MENSAJE_CREDENCIALES = "Las credenciales ingresadas no son válidas. Intente nuevamente"

# Texto inicial de los hallazgos por grado (HallazgosPredeterminados.java).
HALLAZGOS_POR_GRADO = [
    "Ausencia de hallazgos radiográficos de osteoartritis.",
    "Estrechamiento dudoso del espacio articular",
    "Osteofitos definidos y posible estrechamiento",
    "Múltiples osteofitos moderados",
    "Osteofitos grandes, marcado estrechamiento",
]

TIEMPO_MAXIMO_S = 30


# --------------------------------------------------------------------------- #
# Registro de resultados
# --------------------------------------------------------------------------- #
@dataclass
class Prueba:
    codigo: str
    nombre: str
    verificaciones: list = field(default_factory=list)  # (descripcion, estado, detalle)
    notas: list = field(default_factory=list)
    error: str | None = None

    def verificar(self, descripcion: str, condicion: bool, detalle: str = "") -> bool:
        self.verificaciones.append((descripcion, "OK" if condicion else "FALLA", detalle))
        return condicion

    def manual(self, descripcion: str, detalle: str = "") -> None:
        self.verificaciones.append((descripcion, "MANUAL", detalle))

    @property
    def estado(self) -> str:
        if self.error:
            return "ERROR"
        estados = {e for _, e, _ in self.verificaciones}
        if "FALLA" in estados:
            return "FALLA"
        if "MANUAL" in estados:
            return "PASA (con verificación manual pendiente)"
        return "PASA" if estados else "SIN EJECUTAR"


PRUEBAS: list[Prueba] = []


def prueba(codigo: str, nombre: str):
    """Decorador: registra la prueba y captura cualquier excepcion como ERROR."""
    def envoltura(funcion):
        def ejecutar(ctx):
            p = Prueba(codigo, nombre)
            PRUEBAS.append(p)
            print(f"\n=== {codigo} {nombre}")
            try:
                funcion(ctx, p)
            except Exception as e:  # noqa: BLE001 - se reporta en el informe
                p.error = f"{type(e).__name__}: {e}"
            for desc, estado, det in p.verificaciones:
                marca = {"OK": "✔", "FALLA": "✘", "MANUAL": "…"}[estado]
                print(f"  {marca} {desc}" + (f"  [{det}]" if det else ""))
            if p.error:
                print(f"  ✘ ERROR: {p.error}")
            print(f"  → {p.estado}")
        ejecutar.codigo = codigo
        return ejecutar
    return envoltura


# --------------------------------------------------------------------------- #
# Utilidades HTTP e imagenes
# --------------------------------------------------------------------------- #
class Cliente:
    def __init__(self, api: str, inferencia: str, timeout: int = 60):
        self.api = api.rstrip("/")
        self.inferencia = inferencia.rstrip("/")
        self.timeout = timeout

    def _h(self, token):
        return {"Authorization": f"Bearer {token}"} if token else {}

    def get(self, ruta, token=None):
        return requests.get(self.api + ruta, headers=self._h(token), timeout=self.timeout)

    def post(self, ruta, token=None, json_=None):
        return requests.post(self.api + ruta, headers=self._h(token), json=json_, timeout=self.timeout)

    def put(self, ruta, token=None, json_=None):
        return requests.put(self.api + ruta, headers=self._h(token), json=json_, timeout=self.timeout)

    def delete(self, ruta, token=None):
        return requests.delete(self.api + ruta, headers=self._h(token), timeout=self.timeout)

    def predict(self, token, nombre, contenido, tipo="image/png", lateralidad="DERECHA"):
        datos = {} if lateralidad is None else {"lateralidad": lateralidad}
        return requests.post(self.api + "/predict", headers=self._h(token),
                             files={"imagen": (nombre, contenido, tipo)}, data=datos,
                             timeout=self.timeout)

    def login(self, correo, contrasena):
        return self.post("/auth/login", json_={"email": correo, "password": contrasena,
                                               "rememberSession": False})

    def token(self, correo, contrasena):
        r = self.login(correo, contrasena)
        if r.status_code != 200:
            raise RuntimeError(f"No se pudo iniciar sesión con {correo}: HTTP {r.status_code} {r.text[:200]}")
        return r.json()["accessToken"]


def mensaje(r) -> str:
    try:
        return r.json().get("mensaje", "")
    except ValueError:
        return r.text[:150]


def png_gris(ancho: int, alto: int, valor: int) -> bytes:
    """PNG en escala de grises de un solo valor, sin dependencias externas."""
    fila = b"\x00" + bytes([valor]) * ancho
    crudo = fila * alto

    def bloque(tipo, datos):
        return (struct.pack(">I", len(datos)) + tipo + datos
                + struct.pack(">I", zlib.crc32(tipo + datos) & 0xFFFFFFFF))

    return (b"\x89PNG\r\n\x1a\n"
            + bloque(b"IHDR", struct.pack(">IIBBBBB", ancho, alto, 8, 0, 0, 0, 0))
            + bloque(b"IDAT", zlib.compress(crudo))
            + bloque(b"IEND", b""))


def fecha_comparable(texto: str) -> str:
    """LocalDateTime de Java con un numero variable de decimales -> texto ordenable."""
    base, _, fraccion = texto.partition(".")
    return base + "." + fraccion.ljust(9, "0")


def tipo_mime(ruta: Path) -> str:
    return "image/jpeg" if ruta.suffix.lower() in (".jpg", ".jpeg") else "image/png"


def resumen_http(r) -> str:
    return f"HTTP {r.status_code}" + (f" «{mensaje(r)}»" if r.status_code >= 400 and mensaje(r) else "")


# --------------------------------------------------------------------------- #
# Contexto compartido entre pruebas
# --------------------------------------------------------------------------- #
class Contexto:
    def __init__(self, args):
        self.args = args
        self.c = Cliente(args.api, args.inferencia, args.timeout)
        self.imagen = Path(args.imagen)
        self.imagen_bytes = self.imagen.read_bytes()
        self.sufijo = uuid.uuid4().hex[:6]
        self.token_admin = None
        self.token_medico = None
        self.token_otro = None          # medico creado en 3.1.1
        self.medico_nuevo = None        # dict con id, correo, contrasena
        self.analisis = None            # ResultadoDTO del analisis principal
        self.analisis_borrable = None   # analisis usado en 3.1.7


# --------------------------------------------------------------------------- #
# Pruebas
# --------------------------------------------------------------------------- #
@prueba("3.1.1", "Registro de usuarios (con correo de bienvenida)")
def p_registro(ctx: Contexto, p: Prueba):
    c = ctx.c
    ctx.token_admin = c.token(*ADMIN)
    correo = ctx.args.correo_nuevo or f"koda.prueba.{ctx.sufijo}@example.com"
    contrasena = f"Temporal{ctx.sufijo}!"
    cuerpo = {"nombre": f"Dr. Prueba {ctx.sufijo}", "correo": correo,
              "usuario": f"prueba{ctx.sufijo}", "contrasenaTemporal": contrasena,
              "telefono": "3000000000", "institucion": "Hospital de Pruebas"}

    r = c.post("/medicos", ctx.token_admin, cuerpo)
    if p.verificar("POST /medicos con datos válidos responde 201", r.status_code == 201, resumen_http(r)):
        creado = r.json()
        ctx.medico_nuevo = {"id": creado["id"], "correo": correo, "contrasena": contrasena}
        p.verificar("La respuesta no incluye la contraseña",
                    not any("contrasena" in k.lower() or "password" in k.lower() for k in creado))

    r2 = c.login(correo, contrasena)
    if p.verificar("El nuevo médico inicia sesión con la contraseña temporal", r2.status_code == 200,
                   resumen_http(r2)):
        ctx.token_otro = r2.json()["accessToken"]

    r3 = c.post("/medicos", ctx.token_admin, {**cuerpo, "usuario": f"otro{ctx.sufijo}"})
    p.verificar("Un correo repetido se rechaza con 409", r3.status_code == 409, resumen_http(r3))

    r4 = c.post("/medicos", ctx.token_admin, {**cuerpo, "correo": "", "usuario": ""})
    p.verificar("Campos obligatorios vacíos se rechazan con 400", r4.status_code == 400, resumen_http(r4))

    p.manual("RF-26: revisar la bandeja de " + correo + " — asunto «KODA: su cuenta fue creada», "
             "con correo, contraseña temporal, enlace …/login e instrucciones para restablecer",
             "si MAIL_HOST está vacío: verificar en el log del backend «No se enviaron las credenciales» "
             "y que la contraseña NO aparezca")
    p.manual("RF-26: el intento con correo repetido (409) NO debe generar un segundo correo")


@prueba("3.1.2", "Login y autenticación")
def p_login(ctx: Contexto, p: Prueba):
    c = ctx.c
    for rol, (correo, clave) in (("médico", MEDICO), ("administrador", ADMIN)):
        r = c.login(correo, clave)
        ok = p.verificar(f"Login de {rol} responde 200 con token", r.status_code == 200
                         and bool(r.json().get("accessToken")), resumen_http(r))
        if ok:
            p.verificar(f"La respuesta del {rol} no expone la contraseña",
                        "password" not in json.dumps(r.json().get("usuario", {})).lower())
    ctx.token_medico = c.token(*MEDICO)
    ctx.token_admin = ctx.token_admin or c.token(*ADMIN)

    r = c.login(MEDICO[0], "ClaveIncorrecta1!")
    p.verificar("Credenciales inválidas → 401 con mensaje genérico",
                r.status_code == 401 and MENSAJE_CREDENCIALES in mensaje(r), resumen_http(r))
    r = c.get("/analisis")
    p.verificar("Solicitud sin token → 401", r.status_code == 401, resumen_http(r))
    r = c.get("/medicos", ctx.token_medico)
    p.verificar("El médico no accede a /medicos → 403", r.status_code == 403, resumen_http(r))
    r = c.predict(ctx.token_admin, ctx.imagen.name, ctx.imagen_bytes, tipo_mime(ctx.imagen))
    p.verificar("El administrador no puede analizar → 403", r.status_code == 403, resumen_http(r))


@prueba("3.1.3", "Clasificación de radiografías (con lateralidad y hallazgos)")
def p_clasificacion(ctx: Contexto, p: Prueba):
    c, t = ctx.c, ctx.token_medico
    inicio = time.perf_counter()
    r = c.predict(t, ctx.imagen.name, ctx.imagen_bytes, tipo_mime(ctx.imagen), "DERECHA")
    segundos = time.perf_counter() - inicio
    if not p.verificar("POST /predict con imagen válida y lateralidad=DERECHA responde 200",
                       r.status_code == 200, resumen_http(r)):
        return
    res = ctx.analisis = r.json()
    pred = res["prediccion"]
    p.verificar("Grado KL entre 0 y 4", pred["gradoKL"] in range(5), f"grado {pred['gradoKL']}")
    p.verificar("5 probabilidades que suman ≈ 1", len(pred["probabilidades"]) == 5
                and abs(sum(pred["probabilidades"]) - 1) < 0.02,
                ", ".join(f"{x:.3f}" for x in pred["probabilidades"]))
    p.verificar("El grado es el de mayor probabilidad",
                pred["probabilidades"].index(max(pred["probabilidades"])) == pred["gradoKL"])
    p.verificar("Confianza entre 0 y 1", 0 <= pred["confianza"] <= 1, f"{pred['confianza'] * 100:.1f} %")
    p.verificar(f"Tiempo de respuesta < {TIEMPO_MAXIMO_S} s", segundos < TIEMPO_MAXIMO_S,
                f"{segundos:.2f} s (backend: {res['tiempoProcesamientoMs']} ms), modelo {pred['modelo']}")
    p.verificar("RF-24: la respuesta trae lateralidad=DERECHA", res.get("lateralidad") == "DERECHA",
                str(res.get("lateralidad")))
    p.verificar("RF-25: hallazgos predeterminados del grado predicho",
                (res.get("hallazgos") or "").startswith(HALLAZGOS_POR_GRADO[pred["gradoKL"]]),
                (res.get("hallazgos") or "")[:60] + "…")

    # Errores de lateralidad (RF-24)
    r = c.predict(t, ctx.imagen.name, ctx.imagen_bytes, tipo_mime(ctx.imagen), None)
    p.verificar("Sin lateralidad → 400 con mensaje claro",
                r.status_code == 400 and mensaje(r) == MENSAJE_SIN_RODILLA, resumen_http(r))
    r = c.predict(t, ctx.imagen.name, ctx.imagen_bytes, tipo_mime(ctx.imagen), "CENTRO")
    p.verificar("lateralidad=CENTRO → 400", r.status_code == 400, resumen_http(r))

    # Archivos no validos
    casos = [
        ("PDF con extensión .png", "documento.png", b"%PDF-1.4\n%prueba KODA\n" + b"0" * 2048),
        ("Imagen dañada", "danada.png", ctx.imagen_bytes[:200] + os.urandom(800)),
        ("Imagen en negro", "negra.png", png_gris(256, 256, 0)),
        ("Archivo de 10,5 MB", "grande.png", b"\x89PNG\r\n\x1a\n" + os.urandom(int(10.5 * 1024 * 1024))),
    ]
    for nombre, archivo, contenido in casos:
        r = c.predict(t, archivo, contenido, "image/png", "IZQUIERDA")
        p.verificar(f"{nombre} → error con mensaje en español",
                    400 <= r.status_code < 500 and bool(mensaje(r)), resumen_http(r))

    r = c.predict(t, ctx.imagen.name, ctx.imagen_bytes, tipo_mime(ctx.imagen), "IZQUIERDA")
    if p.verificar("Tras los errores, el sistema sigue clasificando (200, lateralidad IZQUIERDA)",
                   r.status_code == 200 and r.json().get("lateralidad") == "IZQUIERDA", resumen_http(r)):
        ctx.analisis_borrable = r.json()


@prueba("3.1.4", "Generación de mapa de calor")
def p_heatmap(ctx: Contexto, p: Prueba):
    if not p.verificar("Existe un análisis de 3.1.3", ctx.analisis is not None):
        return
    pred = ctx.analisis["prediccion"]
    datos = base64.b64decode(pred["heatmapBase64"].split(",")[-1])
    p.verificar("heatmapBase64 es un PNG válido", datos[:8] == b"\x89PNG\r\n\x1a\n", f"{len(datos) / 1024:.0f} KB")
    salida = Path(ctx.args.salida) / f"heatmap_analisis_{ctx.analisis['analisisId']}.png"
    salida.write_bytes(datos)
    p.manual("Abrir el mapa de calor y confirmar que resalta la articulación", str(salida))
    p.verificar("La predicción trae grado y probabilidades junto al mapa",
                pred["gradoKL"] in range(5) and len(pred["probabilidades"]) == 5)


@prueba("3.1.5", "Recuperación de registros")
def p_historial(ctx: Contexto, p: Prueba):
    c, t = ctx.c, ctx.token_medico
    r = c.get("/analisis", t)
    if not p.verificar("GET /analisis responde 200", r.status_code == 200, resumen_http(r)):
        return
    lista = r.json()
    p.verificar("La lista no está vacía", len(lista) > 0, f"{len(lista)} análisis")
    fechas = [fecha_comparable(a["fechaAnalisis"]) for a in lista]
    p.verificar("Ordenada del más reciente al más antiguo", fechas == sorted(fechas, reverse=True))
    campos = {"fechaAnalisis", "nombreArchivo", "gradoKL", "confianza", "probabilidades", "modelo",
              "imagenDisponible", "lateralidad", "hallazgos"}
    faltan = campos - set(lista[0])
    p.verificar("Cada registro trae los campos esperados (incluye lateralidad y hallazgos)", not faltan,
                "faltan: " + ", ".join(sorted(faltan)) if faltan else "")
    if ctx.analisis:
        propio = next((a for a in lista if a["analisisId"] == ctx.analisis["analisisId"]), None)
        p.verificar("El análisis de 3.1.3 aparece con su rodilla", propio is not None
                    and propio["lateralidad"] == "DERECHA")
    sin_rodilla = sum(1 for a in lista if a["lateralidad"] is None)
    if sin_rodilla:
        p.verificar("Los análisis anteriores a V7 (sin rodilla) traen hallazgos predeterminados",
                    all(a["hallazgos"] for a in lista if a["lateralidad"] is None), f"{sin_rodilla} sin rodilla")
    if ctx.token_otro:
        r = c.get("/analisis", ctx.token_otro)
        p.verificar("Otro médico no ve estos análisis en su historial", r.status_code == 200 and all(
            a["analisisId"] != (ctx.analisis or {}).get("analisisId") for a in r.json()))


@prueba("3.1.6", "Recuperación de registro con mapa de calor")
def p_detalle(ctx: Contexto, p: Prueba):
    if not p.verificar("Existe un análisis de 3.1.3", ctx.analisis is not None):
        return
    c, t, i = ctx.c, ctx.token_medico, ctx.analisis["analisisId"]
    r = c.get(f"/analisis/{i}", t)
    if p.verificar(f"GET /analisis/{i} responde 200", r.status_code == 200, resumen_http(r)):
        d = r.json()
        p.verificar("Trae fecha, archivo, grado, probabilidades y modelo",
                    all(d.get(k) is not None for k in ("fechaAnalisis", "nombreArchivo", "gradoKL",
                                                        "probabilidades", "modelo")))
        p.verificar("RF-24/RF-25: trae rodilla y hallazgos", d.get("lateralidad") == "DERECHA"
                    and bool(d.get("hallazgos")))
    for recurso in ("imagen", "heatmap"):
        r = c.get(f"/analisis/{i}/{recurso}", t)
        p.verificar(f"GET /analisis/{i}/{recurso} → 200 con imagen", r.status_code == 200
                    and r.headers.get("Content-Type", "").startswith("image/"), resumen_http(r))
        p.verificar(f"/{recurso} sin caché (Cache-Control: no-store)",
                    "no-store" in r.headers.get("Cache-Control", ""), r.headers.get("Cache-Control", ""))
    if ctx.token_otro:
        r = c.get(f"/analisis/{i}/imagen", ctx.token_otro)
        p.verificar("La radiografía pedida por otro médico → 404", r.status_code == 404, resumen_http(r))
    r = c.get(f"/analisis/{i}/imagen")
    p.verificar("La radiografía sin sesión → 401", r.status_code == 401, resumen_http(r))


@prueba("3.1.7", "Eliminación de la radiografía")
def p_eliminar(ctx: Contexto, p: Prueba):
    if not p.verificar("Existe un análisis de prueba para eliminar", ctx.analisis_borrable is not None):
        return
    c, t, i = ctx.c, ctx.token_medico, ctx.analisis_borrable["analisisId"]
    if ctx.token_otro:
        r = c.delete(f"/analisis/{i}/imagen", ctx.token_otro)
        p.verificar("Otro médico no puede eliminarla → 404", r.status_code == 404, resumen_http(r))
    r = c.delete(f"/analisis/{i}/imagen", t)
    p.verificar(f"DELETE /analisis/{i}/imagen → 204", r.status_code == 204, resumen_http(r))
    r = c.get(f"/analisis/{i}/imagen", t)
    p.verificar("La imagen ya no se entrega → 404", r.status_code == 404, resumen_http(r))
    r = c.get(f"/analisis/{i}", t)
    p.verificar("El registro se conserva (200, imagenDisponible=false)",
                r.status_code == 200 and r.json().get("imagenDisponible") is False, resumen_http(r))


@prueba("3.1.8", "Consulta de estadísticas")
def p_estadisticas(ctx: Contexto, p: Prueba):
    c = ctx.c
    r = c.get("/estadisticas/personales", ctx.token_medico)
    if p.verificar("GET /estadisticas/personales (médico) → 200", r.status_code == 200, resumen_http(r)):
        e = r.json()
        p.verificar("Trae total, hoy, semana, confianza promedio, distribución KL y por día",
                    all(k in e for k in ("totalRadiografias", "radiografiasHoy", "radiografiasSemana",
                                         "confianzaPromedio", "distribucionKL", "radiografiasPorDia")),
                    f"total {e.get('totalRadiografias')}, hoy {e.get('radiografiasHoy')}")
        p.verificar("Cuenta los análisis de esta ejecución (hoy ≥ 2)", e.get("radiografiasHoy", 0) >= 2)
    r = c.get("/estadisticas", ctx.token_admin)
    if p.verificar("GET /estadisticas (administrador) → 200", r.status_code == 200, resumen_http(r)):
        e = r.json()
        p.verificar("Trae médicos activos y totales globales",
                    all(k in e for k in ("totalRadiografias", "radiografiasHoy", "confianzaPromedio",
                                         "medicosActivos", "distribucionKL")),
                    f"total {e.get('totalRadiografias')}, médicos activos {e.get('medicosActivos')}")
    r = c.get("/estadisticas", ctx.token_medico)
    p.verificar("El médico no accede a las estadísticas globales → 403", r.status_code == 403, resumen_http(r))


@prueba("3.1.9", "Recuperación de contraseña")
def p_recuperacion(ctx: Contexto, p: Prueba):
    if not p.verificar("Existe el médico de prueba de 3.1.1", ctx.medico_nuevo is not None):
        return
    c, m = ctx.c, ctx.medico_nuevo
    r = c.post("/auth/recuperacion", json_={"correo": m["correo"]})
    p.verificar("POST /auth/recuperacion → 204", r.status_code == 204, resumen_http(r))
    r = c.post("/auth/recuperacion", json_={"correo": f"noexiste.{ctx.sufijo}@example.com"})
    p.verificar("Un correo desconocido recibe la misma respuesta (204)", r.status_code == 204, resumen_http(r))

    codigo = ctx.args.codigo
    if not codigo and sys.stdin.isatty() and not ctx.args.sin_interaccion:
        codigo = input(f"  Código de 6 dígitos enviado a {m['correo']} "
                       "(o en el log del backend si MAIL_HOST está vacío; Enter para omitir): ").strip()
    if not codigo:
        p.manual("Completar el restablecimiento con el código", "ejecute de nuevo con --codigo o hágalo en /recuperar")
        return
    nueva = f"Nueva{ctx.sufijo}2026!"
    cuerpo = {"correo": m["correo"], "codigo": codigo, "nuevaContrasena": nueva}
    r = c.post("/auth/recuperacion/restablecer", json_=cuerpo)
    p.verificar("POST /auth/recuperacion/restablecer → 204", r.status_code == 204, resumen_http(r))
    r = c.login(m["correo"], nueva)
    p.verificar("Inicia sesión con la nueva contraseña", r.status_code == 200, resumen_http(r))
    r = c.post("/auth/recuperacion/restablecer", json_={**cuerpo, "nuevaContrasena": nueva + "x"})
    p.verificar("El mismo código no se puede usar dos veces → 400", r.status_code == 400, resumen_http(r))


@prueba("3.1.10", "Exportar resultado en PDF")
def p_pdf(ctx: Contexto, p: Prueba):
    # El PDF se genera en el navegador (jsPDF): la verificacion es manual.
    if not p.verificar("Existe un análisis de 3.1.3", ctx.analisis is not None):
        return
    url = f"{ctx.args.frontend.rstrip('/')}/app/resultado/{ctx.analisis['analisisId']}"
    p.manual("Abrir el resultado como mgarcia@hospital.org y pulsar Descargar reporte", url)
    for punto in ("datos del análisis (fecha, archivo, modelo)", "fila «Rodilla: Derecha» (RF-24)",
                  "radiografía original con el contraste elegido", "mapa de calor", "grado KL y confianza",
                  "sección «Hallazgos radiográficos» con el texto que se ve en pantalla, "
                  "aunque no se haya guardado (RF-25)", "aviso de limitación clínica (RF-16)",
                  "YA NO aparece la distribución de probabilidades por grado"):
        p.manual("El PDF contiene: " + punto)


@prueba("3.1.11", "Estado del sistema")
def p_estado(ctx: Contexto, p: Prueba):
    c = ctx.c
    r = c.get("/actuator/health")
    if p.verificar("GET /api/actuator/health → 200", r.status_code == 200, resumen_http(r)):
        salud = r.json()
        p.verificar("Estado general UP", salud.get("status") == "UP", salud.get("status", ""))
        ia = salud.get("components", {}).get("moduloIA", {})
        p.verificar("Módulo de IA UP con modelo informado", ia.get("status") == "UP",
                    json.dumps(ia.get("details", {}), ensure_ascii=False))
    r = requests.get(c.inferencia + "/health", timeout=c.timeout)
    if p.verificar("GET /health del servicio de inferencia → 200", r.status_code == 200, resumen_http(r)):
        p.verificar("Modelo cargado diko_stage2", r.json().get("modelo") == "diko_stage2",
                    r.json().get("modelo", ""))


@prueba("3.1.12", "Edición de hallazgos radiográficos (RF-25)")
def p_hallazgos(ctx: Contexto, p: Prueba):
    if not p.verificar("Existe un análisis de 3.1.3", ctx.analisis is not None):
        return
    c, t, i = ctx.c, ctx.token_medico, ctx.analisis["analisisId"]
    texto = f"Hallazgos revisados por el médico en la prueba {ctx.sufijo}.\nSegunda línea."
    r = c.put(f"/analisis/{i}/hallazgos", t, {"hallazgos": f"   {texto}   "})
    p.verificar("PUT /analisis/{id}/hallazgos → 200 con el texto sin espacios sobrantes",
                r.status_code == 200 and r.json().get("hallazgos") == texto, resumen_http(r))
    r = c.get(f"/analisis/{i}", t)
    p.verificar("GET /analisis/{id} devuelve el texto guardado (incluye saltos de línea)",
                r.status_code == 200 and r.json().get("hallazgos") == texto)
    r = c.put(f"/analisis/{i}/hallazgos", t, {"hallazgos": "   "})
    p.verificar("Texto vacío → 400", r.status_code == 400, resumen_http(r))
    r = c.put(f"/analisis/{i}/hallazgos", t, {"hallazgos": "a" * 2001})
    p.verificar("Texto de 2001 caracteres → 400", r.status_code == 400, resumen_http(r))
    r = c.put(f"/analisis/{i}/hallazgos", t, {"hallazgos": "a" * 2000})
    p.verificar("Texto de exactamente 2000 caracteres → 200", r.status_code == 200, resumen_http(r))
    if ctx.token_otro:
        r = c.put(f"/analisis/{i}/hallazgos", ctx.token_otro, {"hallazgos": "intento ajeno"})
        p.verificar("Otro médico → 404", r.status_code == 404, resumen_http(r))
    r = c.put(f"/analisis/{i}/hallazgos", None, {"hallazgos": "sin sesión"})
    p.verificar("Sin token → 401", r.status_code == 401, resumen_http(r))
    r = c.put(f"/analisis/{i}/hallazgos", ctx.token_admin, {"hallazgos": "administrador"})
    p.verificar("Administrador → 403", r.status_code == 403, resumen_http(r))
    # Deja el texto legible para revisar el PDF (3.1.10).
    c.put(f"/analisis/{i}/hallazgos", t, {"hallazgos": texto})


def limpiar(ctx: Contexto):
    if ctx.medico_nuevo and ctx.token_admin and not ctx.args.conservar_medico:
        r = ctx.c.delete(f"/medicos/{ctx.medico_nuevo['id']}", ctx.token_admin)
        print(f"\nLimpieza: DELETE /medicos/{ctx.medico_nuevo['id']} → HTTP {r.status_code}")


# --------------------------------------------------------------------------- #
# Informe
# --------------------------------------------------------------------------- #
def escribir_informe(ctx: Contexto, inicio: dt.datetime):
    salida = Path(ctx.args.salida)
    lineas = [
        "# Resultados de las Pruebas de Concepto — KODA",
        "",
        f"- Fecha de ejecución: {inicio:%Y-%m-%d %H:%M}",
        f"- Backend: {ctx.args.api} · Inferencia: {ctx.args.inferencia}",
        f"- Radiografía usada: {ctx.imagen.name} ({len(ctx.imagen_bytes) / 1024:.0f} KB)",
        "",
        "| Prueba | Nombre | Estado | Verificaciones OK |",
        "|---|---|---|---|",
    ]
    for p in PRUEBAS:
        ok = sum(1 for _, e, _ in p.verificaciones if e == "OK")
        auto = sum(1 for _, e, _ in p.verificaciones if e != "MANUAL")
        lineas.append(f"| {p.codigo} | {p.nombre} | {p.estado} | {ok}/{auto} |")
    for p in PRUEBAS:
        lineas += ["", f"## {p.codigo}. {p.nombre}", "", f"**Estado:** {p.estado}", ""]
        for desc, estado, det in p.verificaciones:
            lineas.append(f"- [{estado}] {desc}" + (f" — {det}" if det else ""))
        if p.error:
            lineas.append(f"- [ERROR] {p.error}")
    (salida / "resultados_pruebas_concepto.md").write_text("\n".join(lineas) + "\n", encoding="utf-8")
    datos = [{"codigo": p.codigo, "nombre": p.nombre, "estado": p.estado, "error": p.error,
              "verificaciones": [{"descripcion": d, "estado": e, "detalle": x} for d, e, x in p.verificaciones]}
             for p in PRUEBAS]
    (salida / "resultados_pruebas_concepto.json").write_text(
        json.dumps({"fecha": inicio.isoformat(), "pruebas": datos}, ensure_ascii=False, indent=2),
        encoding="utf-8")
    print(f"\nInforme: {salida / 'resultados_pruebas_concepto.md'}")


def main():
    ap = argparse.ArgumentParser(description="Pruebas de Concepto de KODA (sección 3.1 del Plan de Pruebas)")
    ap.add_argument("--imagen", required=True, help="Radiografía de rodilla válida (PNG o JPEG, < 10 MB)")
    ap.add_argument("--api", default="http://localhost:8080/api")
    ap.add_argument("--inferencia", default="http://localhost:5000")
    ap.add_argument("--frontend", default="http://localhost:4200")
    ap.add_argument("--correo-nuevo", help="Correo real del médico de prueba (para recibir los correos)")
    ap.add_argument("--codigo", help="Código de recuperación de 6 dígitos (3.1.9)")
    ap.add_argument("--sin-interaccion", action="store_true", help="No pedir el código por consola")
    ap.add_argument("--conservar-medico", action="store_true", help="No eliminar el médico de prueba al final")
    ap.add_argument("--salida", default=".", help="Carpeta del informe y del mapa de calor")
    ap.add_argument("--timeout", type=int, default=60)
    ap.add_argument("--solo", nargs="*", help="Ejecutar solo algunas pruebas, p. ej. --solo 3.1.3 3.1.12")
    args = ap.parse_args()
    Path(args.salida).mkdir(parents=True, exist_ok=True)

    ctx = Contexto(args)
    inicio = dt.datetime.now()
    # El orden importa: 3.1.1 crea el segundo médico y 3.1.3 el análisis que usan las demás.
    secuencia = [p_registro, p_login, p_clasificacion, p_heatmap, p_historial, p_detalle,
                 p_eliminar, p_estadisticas, p_hallazgos, p_recuperacion, p_pdf, p_estado]
    try:
        for funcion in secuencia:
            if args.solo and funcion.codigo not in args.solo and funcion.codigo not in ("3.1.1", "3.1.2", "3.1.3"):
                continue
            funcion(ctx)
    finally:
        limpiar(ctx)
        PRUEBAS.sort(key=lambda p: [int(x) for x in p.codigo.split(".")])
        escribir_informe(ctx, inicio)
    sys.exit(1 if any(p.estado in ("FALLA", "ERROR") for p in PRUEBAS) else 0)


if __name__ == "__main__":
    main()
