"""Casos de integracion I-01 a I-10 contra el stack real (docker compose)."""
from __future__ import annotations

import base64
import math
import subprocess
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import httpx
import psycopg
import pytest

from conftest import (
    API_URL, LIMITE_RESPUESTA_S, RAIZ_KODA, SERVICIO_BACKEND, SERVICIO_INFERENCIA, TAMANO_GRANDE_BYTES,
    compose, consultar, crear_medico, enviar_predict, esperar_stack_saludable, evidencia, heatmap_png,
    login, salud, verificar_mensaje_controlado,
)

TOLERANCIA = 1e-9  # flotantes API vs BD (double precision en ambos lados)
_I01: dict = {}


def conteos(db) -> tuple[int, int]:
    return consultar(db, "SELECT (SELECT count(*) FROM metadatos_analisis), (SELECT count(*) FROM imagenes_analisis)")[0]


def predict_ok(medico, archivo, registro) -> dict:
    r, t = enviar_predict(medico.cliente, archivo)
    assert r.status_code == 200, f"/predict valido fallo: {r.status_code} {r.text[:300]}"
    cuerpo = r.json()
    registro.analisis.add(cuerpo["analisisId"])
    return cuerpo | {"_t": t}


def sin_heatmap(cuerpo: dict) -> dict:
    p = dict(cuerpo["prediccion"])
    p["heatmapBase64"] = f"<{len(p['heatmapBase64'])} caracteres base64>"
    return {k: v for k, v in cuerpo.items() if k != "prediccion"} | {"prediccion": p}


# ---------------------------------------------------------------- I-01 (CRITICO)
def test_I01_predict_png_valido(medico_a, png_valido, registro):
    r, t = enviar_predict(medico_a.cliente, png_valido)
    assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
    cuerpo = r.json()
    registro.analisis.add(cuerpo["analisisId"])
    p = cuerpo["prediccion"]

    assert isinstance(p["gradoKL"], int) and 0 <= p["gradoKL"] <= 4
    probs = p["probabilidades"]
    assert len(probs) == 5 and all(isinstance(x, (int, float)) and math.isfinite(x) for x in probs)
    assert isinstance(p["confianza"], (int, float)) and 0 <= p["confianza"] <= 1
    img = heatmap_png(p["heatmapBase64"])
    assert img.format == "PNG" and img.width > 0 and img.height > 0
    assert t < LIMITE_RESPUESTA_S, f"Respuesta en {t:.2f} s (limite {LIMITE_RESPUESTA_S} s)"

    _I01.update(cuerpo=cuerpo, medico_id=medico_a.id, archivo=png_valido[0])
    evidencia("I-01", http=r.status_code, tiempo_s=round(t, 3), suma_probabilidades=sum(probs),
              confianza_igual_max_prob=math.isclose(p["confianza"], max(probs)),
              grado_igual_argmax=p["gradoKL"] == probs.index(max(probs)),
              heatmap={"formato": img.format, "dimensiones": img.size, "modo": img.mode},
              respuesta=sin_heatmap(cuerpo))


