from pathlib import Path

import httpx

IMAGE_DIR = Path("/data/images")
_MAX_BYTES = 10 * 1024 * 1024  # 10 MB
_TIMEOUT = 15.0
_CT_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
}
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
}


def _ext(content_type: str) -> str:
    ct = content_type.split(";")[0].strip().lower()
    return _CT_TO_EXT.get(ct, ".jpg")


async def cache_image(recipe_id: int, url: str) -> str | None:
    """Download url, store at /data/images/recipe_{id}.{ext}, return public path or None."""
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        async with httpx.AsyncClient(
            follow_redirects=True, timeout=_TIMEOUT, headers=_HEADERS
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            ct = resp.headers.get("content-type", "image/jpeg")
            if not ct.startswith("image/"):
                return None
            data = resp.content
            if len(data) > _MAX_BYTES:
                return None

        ext = _ext(ct)
        # Remove any previous cached file for this recipe
        for old in IMAGE_DIR.glob(f"recipe_{recipe_id}.*"):
            old.unlink(missing_ok=True)

        (IMAGE_DIR / f"recipe_{recipe_id}{ext}").write_bytes(data)
        return f"/images/recipe_{recipe_id}{ext}"
    except Exception:
        return None


def delete_cached_image(recipe_id: int) -> None:
    for f in IMAGE_DIR.glob(f"recipe_{recipe_id}.*"):
        f.unlink(missing_ok=True)
