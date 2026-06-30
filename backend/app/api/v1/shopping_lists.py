from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.auth import current_admin_user
from app.models.user import User
from app.models.aisle import Aisle
from app.models.ingredient_aisle_pin import IngredientAislePin
from app.models.recipe import Recipe
from app.models.shopping_list import ShoppingList, shopping_list_recipes
from app.models.shopping_list_item import ShoppingListItem
from app.models.store import Store
from app.schemas.shopping_list import (
    AddRecipesRequest,
    AisleGroup,
    ShoppingListCreate,
    ShoppingListItemCreate,
    ShoppingListItemPatch,
    ShoppingListItemRead,
    ShoppingListRead,
    ShoppingListSummary,
    ShoppingListUpdate,
)
from app.schemas.store import AisleRead
from app.services.aisle_matcher import AisleMatcher
from app.services.shopping_list_builder import aggregate_ingredients, sort_items_by_aisle, _canonical_name

router = APIRouter(prefix="/shopping-lists", tags=["shopping-lists"])


async def _load_pins(db: AsyncSession, store_id: int) -> dict[str, int]:
    """Returns {canonical_name: aisle_id} for all pins on a store."""
    result = await db.execute(
        select(IngredientAislePin).where(
            IngredientAislePin.store_id == store_id,
            IngredientAislePin.aisle_id.isnot(None),
        )
    )
    return {p.canonical_name: p.aisle_id for p in result.scalars().all()}


async def _upsert_pin(db: AsyncSession, store_id: int, name: str, aisle_id: int | None) -> None:
    canonical = _canonical_name(name)
    result = await db.execute(
        select(IngredientAislePin).where(
            IngredientAislePin.store_id == store_id,
            IngredientAislePin.canonical_name == canonical,
        )
    )
    pin = result.scalar_one_or_none()
    if aisle_id is None:
        if pin:
            await db.delete(pin)
    else:
        if pin:
            pin.aisle_id = aisle_id
        else:
            db.add(IngredientAislePin(store_id=store_id, canonical_name=canonical, aisle_id=aisle_id))


async def _build_read(sl: ShoppingList, db: AsyncSession) -> ShoppingListRead:
    """Construct ShoppingListRead with aisle_groups from a loaded ShoppingList."""
    aisles = []
    if sl.store_id:
        result = await db.execute(
            select(Aisle)
            .where(Aisle.store_id == sl.store_id)
            .order_by(Aisle.position)
        )
        aisles = result.scalars().all()

    aisle_map: dict[int, Aisle] = {a.id: a for a in aisles}
    grouped = sort_items_by_aisle(sl.items, aisles)

    aisle_groups = []
    for aisle_id, items in grouped.items():
        aisle_obj = aisle_map.get(aisle_id) if aisle_id is not None else None
        aisle_schema = AisleRead.model_validate(aisle_obj) if aisle_obj else None
        aisle_groups.append(
            AisleGroup(
                aisle=aisle_schema,
                items=[ShoppingListItemRead.model_validate(i) for i in items],
            )
        )

    total = len(sl.items)
    checked = sum(1 for i in sl.items if i.is_checked)

    return ShoppingListRead(
        id=sl.id,
        name=sl.name,
        store=sl.store,
        recipes=sl.recipes,
        is_archived=sl.is_archived,
        total_items=total,
        checked_items=checked,
        aisle_groups=aisle_groups,
        created_at=sl.created_at,
        updated_at=sl.updated_at,
    )


async def _load_full(sl_id: int, db: AsyncSession) -> ShoppingList:
    result = await db.execute(
        select(ShoppingList)
        .where(ShoppingList.id == sl_id)
        .options(
            selectinload(ShoppingList.items),
            selectinload(ShoppingList.recipes),
            selectinload(ShoppingList.store),
        )
    )
    sl = result.scalar_one_or_none()
    if not sl:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    return sl


# ── List + Create ─────────────────────────────────────────────────────────────


