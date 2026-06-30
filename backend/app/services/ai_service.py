import asyncio
import json
import re
from functools import partial

import anthropic
import httpx
from bs4 import BeautifulSoup

MODEL = "claude-haiku-4-5-20251001"

_BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
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


def _extract_json(text: str) -> str:
    """Pull JSON out of a response that may have markdown fences."""
    match = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
    if match:
        return match.group(1).strip()
    # Find first [ or { and last ] or }
    start = next((i for i, c in enumerate(text) if c in "{["), 0)
    end = max(text.rfind("}"), text.rfind("]")) + 1
    return text[start:end]


def _call_claude_sync(api_key: str, prompt: str, max_tokens: int = 4096) -> str:
    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


async def _call_claude(api_key: str, prompt: str, max_tokens: int = 4096) -> str:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, partial(_call_claude_sync, api_key, prompt, max_tokens))


import html as _html_module
import re as _re


def _parse_iso_duration(value: str | None) -> int | None:
    """Convert ISO 8601 duration like PT1H30M or PT15M to total minutes."""
    if not value:
        return None
    hours = _re.search(r"(\d+)H", value)
    mins = _re.search(r"(\d+)M", value)
    total = (int(hours.group(1)) * 60 if hours else 0) + (int(mins.group(1)) if mins else 0)
    return total or None


def _parse_servings(value) -> int | None:
    if not value:
        return None
    s = value[0] if isinstance(value, list) else str(value)
    m = _re.search(r"\d+", str(s))
    return int(m.group()) if m else None


def _ld_to_recipe(ld: dict, url: str) -> dict:
    """Directly map a JSON-LD Recipe object to our internal recipe format."""
    from app.services.ingredient_parser import parse_ingredient

    # Ingredients — JSON-LD gives raw strings; run them through our parser
    raw_ings = ld.get("recipeIngredient") or []
    ingredients = [parse_ingredient(_html_module.unescape(s)) for s in raw_ings if s]

    # Instructions — may be strings or HowToStep objects
    raw_steps = ld.get("recipeInstructions") or []
    instructions = []
    for step in raw_steps:
        if isinstance(step, str):
            instructions.append(_html_module.unescape(step).strip())
        elif isinstance(step, dict):
            text = step.get("text") or step.get("name") or ""
            if text:
                instructions.append(_html_module.unescape(text).strip())

    # Image — may be string or list
    image = ld.get("image")
    image_url = None
    if isinstance(image, list) and image:
        image_url = image[0]
    elif isinstance(image, str):
        image_url = image
    elif isinstance(image, dict):
        image_url = image.get("url")

    # Tags
    keywords = ld.get("keywords") or ""
    tags = [t.strip() for t in keywords.split(",") if t.strip()] if keywords else []

    return {
        "title": _html_module.unescape(ld.get("name") or ""),
        "description": _html_module.unescape(ld.get("description") or ""),
        "servings": _parse_servings(ld.get("recipeYield")),
        "prep_time_minutes": _parse_iso_duration(ld.get("prepTime")),
        "cook_time_minutes": _parse_iso_duration(ld.get("cookTime")),
        "ingredients": ingredients,
        "instructions": instructions,
        "tags": tags,
        "image_url": image_url,
        "source_url": str(url),
    }


def _find_recipe_ld(html: str) -> dict | None:
    """Extract a Recipe JSON-LD node from raw HTML, handling @graph arrays."""
    soup = BeautifulSoup(html, "html.parser")
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, dict):
                if data.get("@type") == "Recipe":
                    return data
                for item in data.get("@graph", []):
                    if isinstance(item, dict) and item.get("@type") == "Recipe":
                        return item
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and item.get("@type") == "Recipe":
                        return item
        except Exception:
            continue
    return None


def _page_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "header", "footer", "aside", "iframe"]):
        tag.decompose()
    main = soup.find("main") or soup.find("article") or soup
    return main.get_text(separator="\n", strip=True)[:10000]


async def parse_recipe_from_url(url: str, api_key: str) -> dict:
    async with httpx.AsyncClient(headers=_BROWSER_HEADERS, follow_redirects=True, timeout=15) as client:
        resp = await client.get(url)
        resp.raise_for_status()

    # Fast path: parse JSON-LD directly — no Claude tokens needed
    recipe_ld = _find_recipe_ld(resp.text)
    if recipe_ld:
        return _ld_to_recipe(recipe_ld, str(resp.url))

    # Slow path: no structured data — ask Claude to extract from page text
    text = _page_text(resp.text)
    prompt = f"""Extract the recipe from this webpage text and return ONLY valid JSON.

URL: {url}

Page text:
{text}

Return this exact structure (null for unknown fields):
{{
  "title": "Recipe Name",
  "description": "Brief description",
  "servings": 4,
  "prep_time_minutes": 15,
  "cook_time_minutes": 30,
  "ingredients": [
    {{"name": "all-purpose flour", "amount": "2", "unit": "cups", "notes": "sifted"}},
    {{"name": "salt", "amount": "1", "unit": "tsp", "notes": null}}
  ],
  "instructions": ["Step one.", "Step two."],
  "tags": ["dinner"],
  "image_url": null,
  "source_url": "{url}"
}}

Rules:
- amount: numeric string only ("1", "1/2", "2 1/4")
- unit: measurement word or null
- notes: preparation descriptors or null
- Return ONLY the JSON, no markdown"""

    raw = await _call_claude(api_key, prompt)
    return json.loads(_extract_json(raw))


