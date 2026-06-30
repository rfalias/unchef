import re

UNITS = {
    "cup", "cups", "c",
    "tablespoon", "tablespoons", "tbsp", "tbs",
    "teaspoon", "teaspoons", "tsp",
    "ounce", "ounces", "oz",
    "pound", "pounds", "lb", "lbs",
    "gram", "grams", "g",
    "kilogram", "kilograms", "kg",
    "milliliter", "milliliters", "ml",
    "liter", "liters", "l",
    "pint", "pints", "pt",
    "quart", "quarts", "qt",
    "gallon", "gallons", "gal",
    "fluid ounce", "fluid ounces", "fl oz",
    "stick", "sticks",
    "clove", "cloves",
    "slice", "slices",
    "piece", "pieces",
    "can", "cans",
    "package", "packages", "pkg",
    "bunch", "bunches",
    "head", "heads",
    "sprig", "sprigs",
    "pinch", "pinches",
    "dash", "dashes",
    "handful", "handfuls",
    "inch", "inches",
}

FRACTION_MAP = {
    "½": "1/2", "⅓": "1/3", "⅔": "2/3", "¼": "1/4",
    "¾": "3/4", "⅕": "1/5", "⅖": "2/5", "⅗": "3/5",
    "⅘": "4/5", "⅙": "1/6", "⅚": "5/6", "⅛": "1/8",
    "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
}

_FRACTION_UNICODE_RE = re.compile("|".join(re.escape(k) for k in FRACTION_MAP))
_AMOUNT_RE = re.compile(
    r"^"
    r"(?P<amount>"
    r"(?:\d+\s+)?"           # optional whole number
    r"(?:\d+/\d+|\d+\.?\d*)" # fraction or decimal
    r")"
    r"\s*"
    r"(?:(?P<unit>" + "|".join(re.escape(u) for u in sorted(UNITS, key=len, reverse=True)) + r")(?=[\s.,/]|$))?"
    r"\.?\s*"
    r"(?P<rest>.*)$",
    re.IGNORECASE,
)


def _normalize_unicode_fractions(text: str) -> str:
    return _FRACTION_UNICODE_RE.sub(lambda m: FRACTION_MAP[m.group()], text)


def parse_ingredient(raw: str) -> dict:
    """Parse a raw ingredient string into {name, amount, unit, notes}."""
    raw = raw.strip()
    if not raw:
        return {"name": "", "amount": None, "unit": None, "notes": None}

    raw = _normalize_unicode_fractions(raw)

    # Extract notes in parentheses
    notes_match = re.search(r"\(([^)]+)\)", raw)
    notes = notes_match.group(1).strip() if notes_match else None
    if notes_match:
        raw = raw[:notes_match.start()] + raw[notes_match.end():]
        raw = raw.strip().rstrip(",").strip()

    m = _AMOUNT_RE.match(raw)
    if m:
        amount = m.group("amount").strip() or None
        unit = (m.group("unit") or "").strip().lower() or None
        name = m.group("rest").strip().rstrip(",").strip()
    else:
        amount = None
        unit = None
        name = raw.strip().rstrip(",").strip()

    # Normalize unit
    unit_aliases = {
        "c": "cup", "tbs": "tbsp", "tsp": "tsp",
        "oz": "oz", "lb": "lb", "lbs": "lb",
        "g": "g", "kg": "kg", "ml": "ml", "l": "l",
    }
    if unit:
        unit = unit_aliases.get(unit, unit)

    return {"name": name or raw, "amount": amount, "unit": unit, "notes": notes}