# ---------------------------------------------------------------- I-02 (CRITICO)
def test_I02_registro_en_bd_igual_a_api(db):
    if not _I01:
        pytest.fail("I-01 no produjo un analisis; I-02 no puede verificarse")
    cuerpo, p = _I01["cuerpo"], _I01["cuerpo"]["prediccion"]
    filas = consultar(db, """
        SELECT id, usuario_id, nombre_archivo, grado_kl, confianza, probabilidades, modelo,
               fecha_creacion, tiempo_procesamiento_ms, lateralidad, hallazgos
        FROM metadatos_analisis WHERE id = %s""", (cuerpo["analisisId"],))
    assert len(filas) == 1, f"Se esperaba 1 registro, hay {len(filas)}"
    (id_, usuario, archivo, grado, conf, probs_txt, modelo, fecha, tiempo, lado, hallazgos) = filas[0]

    for nombre, valor in dict(usuario=usuario, archivo=archivo, grado=grado, confianza=conf,
                              probabilidades=probs_txt, modelo=modelo, fecha=fecha).items():
        assert valor is not None, f"Campo obligatorio NULL: {nombre}"

    probs_bd = [float(x) for x in probs_txt.split(",")]
    fecha_api = datetime.fromisoformat(cuerpo["fechaAnalisis"])
    comparacion = {
        "medico": (usuario, _I01["medico_id"], usuario == _I01["medico_id"]),
        "archivo": (archivo, cuerpo["nombreArchivo"], archivo == cuerpo["nombreArchivo"] == _I01["archivo"]),
        "grado": (grado, p["gradoKL"], grado == p["gradoKL"]),
        "confianza": (conf, p["confianza"], abs(conf - p["confianza"]) <= TOLERANCIA),
        "probabilidades": (probs_bd, p["probabilidades"], len(probs_bd) == 5 and all(
            abs(a - b) <= TOLERANCIA for a, b in zip(probs_bd, p["probabilidades"]))),
        "modelo": (modelo, p["modelo"], modelo == p["modelo"]),
        "fecha": (fecha, fecha_api, abs(fecha - fecha_api) <= timedelta(milliseconds=1)),
        "tiempo_ms": (tiempo, cuerpo["tiempoProcesamientoMs"], tiempo == cuerpo["tiempoProcesamientoMs"]),
        "lateralidad": (lado, cuerpo["lateralidad"], lado == cuerpo["lateralidad"]),
        "hallazgos": (hallazgos, cuerpo["hallazgos"], hallazgos == cuerpo["hallazgos"]),
    }
    heat = consultar(db, "SELECT heatmap FROM imagenes_analisis WHERE analisis_id = %s", (id_,))
    heat_igual = bool(heat) and bytes(heat[0][0]) == base64.b64decode(p["heatmapBase64"])
    evidencia("I-02", tolerancia_flotantes=TOLERANCIA, heatmap_bd_igual_api=heat_igual,
              comparacion={k: {"bd": v[0], "api": v[1], "coincide": v[2]} for k, v in comparacion.items()})
    distintos = [k for k, v in comparacion.items() if not v[2]]
    assert not distintos, f"Campos que no coinciden: {distintos}"
    assert heat_igual, "El heatmap guardado no coincide con el devuelto por la API"


# ---------------------------------------------------------------- I-03
@pytest.mark.parametrize("subcaso", ["a_pdf_renombrado", "b_imagen_negra", "c_archivo_10_5MB"])
def test_I03_entradas_invalidas(subcaso, request, db, medico_a, png_valido, registro):
    archivo = request.getfixturevalue({"a_pdf_renombrado": "pdf_como_png", "b_imagen_negra": "png_negro",
                                       "c_archivo_10_5MB": "png_grande"}[subcaso])
    antes = conteos(db)
    r, t = enviar_predict(medico_a.cliente, archivo)
    despues = conteos(db)
    datos = dict(http=r.status_code, tiempo_s=round(t, 3), bytes_enviados=len(archivo[1]),
                 conteo_antes=antes, conteo_despues=despues, cuerpo=r.text[:300])
    if r.status_code == 200:
        registro.analisis.add(r.json()["analisisId"])
        evidencia(f"I-03{subcaso[0]}", **datos, hallazgo="El sistema ACEPTO la entrada invalida")
        pytest.fail(f"Hallazgo: la entrada '{subcaso}' fue aceptada (200)")

    mensaje = verificar_mensaje_controlado(r)
    posterior = predict_ok(medico_a, png_valido, registro)
    evidencia(f"I-03{subcaso[0]}", **datos, mensaje=mensaje, predict_posterior_http=200,
              predict_posterior_s=round(posterior["_t"], 3))
    assert 400 <= r.status_code < 500, f"Se esperaba 4xx, llego {r.status_code}"
    assert despues == antes, f"El conteo cambio: {antes} -> {despues}"


