from fastapi import APIRouter

from app.api.v1.recipes import router as recipes_router
from app.api.v1.stores import router as stores_router
from app.api.v1.shopping_lists import router as shopping_lists_router
from app.api.v1.admin import router as admin_router
from app.api.v1.ai import router as ai_router
from app.api.v1.app_settings import router as app_settings_router

api_router = APIRouter()
api_router.include_router(recipes_router)
api_router.include_router(stores_router)
api_router.include_router(shopping_lists_router)
api_router.include_router(admin_router)
api_router.include_router(ai_router)
api_router.include_router(app_settings_router)
