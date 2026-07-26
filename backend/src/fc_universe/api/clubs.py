"""Clubs API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from fc_universe.database import get_db
from fc_universe.models import Club, Season
from fc_universe.schemas.club import ClubOut

router = APIRouter(tags=["clubs"])


@router.get("/careers/{career_id}/clubs", response_model=list[ClubOut])
def list_clubs(
    career_id: int, 
    skip: int = 0, 
    limit: int = 2000, 
    search: str | None = None, 
    league: str | None = None, 
    db: Session = Depends(get_db)
):
    """List all clubs in a specific career."""
    query = db.query(Club).filter(Club.career_id == career_id)
    if search:
        search_term = f"%{search}%"
        query = query.filter((Club.name.ilike(search_term)) | (Club.short_name.ilike(search_term)))
    if league:
        query = query.filter(Club.league == league)
        
    clubs = query.order_by(Club.name.asc()).offset(skip).limit(limit).all()
    return clubs


@router.get("/careers/{career_id}/clubs/{club_id}", response_model=ClubOut)
def get_club(career_id: int, club_id: int, db: Session = Depends(get_db)):
    """Get details of a specific club with dynamic manager, squad, and financial statistics."""
    from fastapi import HTTPException
    from fc_universe.models import Career, Manager, Player, Transfer, TimelineEvent
    
    club = db.query(Club).filter(Club.career_id == career_id, Club.id == club_id).first()
    if not club:
        club = db.query(Club).filter(Club.career_id == career_id, Club.game_id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
        
    career_obj = db.query(Career).filter(Career.id == career_id).first()
    
    # 1. Manager Name Resolution
    mgr_name = None
    if career_obj and career_obj.team_id is not None and (career_obj.team_id == club.game_id or career_obj.team_id == club.id):
        mgr_name = career_obj.manager_name
    if not mgr_name:
        mgr = db.query(Manager).filter(Manager.career_id == career_id, Manager.club_id == club.id).first()
        if mgr:
            mgr_name = mgr.name
    if not mgr_name:
        mgr_name = "Interim Manager"

    # 2. Stadium Name Map / Fallback
    STADIUM_MAP = {
        "Real Madrid": "Santiago Bernabéu",
        "FC Barcelona": "Spotify Camp Nou",
        "Atletico Madrid": "Cívitas Metropolitano",
        "Manchester City": "Etihad Stadium",
        "Manchester United": "Old Trafford",
        "Liverpool": "Anfield",
        "Arsenal": "Emirates Stadium",
        "Chelsea": "Stamford Bridge",
        "Bayern": "Allianz Arena",
        "Dortmund": "Signal Iduna Park",
        "Paris": "Parc des Princes",
        "Juventus": "Allianz Stadium",
        "Milan": "San Siro",
        "Inter": "San Siro"
    }
    stadium_name = None
    for name_key, st_name in STADIUM_MAP.items():
        if name_key.lower() in club.name.lower():
            stadium_name = st_name
            break
    if not stadium_name:
        stadium_name = f"{club.short_name or club.name} Stadium"

    # 3. Squad & Top Player Stats
    players_query = db.query(Player).filter(
        Player.career_id == career_id, 
        Player.current_club_id == club.id
    )
    squad_count = players_query.count()
    top_p = players_query.order_by(Player.overall.desc()).first()
    top_player_name = (top_p.known_name or f"{top_p.first_name} {top_p.last_name}".strip()) if top_p else None
    top_player_ovr = top_p.overall if top_p else None

    # 4. Transfers & Net Spend Stats
    bought_transfers = db.query(Transfer).filter(Transfer.career_id == career_id, Transfer.to_club_id == club.id).all()
    sold_transfers = db.query(Transfer).filter(Transfer.career_id == career_id, Transfer.from_club_id == club.id).all()
    
    total_spent = sum([t.fee for t in bought_transfers if t.fee])
    total_received = sum([t.fee for t in sold_transfers if t.fee])
    net_spend = total_spent - total_received
    transfers_count = len(bought_transfers) + len(sold_transfers)

    # 5. Historical All-Time Trophies Database
    # Icons served via /api/images/trophy/{name} from data/image_cache/trophies/
    # Available PNGs: balondor, bundesliga, copa_del_rey, coppa_italia, dfb_pokal,
    #                 fa, carabao, la_liga, ligue_1, pl, seria_a, ucl, uel, uecl, coupe_de_france
    HISTORICAL_TROPHIES_MAP = {
        "Real Madrid": [
            {"name": "UEFA Champions League", "icon": "/api/images/trophy/ucl", "count": 15, "category": "Continental"},
            {"name": "La Liga", "icon": "/api/images/trophy/la_liga", "count": 36, "category": "Domestic League"},
            {"name": "Copa del Rey", "icon": "/api/images/trophy/copa_del_rey", "count": 20, "category": "Domestic Cup"},
            {"name": "Supercopa de España", "icon": "/api/images/trophy/copa_del_rey", "count": 13, "category": "Domestic Supercup"},
            {"name": "FIFA Club World Cup", "icon": "/api/images/trophy/ucl", "count": 5, "category": "World"}
        ],
        "Barcelona": [
            {"name": "UEFA Champions League", "icon": "/api/images/trophy/ucl", "count": 5, "category": "Continental"},
            {"name": "La Liga", "icon": "/api/images/trophy/la_liga", "count": 27, "category": "Domestic League"},
            {"name": "Copa del Rey", "icon": "/api/images/trophy/copa_del_rey", "count": 31, "category": "Domestic Cup"},
            {"name": "Supercopa de España", "icon": "/api/images/trophy/copa_del_rey", "count": 14, "category": "Domestic Supercup"},
            {"name": "FIFA Club World Cup", "icon": "/api/images/trophy/ucl", "count": 3, "category": "World"}
        ],
        "Bayern": [
            {"name": "UEFA Champions League", "icon": "/api/images/trophy/ucl", "count": 6, "category": "Continental"},
            {"name": "Bundesliga", "icon": "/api/images/trophy/bundesliga", "count": 33, "category": "Domestic League"},
            {"name": "DFB-Pokal", "icon": "/api/images/trophy/dfb_pokal", "count": 20, "category": "Domestic Cup"},
            {"name": "DFL-Supercup", "icon": "/api/images/trophy/dfb_pokal", "count": 10, "category": "Domestic Supercup"}
        ],
        "Manchester City": [
            {"name": "UEFA Champions League", "icon": "/api/images/trophy/ucl", "count": 1, "category": "Continental"},
            {"name": "Premier League", "icon": "/api/images/trophy/pl", "count": 10, "category": "Domestic League"},
            {"name": "FA Cup", "icon": "/api/images/trophy/fa", "count": 7, "category": "Domestic Cup"},
            {"name": "EFL Cup (Carabao)", "icon": "/api/images/trophy/carabao", "count": 8, "category": "League Cup"},
            {"name": "Community Shield", "icon": "/api/images/trophy/fa", "count": 7, "category": "Supercup"}
        ],
        "Manchester United": [
            {"name": "UEFA Champions League", "icon": "/api/images/trophy/ucl", "count": 3, "category": "Continental"},
            {"name": "Premier League", "icon": "/api/images/trophy/pl", "count": 20, "category": "Domestic League"},
            {"name": "FA Cup", "icon": "/api/images/trophy/fa", "count": 13, "category": "Domestic Cup"},
            {"name": "EFL Cup", "icon": "/api/images/trophy/carabao", "count": 6, "category": "League Cup"},
            {"name": "Community Shield", "icon": "/api/images/trophy/fa", "count": 21, "category": "Supercup"}
        ],
        "Liverpool": [
            {"name": "UEFA Champions League", "icon": "/api/images/trophy/ucl", "count": 6, "category": "Continental"},
            {"name": "Premier League", "icon": "/api/images/trophy/pl", "count": 19, "category": "Domestic League"},
            {"name": "FA Cup", "icon": "/api/images/trophy/fa", "count": 8, "category": "Domestic Cup"},
            {"name": "EFL Cup", "icon": "/api/images/trophy/carabao", "count": 10, "category": "League Cup"},
            {"name": "Community Shield", "icon": "/api/images/trophy/fa", "count": 16, "category": "Supercup"}
        ],
        "Arsenal": [
            {"name": "Premier League", "icon": "/api/images/trophy/pl", "count": 13, "category": "Domestic League"},
            {"name": "FA Cup", "icon": "/api/images/trophy/fa", "count": 14, "category": "Domestic Cup"},
            {"name": "EFL Cup", "icon": "/api/images/trophy/carabao", "count": 2, "category": "League Cup"},
            {"name": "FA Community Shield", "icon": "/api/images/trophy/fa", "count": 17, "category": "Supercup"}
        ],
        "Chelsea": [
            {"name": "UEFA Champions League", "icon": "/api/images/trophy/ucl", "count": 2, "category": "Continental"},
            {"name": "Premier League", "icon": "/api/images/trophy/pl", "count": 6, "category": "Domestic League"},
            {"name": "FA Cup", "icon": "/api/images/trophy/fa", "count": 8, "category": "Domestic Cup"},
            {"name": "EFL Cup", "icon": "/api/images/trophy/carabao", "count": 5, "category": "League Cup"},
            {"name": "UEFA Europa League", "icon": "/api/images/trophy/uel", "count": 2, "category": "Continental"}
        ],
        "Milan": [
            {"name": "UEFA Champions League", "icon": "/api/images/trophy/ucl", "count": 7, "category": "Continental"},
            {"name": "Serie A Scudetto", "icon": "/api/images/trophy/seria_a", "count": 19, "category": "Domestic League"},
            {"name": "Coppa Italia", "icon": "/api/images/trophy/coppa_italia", "count": 5, "category": "Domestic Cup"},
            {"name": "Supercoppa Italiana", "icon": "/api/images/trophy/coppa_italia", "count": 7, "category": "Domestic Supercup"}
        ],
        "Inter": [
            {"name": "UEFA Champions League", "icon": "/api/images/trophy/ucl", "count": 3, "category": "Continental"},
            {"name": "Serie A Scudetto", "icon": "/api/images/trophy/seria_a", "count": 20, "category": "Domestic League"},
            {"name": "Coppa Italia", "icon": "/api/images/trophy/coppa_italia", "count": 9, "category": "Domestic Cup"},
            {"name": "Supercoppa Italiana", "icon": "/api/images/trophy/coppa_italia", "count": 8, "category": "Domestic Supercup"}
        ],
        "Juventus": [
            {"name": "UEFA Champions League", "icon": "/api/images/trophy/ucl", "count": 2, "category": "Continental"},
            {"name": "Serie A Scudetto", "icon": "/api/images/trophy/seria_a", "count": 36, "category": "Domestic League"},
            {"name": "Coppa Italia", "icon": "/api/images/trophy/coppa_italia", "count": 15, "category": "Domestic Cup"},
            {"name": "Supercoppa Italiana", "icon": "/api/images/trophy/coppa_italia", "count": 9, "category": "Domestic Supercup"}
        ],
        "Paris": [
            {"name": "Ligue 1", "icon": "/api/images/trophy/ligue_1", "count": 12, "category": "Domestic League"},
            {"name": "Coupe de France", "icon": "/api/images/trophy/coupe_de_france", "count": 15, "category": "Domestic Cup"},
            {"name": "Trophée des Champions", "icon": "/api/images/trophy/coupe_de_france", "count": 12, "category": "Domestic Supercup"}
        ]
    }

    hist_trophies = None
    for k, v in HISTORICAL_TROPHIES_MAP.items():
        if k.lower() in club.name.lower():
            hist_trophies = v
            break

    if not hist_trophies:
        dom_p = club.domestic_prestige or 5
        intl_p = club.international_prestige or 5
        hist_trophies = []
        if dom_p > 5:
            hist_trophies.append({"name": "Domestic League Titles", "icon": "/api/images/trophy/pl", "count": int(dom_p * 1.5), "category": "Domestic"})
        if dom_p > 3:
            hist_trophies.append({"name": "Domestic Cup Titles", "icon": "/api/images/trophy/fa", "count": int(dom_p * 1.2), "category": "Domestic Cup"})
        if intl_p > 7:
            hist_trophies.append({"name": "Continental Titles", "icon": "/api/images/trophy/ucl", "count": int(intl_p // 3), "category": "Continental"})

    # 6. In-Universe Trophies Won for this specific club
    # Clubs are duplicated per-season (same game_id, different db ids).
    # Find ALL club rows with matching game_id, then query trophies for any of those ids.
    univ_trophies = []
    if club.game_id:
        all_club_ids = [
            c.id for c in db.query(Club.id).filter(
                Club.career_id == career_id,
                Club.game_id == club.game_id
            ).all()
        ]
        club_events = db.query(TimelineEvent).filter(
            TimelineEvent.career_id == career_id,
            TimelineEvent.event_type == "trophy",
            TimelineEvent.related_club_id.in_(all_club_ids)
        ).all()
    else:
        club_events = []
    
    def _resolve_trophy_icon(desc: str) -> str:
        """Pick the best available trophy PNG based on description keywords."""
        dl = desc.lower()
        if "champions league" in dl or "ucl" in dl:
            return "/api/images/trophy/ucl"
        if "europa league" in dl:
            return "/api/images/trophy/uel"
        if "conference" in dl:
            return "/api/images/trophy/uecl"
        if "premier league" in dl:
            return "/api/images/trophy/pl"
        if "bundesliga" in dl:
            return "/api/images/trophy/bundesliga"
        if "serie a" in dl or "scudetto" in dl:
            return "/api/images/trophy/seria_a"
        if "la liga" in dl or "laliga" in dl or "primera divis" in dl:
            return "/api/images/trophy/la_liga"
        if "copa del rey" in dl:
            return "/api/images/trophy/copa_del_rey"
        if "coppa italia" in dl:
            return "/api/images/trophy/coppa_italia"
        if "dfb" in dl or "pokal" in dl:
            return "/api/images/trophy/dfb_pokal"
        if "efl" in dl or "carabao" in dl or "league cup" in dl:
            return "/api/images/trophy/carabao"
        if "ligue 1" in dl:
            return "/api/images/trophy/ligue_1"
        if "coupe de france" in dl:
            return "/api/images/trophy/coupe_de_france"
        if "fa cup" in dl or "community shield" in dl:
            return "/api/images/trophy/fa"
        if "wsl" in dl or "nwsl" in dl or "liga f" in dl or "frauen" in dl:
            return "/api/images/trophy/pl"
        return "/api/images/trophy/fa"
    
    for me in club_events:
        desc = me.description
        # Extract clean trophy name from "Club have won the X title in the Y season!"
        clean_name = desc
        if " have won the " in desc:
            clean_name = desc.split(" have won the ", 1)[1]
            if " title in the " in clean_name:
                clean_name = clean_name.split(" title in the ", 1)[0]
        
        # Get the season year
        season_obj = db.query(Season).filter(Season.id == me.season_id).first() if me.season_id else None
        season_year = season_obj.year if season_obj else None
        
        univ_trophies.append({
            "name": clean_name,
            "icon": _resolve_trophy_icon(desc),
            "count": 1,
            "year": season_year,
            "category": "In-Universe Career"
        })

    return {
        "id": club.id,
        "career_id": club.career_id,
        "game_id": club.game_id,
        "name": club.name,
        "short_name": club.short_name,
        "league": club.league,
        "country": club.country,
        "overall_rating": club.overall_rating,
        "defense_rating": club.defense_rating,
        "midfield_rating": club.midfield_rating,
        "attack_rating": club.attack_rating,
        "club_worth": club.club_worth,
        "domestic_prestige": club.domestic_prestige,
        "international_prestige": club.international_prestige,
        "foundation_year": club.foundation_year,
        "rival_team_id": club.rival_team_id,
        "created_at": club.created_at,
        "updated_at": club.updated_at,
        "manager_name": mgr_name,
        "stadium_name": stadium_name,
        "squad_count": squad_count,
        "top_player_name": top_player_name,
        "top_player_overall": top_player_ovr,
        "transfers_count": transfers_count,
        "total_spent": total_spent,
        "total_received": total_received,
        "net_spend": net_spend,
        "historical_trophies": hist_trophies,
        "universe_trophies": univ_trophies
    }


