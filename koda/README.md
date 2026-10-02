# KODA — Knee Osteoarthritis Diagnostic Assistant

Plataforma web de apoyo al diagnóstico de osteoartritis de rodilla mediante análisis de imágenes radiográficas, clasificación según la escala de Kellgren-Lawrence (KL) y visualización de zonas de interés con Grad-CAM.

**Grupo 17** — Ingeniería de Sistemas, Pontificia Universidad Javeriana
Directora: Ing. Andrea del Pilar Rueda Olarte

Integrantes:
- Juan Luis Ardila Velasco
- Juan Sebastián Álvarez Rodríguez
- Karla Mariana Martínez Cedeño
- Juan Martín Trejos Vanegas

## Arquitectura

Arquitectura de tres capas:

```
koda/
├── frontend/     # Angular 17 — interfaz clínica
├── backend/      # Spring Boot 3.x — API REST, autenticación, persistencia
├── inference/    # Python / PyTorch — clasificación KL (DIKO_Stage2) + Grad-CAM
├── docs/         # Documentación del proyecto (SRS, anteproyecto, SPMP, etc.)
└── docker-compose.yml
```

## Requisitos previos

- Node.js 20+ y npm
- JDK 17+
- Python 3.11+
- Docker y Docker Compose (opcional, para levantar todo junto)
- PostgreSQL 17 (si no se usa Docker)

## Puesta en marcha

### 1. Clonar variables de entorno

```bash
cp .env.example .env
```

### 2. Opción A — Levantar todo con Docker Compose

```bash
docker compose up --build
```

- Frontend: http://localhost:4200
- Backend: http://localhost:8080/api
- Swagger: http://localhost:8080/swagger-ui.html
- Inferencia: http://localhost:8000/docs

### 2. Opción B — Levantar cada módulo por separado

**Frontend**
```bash
cd frontend
npm install
npm start        # http://localhost:4200
```

**Backend**
```bash
cd backend
mvn spring-boot:run     # http://localhost:8080/api
```

**Inferencia**
```bash
cd inference
python3 -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m scripts.convertir_diko   # una sola vez: genera saved_models/diko_stage2_pesos.pt desde DIKO.pth
uvicorn app.main:app --reload --port 5000
```

Los pesos del modelo no se versionan (~200 MB). Para arrancar sin ellos, con el
clasificador simulado: `KODA_MODELO=simulado`.

## Evaluación del modelo

Mide DIKO_Stage2 sobre el test balanceado: 351 radiografías, 75 por grado KL
(51 de grado 4). No hace falta descargar el dataset ni tener cuenta de Kaggle:
el script baja solo esas imágenes (unos 8 MB) del dataset público
[Knee Osteoarthritis Dataset with Severity Grading](https://www.kaggle.com/datasets/shashwatwork/knee-osteoarthritis-dataset-with-severity)
y verifica cada una contra la huella MD5 de `inference/datos/test_balanceado.csv`.

```bash
cd inference
python -m scripts.evaluar_test --kaggle --lista datos/test_balanceado.csv
```

La primera corrida tarda unos 6 minutos en CPU: 3 a 4 de descarga, una imagen
a la vez, y unos 3 de inferencia. Las imágenes quedan en `~/.cache/kagglehub`,
así que las siguientes corridas no las vuelven a bajar. Resultado esperado:
exactitud 65.5%, ±1 grado 95.4%, kappa cuadrático 0.876.

Con una copia local del dataset: `--dataset <ruta> --split test`, con o sin `--lista`.

## Estructura interna

**frontend/src/app**
- `core/` — servicios, guards, interceptores y modelos transversales
- `shared/` — componentes, pipes y utilidades reutilizables
- `features/` — módulos funcionales (auth, pacientes, radiografías, diagnóstico, dashboard)

**backend/src/main/java/com/koda/backend**
- `controller/` — endpoints REST
- `service/` — lógica de negocio
- `repository/` — acceso a datos (Spring Data JPA)
- `model/` — entidades JPA
- `dto/` — objetos de transferencia
- `config/` — configuración (seguridad, CORS, OpenAPI)
- `security/` — JWT y filtros de autenticación

**inference/app**
- `api/routes/` — endpoints FastAPI
- `models/` — carga y definición de arquitecturas de red
- `preprocessing/` — preparación de imágenes radiográficas
- `inference/` — lógica de predicción del grado KL
- `gradcam/` — generación de mapas de calor

## Estándares de referencia

ISO 25010, ISO 29148, ISO 23053, ISO 9241-210, IEEE 830.