@router.get("", response_model=list[ShoppingListSummary])
async def list_shopping_lists(
    archived: bool = False,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ShoppingList)
        .where(ShoppingList.is_archived == archived)
        .options(
            selectinload(ShoppingList.items),
            selectinload(ShoppingList.store),
        )
        .order_by(ShoppingList.created_at.desc())
    )
    lists = result.scalars().all()
    summaries = []
    for sl in lists:
        summaries.append(
            ShoppingListSummary(
                id=sl.id,
                name=sl.name,
                store=sl.store,
                is_archived=sl.is_archived,
                total_items=len(sl.items),
                checked_items=sum(1 for i in sl.items if i.is_checked),
                created_at=sl.created_at,
                updated_at=sl.updated_at,
            )
        )
    return summaries


@router.post("", response_model=ShoppingListRead, status_code=201)
async def create_shopping_list(
    body: ShoppingListCreate, db: AsyncSession = Depends(get_db)
):
    sl = ShoppingList(name=body.name, store_id=body.store_id)
    db.add(sl)
    await db.flush()  # get sl.id

    # Load recipes and attach via direct table insert (avoids lazy-load on new object)
    recipe_ingredients: list[tuple[int, list[dict]]] = []
    for recipe_id in body.recipe_ids:
        r_result = await db.execute(select(Recipe).where(Recipe.id == recipe_id))
        recipe = r_result.scalar_one_or_none()
        if recipe:
            await db.execute(
                insert(shopping_list_recipes).values(
                    shopping_list_id=sl.id, recipe_id=recipe.id
                )
            )
            recipe_ingredients.append((recipe.id, recipe.ingredients or []))

    # Load aisles for matching
    aisles = []
    if body.store_id:
        a_result = await db.execute(
            select(Aisle).where(Aisle.store_id == body.store_id).order_by(Aisle.position)
        )
        aisles = a_result.scalars().all()

    matcher = AisleMatcher(aisles)
    pins = await _load_pins(db, body.store_id) if body.store_id else {}

    # Aggregate + dedup recipe ingredients
    aggregated = aggregate_ingredients(recipe_ingredients)

    # Add extra items
    for extra in body.extra_items:
        aggregated.append({
            "name": extra.name,
            "amount": extra.amount,
            "unit": extra.unit,
            "notes": extra.notes,
            "source_recipe_ids": [],
        })

    # Create items with aisle matching (pins take priority over keyword matcher)
    for ing in aggregated:
        aisle_id = pins.get(_canonical_name(ing["name"])) or matcher.match(ing["name"])
        item = ShoppingListItem(
            shopping_list_id=sl.id,
            name=ing["name"],
            amount=ing["amount"],
            unit=ing["unit"],
            notes=ing["notes"],
            source_recipe_ids=ing["source_recipe_ids"],
            aisle_id=aisle_id,
        )
        db.add(item)

    await db.commit()
    sl = await _load_full(sl.id, db)
    return await _build_read(sl, db)


# ── Detail ────────────────────────────────────────────────────────────────────


@router.get("/{list_id}", response_model=ShoppingListRead)
async def get_shopping_list(list_id: int, db: AsyncSession = Depends(get_db)):
    sl = await _load_full(list_id, db)
    return await _build_read(sl, db)


@router.patch("/{list_id}", response_model=ShoppingListRead)
async def update_shopping_list(
    list_id: int, body: ShoppingListUpdate, db: AsyncSession = Depends(get_db)
):
    sl = await _load_full(list_id, db)
    if body.name is not None:
        sl.name = body.name
    await db.commit()
    sl = await _load_full(list_id, db)
    return await _build_read(sl, db)


@router.delete("/{list_id}", status_code=204)
async def delete_shopping_list(
    list_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(current_admin_user),
):
    result = await db.execute(select(ShoppingList).where(ShoppingList.id == list_id))
    sl = result.scalar_one_or_none()
    if not sl:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    await db.delete(sl)
    await db.commit()


@router.patch("/{list_id}/archive", response_model=ShoppingListRead)
async def toggle_archive(list_id: int, db: AsyncSession = Depends(get_db)):
    sl = await _load_full(list_id, db)
    sl.is_archived = not sl.is_archived
    await db.commit()
    sl = await _load_full(list_id, db)
    return await _build_read(sl, db)


# ── Add recipes ───────────────────────────────────────────────────────────────


