from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import httpx

router = APIRouter(tags=["images"])

# Create a shared async client to reuse connections and improve speed.
# Force IPv4 to prevent 30-second IPv6 DNS resolution timeouts on Windows.
transport = httpx.AsyncHTTPTransport(local_address="0.0.0.0")
client = httpx.AsyncClient(transport=transport, timeout=10.0)

@router.get("/images/player/{game_id}")
async def get_player_image(game_id: int):
    # Try Futwiz CDN first (very fast, reliable)
    url = f"https://cdn.futwiz.com/assets/img/fc25/faces/{game_id}.png"
    try:
        response = await client.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        if response.status_code == 200:
            return Response(content=response.content, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})
        elif response.status_code == 404:
            # Fallback to Sofifa 25_120
            padded = str(game_id).zfill(6)
            url_sofifa = f"https://cdn.sofifa.net/players/{padded[:3]}/{padded[3:6]}/25_120.png"
            sofifa_response = await client.get(url_sofifa, headers={'User-Agent': 'Mozilla/5.0'})
            if sofifa_response.status_code == 200:
                return Response(content=sofifa_response.content, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})
            else:
                raise HTTPException(status_code=404, detail="Image not found")
        else:
            raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        print(f"Error fetching player image {game_id}: {e}")
        raise HTTPException(status_code=500, detail="Error fetching image")

@router.get("/images/club/{team_id}")
async def get_club_image(team_id: int):
    url = f"https://cdn.futwiz.com/assets/img/fc25/badges/{team_id}.png"
    try:
        response = await client.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        if response.status_code == 200:
            return Response(content=response.content, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})
        else:
            # Fallback to sofifa
            url_sofifa = f"https://cdn.sofifa.net/meta/team/{team_id}/120.png"
            sofifa_response = await client.get(url_sofifa, headers={'User-Agent': 'Mozilla/5.0'})
            if sofifa_response.status_code == 200:
                return Response(content=sofifa_response.content, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})
            else:
                raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        print(f"Error fetching club image {team_id}: {e}")
        raise HTTPException(status_code=404, detail="Image not found")
