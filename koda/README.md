# KODA — Knee Osteoarthritis Diagnostic Assistant

Plataforma web de apoyo al diagnóstico de osteoartritis de rodilla mediante análisis de imágenes radiográficas, clasificación según la escala de Kellgren-Lawrence (KL) y visualización de zonas de interés con Grad-CAM.

**Grupo 17** — Ingeniería de Sistemas, Pontificia Universidad Javeriana
Directora: Ing. Andrea del Pilar Rueda Olarte

Integrantes:
- Juan Camilo (tu nombre de repo)
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
├── inference/    # Python / TensorFlow-Keras — clasificación KL + Grad-CAM
├── docs/         # Documentación del proyecto (SRS, anteproyecto, SPMP, etc.)
└── docker-compose.yml
```

## Requisitos previos

- Node.js 20+ y npm
- JDK 17+
- Python 3.11+
- Docker y Docker Compose (opcional, para levantar todo junto)
- PostgreSQL 16 (si no se usa Docker)

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
uvicorn app.main:app --reload --port 8000
```

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