@router.post("/{list_id}/add-recipes", response_model=ShoppingListRead)
async def add_recipes(
    list_id: int, body: AddRecipesRequest, db: AsyncSession = Depends(get_db)
):
    sl = await _load_full(list_id, db)

    existing_recipe_ids = {r.id for r in sl.recipes}
    new_recipe_ids = [rid for rid in body.recipe_ids if rid not in existing_recipe_ids]

    aisles = []
    if sl.store_id:
        a_result = await db.execute(
            select(Aisle).where(Aisle.store_id == sl.store_id).order_by(Aisle.position)
        )
        aisles = a_result.scalars().all()
    matcher = AisleMatcher(aisles)
    pins = await _load_pins(db, sl.store_id) if sl.store_id else {}

    recipe_ingredients: list[tuple[int, list[dict]]] = []
    for recipe_id in new_recipe_ids:
        r_result = await db.execute(select(Recipe).where(Recipe.id == recipe_id))
        recipe = r_result.scalar_one_or_none()
        if recipe:
            await db.execute(
                insert(shopping_list_recipes).values(
                    shopping_list_id=sl.id, recipe_id=recipe.id
                )
            )
            recipe_ingredients.append((recipe.id, recipe.ingredients or []))

    if recipe_ingredients:
        existing_names = {_canonical(i.name) for i in sl.items}
        aggregated = aggregate_ingredients(recipe_ingredients)
        for ing in aggregated:
            if _canonical(ing["name"]) not in existing_names:
                item = ShoppingListItem(
                    shopping_list_id=sl.id,
                    name=ing["name"],
                    amount=ing["amount"],
                    unit=ing["unit"],
                    notes=ing["notes"],
                    source_recipe_ids=ing["source_recipe_ids"],
                    aisle_id=pins.get(_canonical_name(ing["name"])) or matcher.match(ing["name"]),
                )
                db.add(item)

    await db.commit()
    sl = await _load_full(list_id, db)
    return await _build_read(sl, db)


def _canonical(name: str) -> str:
    return name.lower().strip()


# ── Items ─────────────────────────────────────────────────────────────────────


@router.post("/{list_id}/items", response_model=ShoppingListItemRead, status_code=201)
async def add_item(
    list_id: int, body: ShoppingListItemCreate, db: AsyncSession = Depends(get_db)
):
    # Verify list exists
    result = await db.execute(
        select(ShoppingList).where(ShoppingList.id == list_id).options(selectinload(ShoppingList.store))
    )
    sl = result.scalar_one_or_none()
    if not sl:
        raise HTTPException(status_code=404, detail="Shopping list not found")

    aisles = []
    if sl.store_id:
        a_result = await db.execute(
            select(Aisle).where(Aisle.store_id == sl.store_id).order_by(Aisle.position)
        )
        aisles = a_result.scalars().all()
    matcher = AisleMatcher(aisles)
    pins = await _load_pins(db, sl.store_id) if sl.store_id else {}

    item = ShoppingListItem(
        shopping_list_id=list_id,
        name=body.name,
        amount=body.amount,
        unit=body.unit,
        notes=body.notes,
        source_recipe_ids=[],
        aisle_id=pins.get(_canonical_name(body.name)) or matcher.match(body.name),
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/{list_id}/items/{item_id}", response_model=ShoppingListItemRead)
async def patch_item(
    list_id: int,
    item_id: int,
    body: ShoppingListItemPatch,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ShoppingListItem)
        .where(
            ShoppingListItem.id == item_id,
            ShoppingListItem.shopping_list_id == list_id,
        )
        .options(selectinload(ShoppingListItem.shopping_list))
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    update_data = body.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(item, k, v)

    # Persist aisle pin for this store so future lists remember it
    if "aisle_override_id" in update_data:
        sl_result = await db.execute(
            select(ShoppingList).where(ShoppingList.id == list_id)
        )
        sl = sl_result.scalar_one_or_none()
        if sl and sl.store_id:
            await _upsert_pin(db, sl.store_id, item.name, update_data["aisle_override_id"])

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{list_id}/items/{item_id}", status_code=204)
async def delete_item(
    list_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(current_admin_user),
):
    result = await db.execute(
        select(ShoppingListItem).where(
            ShoppingListItem.id == item_id,
            ShoppingListItem.shopping_list_id == list_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()
