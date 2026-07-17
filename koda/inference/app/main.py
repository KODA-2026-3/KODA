"""
KODA - Knee Osteoarthritis Diagnostic Assistant
Servicio de inferencia (clasificacion KL + Grad-CAM)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router as api_router

app = FastAPI(
    title="KODA Inference Service",
    description="Servicio de analisis de radiografias de rodilla (escala Kellgren-Lawrence)",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ajustar en produccion
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "koda-inference"}
