from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.auth import current_active_user, current_admin_user
from app.models.aisle import Aisle
from app.models.store import Store
from app.models.user import User
from app.schemas.store import (
    AisleCreate,
    AisleRead,
    AisleReorderItem,
    AisleUpdate,
    StoreCreate,
    StoreListItem,
    StoreRead,
    StoreUpdate,
)


class AisleImportRequest(BaseModel):
    text: str | None = None
    image_b64: str | None = None
    image_media_type: str | None = None


class AisleSuggestion(BaseModel):
    name: str
    keywords: list[str]

router = APIRouter(prefix="/stores", tags=["stores"])


# ── Stores ────────────────────────────────────────────────────────────────────


@router.get("", response_model=list[StoreListItem])
async def list_stores(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Store).order_by(Store.name))
    stores = result.scalars().all()
    # Count aisles per store
    counts_result = await db.execute(
        select(Aisle.store_id, func.count(Aisle.id)).group_by(Aisle.store_id)
    )
    counts = {row[0]: row[1] for row in counts_result}
    items = []
    for store in stores:
        d = {"id": store.id, "name": store.name, "description": store.description,
             "aisle_count": counts.get(store.id, 0), "created_at": store.created_at}
        items.append(d)
    return items


@router.post("", response_model=StoreRead, status_code=201)
async def create_store(body: StoreCreate, db: AsyncSession = Depends(get_db)):
    store = Store(**body.model_dump())
    db.add(store)
    await db.commit()
    await db.refresh(store, ["aisles"])
    return store


@router.get("/{store_id}", response_model=StoreRead)
async def get_store(store_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Store).where(Store.id == store_id).options(selectinload(Store.aisles))
    )
    store = result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


@router.put("/{store_id}", response_model=StoreRead)
async def update_store(
    store_id: int, body: StoreUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Store).where(Store.id == store_id).options(selectinload(Store.aisles))
    )
    store = result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(store, k, v)
    await db.commit()
    await db.refresh(store, ["aisles"])
    return store


@router.delete("/{store_id}", status_code=204)
async def delete_store(
    store_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(current_admin_user),
):
    result = await db.execute(select(Store).where(Store.id == store_id))
    store = result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    await db.delete(store)
    await db.commit()


# ── Aisles ────────────────────────────────────────────────────────────────────


@router.get("/{store_id}/aisles", response_model=list[AisleRead])
async def list_aisles(store_id: int, db: AsyncSession = Depends(get_db)):
    await _assert_store(store_id, db)
    result = await db.execute(
        select(Aisle).where(Aisle.store_id == store_id).order_by(Aisle.position)
    )
    return result.scalars().all()


@router.post("/{store_id}/aisles", response_model=AisleRead, status_code=201)
async def create_aisle(
    store_id: int, body: AisleCreate, db: AsyncSession = Depends(get_db)
):
    await _assert_store(store_id, db)

    if body.position is None:
        max_result = await db.execute(
            select(func.coalesce(func.max(Aisle.position), -1)).where(
                Aisle.store_id == store_id
            )
        )
        position = max_result.scalar_one() + 1
    else:
        position = body.position

    aisle = Aisle(
        store_id=store_id,
        name=body.name,
        keywords=body.keywords,
        position=position,
    )
    db.add(aisle)
    await db.commit()
    await db.refresh(aisle)
    return aisle


@router.put("/{store_id}/aisles/reorder", response_model=list[AisleRead])
async def reorder_aisles(
    store_id: int,
    body: list[AisleReorderItem],
    db: AsyncSession = Depends(get_db),
):
    await _assert_store(store_id, db)
    for item in body:
        await db.execute(
            update(Aisle)
            .where(Aisle.id == item.id, Aisle.store_id == store_id)
            .values(position=item.position)
        )
    await db.commit()
    result = await db.execute(
        select(Aisle).where(Aisle.store_id == store_id).order_by(Aisle.position)
    )
    return result.scalars().all()


@router.put("/{store_id}/aisles/{aisle_id}", response_model=AisleRead)
async def update_aisle(
    store_id: int,
    aisle_id: int,
    body: AisleUpdate,
    db: AsyncSession = Depends(get_db),
):
    aisle = await _get_aisle(store_id, aisle_id, db)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(aisle, k, v)
    await db.commit()
    await db.refresh(aisle)
    return aisle


@router.post("/{store_id}/aisles/parse-ai", response_model=list[AisleSuggestion])
async def parse_aisles_ai(
    store_id: int,
    body: AisleImportRequest,
    current_user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.claude_api_key:
        raise HTTPException(status_code=400, detail="No Claude API key configured on your account.")
    if not body.text and not body.image_b64:
        raise HTTPException(status_code=400, detail="Provide either text or an image.")
    result = await db.execute(select(Store).where(Store.id == store_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Store not found.")
    from app.services.ai_service import parse_aisles_from_input
    aisles = await parse_aisles_from_input(
        api_key=current_user.claude_api_key,
        text=body.text,
        image_b64=body.image_b64,
        image_media_type=body.image_media_type,
    )
    return [AisleSuggestion(name=a.get("name", ""), keywords=a.get("keywords", [])) for a in aisles]


@router.delete("/{store_id}/aisles/{aisle_id}", status_code=204)
async def delete_aisle(
    store_id: int,
    aisle_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(current_admin_user),
):
    aisle = await _get_aisle(store_id, aisle_id, db)
    await db.delete(aisle)
    await db.commit()


# ── Helpers ───────────────────────────────────────────────────────────────────


async def _assert_store(store_id: int, db: AsyncSession) -> None:
    result = await db.execute(select(Store.id).where(Store.id == store_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Store not found")


async def _get_aisle(store_id: int, aisle_id: int, db: AsyncSession) -> Aisle:
    result = await db.execute(
        select(Aisle).where(Aisle.id == aisle_id, Aisle.store_id == store_id)
    )
    aisle = result.scalar_one_or_none()
    if not aisle:
        raise HTTPException(status_code=404, detail="Aisle not found")
    return aisle
