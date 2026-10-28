"""Players API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, aliased

from fc_universe.api.common import (
    club_brief, current_season_year, resolve_trophy_icon, trophy_dict, trophy_rows, user_club,
)
from fc_universe.database import get_db
from fc_universe.models import (
    Award, Career, Club, Player, PlayerSeasonStats, Season, TimelineEvent, Transfer,
)
from fc_universe.schemas.player import PlayerOut

router = APIRouter(tags=["players"])


def _player_out(player: Player, club: Club | None, current_year: int) -> dict:
    data = {c.name: getattr(player, c.name) for c in player.__table__.columns}
    data["club_name"] = club.name if club else "Free Agent"
    data["club"] = club_brief(club)
    data["age"] = current_year - player.birth_year if player.birth_year else None
    return data


@router.get("/careers/{career_id}/players", response_model=list[PlayerOut])
def list_players(
    career_id: int,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    gender: int | None = None,
    my_club: bool = False,
    club_id: int | None = None,
    position: str | None = None,
    include_retired: bool = False,
    db: Session = Depends(get_db)
):
    """List players in a career, best first. ``club_id`` is a database club id."""
    query = (
        db.query(Player, Club)
        .outerjoin(Club, Club.id == Player.current_club_id)
        .filter(Player.career_id == career_id)
    )
    if not include_retired:
        query = query.filter(Player.is_retired.isnot(True))
    if club_id is not None:
        query = query.filter(Player.current_club_id == club_id)
    if my_club:
        club = user_club(db, db.get(Career, career_id))
        if not club:
            return []
        query = query.filter(Player.current_club_id == club.id)
    if gender is not None:
        query = query.filter(Player.gender == gender)
    if position:
        query = query.filter(Player.position == position)
    if search:
        term = f"%{search}%"
        query = query.filter(
            Player.known_name.ilike(term) | Player.first_name.ilike(term) | Player.last_name.ilike(term)
        )

    year = current_season_year(db, career_id)
    rows = query.order_by(Player.overall.desc(), Player.id).offset(skip).limit(min(limit, 500)).all()
    return [_player_out(p, c, year) for p, c in rows]


@router.get("/careers/{career_id}/players/{player_id}", response_model=PlayerOut)
def get_player(career_id: int, player_id: int, db: Session = Depends(get_db)):
    """Get a single player."""
    player = db.query(Player).filter(Player.career_id == career_id, Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    club = db.get(Club, player.current_club_id) if player.current_club_id else None
    return _player_out(player, club, current_season_year(db, career_id))


POS_KEY_STATS = {
    "ST": ["finishing", "shot_power", "positioning", "sprint_speed", "heading_accuracy"],
    "RW": ["sprint_speed", "acceleration", "dribbling", "crossing", "ball_control"],
    "LW": ["sprint_speed", "acceleration", "dribbling", "crossing", "ball_control"],
    "CAM": ["short_passing", "vision", "ball_control", "dribbling", "long_shots"],
    "RM": ["sprint_speed", "crossing", "short_passing", "dribbling", "stamina"],
    "LM": ["sprint_speed", "crossing", "short_passing", "dribbling", "stamina"],
    "CM": ["short_passing", "long_passing", "vision", "ball_control", "stamina"],
    "CDM": ["standing_tackle", "interceptions", "short_passing", "stamina", "defensive_awareness"],
    "CB": ["standing_tackle", "sliding_tackle", "strength", "defensive_awareness", "heading_accuracy"],
    "RB": ["sprint_speed", "standing_tackle", "stamina", "crossing", "acceleration"],
    "LB": ["sprint_speed", "standing_tackle", "stamina", "crossing", "acceleration"],
    "GK": ["gk_diving", "gk_handling", "gk_kicking", "gk_positioning", "gk_reflexes"]
}

BASE_DISTANCE_WEEKS = {
    ("ST", "RW"): 6, ("ST", "LW"): 6, ("ST", "CAM"): 8,
    ("RW", "LW"): 3, ("LW", "RW"): 3, ("RW", "RM"): 3, ("LW", "LM"): 3,
    ("CAM", "CM"): 4, ("CM", "CAM"): 4, ("CM", "CDM"): 4, ("CDM", "CM"): 4,
    ("RM", "LM"): 4, ("LM", "RM"): 4, ("CDM", "CB"): 6, ("CB", "CDM"): 6,
    ("CB", "RB"): 8, ("CB", "LB"): 8,
    ("RB", "LB"): 4, ("LB", "RB"): 4, ("CM", "RM"): 5, ("CM", "LM"): 5,
}

ALL_OUTFIELD_POSITIONS = ["ST", "RW", "LW", "CAM", "RM", "LM", "CM", "CDM", "CB", "RB", "LB"]


def calculate_conversion_plans(player, current_year: int):
    current_pos = player.position or "CM"
    if current_pos == "GK":
        return []

    plans = []
    player_dict = {c.name: getattr(player, c.name) for c in player.__table__.columns}
    overall = player.overall or 75
    age = max(16, current_year - player.birth_year) if player.birth_year else 24

    for target_pos in ALL_OUTFIELD_POSITIONS:
        if target_pos == current_pos:
            continue

        pair = (current_pos, target_pos)
        rev = (target_pos, current_pos)
        base_weeks = BASE_DISTANCE_WEEKS.get(pair) or BASE_DISTANCE_WEEKS.get(rev) or 16

        key_stats = POS_KEY_STATS.get(target_pos, [])
        if key_stats:
            avg_stat = sum(player_dict.get(s) or 60 for s in key_stats) / len(key_stats)
            diff = overall - avg_stat
            mult = 1.5 if diff > 10 else (1.25 if diff > 5 else (0.75 if diff < -5 else 1.0))
            suitability = max(20, min(99, int(100 - (diff * 2))))
        else:
            mult = 1.0
            suitability = 75

        age_mult = 0.85 if age <= 20 else (1.35 if age >= 30 else 1.0)
        weeks = max(2, int(round(base_weeks * mult * age_mult)))

        if weeks <= 4:
            label = "Fast Conversion"
        elif weeks <= 12:
            label = "Moderate Transition"
        else:
            label = "Long-Term Transition"

        is_secondary = player.secondary_positions and target_pos in player.secondary_positions.split(", ")

        plans.append({
            "target_position": target_pos,
            "weeks": weeks,
            "difficulty": label,
            "suitability": suitability,
            "is_secondary": bool(is_secondary)
        })

    plans.sort(key=lambda x: x["weeks"])
    return plans


@router.get("/careers/{career_id}/players/{player_id}/profile")
def get_player_profile(career_id: int, player_id: int, db: Session = Depends(get_db)):
    """Complete profile for a player: stats by season, transfers, awards, trophies, timeline."""
    player = db.query(Player).filter(Player.career_id == career_id, Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    year = current_season_year(db, career_id)
    club = db.get(Club, player.current_club_id) if player.current_club_id else None

    stats_rows = (
        db.query(PlayerSeasonStats, Season.year, Club)
        .join(Season, Season.id == PlayerSeasonStats.season_id)
        .outerjoin(Club, Club.id == PlayerSeasonStats.club_id)
        .filter(PlayerSeasonStats.player_id == player_id)
        .order_by(Season.year.desc())
        .all()
    )
    stats = [
        {
            "season_year": s_year,
            "club_name": s_club.name if s_club else "Unknown Club",
            "club": club_brief(s_club),
            "appearances": row.appearances,
            "goals": row.goals,
            "assists": row.assists,
            "clean_sheets": row.clean_sheets,
            "yellow_cards": row.yellow_cards,
            "red_cards": row.red_cards,
            "avg_rating": row.avg_rating,
        }
        for row, s_year, s_club in stats_rows
    ]

    FromClub, ToClub = aliased(Club), aliased(Club)
    transfer_rows = (
        db.query(Transfer, Season.year, FromClub, ToClub)
        .outerjoin(Season, Season.id == Transfer.season_id)
        .outerjoin(FromClub, FromClub.id == Transfer.from_club_id)
        .outerjoin(ToClub, ToClub.id == Transfer.to_club_id)
        .filter(Transfer.player_id == player_id)
        .order_by(Season.year.desc(), Transfer.id.desc())
        .all()
    )
    transfers = [
        {
            "season_year": t_year,
            "from_club_name": f.name if f else "Free Agent",
            "to_club_name": to.name if to else "Free Agent",
            "from_club": club_brief(f),
            "to_club": club_brief(to),
            "fee": t.fee or 0.0,
            "type": t.type or "transfer",
        }
        for t, t_year, f, to in transfer_rows
    ]

    award_rows = (
        db.query(Award, Season.year)
        .outerjoin(Season, Season.id == Award.season_id)
        .filter(Award.player_id == player_id)
        .order_by(Season.year.desc())
        .all()
    )
    awards = [{"season_year": a_year, "name": a.name, "icon": resolve_trophy_icon(a.name)} for a, a_year in award_rows]

    timeline_rows = (
        db.query(TimelineEvent, Season.year)
        .outerjoin(Season, Season.id == TimelineEvent.season_id)
        .filter(TimelineEvent.related_player_id == player_id)
        .order_by(Season.year.desc(), TimelineEvent.id.desc())
        .all()
    )
    timeline = [
        {"season_year": t_year, "event_type": e.event_type, "description": e.description}
        for e, t_year in timeline_rows
    ]

    # Team trophies count only for seasons the player was actually at the club.
    tenure = {(row.club_id, s_year) for row, s_year, _ in stats_rows if row.club_id}
    if club:
        tenure.add((club.id, year))
    trophies = [
        trophy_dict(e, t_year, comp, t_club)
        for e, t_year, comp, t_club in trophy_rows(db, career_id, list({c for c, _ in tenure}))
        if (e.related_club_id, t_year) in tenure
    ]

    return {
        "player": _player_out(player, club, year),
        "current_season_year": year,
        "stats": stats,
        "transfers": transfers,
        "awards": awards,
        "trophies": trophies,
        "timeline": timeline,
        "conversion_plans": calculate_conversion_plans(player, year),
    }
