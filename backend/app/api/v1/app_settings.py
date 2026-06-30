from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth import current_admin_user
from app.models.user import User

router = APIRouter(prefix="/app-settings", tags=["app-settings"])

DEFAULTS = {"app_name": "Uninspired Chef", "app_icon": "🥗"}


class BrandingUpdate(BaseModel):
    app_name: str | None = None
    app_icon: str | None = None


@router.get("")
async def get_settings(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("SELECT key, value FROM app_settings"))
    data = {r[0]: r[1] for r in rows}
    return {k: data.get(k, v) for k, v in DEFAULTS.items()}


@router.put("")
async def update_settings(
    body: BrandingUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(current_admin_user),
):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "app_icon" in updates and len(updates["app_icon"]) > 100_000:
        raise HTTPException(status_code=422, detail="Icon image too large (max ~64 KB).")
    for key, value in updates.items():
        await db.execute(
            text("INSERT INTO app_settings (key, value) VALUES (:k, :v) ON CONFLICT(key) DO UPDATE SET value = :v"),
            {"k": key, "v": value},
        )
    await db.commit()
    return await get_settings(db)
