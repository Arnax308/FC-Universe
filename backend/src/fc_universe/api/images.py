from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, FileResponse
from pathlib import Path
import httpx

router = APIRouter(tags=["images"])

# Create a shared async client to reuse connections and improve speed.
# Force IPv4 to prevent 30-second IPv6 DNS resolution timeouts on Windows.
transport = httpx.AsyncHTTPTransport(local_address="0.0.0.0")
client = httpx.AsyncClient(transport=transport, timeout=10.0)

# Disk-based image cache directories
CACHE_DIR = Path(__file__).parent.parent / "data" / "image_cache"
PLAYER_CACHE = CACHE_DIR / "players"
CLUB_CACHE = CACHE_DIR / "clubs"
PLAYER_CACHE.mkdir(parents=True, exist_ok=True)
CLUB_CACHE.mkdir(parents=True, exist_ok=True)


async def _fetch_and_cache(cache_path: Path, urls: list[str]) -> Response:
    """Try fetching from disk cache first, then CDN URLs in order. Cache on success."""
    # 1. Check disk cache
    if cache_path.exists():
        return FileResponse(
            path=str(cache_path),
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=604800"}  # 7 days
        )
    
    # 2. Try each CDN URL in order
    for url in urls:
        try:
            response = await client.get(url, headers={'User-Agent': 'Mozilla/5.0'})
            if response.status_code == 200:
                # Save to disk cache
                cache_path.write_bytes(response.content)
                return Response(
                    content=response.content,
                    media_type="image/png",
                    headers={"Cache-Control": "public, max-age=604800"}
                )
        except Exception:
            continue
    
    raise HTTPException(status_code=404, detail="Image not found")


DEFAULT_PLAYER_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="#64748b"><circle cx="12" cy="8" r="4"/><path d="M12 14c-4.42 0-8 2.69-8 6v1h16v-1c0-3.31-3.58-6-8-6z"/></svg>"""
DEFAULT_CLUB_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="#64748b"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-5.45 9-12V5l-9-4z"/></svg>"""


@router.get("/images/player/{game_id}")
async def get_player_image(game_id: int):
    cache_path = PLAYER_CACHE / f"{game_id}.png"
    
    # Build fallback URL list
    padded = str(game_id).zfill(6)
    urls = [
        f"https://cdn.futwiz.com/assets/img/fc25/faces/{game_id}.png",
        f"https://cdn.sofifa.net/players/{padded[:3]}/{padded[3:6]}/25_120.png",
    ]
    
    try:
        return await _fetch_and_cache(cache_path, urls)
    except Exception:
        return Response(content=DEFAULT_PLAYER_SVG, media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=86400"})


@router.get("/images/club/{team_id}")
async def get_club_image(team_id: int):
    cache_path = CLUB_CACHE / f"{team_id}.png"
    
    urls = [
        f"https://cdn.futwiz.com/assets/img/fc25/badges/{team_id}.png",
        f"https://cdn.sofifa.net/meta/team/{team_id}/120.png",
    ]
    
    try:
        return await _fetch_and_cache(cache_path, urls)
    except Exception:
        return Response(content=DEFAULT_CLUB_SVG, media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=86400"})


TROPHY_CACHE = CACHE_DIR / "trophies"
TROPHY_CACHE.mkdir(parents=True, exist_ok=True)


@router.get("/images/trophy/{name}")
async def get_trophy_image(name: str):
    cache_path = TROPHY_CACHE / f"{name}.png"
    if cache_path.exists():
        return FileResponse(
            path=str(cache_path),
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=604800"}
        )
    asset_path = Path(__file__).parent.parent.parent.parent / "frontend" / "public" / "assets" / "trophies" / f"{name}.png"
    if asset_path.exists():
        return FileResponse(
            path=str(asset_path),
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=604800"}
        )
    raise HTTPException(status_code=404, detail="Trophy image not found")

