import re
from fractions import Fraction

from app.services.aisle_matcher import AisleMatcher


def _canonical_name(name: str) -> str:
    name = name.lower().strip()
    name = re.sub(r"\(.*?\)", "", name).strip()
    name = re.sub(r",.*$", "", name).strip()
    # Simple depluralization for grouping only (display name preserved separately)
    if name.endswith("oes"):
        name = name[:-2]
    elif name.endswith("ies") and len(name) > 4:
        name = name[:-3] + "y"
    elif name.endswith("es") and len(name) > 5:
        name = name[:-1]
    elif name.endswith("s") and len(name) > 4 and not name.endswith("ss"):
        name = name[:-1]
    return name


def _parse_amount(amount: str | None) -> Fraction | None:
    if not amount:
        return None
    amount = amount.strip()
    try:
        # Handle mixed number: "1 1/2"
        parts = amount.split()
        if len(parts) == 2:
            return Fraction(parts[0]) + Fraction(parts[1])
        return Fraction(amount)
    except (ValueError, ZeroDivisionError):
        return None


def _format_fraction(f: Fraction) -> str:
    if f.denominator == 1:
        return str(f.numerator)
    whole = f.numerator // f.denominator
    remainder = f - whole
    if whole and remainder:
        return f"{whole} {remainder}"
    return str(f)


def aggregate_ingredients(
    recipe_ingredients: list[tuple[int, list[dict]]]
) -> list[dict]:
    """
    recipe_ingredients: list of (recipe_id, ingredients_list)
    Returns deduplicated, aggregated ingredient dicts ready for DB insertion.
    """
    groups: dict[str, dict] = {}

    for recipe_id, ingredients in recipe_ingredients:
        for ing in ingredients:
            name = ing.get("name", "").strip()
            if not name:
                continue
            key = _canonical_name(name)
            if key not in groups:
                groups[key] = {
                    "display_name": name,
                    "amounts_by_unit": {},  # unit -> list[Fraction|None]
                    "raw_amounts": [],      # fallback for non-parseable
                    "notes": ing.get("notes"),
                    "source_recipe_ids": [],
                }
            g = groups[key]
            if recipe_id not in g["source_recipe_ids"]:
                g["source_recipe_ids"].append(recipe_id)

            unit = (ing.get("unit") or "").strip().lower() or ""
            amount_frac = _parse_amount(ing.get("amount"))
            if amount_frac is not None:
                g["amounts_by_unit"].setdefault(unit, []).append(amount_frac)
            else:
                raw = ing.get("amount") or ""
                if raw:
                    g["raw_amounts"].append(f"{raw} {unit}".strip())

    results = []
    for key, g in groups.items():
        # Build amount string
        parts = []
        for unit, fracs in g["amounts_by_unit"].items():
            total = sum(fracs, Fraction(0))
            label = f"{_format_fraction(total)} {unit}".strip()
            parts.append(label)
        parts.extend(g["raw_amounts"])
        if len(parts) == 1:
            combined_amount_str = parts[0]
        elif parts:
            combined_amount_str = " + ".join(parts)
        else:
            combined_amount_str = None

        # Separate amount value and unit for storage if there's a single clean unit
        amount_val = None
        unit_val = None
        if combined_amount_str and len(g["amounts_by_unit"]) == 1 and not g["raw_amounts"]:
            unit_key = next(iter(g["amounts_by_unit"]))
            total = sum(g["amounts_by_unit"][unit_key], Fraction(0))
            amount_val = _format_fraction(total)
            unit_val = unit_key or None
        else:
            amount_val = combined_amount_str
            unit_val = None

        results.append({
            "name": g["display_name"],
            "amount": amount_val,
            "unit": unit_val,
            "notes": g["notes"],
            "source_recipe_ids": g["source_recipe_ids"],
        })

    return results


def sort_items_by_aisle(items: list, aisles: list) -> dict[int | None, list]:
    """
    Returns a dict of aisle_id -> [items], with None as the last key for unmatched.
    Items are matched via AisleMatcher if they have no aisle_id.
    """
    matcher = AisleMatcher(aisles)
    aisle_position: dict[int, int] = {a.id: a.position for a in aisles}

    groups: dict[int | None, list] = {}
    for item in items:
        effective_id = item.aisle_override_id or item.aisle_id
        groups.setdefault(effective_id, []).append(item)

    # Sort group keys: aisles by position, None last
    sorted_keys = sorted(
        groups.keys(),
        key=lambda k: aisle_position.get(k, float("inf")) if k is not None else float("inf"),
    )
    return {k: groups[k] for k in sorted_keys}
