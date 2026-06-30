import asyncio
import html as _html
import json
import re
from typing import Any

import httpx
from bs4 import BeautifulSoup
from recipe_scrapers import scrape_html

from app.services.ingredient_parser import parse_ingredient


def _minutes(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _scrape_sync(url: str, html: str) -> dict:
    scraper = scrape_html(html, org_url=url)
    try:
        groups = scraper.ingredient_groups() or []
        # Use groups if any have a non-None purpose (i.e. real sections exist)
        if groups and any(g.purpose for g in groups):
            ingredients_raw = []
            for g in groups:
                section = g.purpose.strip() if g.purpose else None
                for raw in (g.ingredients or []):
                    ingredients_raw.append((raw, section))
        else:
            ingredients_raw = [(i, None) for i in (scraper.ingredients() or [])]
    except Exception:
        try:
            ingredients_raw = [(i, None) for i in (scraper.ingredients() or [])]
        except Exception:
            ingredients_raw = []
    try:
        instructions_raw = scraper.instructions_list() or []
    except Exception:
        try:
            raw = scraper.instructions() or ""
            instructions_raw = [s.strip() for s in re.split(r"\n+", raw) if s.strip()]
        except Exception:
            instructions_raw = []
    try:
        image = scraper.image()
    except Exception:
        image = None
    try:
        title = scraper.title() or ""
    except Exception:
        title = ""
    try:
        description = scraper.description()
    except Exception:
        description = None
    try:
        servings_raw = scraper.yields()
        servings = int(re.search(r"\d+", servings_raw).group()) if servings_raw else None
    except Exception:
        servings = None
    try:
        prep = _minutes(scraper.prep_time())
    except Exception:
        prep = None
    try:
        cook = _minutes(scraper.cook_time())
    except Exception:
        cook = None
    try:
        tags = scraper.keywords() or []
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]
    except Exception:
        tags = []

    ingredients = []
    for raw_text, section in ingredients_raw:
        cleaned = raw_text.lstrip("▢☐□✓✔ ").strip()
        item = parse_ingredient(cleaned)
        if section:
            item["section"] = section
        ingredients.append(item)

    return {
        "title": title,
        "description": description,
        "source_url": url,
        "image_url": image,
        "servings": servings,
        "prep_time_minutes": prep,
        "cook_time_minutes": cook,
        "instructions": instructions_raw,
        "ingredients": ingredients,
        "tags": tags,
    }


def _json_ld_fallback(url: str, html: str) -> dict | None:
    """Try to extract schema.org/Recipe from JSON-LD when recipe-scrapers fails."""
    soup = BeautifulSoup(html, "html.parser")
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        recipe = None
        if isinstance(data, list):
            recipes = [d for d in data if isinstance(d, dict) and d.get("@type") == "Recipe"]
            recipe = recipes[0] if recipes else None
        elif isinstance(data, dict):
            if data.get("@type") == "Recipe":
                recipe = data
            else:
                for item in data.get("@graph", []):
                    if isinstance(item, dict) and item.get("@type") == "Recipe":
                        recipe = item
                        break
        data = recipe
        if not data:
            continue
        ingredients_raw = data.get("recipeIngredient", [])
        ingredients = [parse_ingredient(_html.unescape(i)) for i in ingredients_raw]
        instructions_raw = data.get("recipeInstructions", [])
        if isinstance(instructions_raw, list):
            steps = []
            for step in instructions_raw:
                if isinstance(step, str):
                    steps.append(_html.unescape(step).strip())
                elif isinstance(step, dict):
                    steps.append(_html.unescape(step.get("text", "")).strip())
            instructions_raw = steps
        elif isinstance(instructions_raw, str):
            instructions_raw = [_html.unescape(s).strip() for s in re.split(r"\n+", instructions_raw) if s.strip()]
        try:
            prep = _minutes(
                data.get("prepTime", "").replace("PT", "").replace("M", "")
                if isinstance(data.get("prepTime"), str) else data.get("prepTime")
            )
        except Exception:
            prep = None
        try:
            cook = _minutes(
                data.get("cookTime", "").replace("PT", "").replace("M", "")
                if isinstance(data.get("cookTime"), str) else data.get("cookTime")
            )
        except Exception:
            cook = None
        try:
            servings_raw = data.get("recipeYield", None)
            if isinstance(servings_raw, list):
                servings_raw = servings_raw[0]
            servings = int(re.search(r"\d+", str(servings_raw)).group()) if servings_raw else None
        except Exception:
            servings = None
        image = data.get("image")
        if isinstance(image, list):
            image = image[0]
        if isinstance(image, dict):
            image = image.get("url")
        tags = data.get("keywords", [])
        if isinstance(tags, str):
            tags = [_html.unescape(t).strip() for t in tags.split(",") if t.strip()]
        return {
            "title": _html.unescape(data.get("name") or ""),
            "description": _html.unescape(data.get("description") or "") or None,
            "source_url": url,
            "image_url": image,
            "servings": servings,
            "prep_time_minutes": prep,
            "cook_time_minutes": cook,
            "instructions": instructions_raw,
            "ingredients": ingredients,
            "tags": tags,
        }
    return None


_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "DNT": "1",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
}


async def import_recipe_from_url(url: str) -> dict:
    """Fetch URL and parse as a recipe. Returns a dict matching RecipeCreate fields."""
    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=30,
        headers=_BROWSER_HEADERS,
    ) as client:
        resp = await client.get(url)
        if resp.status_code == 403:
            raise ValueError(
                "The site blocked the request (403). "
                "Try a different recipe site, or create the recipe manually."
            )
        resp.raise_for_status()
        html = resp.text

    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(None, _scrape_sync, url, html)
        if result.get("title"):
            return result
    except Exception:
        pass

    fallback = _json_ld_fallback(url, html)
    if fallback:
        return fallback

    raise ValueError(f"Could not parse a recipe from: {url}")
