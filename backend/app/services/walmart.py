import json

import httpx

_MAP_URL = (
    "https://developer.api.walmart.com/api-proxy/service/"
    "Store-Services/Instore-Maps/v1/instore-maps/v1/{store_id}"
)

# Department custnames that contain any of these substrings are kept.
_FOOD_TERMS = {
    "produce", "fruit", "vegetable", "meat", "seafood", "fish", "poultry",
    "bakery", "deli", "dairy", "frozen", "beverage", "drink", "snack",
    "candy", "cereal", "breakfast", "bread", "coffee", "tea", "canned",
    "soup", "pasta", "rice", "grain", "condiment", "sauce", "oil",
    "baking", "spice", "herb", "international", "ethnic", "organic",
    "natural", "baby food", "infant", "wine", "beer", "spirits",
    "alcohol", "juice", "soda", "water", "grocery", "food", "floral",
    "flower", "pickle", "olive", "cheese", "egg", "butter", "cream",
    "dressing", "seasoning", "jam", "jelly", "honey", "syrup", "sugar",
    "flour", "chips", "cookie", "cracker", "nut", "dried", "pet food",
}


def _is_food(name: str) -> bool:
    low = name.lower()
    return any(term in low for term in _FOOD_TERMS)


def _extract_map_data(html: str) -> dict:
    marker = "window.mapData = "
    idx = html.find(marker)
    if idx == -1:
        raise ValueError("mapData variable not found in Walmart response.")
    start = html.index("{", idx)
    depth = 0
    for i, ch in enumerate(html[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return json.loads(html[start : i + 1])
    raise ValueError("Could not bracket-match the mapData JSON.")


async def fetch_walmart_aisles(walmart_store_id: int) -> list[dict]:
    url = _MAP_URL.format(store_id=walmart_store_id)
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()

    data = _extract_map_data(resp.text)

    floors = data.get("floors") or []
    if not floors:
        raise ValueError("No floor data in Walmart response.")

    departments = floors[0].get("departments") or []

    seen: set[str] = set()
    aisles: list[dict] = []
    for dept in departments:
        name = (dept.get("custname") or dept.get("name") or "").strip()
        if not name or name in seen:
            continue
        seen.add(name)
        if _is_food(name):
            aisles.append({"name": name, "keywords": []})

    return aisles