# ---------------------------------------------------------------- I-04 (CRITICO)
def test_I04_ia_caida(db, medico_a, png_valido, registro, inferencia_restaurada):
    compose("stop", SERVICIO_INFERENCIA)
    antes = conteos(db)
    r, t = enviar_predict(medico_a.cliente, png_valido)
    despues = conteos(db)
    mensaje = verificar_mensaje_controlado(r) if r.status_code != 200 else None
    r_login = login(medico_a.correo, medico_a.contrasena)

    compose("start", SERVICIO_INFERENCIA)
    inicio = time.monotonic()
    esperar_stack_saludable()
    t_recuperacion = time.monotonic() - inicio
    posterior = predict_ok(medico_a, png_valido, registro)

    evidencia("I-04", paso2_http=r.status_code, paso2_tiempo_s=round(t, 3), paso2_mensaje=mensaje,
              paso3_login_http=r_login.status_code, ia_saludable_tras_start_s=round(t_recuperacion, 1),
              paso5_http=200, paso5_tiempo_s=round(posterior["_t"], 3), conteo_antes=antes,
              conteo_despues=despues)
    assert r.status_code in (502, 503, 504), f"Error no controlado: {r.status_code} {r.text[:200]}"
    assert r_login.status_code == 200 and r_login.json().get("accessToken")
    assert despues == antes, f"El /predict fallido creo registros: {antes} -> {despues}"


# ---------------------------------------------------------------- I-05 (CRITICO)
def test_I05_ia_sin_respuesta(db, medico_a, png_valido, registro, inferencia_restaurada):
    timeout_cfg = 25.0  # koda.inference.read-timeout-ms por defecto (application.yml)
    compose("pause", SERVICIO_INFERENCIA)
    try:
        antes = conteos(db)
        r, t = enviar_predict(medico_a.cliente, png_valido)
        despues = conteos(db)
        incompletos = consultar(db, """
            SELECT count(*) FROM metadatos_analisis m
            WHERE NOT EXISTS (SELECT 1 FROM imagenes_analisis i WHERE i.analisis_id = m.id)
              AND m.usuario_id = %s""", (medico_a.id,))[0][0]
    finally:
        compose("unpause", SERVICIO_INFERENCIA)
    mensaje = verificar_mensaje_controlado(r) if r.status_code != 200 else None
    esperar_stack_saludable()
    posterior = predict_ok(medico_a, png_valido, registro)

    evidencia("I-05", http=r.status_code, tiempo_hasta_respuesta_s=round(t, 2),
              timeout_configurado_s=timeout_cfg, mensaje=mensaje, conteo_antes=antes,
              conteo_despues=despues, analisis_sin_imagen_del_medico=incompletos,
              predict_tras_unpause_http=200, predict_tras_unpause_s=round(posterior["_t"], 3))
    assert r.status_code == 504, f"Se esperaba 504 por timeout, llego {r.status_code} {r.text[:200]}"
    assert timeout_cfg - 1 <= t < LIMITE_RESPUESTA_S, f"Tiempo {t:.2f} s fuera de lo esperado"
    assert despues == antes and incompletos == 0


# ---------------------------------------------------------------- I-06
def test_I06_health_check(inferencia_restaurada):
    codigo_up, estado_up = salud()
    compose("stop", SERVICIO_INFERENCIA)
    detenida = time.monotonic()
    codigo_down, estado_down, retraso = None, {}, None
    while time.monotonic() - detenida < 60:
        codigo_down, estado_down = salud()
        if estado_down.get("components", {}).get("moduloIA", {}).get("status") == "DOWN":
            retraso = time.monotonic() - detenida
            break
        time.sleep(0.5)

    evidencia("I-06", activa={"http": codigo_up, "estado": estado_up.get("status"),
                              "moduloIA": estado_up.get("components", {}).get("moduloIA")},
              detenida={"http": codigo_down, "estado": estado_down.get("status"),
                        "moduloIA": estado_down.get("components", {}).get("moduloIA")},
              retraso_down_s=None if retraso is None else round(retraso, 2))
    assert estado_up.get("status") == "UP" and estado_up["components"]["moduloIA"]["status"] == "UP"
    assert retraso is not None, "El health check nunca reporto DOWN"
    assert estado_down.get("status") == "DOWN"