_CLAUDE_PROMPT_TEMPLATE = """\
Extract the recipe from the content below and return ONLY valid JSON.

URL: {url}

{content}

Return this exact structure (null for unknown fields):
{{
  "title": "Recipe Name",
  "description": "Brief description",
  "servings": 4,
  "prep_time_minutes": 15,
  "cook_time_minutes": 30,
  "ingredients": [
    {{"name": "all-purpose flour", "amount": "2", "unit": "cups", "notes": "sifted"}},
    {{"name": "salt", "amount": "1", "unit": "tsp", "notes": null}}
  ],
  "instructions": ["Step one.", "Step two."],
  "tags": ["dinner"],
  "image_url": null,
  "source_url": "{url}"
}}

Rules:
- amount: numeric string only ("1", "1/2", "2 1/4")
- unit: measurement word or null
- notes: preparation descriptors or null
- Return ONLY the JSON, no markdown"""


async def parse_recipe_via_claude(url: str, api_key: str) -> tuple[dict, str]:
    """Always calls Claude. Returns (result, content_source) — 'json_ld' or 'page_text'."""
    async with httpx.AsyncClient(headers=_BROWSER_HEADERS, follow_redirects=True, timeout=15) as client:
        resp = await client.get(url)
        resp.raise_for_status()

    recipe_ld = _find_recipe_ld(resp.text)
    if recipe_ld:
        content = f"JSON-LD Recipe data:\n{json.dumps(recipe_ld, indent=2)[:12000]}"
        source = "json_ld"
    else:
        content = f"Page text:\n{_page_text(resp.text)}"
        source = "page_text"

    prompt = _CLAUDE_PROMPT_TEMPLATE.format(url=url, content=content)
    raw = await _call_claude(api_key, prompt)
    return json.loads(_extract_json(raw)), source


async def parse_ingredients_text(text: str, api_key: str) -> list[dict]:
    prompt = f"""Parse this ingredient list into structured JSON. Return ONLY a JSON array.

Input:
{text}

Output format:
[
  {{"name": "all-purpose flour", "amount": "2", "unit": "cups", "notes": "sifted"}},
  {{"name": "eggs", "amount": "3", "unit": null, "notes": "large"}},
  {{"name": "salt", "amount": "1", "unit": "tsp", "notes": null}}
]

Rules:
- name: the ingredient only, stripped of amounts and descriptors
- amount: numeric string ("1", "1/2", "2 1/4") or null
- unit: measurement unit or null for count items (eggs, cloves, etc.)
- notes: preparation/descriptors ("chopped", "optional", "to taste") or null
- Return ONLY the JSON array — no markdown, no explanation"""

    raw = await _call_claude(api_key, prompt)
    return json.loads(_extract_json(raw))


async def parse_aisles_from_input(
    api_key: str,
    text: str | None = None,
    image_b64: str | None = None,
    image_media_type: str | None = None,
) -> list[dict]:
    """Return [{name: str, keywords: [str]}] from free-form text or an image of aisle signs."""
    instruction = (
        "You are helping set up a grocery shopping app. "
        "Parse the aisle information provided and return a JSON array of aisles. "
        "For each aisle include a short name and 10–25 lowercase keyword strings "
        "(product names, categories) that would belong in that aisle. "
        "Return ONLY a JSON array like: "
        '[{"name": "Produce", "keywords": ["apple", "banana", "spinach", "broccoli"]}, ...]'
        " — no markdown, no explanation."
    )

    content: list[dict] = []
    if image_b64:
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": image_media_type or "image/jpeg",
                "data": image_b64,
            },
        })
        content.append({"type": "text", "text": instruction})
    else:
        content.append({"type": "text", "text": f"{instruction}\n\nAisle information:\n{text}"})

    def _call() -> str:
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model=MODEL,
            max_tokens=2048,
            messages=[{"role": "user", "content": content}],
        )
        return msg.content[0].text

    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(None, _call)
    return json.loads(_extract_json(raw))


async def suggest_aisle_keywords(aisle_name: str, api_key: str, store_name: str = "") -> list[str]:
    context = f" at {store_name}" if store_name else ""
    prompt = f"""Suggest grocery keywords for the "{aisle_name}" aisle{context} in a shopping list app.

Return 15-25 relevant grocery items as a JSON array of short lowercase strings (1-3 words each).
Choose keywords general enough to match many product names.

Return ONLY the JSON array — no markdown, no explanation.
Example: ["pasta", "spaghetti", "penne", "rice", "quinoa", "lentils"]"""

    raw = await _call_claude(api_key, prompt)
    return json.loads(_extract_json(raw))
