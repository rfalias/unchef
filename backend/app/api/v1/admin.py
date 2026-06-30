import asyncio
import json

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from recipe_scrapers import scrape_html
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth import current_admin_user, current_active_user
from app.models.user import User
from app.schemas.user import AdminUserPatch, AdminUserRead, PasswordReset

_BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "DNT": "1",
    "Cache-Control": "max-age=0",
}

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[AdminUserRead])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(current_admin_user),
):
    result = await db.execute(select(User).order_by(User.id))
    return result.scalars().all()


@router.patch("/users/{user_id}", response_model=AdminUserRead)
async def patch_user(
    user_id: int,
    body: AdminUserPatch,
    current_user: User = Depends(current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if body.role is not None:
        if user.id == current_user.id and body.role != "admin":
            raise HTTPException(status_code=400, detail="Cannot remove your own admin role.")
        user.role = body.role

    if body.is_active is not None:
        if user.id == current_user.id and not body.is_active:
            raise HTTPException(status_code=400, detail="Cannot deactivate yourself.")
        user.is_active = body.is_active

    await db.commit()
    await db.refresh(user)
    return user


@router.post("/users/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def admin_reset_password(
    user_id: int,
    body: PasswordReset,
    current_user: User = Depends(current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == 1 and current_user.id != 1:
        raise HTTPException(status_code=403, detail="Cannot reset the founding account's password.")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    from fastapi_users.password import PasswordHelper
    user.hashed_password = PasswordHelper().hash(body.new_password)
    await db.commit()


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: User = Depends(current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself.")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    await db.delete(user)
    await db.commit()


# ── Parse debug ───────────────────────────────────────────────────────────────

class ParseInspectRequest(BaseModel):
    url: str
    use_ai: bool = False


def _scrape_sync_debug(url: str, html: str) -> dict:
    try:
        s = scrape_html(html, org_url=url)
        title = ""
        try:
            title = s.title() or ""
        except Exception:
            pass
        ings = []
        try:
            ings = s.ingredients() or []
        except Exception:
            pass
        steps = []
        try:
            steps = s.instructions_list() or []
        except Exception:
            pass
        return {"ok": True, "title": title, "ingredients_count": len(ings), "instructions_count": len(steps), "error": None}
    except Exception as exc:
        return {"ok": False, "title": None, "ingredients_count": 0, "instructions_count": 0, "error": str(exc)}


def _scan_json_ld(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    scripts = soup.find_all("script", type="application/ld+json")
    all_types: list[str] = []
    recipe_node: dict | None = None

    for script in scripts:
        try:
            data = json.loads(script.string or "")
        except Exception:
            continue
        nodes = []
        if isinstance(data, dict):
            nodes = [data] + data.get("@graph", [])
        elif isinstance(data, list):
            nodes = data
        for node in nodes:
            if not isinstance(node, dict):
                continue
            t = node.get("@type", "")
            if isinstance(t, list):
                all_types.extend(t)
            elif t:
                all_types.append(t)
            if t == "Recipe" and recipe_node is None:
                recipe_node = node

    return {
        "scripts_found": len(scripts),
        "all_types": sorted(set(all_types)),
        "recipe_found": recipe_node is not None,
        "recipe_name": recipe_node.get("name") if recipe_node else None,
        "recipe_keys": list(recipe_node.keys()) if recipe_node else [],
        "has_ingredients": bool(recipe_node and recipe_node.get("recipeIngredient")),
        "has_instructions": bool(recipe_node and recipe_node.get("recipeInstructions")),
    }


async def _run_ai_inspect(url: str, api_key: str) -> dict:
    from app.services import ai_service
    try:
        parsed, source = await ai_service.parse_recipe_via_claude(url, api_key)
        return {
            "ran": True,
            "ok": True,
            "content_source": source,
            "title": parsed.get("title"),
            "ingredients_count": len(parsed.get("ingredients") or []),
            "instructions_count": len(parsed.get("instructions") or []),
            "error": None,
        }
    except Exception as exc:
        return {"ran": True, "ok": False, "error": str(exc)}


@router.post("/parse-inspect")
async def parse_inspect(
    body: ParseInspectRequest,
    current_user: User = Depends(current_admin_user),
):
    result: dict = {"url": body.url, "fetch": {}, "json_ld": {}, "scraper": {}, "ai": None, "outcome": "unknown"}

    # AI key check up front so we can report it even if fetch fails
    ai_key = current_user.claude_api_key if body.use_ai else None
    if body.use_ai and not ai_key:
        result["ai"] = {"ran": False, "error": "No Claude API key saved on your account."}

    # 1. Fetch
    html: str | None = None
    try:
        async with httpx.AsyncClient(headers=_BROWSER_HEADERS, follow_redirects=True, timeout=20) as client:
            resp = await client.get(body.url)
        html = resp.text
        is_text = resp.headers.get("content-type", "").startswith("text/")
        result["fetch"] = {
            "ok": True,
            "status_code": resp.status_code,
            "final_url": str(resp.url),
            "content_type": resp.headers.get("content-type", ""),
            "content_length_kb": round(len(resp.content) / 1024, 1),
            "is_text": is_text,
            "looks_binary": not html[:20].isprintable() if html else False,
            "error": None,
        }
        if resp.status_code >= 400:
            result["outcome"] = f"http_error_{resp.status_code}"
    except Exception as exc:
        result["fetch"] = {"ok": False, "error": str(exc)}
        result["outcome"] = "fetch_failed"

    # 2 & 3. JSON-LD + scraper (only if we got HTML)
    json_ld_found = False
    if html is not None and result["outcome"] == "unknown":
        result["json_ld"] = _scan_json_ld(html)
        json_ld_found = result["json_ld"]["recipe_found"]

        loop = asyncio.get_event_loop()
        result["scraper"] = await loop.run_in_executor(None, _scrape_sync_debug, body.url, html)

        if result["scraper"]["ok"] and result["scraper"]["title"]:
            result["outcome"] = "scraper_success"
        elif json_ld_found:
            result["outcome"] = "json_ld_available"
        else:
            result["outcome"] = "no_recipe_found"

    # 4. AI parse — always runs when checked (has its own fetch internally)
    if ai_key:
        result["ai"] = await _run_ai_inspect(body.url, ai_key)

    return result