# ---------------------------------------------------------------- I-07 (CRITICO)
def test_I07_aislamiento_entre_medicos(db, medico_a, medico_b, png_valido, png_valido_2, registro):
    id_a = predict_ok(medico_a, png_valido, registro)["analisisId"]
    id_b = predict_ok(medico_b, png_valido_2, registro)["analisisId"]

    def vista(medico, ajeno):
        lista = medico.cliente.get("/analisis")
        r_ajeno = medico.cliente.get(f"/analisis/{ajeno}")
        propios_bd = {f[0] for f in consultar(db, "SELECT id FROM metadatos_analisis WHERE usuario_id = %s",
                                                (medico.id,))}
        ids = {a["analisisId"] for a in lista.json()}
        return lista.status_code, ids, propios_bd, r_ajeno

    la, ids_a, bd_a, ajeno_a = vista(medico_a, id_b)
    lb, ids_b, bd_b, ajeno_b = vista(medico_b, id_a)
    filas = dict(consultar(db, "SELECT id, usuario_id FROM metadatos_analisis WHERE id = ANY(%s)", ([id_a, id_b],)))

    evidencia("I-07", id_a=id_a, id_b=id_b,
              A={"GET /analisis": la, "ids": sorted(ids_a), f"GET /analisis/{id_b}": ajeno_a.status_code,
                 "cuerpo_ajeno": ajeno_a.text},
              B={"GET /analisis": lb, "ids": sorted(ids_b), f"GET /analisis/{id_a}": ajeno_b.status_code,
                 "cuerpo_ajeno": ajeno_b.text},
              bd={str(k): v for k, v in filas.items()})
    assert la == lb == 200
    assert ids_a == bd_a and id_a in ids_a and id_b not in ids_a
    assert ids_b == bd_b and id_b in ids_b and id_a not in ids_b
    assert ajeno_a.status_code == 404 and ajeno_b.status_code == 404
    verificar_mensaje_controlado(ajeno_a)
    assert filas.get(id_a) == medico_a.id and filas.get(id_b) == medico_b.id


# ---------------------------------------------------------------- I-08
def test_I08_ciclo_de_vida_medico(db, admin, registro):
    r, datos = crear_medico(admin, registro, "C")
    assert r.status_code == 201, f"{r.status_code} {r.text}"
    id_ = r.json()["id"]
    fila = consultar(db, "SELECT contrasena, rol, activo FROM usuarios WHERE id = %s", (id_,))
    r_login = login(datos["correo"], datos["contrasenaTemporal"])
    r_del = admin.delete(f"/medicos/{id_}")
    despues = consultar(db, "SELECT id, activo FROM usuarios WHERE id = %s", (id_,))

    hash_, rol, activo = fila[0]
    evidencia("I-08", post_http=r.status_code, fila={"hash_prefijo": hash_[:7] + "...", "largo_hash": len(hash_),
                                                     "rol": rol, "activo": activo},
              login_http=r_login.status_code, delete_http=r_del.status_code, filas_despues=len(despues),
              borrado="fisico" if not despues else f"logico (activo={despues[0][1]})")
    assert hash_ != datos["contrasenaTemporal"] and hash_.startswith(("$2a$", "$2b$", "$2y$"))
    assert rol == "MEDICO" and activo is True
    assert r_login.status_code == 200 and r_login.json().get("accessToken")
    assert r_del.status_code == 204
    assert not despues, f"La fila sigue existiendo tras DELETE (borrado logico): {despues}"


