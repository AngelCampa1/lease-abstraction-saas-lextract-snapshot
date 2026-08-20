"""Main v1 API router.

Route modules are included here as they are implemented.
"""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.extractions import router as extractions_router
from app.api.v1.leads import router as leads_router
from app.api.v1.payments import router as payments_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.user import router as user_router
from app.api.v1.webhooks import router as webhooks_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(extractions_router)
router.include_router(leads_router)
router.include_router(payments_router)
router.include_router(tasks_router)
router.include_router(user_router)
router.include_router(webhooks_router)
