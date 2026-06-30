import re

from rapidfuzz import fuzz, process


class AisleMatcher:
    def __init__(self, aisles: list):
        self.aisles = aisles
        # Build keyword → aisle_id map; lower position wins on conflict
        self.keyword_to_aisle: dict[str, int] = {}
        for aisle in reversed(aisles):  # reversed so position=0 overwrites later positions
            for kw in aisle.keywords:
                self.keyword_to_aisle[kw.lower().strip()] = aisle.id
        # Sorted by length descending for substring matching (longer = more specific)
        self.all_keywords = sorted(self.keyword_to_aisle.keys(), key=len, reverse=True)

    def match(self, ingredient_name: str) -> int | None:
        if not self.all_keywords:
            return None
        normalized = ingredient_name.lower().strip()
        normalized = re.sub(r"\(.*?\)", "", normalized).strip()
        normalized = re.sub(r",.*$", "", normalized).strip()

        # Pass 1: whole-word match (longer keywords first for specificity)
        for kw in self.all_keywords:
            pattern = r"(?<![a-z])" + re.escape(kw) + r"(?![a-z])"
            if re.search(pattern, normalized):
                return self.keyword_to_aisle[kw]

        # Pass 2: fuzzy partial ratio match
        result = process.extractOne(
            normalized,
            self.all_keywords,
            scorer=fuzz.partial_ratio,
            score_cutoff=82,
        )
        if result:
            matched_kw = result[0]
            return self.keyword_to_aisle[matched_kw]

        return None