# ---------------------------------------------------------------- I-09
def test_I09_retencion_7_dias(db, medico_a, png_valido, registro):
    id_ = predict_ok(medico_a, png_valido, registro)["analisisId"]
    # Relativo a la fecha del propio registro: el backend guarda hora local (TZ del
    # contenedor) y now() de PostgreSQL puede estar en otra zona horaria.
    consultar(db, "UPDATE metadatos_analisis SET fecha_creacion = fecha_creacion - interval '8 days' "
                  "WHERE id = %s", (id_,))
    fecha_bd = consultar(db, "SELECT fecha_creacion FROM metadatos_analisis WHERE id = %s", (id_,))[0][0]

    lista = medico_a.cliente.get("/analisis")
    en_lista = [a for a in lista.json() if a["analisisId"] == id_]
    r_id = medico_a.cliente.get(f"/analisis/{id_}")
    r_img = medico_a.cliente.get(f"/analisis/{id_}/imagen")
    r_heat = medico_a.cliente.get(f"/analisis/{id_}/heatmap")
    sigue_en_bd = bool(consultar(db, "SELECT 1 FROM metadatos_analisis WHERE id = %s", (id_,)))
    expira = consultar(db, "SELECT expira_en FROM imagenes_analisis WHERE analisis_id = %s", (id_,))

    evidencia("I-09", id=id_, fecha_creacion_ajustada=fecha_bd, en_listado=bool(en_lista),
              imagenDisponible_listado=en_lista[0]["imagenDisponible"] if en_lista else None,
              get_por_id_http=r_id.status_code,
              imagenDisponible_por_id=r_id.json().get("imagenDisponible") if r_id.status_code == 200 else None,
              get_imagen_http=r_img.status_code, get_heatmap_http=r_heat.status_code,
              mensaje_imagen=r_img.json().get("mensaje") if r_img.status_code != 200 else None,
              registro_sigue_en_bd=sigue_en_bd, imagen_expira_en_bd=expira[0][0] if expira else None)
    # Resultado esperado acordado con el equipo (alineado con RF-19 / RNF-04 / CU-08 F1):
    # el registro se conserva y sigue consultable, pero la radiografia ya no se entrega.
    assert en_lista and en_lista[0]["imagenDisponible"] is False, "El registro debe seguir, sin imagen"
    assert r_id.status_code == 200 and r_id.json()["imagenDisponible"] is False
    assert r_img.status_code == 404 and r_heat.status_code == 404, "La radiografia sigue entregandose"
    verificar_mensaje_controlado(r_img)
    assert sigue_en_bd


def test_I09b_vencimiento_segun_srs(db, medico_a, png_valido, registro):
    """Variante informativa alineada con RF-19 / RDE-04 / CU-08 F1 del SRS: al vencer
    el plazo deja de entregarse la imagen y el registro se conserva con aviso."""
    id_ = predict_ok(medico_a, png_valido, registro)["analisisId"]
    consultar(db, "UPDATE imagenes_analisis SET expira_en = expira_en - interval '8 days' "
                  "WHERE analisis_id = %s", (id_,))
    item = next((a for a in medico_a.cliente.get("/analisis").json() if a["analisisId"] == id_), None)
    r_id = medico_a.cliente.get(f"/analisis/{id_}")
    r_img = medico_a.cliente.get(f"/analisis/{id_}/imagen")
    r_heat = medico_a.cliente.get(f"/analisis/{id_}/heatmap")
    evidencia("I-09b", id=id_, en_listado=item is not None,
              imagenDisponible_listado=item and item["imagenDisponible"],
              get_por_id_http=r_id.status_code, imagenDisponible_por_id=r_id.json().get("imagenDisponible"),
              get_imagen_http=r_img.status_code, get_heatmap_http=r_heat.status_code,
              mensaje_imagen=r_img.json().get("mensaje") if r_img.status_code != 200 else None)
    assert item is not None and item["imagenDisponible"] is False
    assert r_id.status_code == 200 and r_id.json()["imagenDisponible"] is False
    assert r_img.status_code == 404 and r_heat.status_code == 404
    verificar_mensaje_controlado(r_img)


# ---------------------------------------------------------------- I-10
TABLAS = ["usuarios", "metadatos_analisis", "imagenes_analisis", "codigos_recuperacion", "flyway_schema_history"]


def huella(db) -> dict:
    return {t: consultar(db, f"SELECT count(*), md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) "
                             f"FROM {t} x")[0] for t in TABLAS}


def test_I10a_reinicio_backend_conserva_datos(db, medico_a):
    antes = huella(db)
    compose("restart", SERVICIO_BACKEND)
    inicio = time.monotonic()
    esperar_stack_saludable()
    despues = huella(db)
    evidencia("I-10a", reinicio_hasta_saludable_s=round(time.monotonic() - inicio, 1),
              antes={k: v[0] for k, v in antes.items()}, despues={k: v[0] for k, v in despues.items()},
              contenido_identico={k: antes[k] == despues[k] for k in TABLAS})
    assert antes == despues


def _docker(*args, check=True):
    return subprocess.run(["docker", *args], capture_output=True, text=True, check=check)


