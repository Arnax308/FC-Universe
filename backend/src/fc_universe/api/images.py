import re
import time
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, Response

router = APIRouter(tags=["images"])

# Create a shared async client to reuse connections and improve speed.
# Force IPv4 to prevent 30-second IPv6 DNS resolution timeouts on Windows.
transport = httpx.AsyncHTTPTransport(local_address="0.0.0.0")
client = httpx.AsyncClient(transport=transport, timeout=10.0)

# Disk-based image cache directories
CACHE_DIR = Path(__file__).parent.parent / "data" / "image_cache"
PLAYER_CACHE = CACHE_DIR / "players"
CLUB_CACHE = CACHE_DIR / "clubs"
TROPHY_CACHE = CACHE_DIR / "trophies"
for _d in (PLAYER_CACHE, CLUB_CACHE, TROPHY_CACHE):
    _d.mkdir(parents=True, exist_ok=True)
TROPHY_ASSETS = Path(__file__).resolve().parents[4] / "frontend" / "public" / "assets" / "trophies"

CACHE_HEADERS = {"Cache-Control": "public, max-age=604800"}  # 7 days
# Remember CDN misses so every render doesn't re-hit two CDNs for images that don't exist.
MISS_TTL_SECONDS = 24 * 3600
_misses: dict[Path, float] = {}


async def _fetch_and_cache(cache_path: Path, urls: list[str]) -> Response:
    """Serve from disk cache, else try each CDN URL in order and cache the first image."""
    if cache_path.exists():
        return FileResponse(path=str(cache_path), media_type="image/png", headers=CACHE_HEADERS)

    missed_at = _misses.get(cache_path)
    if missed_at and time.time() - missed_at < MISS_TTL_SECONDS:
        raise HTTPException(status_code=404, detail="Image not found")

    for url in urls:
        try:
            response = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
        except Exception:
            continue
        if response.status_code == 200 and response.headers.get("content-type", "").startswith("image/"):
            cache_path.write_bytes(response.content)
            return Response(content=response.content, media_type="image/png", headers=CACHE_HEADERS)

    _misses[cache_path] = time.time()
    # A 404 (not a placeholder image) lets the frontend draw its own styled fallback.
    raise HTTPException(status_code=404, detail="Image not found")


@router.get("/images/player/{game_id}")
async def get_player_image(game_id: int):
    padded = str(game_id).zfill(6)
    urls = [
        f"https://cdn.sofifa.net/players/{padded[:3]}/{padded[3:6]}/26_120.png",
        f"https://cdn.futwiz.com/assets/img/fc25/faces/{game_id}.png",
        f"https://cdn.sofifa.net/players/{padded[:3]}/{padded[3:6]}/25_120.png",
    ]
    return await _fetch_and_cache(PLAYER_CACHE / f"{game_id}.png", urls)


@router.get("/images/club/{team_id}")
async def get_club_image(team_id: int):
    urls = [
        f"https://cdn.futwiz.com/assets/img/fc25/badges/{team_id}.png",
        f"https://cdn.sofifa.net/meta/team/{team_id}/120.png",
    ]
    return await _fetch_and_cache(CLUB_CACHE / f"{team_id}.png", urls)


@router.get("/images/trophy/{name}")
async def get_trophy_image(name: str):
    if not re.fullmatch(r"[a-z0-9_]+", name):
        raise HTTPException(status_code=404, detail="Trophy image not found")
    for path in (TROPHY_CACHE / f"{name}.png", TROPHY_ASSETS / f"{name}.png"):
        if path.exists():
            return FileResponse(path=str(path), media_type="image/png", headers=CACHE_HEADERS)
    raise HTTPException(status_code=404, detail="Trophy image not found")
