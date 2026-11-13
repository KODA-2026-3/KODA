# Resultados de las Pruebas de Concepto — KODA

- Fecha de ejecución: 2026-11-12 19:41
- Backend: http://localhost:8080/api · Inferencia: http://localhost:5000
- Radiografía usada: rx_A.png (22 KB)

| Prueba | Nombre | Estado | Verificaciones OK |
|---|---|---|---|
| 3.1.1 | Registro de usuarios (con correo de bienvenida) | PASA (con verificación manual pendiente) | 5/5 |
| 3.1.2 | Login y autenticación | PASA | 8/8 |
| 3.1.3 | Clasificación de radiografías (con lateralidad y hallazgos) | PASA | 15/15 |
| 3.1.4 | Generación de mapa de calor | PASA (con verificación manual pendiente) | 3/3 |
| 3.1.5 | Recuperación de registros | PASA | 7/7 |
| 3.1.6 | Recuperación de registro con mapa de calor | PASA | 10/10 |
| 3.1.7 | Eliminación de la radiografía | PASA | 5/5 |
| 3.1.8 | Consulta de estadísticas | PASA | 6/6 |
| 3.1.9 | Recuperación de contraseña | PASA | 6/6 |
| 3.1.10 | Exportar resultado en PDF | PASA (con verificación manual pendiente) | 1/1 |
| 3.1.11 | Estado del sistema | PASA | 5/5 |
| 3.1.12 | Edición de hallazgos radiográficos (RF-25) | PASA | 9/9 |

## 3.1.1. Registro de usuarios (con correo de bienvenida)

**Estado:** PASA (con verificación manual pendiente)

- [OK] POST /medicos con datos válidos responde 201 — HTTP 201
- [OK] La respuesta no incluye la contraseña
- [OK] El nuevo médico inicia sesión con la contraseña temporal — HTTP 200
- [OK] Un correo repetido se rechaza con 409 — HTTP 409 «Ya existe una cuenta con ese correo electrónico.»
- [OK] Campos obligatorios vacíos se rechazan con 400 — HTTP 400 «usuario: must not be blank»
- [MANUAL] RF-26: revisar la bandeja de ardila20120079@gmail.com — asunto «KODA: su cuenta fue creada», con correo, contraseña temporal, enlace …/login e instrucciones para restablecer — si MAIL_HOST está vacío: verificar en el log del backend «No se enviaron las credenciales» y que la contraseña NO aparezca
- [MANUAL] RF-26: el intento con correo repetido (409) NO debe generar un segundo correo

## 3.1.2. Login y autenticación

**Estado:** PASA

- [OK] Login de médico responde 200 con token — HTTP 200
- [OK] La respuesta del médico no expone la contraseña
- [OK] Login de administrador responde 200 con token — HTTP 200
- [OK] La respuesta del administrador no expone la contraseña
- [OK] Credenciales inválidas → 401 con mensaje genérico — HTTP 401 «Las credenciales ingresadas no son válidas. Intente nuevamente.»
- [OK] Solicitud sin token → 401 — HTTP 401
- [OK] El médico no accede a /medicos → 403 — HTTP 403
- [OK] El administrador no puede analizar → 403 — HTTP 403

## 3.1.3. Clasificación de radiografías (con lateralidad y hallazgos)

**Estado:** PASA

- [OK] POST /predict con imagen válida y lateralidad=DERECHA responde 200 — HTTP 200
- [OK] Grado KL entre 0 y 4 — grado 4
- [OK] 5 probabilidades que suman ≈ 1 — 0.000, 0.000, 0.000, 0.000, 1.000
- [OK] El grado es el de mayor probabilidad
- [OK] Confianza entre 0 y 1 — 100.0 %
- [OK] Tiempo de respuesta < 30 s — 1.01 s (backend: 945 ms), modelo diko_stage2
- [OK] RF-24: la respuesta trae lateralidad=DERECHA — DERECHA
- [OK] RF-25: hallazgos predeterminados del grado predicho — Osteofitos grandes, marcado estrechamiento del espacio artic…
- [OK] Sin lateralidad → 400 con mensaje claro — HTTP 400 «Indique si la radiografía es de la rodilla izquierda o derecha.»
- [OK] lateralidad=CENTRO → 400 — HTTP 400 «Indique si la radiografía es de la rodilla izquierda o derecha.»
- [OK] PDF con extensión .png → error con mensaje en español — HTTP 422 «El formato del archivo no es compatible. Solo se aceptan imágenes JPEG o PNG.»
- [OK] Imagen dañada → error con mensaje en español — HTTP 422 «El archivo no es una imagen válida o está dañado.»
- [OK] Imagen en negro → error con mensaje en español — HTTP 422 «La imagen no contiene información suficiente para el análisis (parece estar en blanco, en negro o vacía).»
- [OK] Archivo de 10,5 MB → error con mensaje en español — HTTP 422 «El archivo excede el tamaño máximo permitido (10 MB). Por favor, seleccione un archivo más pequeño.»
- [OK] Tras los errores, el sistema sigue clasificando (200, lateralidad IZQUIERDA) — HTTP 200

## 3.1.4. Generación de mapa de calor

**Estado:** PASA (con verificación manual pendiente)

- [OK] Existe un análisis de 3.1.3
- [OK] heatmapBase64 es un PNG válido — 72 KB
- [MANUAL] Abrir el mapa de calor y confirmar que resalta la articulación — resultados\heatmap_analisis_30.png
- [OK] La predicción trae grado y probabilidades junto al mapa

