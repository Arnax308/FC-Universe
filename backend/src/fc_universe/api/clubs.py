"""Clubs API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from fc_universe.api.common import (
    club_brief, current_season_year, season_label, trophy_dict, trophy_rows,
)
from fc_universe.database import get_db
from fc_universe.models import (
    Career, Club, ClubSeasonStats, Competition, Manager, Player, Season, Transfer,
)
from fc_universe.schemas.club import ClubOut

router = APIRouter(tags=["clubs"])

# Home grounds for the best-known clubs, keyed by EA team id.
STADIUMS = {
    243: "Santiago Bernabéu", 241: "Spotify Camp Nou", 240: "Riyadh Air Metropolitano",
    10: "Etihad Stadium", 11: "Old Trafford", 9: "Anfield", 1: "Emirates Stadium",
    5: "Stamford Bridge", 18: "Tottenham Hotspur Stadium", 21: "Allianz Arena",
    22: "Signal Iduna Park", 73: "Parc des Princes", 45: "Allianz Stadium",
    131681: "San Siro", 131682: "San Siro", 461: "Mestalla",
}


def _honour(name: str, icon: str, count: int, category: str) -> dict:
    return {"name": name, "icon": f"/api/images/trophy/{icon}", "count": count, "category": category}


# Real-world honours won before the career began, keyed by EA team id — exact club only,
# so women's, historic and namesake teams don't inherit them.
REAL_WORLD_HONOURS = {
    243: [  # Real Madrid
        _honour("UEFA Champions League", "ucl", 15, "Continental"),
        _honour("La Liga", "la_liga", 36, "Domestic League"),
        _honour("Copa del Rey", "copa_del_rey", 20, "Domestic Cup"),
        _honour("Supercopa de España", "copa_del_rey", 13, "Domestic Supercup"),
    ],
    241: [  # FC Barcelona
        _honour("UEFA Champions League", "ucl", 5, "Continental"),
        _honour("La Liga", "la_liga", 28, "Domestic League"),
        _honour("Copa del Rey", "copa_del_rey", 32, "Domestic Cup"),
        _honour("Supercopa de España", "copa_del_rey", 15, "Domestic Supercup"),
    ],
    21: [  # Bayern München
        _honour("UEFA Champions League", "ucl", 6, "Continental"),
        _honour("Bundesliga", "bundesliga", 34, "Domestic League"),
        _honour("DFB-Pokal", "dfb_pokal", 20, "Domestic Cup"),
    ],
    10: [  # Manchester City
        _honour("UEFA Champions League", "ucl", 1, "Continental"),
        _honour("Premier League", "pl", 10, "Domestic League"),
        _honour("FA Cup", "fa", 7, "Domestic Cup"),
        _honour("EFL Cup", "carabao", 8, "League Cup"),
    ],
    11: [  # Manchester United
        _honour("UEFA Champions League", "ucl", 3, "Continental"),
        _honour("Premier League", "pl", 20, "Domestic League"),
        _honour("FA Cup", "fa", 13, "Domestic Cup"),
        _honour("EFL Cup", "carabao", 6, "League Cup"),
    ],
    9: [  # Liverpool
        _honour("UEFA Champions League", "ucl", 6, "Continental"),
        _honour("Premier League", "pl", 20, "Domestic League"),
        _honour("FA Cup", "fa", 8, "Domestic Cup"),
        _honour("EFL Cup", "carabao", 10, "League Cup"),
    ],
    1: [  # Arsenal
        _honour("Premier League", "pl", 13, "Domestic League"),
        _honour("FA Cup", "fa", 14, "Domestic Cup"),
        _honour("EFL Cup", "carabao", 2, "League Cup"),
    ],
    5: [  # Chelsea
        _honour("UEFA Champions League", "ucl", 2, "Continental"),
        _honour("Premier League", "pl", 6, "Domestic League"),
        _honour("FA Cup", "fa", 8, "Domestic Cup"),
        _honour("UEFA Europa League", "uel", 2, "Continental"),
    ],
    131681: [  # Milano FC (AC Milan)
        _honour("UEFA Champions League", "ucl", 7, "Continental"),
        _honour("Serie A", "seria_a", 19, "Domestic League"),
        _honour("Coppa Italia", "coppa_italia", 5, "Domestic Cup"),
    ],
    131682: [  # Lombardia FC (Inter)
        _honour("UEFA Champions League", "ucl", 3, "Continental"),
        _honour("Serie A", "seria_a", 20, "Domestic League"),
        _honour("Coppa Italia", "coppa_italia", 9, "Domestic Cup"),
    ],
    45: [  # Juventus
        _honour("UEFA Champions League", "ucl", 2, "Continental"),
        _honour("Serie A", "seria_a", 36, "Domestic League"),
        _honour("Coppa Italia", "coppa_italia", 15, "Domestic Cup"),
    ],
    73: [  # Paris Saint-Germain
        _honour("UEFA Champions League", "ucl", 1, "Continental"),
        _honour("Ligue 1", "ligue_1", 13, "Domestic League"),
        _honour("Coupe de France", "coupe_de_france", 16, "Domestic Cup"),
    ],
}


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
        term = f"%{search}%"
        query = query.filter(Club.name.ilike(term) | Club.short_name.ilike(term))
    if league:
        query = query.filter(Club.league == league)
    return query.order_by(Club.name.asc()).offset(skip).limit(limit).all()


@router.get("/careers/{career_id}/clubs/{club_id}", response_model=ClubOut)
def get_club(career_id: int, club_id: int, db: Session = Depends(get_db)):
    """Club details: manager, squad, finances, honours. ``club_id`` is a database id."""
    club = db.query(Club).filter(Club.career_id == career_id, Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    career = db.get(Career, career_id)
    is_user_club = bool(career and career.team_id is not None and career.team_id == club.game_id)

    if is_user_club:
        mgr_name = career.manager_name
    else:
        mgr = db.query(Manager).filter(Manager.career_id == career_id, Manager.club_id == club.id).first()
        mgr_name = mgr.name if mgr else None

    squad = db.query(Player).filter(
        Player.career_id == career_id, Player.current_club_id == club.id, Player.is_retired.isnot(True)
    )
    squad_count = squad.count()
    top = squad.order_by(Player.overall.desc()).first()

    spent = db.query(func.coalesce(func.sum(Transfer.fee), 0), func.count(Transfer.id)).filter(
        Transfer.career_id == career_id, Transfer.to_club_id == club.id).one()
    received = db.query(func.coalesce(func.sum(Transfer.fee), 0), func.count(Transfer.id)).filter(
        Transfer.career_id == career_id, Transfer.from_club_id == club.id).one()

    year = current_season_year(db, career_id)
    standing = (
        db.query(ClubSeasonStats, Competition)
        .join(Season, Season.id == ClubSeasonStats.season_id)
        .outerjoin(Competition, Competition.id == ClubSeasonStats.competition_id)
        .filter(ClubSeasonStats.club_id == club.id, Season.year <= year)
        .order_by(Season.year.desc())
        .first()
    )
    rival = None
    if club.rival_team_id:
        rival = db.query(Club).filter(Club.career_id == career_id, Club.game_id == club.rival_team_id).first()

    data = {c.name: getattr(club, c.name) for c in club.__table__.columns}
    data.update(
        manager_name=mgr_name,
        is_user_club=is_user_club,
        stadium_name=STADIUMS.get(club.game_id),
        squad_count=squad_count,
        top_player_name=top.known_name if top else None,
        top_player_overall=top.overall if top else None,
        top_player_id=top.id if top else None,
        top_player_game_id=top.game_id if top else None,
        transfers_count=spent[1] + received[1],
        total_spent=float(spent[0]),
        total_received=float(received[0]),
        net_spend=float(spent[0]) - float(received[0]),
        historical_trophies=REAL_WORLD_HONOURS.get(club.game_id, []),
        universe_trophies=[trophy_dict(*row) for row in trophy_rows(db, career_id, [club.id])],
        league_position=standing[0].position if standing else None,
        previous_position=standing[0].previous_position if standing else None,
        competition_id=standing[1].id if standing and standing[1] else None,
        rival=club_brief(rival),
        season_label=season_label(year),
    )
    return data


@router.get("/careers/{career_id}/competitions/{competition_id}/table")
def league_table(career_id: int, competition_id: int, season: int | None = None, db: Session = Depends(get_db)):
    """Standings for a league in ``season`` (default: the latest season with a table)."""
    comp = db.query(Competition).filter(Competition.career_id == career_id, Competition.id == competition_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found")
    years = sorted({y for (y,) in db.query(Season.year).join(ClubSeasonStats, ClubSeasonStats.season_id == Season.id)
                    .filter(Season.career_id == career_id, ClubSeasonStats.competition_id == comp.id)}, reverse=True)
    year = season if season in years else (years[0] if years else current_season_year(db, career_id))
    rows = (
        db.query(ClubSeasonStats, Club)
        .join(Club, Club.id == ClubSeasonStats.club_id)
        .join(Season, Season.id == ClubSeasonStats.season_id)
        .filter(ClubSeasonStats.competition_id == comp.id, Season.year == year)
        .order_by(ClubSeasonStats.position.asc())
        .all()
    )
    return {
        "competition": {"id": comp.id, "game_id": comp.game_id, "name": comp.name, "type": comp.type},
        "season_label": season_label(year),
        "season": year,
        "seasons": years,
        "rows": [
            {
                "position": s.position,
                "previous_position": s.previous_position,
                "club": club_brief(c),
                "played": s.matches_played,
                "wins": s.wins, "draws": s.draws, "losses": s.losses,
                "goals_for": s.goals_for, "goals_against": s.goals_against, "points": s.points,
            }
            for s, c in rows
        ],
    }