def test_I10b_migraciones_sobre_bd_vacia():
    """BD nueva en contenedores aparte (no toca el volumen koda_db_data)."""
    sufijo = uuid.uuid4().hex[:6]
    red, cont_db, cont_be = f"koda-it-{sufijo}", f"koda-it-db-{sufijo}", f"koda-it-be-{sufijo}"
    puerto_db, puerto_be = 15432, 18080
    imagen = _docker("inspect", "-f", "{{.Image}}",
                     compose("ps", "-q", SERVICIO_BACKEND).stdout.strip()).stdout.strip()
    esperadas = sorted(int(p.name.split("__")[0][1:]) for p in
                       (RAIZ_KODA / "backend/src/main/resources/db/migration").glob("V*__*.sql"))
    try:
        _docker("network", "create", red)
        _docker("run", "-d", "--name", cont_db, "--network", red, "-p", f"{puerto_db}:5432",
                "-e", "POSTGRES_DB=koda_db", "-e", "POSTGRES_USER=koda_user", "-e", "POSTGRES_PASSWORD=koda_pass",
                "postgres:17-alpine")
        params = dict(host="localhost", port=puerto_db, dbname="koda_db", user="koda_user", password="koda_pass")
        for _ in range(60):
            try:
                with psycopg.connect(**params, connect_timeout=2) as c:
                    tablas_iniciales = c.execute("SELECT count(*) FROM information_schema.tables "
                                                 "WHERE table_schema='public'").fetchone()[0]
                break
            except psycopg.OperationalError:
                time.sleep(1)
        else:
            pytest.fail("La BD vacia no arranco")

        _docker("run", "-d", "--name", cont_be, "--network", red, "-p", f"{puerto_be}:8080",
                "-e", f"DB_URL=jdbc:postgresql://{cont_db}:5432/koda_db", "-e", "DB_USER=koda_user",
                "-e", "DB_PASSWORD=koda_pass", "-e", "INFERENCE_URL=http://inexistente:5000", imagen)
        estado = {}
        for _ in range(120):
            try:
                estado = httpx.get(f"http://localhost:{puerto_be}/api/actuator/health", timeout=5).json()
                if estado.get("components", {}).get("db", {}).get("status") == "UP":
                    break
            except (httpx.HTTPError, ValueError):
                pass
            if _docker("inspect", "-f", "{{.State.Running}}", cont_be).stdout.strip() != "true":
                break
            time.sleep(2)
        logs = _docker("logs", cont_be, check=False).stdout + _docker("logs", cont_be, check=False).stderr

        with psycopg.connect(**params) as c:
            historial = c.execute("SELECT version, description, success FROM flyway_schema_history "
                                  "ORDER BY installed_rank").fetchall()
            tablas = sorted(r[0] for r in c.execute("SELECT table_name FROM information_schema.tables "
                                                    "WHERE table_schema='public'"))
            columnas = sorted(r[0] for r in c.execute("SELECT column_name FROM information_schema.columns "
                                                      "WHERE table_name='metadatos_analisis'"))
        versiones = [int(v) for v, _, ok in historial if v is not None]
        evidencia("I-10b", imagen_backend=imagen, tablas_antes=tablas_iniciales,
                  health_db=estado.get("components", {}).get("db", {}).get("status"),
                  migraciones=[{"version": v, "descripcion": d, "ok": ok} for v, d, ok in historial],
                  versiones_en_repo=esperadas, tablas=tablas, columnas_metadatos=columnas,
                  errores_en_log=[l for l in logs.splitlines() if "ERROR" in l][:5])
        assert tablas_iniciales == 0
        assert estado.get("components", {}).get("db", {}).get("status") == "UP", "El backend no arranco"
        assert versiones == esperadas and all(ok for _, _, ok in historial)
        assert {"usuarios", "metadatos_analisis", "imagenes_analisis", "codigos_recuperacion"} <= set(tablas)
        assert {"probabilidades", "lateralidad", "hallazgos"} <= set(columnas)
    finally:
        _docker("rm", "-f", "-v", cont_be, cont_db, check=False)
        _docker("network", "rm", red, check=False)
