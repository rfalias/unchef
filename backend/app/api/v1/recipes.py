from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.recipe import Recipe
from app.schemas.recipe import (
    RecipeCreate,
    RecipeImportRequest,
    RecipeListResponse,
    RecipeRead,
    RecipeUpdate,
)
from app.services.image_cache import cache_image, delete_cached_image
from app.services.recipe_importer import import_recipe_from_url

router = APIRouter(prefix="/recipes", tags=["recipes"])


async def _apply_image_cache(recipe: Recipe, db: AsyncSession) -> None:
    """If image_url is a remote URL, download it and update the record in-place."""
    if not recipe.image_url or not recipe.image_url.startswith("http"):
        return
    cached = await cache_image(recipe.id, recipe.image_url)
    if cached:
        recipe.image_url = cached
        await db.commit()


@router.get("", response_model=RecipeListResponse)
async def list_recipes(
    q: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(Recipe)
    if q:
        pattern = f"%{q}%"
        query = query.where(or_(Recipe.title.ilike(pattern)))

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(
        query.order_by(Recipe.created_at.desc()).offset(skip).limit(limit)
    )
    recipes = result.scalars().all()
    return {"items": recipes, "total": total, "skip": skip, "limit": limit}


@router.post("/import")
async def import_recipe(body: RecipeImportRequest):
    try:
        data = await import_recipe_from_url(body.url)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")
    # Return parsed data only — saving is done by the client via POST /recipes
    return data


@router.post("", response_model=RecipeRead, status_code=201)
async def create_recipe(body: RecipeCreate, db: AsyncSession = Depends(get_db)):
    recipe = Recipe(
        **body.model_dump(exclude={"ingredients"}),
        ingredients=[i.model_dump() for i in body.ingredients],
    )
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    await _apply_image_cache(recipe, db)
    return recipe


@router.get("/{recipe_id}", response_model=RecipeRead)
async def get_recipe(recipe_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.put("/{recipe_id}", response_model=RecipeRead)
async def update_recipe(
    recipe_id: int, body: RecipeUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    data = body.model_dump(exclude_none=True, exclude={"ingredients"})
    for k, v in data.items():
        setattr(recipe, k, v)
    if body.ingredients is not None:
        recipe.ingredients = [i.model_dump() for i in body.ingredients]
    await db.commit()
    await db.refresh(recipe)
    await _apply_image_cache(recipe, db)
    return recipe


@router.delete("/{recipe_id}", status_code=204)
async def delete_recipe(recipe_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    delete_cached_image(recipe.id)
    await db.delete(recipe)
    await db.commit()
