"""Clubs API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from fc_universe.database import get_db
from fc_universe.models import Club
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
    HISTORICAL_TROPHIES_MAP = {
        "Real Madrid": [
            {"name": "UEFA Champions League", "icon": "/assets/trophies/ucl.png", "count": 15, "category": "Continental"},
            {"name": "La Liga", "icon": "/assets/trophies/league.png", "count": 36, "category": "Domestic League"},
            {"name": "Copa del Rey", "icon": "/assets/trophies/cup.png", "count": 20, "category": "Domestic Cup"},
            {"name": "FIFA Club World Cup", "icon": "/assets/trophies/ucl.png", "count": 5, "category": "World"}
        ],
        "Barcelona": [
            {"name": "UEFA Champions League", "icon": "/assets/trophies/ucl.png", "count": 5, "category": "Continental"},
            {"name": "La Liga", "icon": "/assets/trophies/league.png", "count": 27, "category": "Domestic League"},
            {"name": "Copa del Rey", "icon": "/assets/trophies/cup.png", "count": 31, "category": "Domestic Cup"},
            {"name": "FIFA Club World Cup", "icon": "/assets/trophies/ucl.png", "count": 3, "category": "World"}
        ],
        "Bayern": [
            {"name": "UEFA Champions League", "icon": "/assets/trophies/ucl.png", "count": 6, "category": "Continental"},
            {"name": "Bundesliga", "icon": "/assets/trophies/league.png", "count": 33, "category": "Domestic League"},
            {"name": "DFB-Pokal", "icon": "/assets/trophies/cup.png", "count": 20, "category": "Domestic Cup"}
        ],
        "Manchester City": [
            {"name": "UEFA Champions League", "icon": "/assets/trophies/ucl.png", "count": 1, "category": "Continental"},
            {"name": "Premier League", "icon": "/assets/trophies/league.png", "count": 10, "category": "Domestic League"},
            {"name": "FA Cup", "icon": "/assets/trophies/cup.png", "count": 7, "category": "Domestic Cup"}
        ],
        "Manchester United": [
            {"name": "UEFA Champions League", "icon": "/assets/trophies/ucl.png", "count": 3, "category": "Continental"},
            {"name": "Premier League", "icon": "/assets/trophies/league.png", "count": 20, "category": "Domestic League"},
            {"name": "FA Cup", "icon": "/assets/trophies/cup.png", "count": 13, "category": "Domestic Cup"}
        ],
        "Liverpool": [
            {"name": "UEFA Champions League", "icon": "/assets/trophies/ucl.png", "count": 6, "category": "Continental"},
            {"name": "Premier League", "icon": "/assets/trophies/league.png", "count": 19, "category": "Domestic League"},
            {"name": "FA Cup", "icon": "/assets/trophies/cup.png", "count": 8, "category": "Domestic Cup"}
        ],
        "Arsenal": [
            {"name": "Premier League", "icon": "/assets/trophies/league.png", "count": 13, "category": "Domestic League"},
            {"name": "FA Cup", "icon": "/assets/trophies/cup.png", "count": 14, "category": "Domestic Cup"},
            {"name": "Community Shield", "icon": "/assets/trophies/cup.png", "count": 17, "category": "Domestic Cup"}
        ],
        "Chelsea": [
            {"name": "UEFA Champions League", "icon": "/assets/trophies/ucl.png", "count": 2, "category": "Continental"},
            {"name": "Premier League", "icon": "/assets/trophies/league.png", "count": 6, "category": "Domestic League"},
            {"name": "FA Cup", "icon": "/assets/trophies/cup.png", "count": 8, "category": "Domestic Cup"}
        ],
        "Milan": [
            {"name": "UEFA Champions League", "icon": "/assets/trophies/ucl.png", "count": 7, "category": "Continental"},
            {"name": "Serie A", "icon": "/assets/trophies/league.png", "count": 19, "category": "Domestic League"},
            {"name": "Coppa Italia", "icon": "/assets/trophies/cup.png", "count": 5, "category": "Domestic Cup"}
        ],
        "Inter": [
            {"name": "UEFA Champions League", "icon": "/assets/trophies/ucl.png", "count": 3, "category": "Continental"},
            {"name": "Serie A", "icon": "/assets/trophies/league.png", "count": 20, "category": "Domestic League"},
            {"name": "Coppa Italia", "icon": "/assets/trophies/cup.png", "count": 9, "category": "Domestic Cup"}
        ],
        "Juventus": [
            {"name": "UEFA Champions League", "icon": "/assets/trophies/ucl.png", "count": 2, "category": "Continental"},
            {"name": "Serie A", "icon": "/assets/trophies/league.png", "count": 36, "category": "Domestic League"},
            {"name": "Coppa Italia", "icon": "/assets/trophies/cup.png", "count": 15, "category": "Domestic Cup"}
        ],
        "Paris": [
            {"name": "Ligue 1", "icon": "/assets/trophies/league.png", "count": 12, "category": "Domestic League"},
            {"name": "Coupe de France", "icon": "/assets/trophies/cup.png", "count": 15, "category": "Domestic Cup"}
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
            hist_trophies.append({"name": "Domestic League Titles", "icon": "/assets/trophies/league.png", "count": int(dom_p * 1.5), "category": "Domestic"})
        if dom_p > 3:
            hist_trophies.append({"name": "Domestic Cup Titles", "icon": "/assets/trophies/cup.png", "count": int(dom_p * 1.2), "category": "Domestic Cup"})
        if intl_p > 7:
            hist_trophies.append({"name": "Continental Titles", "icon": "/assets/trophies/ucl.png", "count": int(intl_p // 3), "category": "Continental"})

    # 6. In-Universe Trophies Won for this specific club
    univ_trophies = []
    club_events = db.query(TimelineEvent).filter(
        TimelineEvent.career_id == career_id,
        TimelineEvent.event_type == "trophy"
    ).all()
    
    matching_events = [
        e for e in club_events 
        if e.related_club_id == club.id or (club.game_id and e.related_club_id == club.game_id) or (club.name and club.name.lower() in e.description.lower())
    ]
    
    if len(matching_events) > 0:
        for me in matching_events:
            desc = me.description
            icon = "/assets/trophies/ucl.png" if "Champions League" in desc else "/assets/trophies/league.png"
            univ_trophies.append({
                "name": desc,
                "icon": icon,
                "count": 1,
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


