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
