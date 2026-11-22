<div align="center">

# KODA

### Knee Osteoarthritis Diagnostic Assistant

**Plataforma de Apoyo Diagnóstico de la Osteoartritis de Rodilla a partir de Radiografías**

Trabajo de grado · Ingeniería de Sistemas · Pontificia Universidad Javeriana · 2026

## Autores

**Grupo ISIST-2610-17** — Carrera de Ingeniería de Sistemas, Pontificia Universidad Javeriana, Bogotá

| Integrante |
|---|
| Juan Luis Ardila Velasco |
| Juan Sebastián Álvarez Rodríguez |
| Karla Mariana Martínez Cedeño |
| Juan Martín Trejos Vanegas |

**Directora:** Ing. Andrea del Pilar Rueda Olarte, Ph.D.


</div>

---

> [!WARNING]
> **KODA es una herramienta de apoyo al diagnóstico.** Sus resultados no constituyen un diagnóstico definitivo ni reemplazan el criterio clínico del profesional de la salud, quien tiene la responsabilidad y la última palabra sobre el diagnóstico. Es un prototipo académico: no cuenta con validación clínica ni con certificación como software médico.

## ¿Qué es KODA?

La Osteoartritis de Rodilla es una de las principales causas de discapacidad en adultos mayores. Su severidad se gradúa en radiografías con la escala **Kellgren-Lawrence (KL)**, de 0 (sin osteoartritis) a 4 (severa), una lectura que puede variar entre observadores.

KODA permite que un médico cargue una radiografía de rodilla desde el navegador y obtenga, en segundos:

- 🦴 **El grado KL estimado** por un modelo de inteligencia artificial (DIKO_Stage2: DenseNet201 + InceptionV3).
- 📊 **El nivel de confianza** del resultado y la probabilidad de cada uno de los cinco grados.
- 🔥 **Un mapa de calor** (Grad-CAM refinado con LayerCAM) que señala las zonas de la imagen que más influyeron en la predicción.
- 📝 **Hallazgos radiográficos** propuestos según el grado, que el médico puede revisar y editar.
- 📄 **Un reporte PDF** con la radiografía, el mapa de calor, el resultado y los hallazgos.

## Tipos de usuario

| Rol | Qué puede hacer |
|---|---|
| 👩‍⚕️ **Médico** | Cargar radiografías e indicar la rodilla, ver el grado KL, la confianza y el mapa de calor, ajustar el contraste y la opacidad del mapa, editar los hallazgos, descargar el reporte PDF, consultar su historial y su dashboard de actividad. Cada médico solo ve sus propios análisis. |
| 🛠️ **Administrador** | Crear, editar, desactivar, reactivar y eliminar cuentas de médico; consultar las estadísticas globales de la plataforma y el registro de todos los análisis. No analiza radiografías ni puede ver las imágenes de los médicos. |

## Funcionalidades principales

- Validación de la radiografía antes de analizarla: JPEG o PNG, máximo 10 MB.
- Visor con zoom, contraste e intensidad del mapa de calor ajustables, sin repetir el análisis.
- Indicador del estado del servicio de IA en la barra superior.
- Conservación de la radiografía y su mapa de calor durante 7 días; el resultado del análisis se mantiene en el historial.
- Recuperación de contraseña con un código de 6 dígitos enviado al correo.
- Control de acceso por rol con JWT y cierre de sesión tras 20 minutos de inactividad, con aviso a los 10.



```
koda/
├── frontend/          # Angular 17 — interfaz web
├── backend/           # Spring Boot 3.3 — API REST, seguridad, persistencia (Flyway)
├── inference/         # FastAPI + PyTorch — clasificación KL y Grad-CAM
├── tests/             # Pruebas de integración
└── docker-compose.yml
```

## Puesta en marcha

### Requisitos

- Docker y Docker Compose (recomendado), **o** por separado:
  - Node.js 20+ y npm
  - JDK 17+
  - Python 3.11 (sirven 3.10 a 3.12; con 3.13 o más reciente `pip install` falla porque numpy 1.26.4 y torch 2.5.1 no tienen instaladores para esas versiones)
  - PostgreSQL 17


### Correr Con Docker Compose

```bash
cd koda
docker compose up --build
```

| Servicio | URL |
|---|---|
| Aplicación web | http://localhost:4200 |
| API REST | http://localhost:8080/api |
| Documentación de la API (Swagger) | http://localhost:8080/swagger-ui.html |
| Servicio de inferencia | http://localhost:5000/docs |

### Correr cada módulo por separado

```bash
# Frontend
cd koda/frontend && npm install && npm start          # http://localhost:4200

# Backend
cd koda/backend && mvn spring-boot:run                # http://localhost:8080/api

# Inferencia
cd koda/inference
python3.11 -m venv .venv                              # Windows: py -3.11 -m venv .venv
source .venv/bin/activate                             # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 5000
```

Sin Python 3.11 instalado, [uv](https://docs.astral.sh/uv/) lo descarga solo: `uv venv --python 3.11` y luego `uv pip install -r requirements.txt --index-strategy unsafe-best-match`.








---

<div align="center">
<sub>Proyecto académico desarrollado como trabajo de grado. Uso exclusivo con fines académicos y de investigación.</sub>
</div>