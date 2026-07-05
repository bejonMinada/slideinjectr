from fastapi import APIRouter

from app.api.v1.endpoints import presentation

router = APIRouter()
router.include_router(presentation.router, prefix="/v1", tags=["presentation"])
