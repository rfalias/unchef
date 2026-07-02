from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.recipe import Recipe
from app.schemas.recipe import RecipeListResponse, RecipeRead

router = APIRouter(prefix="/public", tags=["public"])


async def _require_public(db: AsyncSession) -> None:
    result = await db.execute(text("SELECT value FROM app_settings WHERE key = 'public_recipes'"))
    value = result.scalar_one_or_none()
    if value != "true":
        raise HTTPException(status_code=403, detail="Public recipe browsing is not enabled.")


@router.get("/branding")
async def get_public_branding(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        text("SELECT key, value FROM app_settings WHERE key IN ('app_name','app_icon','theme_palette','theme_accent','theme_muted')")
    )
    data = {r[0]: r[1] for r in rows}
    return {
        "app_name":      data.get("app_name", "Uninspired Chef"),
        "app_icon":      data.get("app_icon", "🥗"),
        "theme_palette": data.get("theme_palette", "charcoal"),
        "theme_accent":  data.get("theme_accent", "green"),
        "theme_muted":   data.get("theme_muted", "default"),
    }


@router.get("/recipes", response_model=RecipeListResponse)
async def list_public_recipes(
    q: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    await _require_public(db)
    query = select(Recipe)
    if q:
        pattern = f"%{q}%"
        query = query.where(or_(Recipe.title.ilike(pattern)))
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    recipes = (await db.execute(query.order_by(Recipe.created_at.desc()).offset(skip).limit(limit))).scalars().all()
    return {"items": recipes, "total": total, "skip": skip, "limit": limit}


@router.get("/recipes/{recipe_id}", response_model=RecipeRead)
async def get_public_recipe(recipe_id: int, db: AsyncSession = Depends(get_db)):
    await _require_public(db)
    recipe = (await db.execute(select(Recipe).where(Recipe.id == recipe_id))).scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found.")
    return recipe
