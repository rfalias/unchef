from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth import current_admin_user
from app.models.user import User

router = APIRouter(prefix="/app-settings", tags=["app-settings"])

DEFAULTS = {
    "app_name": "Uninspired Chef",
    "app_icon": "🥗",
    "theme_palette": "charcoal",
    "theme_accent": "green",
    "allow_registration": "true",
}

VALID_PALETTES = {"charcoal", "midnight", "mocha"}
VALID_ACCENTS = {"green", "blue", "purple", "amber", "rose", "cyan"}


class BrandingUpdate(BaseModel):
    app_name: str | None = None
    app_icon: str | None = None
    theme_palette: str | None = None
    theme_accent: str | None = None
    allow_registration: bool | None = None


@router.get("")
async def get_settings(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("SELECT key, value FROM app_settings"))
    data = {r[0]: r[1] for r in rows}
    result = {k: data.get(k, v) for k, v in DEFAULTS.items()}
    result["allow_registration"] = result["allow_registration"] == "true"
    return result


@router.put("")
async def update_settings(
    body: BrandingUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(current_admin_user),
):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "allow_registration" in updates:
        updates["allow_registration"] = "true" if updates["allow_registration"] else "false"
    if "app_icon" in updates and len(updates["app_icon"]) > 100_000:
        raise HTTPException(status_code=422, detail="Icon image too large (max ~64 KB).")
    if "theme_palette" in updates and updates["theme_palette"] not in VALID_PALETTES:
        raise HTTPException(status_code=422, detail=f"Invalid palette. Choose from: {', '.join(VALID_PALETTES)}")
    if "theme_accent" in updates and updates["theme_accent"] not in VALID_ACCENTS:
        raise HTTPException(status_code=422, detail=f"Invalid accent. Choose from: {', '.join(VALID_ACCENTS)}")
    for key, value in updates.items():
        await db.execute(
            text("INSERT INTO app_settings (key, value) VALUES (:k, :v) ON CONFLICT(key) DO UPDATE SET value = :v"),
            {"k": key, "v": value},
        )
    await db.commit()
    return await get_settings(db)
