from typing import Optional
from pydantic import BaseModel

import anthropic
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth import current_active_user
from app.models.user import User
from app.schemas.user import ApiKeySet, ApiKeyStatus
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])


# ── API key management ────────────────────────────────────────────────────────

@router.put("/api-key", response_model=ApiKeyStatus)
async def set_api_key(
    body: ApiKeySet,
    current_user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_db),
):
    key = body.claude_api_key.strip()
    if not key.startswith("sk-ant-"):
        raise HTTPException(status_code=422, detail="That doesn't look like a valid Claude API key (should start with sk-ant-).")

    await db.execute(update(User).where(User.id == current_user.id).values(claude_api_key=key))
    await db.commit()
    return ApiKeyStatus(has_claude_key=True)


@router.delete("/api-key", response_model=ApiKeyStatus)
async def remove_api_key(
    current_user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(update(User).where(User.id == current_user.id).values(claude_api_key=None))
    await db.commit()
    return ApiKeyStatus(has_claude_key=False)


# ── AI helpers ────────────────────────────────────────────────────────────────

def _require_key(user: User) -> str:
    if not user.claude_api_key:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="No Claude API key saved. Add one in Settings.",
        )
    return user.claude_api_key


def _handle_ai_error(exc: Exception):
    if isinstance(exc, anthropic.AuthenticationError):
        raise HTTPException(status_code=422, detail="Claude API key is invalid. Update it in Settings.")
    if isinstance(exc, anthropic.RateLimitError):
        raise HTTPException(status_code=429, detail="Claude rate limit reached. Try again in a moment.")
    raise HTTPException(status_code=502, detail=f"Claude API error: {exc}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

class ParseRecipeRequest(BaseModel):
    url: str


class ParseIngredientsRequest(BaseModel):
    text: str


class SuggestKeywordsRequest(BaseModel):
    aisle_name: str
    store_name: Optional[str] = None


@router.post("/parse-recipe")
async def parse_recipe(
    body: ParseRecipeRequest,
    current_user: User = Depends(current_active_user),
):
    api_key = _require_key(current_user)
    try:
        result, _ = await ai_service.parse_recipe_via_claude(body.url, api_key)
        return result
    except Exception as exc:
        _handle_ai_error(exc)


@router.post("/parse-ingredients")
async def parse_ingredients(
    body: ParseIngredientsRequest,
    current_user: User = Depends(current_active_user),
):
    api_key = _require_key(current_user)
    try:
        return await ai_service.parse_ingredients_text(body.text, api_key)
    except Exception as exc:
        _handle_ai_error(exc)


@router.post("/suggest-keywords")
async def suggest_keywords(
    body: SuggestKeywordsRequest,
    current_user: User = Depends(current_active_user),
):
    api_key = _require_key(current_user)
    try:
        return await ai_service.suggest_aisle_keywords(
            body.aisle_name, api_key, body.store_name or ""
        )
    except Exception as exc:
        _handle_ai_error(exc)
