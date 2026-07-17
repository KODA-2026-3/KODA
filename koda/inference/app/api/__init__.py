from fastapi import APIRouter

from app.api.routes import diagnostico

router = APIRouter()
router.include_router(diagnostico.router, prefix="/diagnostico", tags=["diagnostico"])
