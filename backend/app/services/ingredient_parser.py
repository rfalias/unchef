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

_UNITS_PATTERN = "|".join(re.escape(u) for u in sorted(UNITS, key=len, reverse=True))

_AMOUNT_RE = re.compile(
    r"^"
    r"(?P<amount>"
    r"(?:\d+\s+)?"           # optional whole number
    r"(?:\d+/\d+|\d+\.?\d*)" # fraction or decimal
    r")"
    r"\s*"
    r"(?:(?P<unit>" + _UNITS_PATTERN + r")(?=[\s.,/]|$))?"
    r"\.?\s*"
    r"(?P<rest>.*)$",
    re.IGNORECASE,
)

# Matches a compound secondary amount like "+ 3/4 teaspoon" or "+ 2 tablespoons"
_COMPOUND_RE = re.compile(
    r"^\+\s*(?:\d+\s+)?(?:\d+/\d+|\d+\.?\d*)\s+(?:" + _UNITS_PATTERN + r")\s*",
    re.IGNORECASE,
)


def _normalize_unicode_fractions(text: str) -> str:
    def replace(m: re.Match) -> str:
        # Insert a space when a digit immediately precedes the fraction (e.g. 1½ → 1 1/2)
        prefix = " " if m.start() > 0 and text[m.start() - 1].isdigit() else ""
        return prefix + FRACTION_MAP[m.group()]
    return _FRACTION_UNICODE_RE.sub(replace, text)


def parse_ingredient(raw: str) -> dict:
    """Parse a raw ingredient string into {name, amount, unit, notes}."""
    raw = raw.strip()
    if not raw:
        return {"name": "", "amount": None, "unit": None, "notes": None}

    raw = _normalize_unicode_fractions(raw)

    # Collect ALL parenthetical groups as notes, then remove them from raw
    notes_parts = re.findall(r"\(([^)]*)\)", raw)
    notes = "; ".join(p.strip() for p in notes_parts if p.strip()) or None
    raw = re.sub(r"\s*\([^)]*\)\s*", " ", raw).strip().rstrip(",").strip()
    # Strip any residual unmatched closing parens left by nested groups
    raw = raw.replace(")", "").strip().rstrip(",").strip()

    m = _AMOUNT_RE.match(raw)
    if m:
        amount = m.group("amount").strip() or None
        unit = (m.group("unit") or "").strip().lower() or None
        name = m.group("rest").strip().rstrip(",").strip()

        # Strip compound secondary amounts like "+ 3/4 teaspoon" from the start of name
        comp = _COMPOUND_RE.match(name)
        if comp:
            name = name[comp.end():].strip().rstrip(",").strip()
    else:
        amount = None
        unit = None
        name = raw.strip().rstrip(",").strip()

    # Normalize unit aliases
    unit_aliases = {
        "c": "cup", "tbs": "tbsp", "tsp": "tsp",
        "oz": "oz", "lb": "lb", "lbs": "lb",
        "g": "g", "kg": "kg", "ml": "ml", "l": "l",
    }
    if unit:
        unit = unit_aliases.get(unit, unit)

    return {"name": name or raw, "amount": amount, "unit": unit, "notes": notes}