## 3.1.5. Recuperación de registros

**Estado:** PASA

- [OK] GET /analisis responde 200 — HTTP 200
- [OK] La lista no está vacía — 31 análisis
- [OK] Ordenada del más reciente al más antiguo
- [OK] Cada registro trae los campos esperados (incluye lateralidad y hallazgos)
- [OK] El análisis de 3.1.3 aparece con su rodilla
- [OK] Los análisis anteriores a V7 (sin rodilla) traen hallazgos predeterminados — 23 sin rodilla
- [OK] Otro médico no ve estos análisis en su historial

## 3.1.6. Recuperación de registro con mapa de calor

**Estado:** PASA

- [OK] Existe un análisis de 3.1.3
- [OK] GET /analisis/30 responde 200 — HTTP 200
- [OK] Trae fecha, archivo, grado, probabilidades y modelo
- [OK] RF-24/RF-25: trae rodilla y hallazgos
- [OK] GET /analisis/30/imagen → 200 con imagen — HTTP 200
- [OK] /imagen sin caché (Cache-Control: no-store) — no-store
- [OK] GET /analisis/30/heatmap → 200 con imagen — HTTP 200
- [OK] /heatmap sin caché (Cache-Control: no-store) — no-store
- [OK] La radiografía pedida por otro médico → 404 — HTTP 404 «No se encontró el análisis.»
- [OK] La radiografía sin sesión → 401 — HTTP 401

## 3.1.7. Eliminación de la radiografía

**Estado:** PASA

- [OK] Existe un análisis de prueba para eliminar
- [OK] Otro médico no puede eliminarla → 404 — HTTP 404 «No se encontró el análisis.»
- [OK] DELETE /analisis/31/imagen → 204 — HTTP 204
- [OK] La imagen ya no se entrega → 404 — HTTP 404 «La radiografía de este análisis ya no está disponible.»
- [OK] El registro se conserva (200, imagenDisponible=false) — HTTP 200

## 3.1.8. Consulta de estadísticas

**Estado:** PASA

- [OK] GET /estadisticas/personales (médico) → 200 — HTTP 200
- [OK] Trae total, hoy, semana, confianza promedio, distribución KL y por día — total 31, hoy 6
- [OK] Cuenta los análisis de esta ejecución (hoy ≥ 2)
- [OK] GET /estadisticas (administrador) → 200 — HTTP 200
- [OK] Trae médicos activos y totales globales — total 31, médicos activos 2
- [OK] El médico no accede a las estadísticas globales → 403 — HTTP 403

## 3.1.9. Recuperación de contraseña

**Estado:** PASA

- [OK] Existe el médico de prueba de 3.1.1
- [OK] POST /auth/recuperacion → 204 — HTTP 204
- [OK] Un correo desconocido recibe la misma respuesta (204) — HTTP 204
- [OK] POST /auth/recuperacion/restablecer → 204 — HTTP 204
- [OK] Inicia sesión con la nueva contraseña — HTTP 200
- [OK] El mismo código no se puede usar dos veces → 400 — HTTP 400 «El código es incorrecto o venció. Verifíquelo o solicite uno nuevo.»

## 3.1.10. Exportar resultado en PDF

**Estado:** PASA (con verificación manual pendiente)

- [OK] Existe un análisis de 3.1.3
- [MANUAL] Abrir el resultado como mgarcia@hospital.org y pulsar Descargar reporte — http://localhost:4200/app/resultado/30
- [MANUAL] El PDF contiene: datos del análisis (fecha, archivo, modelo)
- [MANUAL] El PDF contiene: fila «Rodilla: Derecha» (RF-24)
- [MANUAL] El PDF contiene: radiografía original con el contraste elegido
- [MANUAL] El PDF contiene: mapa de calor
- [MANUAL] El PDF contiene: grado KL y confianza
- [MANUAL] El PDF contiene: sección «Hallazgos radiográficos» con el texto que se ve en pantalla, aunque no se haya guardado (RF-25)
- [MANUAL] El PDF contiene: aviso de limitación clínica (RF-16)
- [MANUAL] El PDF contiene: YA NO aparece la distribución de probabilidades por grado

## 3.1.11. Estado del sistema

**Estado:** PASA

- [OK] GET /api/actuator/health → 200 — HTTP 200
- [OK] Estado general UP — UP
- [OK] Módulo de IA UP con modelo informado — {"url": "http://inference:5000", "modelo": "diko_stage2"}
- [OK] GET /health del servicio de inferencia → 200 — HTTP 200
- [OK] Modelo cargado diko_stage2 — diko_stage2

## 3.1.12. Edición de hallazgos radiográficos (RF-25)

**Estado:** PASA

- [OK] Existe un análisis de 3.1.3
- [OK] PUT /analisis/{id}/hallazgos → 200 con el texto sin espacios sobrantes — HTTP 200
- [OK] GET /analisis/{id} devuelve el texto guardado (incluye saltos de línea)
- [OK] Texto vacío → 400 — HTTP 400 «hallazgos: must not be blank»
- [OK] Texto de 2001 caracteres → 400 — HTTP 400 «hallazgos: no debe superar los 2000 caracteres»
- [OK] Texto de exactamente 2000 caracteres → 200 — HTTP 200
- [OK] Otro médico → 404 — HTTP 404 «No se encontró el análisis.»
- [OK] Sin token → 401 — HTTP 401
- [OK] Administrador → 403 — HTTP 403
