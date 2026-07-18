"""Players API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from fc_universe.database import get_db
from fc_universe.models import Player
from fc_universe.schemas.player import PlayerOut

router = APIRouter(tags=["players"])


@router.get("/careers/{career_id}/players", response_model=list[PlayerOut])
def list_players(
    career_id: int,
    skip: int = 0,
    limit: int = 500,
    search: str | None = None,
    gender: int | None = None,
    my_club: bool = False,
    db: Session = Depends(get_db)
):
    """List players in a specific career."""
    from fc_universe.models.club import Club
    from fc_universe.models.career import Career
    
    query = (
        db.query(Player, Club.name.label("club_name"))
        .outerjoin(Club, Club.id == Player.current_club_id)
        .filter(Player.career_id == career_id)
    )
    
    if my_club:
        career_obj = db.query(Career).filter(Career.id == career_id).first()
        if career_obj and career_obj.team_id is not None:
            user_club = db.query(Club).filter(Club.career_id == career_id, Club.game_id == career_obj.team_id).first()
            if user_club:
                query = query.filter(Player.current_club_id == user_club.id)
            else:
                return []
        else:
            return []
            
    if gender is not None:
        query = query.filter(Player.gender == gender)
        
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Player.known_name.ilike(search_term)) |
            (Player.first_name.ilike(search_term)) |
            (Player.last_name.ilike(search_term))
        )
        
    rows = query.order_by(Player.overall.desc()).offset(skip).limit(limit).all()
    
    players = []
    for r in rows:
        player_obj = r[0]
        player_obj.club_name = r[1] or "Free Agent"
        players.append(player_obj)
        
    return players


@router.get("/careers/{career_id}/players/{player_id}", response_model=PlayerOut)
def get_player(career_id: int, player_id: int, db: Session = Depends(get_db)):
    """Get a specific player in a career."""
    player = db.query(Player).filter(Player.career_id == career_id, Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.get("/careers/{career_id}/players/{player_id}/profile")
def get_player_profile(career_id: int, player_id: int, db: Session = Depends(get_db)):
    """Get complete profile data for a player including historical stats, transfers, and awards."""
    from sqlalchemy.orm import aliased
    from fc_universe.models.stats import PlayerSeasonStats
    from fc_universe.models.club import Club
    from fc_universe.models.season import Season
    from fc_universe.models.transfer import Transfer
    from fc_universe.models.award import Award
    from fc_universe.models.timeline import TimelineEvent
    
    player = db.query(Player).filter(Player.career_id == career_id, Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
        
    club_obj = db.query(Club).filter(Club.id == player.current_club_id).first() if player.current_club_id else None
    player.club_name = club_obj.name if club_obj else "Free Agent"
        
    # Query Season stats
    stats_rows = (
        db.query(PlayerSeasonStats, Season.year, Club.name)
        .join(Season, Season.id == PlayerSeasonStats.season_id)
        .outerjoin(Club, Club.id == PlayerSeasonStats.club_id)
        .filter(PlayerSeasonStats.player_id == player_id)
        .order_by(Season.year.desc())
        .all()
    )
    stats = [
        {
            "season_year": row[1],
            "club_name": row[2] or "Unknown Club",
            "appearances": row[0].appearances or 0,
            "goals": row[0].goals or 0,
            "assists": row[0].assists or 0,
            "clean_sheets": row[0].clean_sheets or 0,
            "yellow_cards": row[0].yellow_cards or 0,
            "red_cards": row[0].red_cards or 0,
            "avg_rating": row[0].avg_rating or 0.0
        }
        for row in stats_rows
    ]
    
    # Query Transfers
    FromClub = aliased(Club)
    ToClub = aliased(Club)
    transfer_rows = (
        db.query(Transfer, Season.year, FromClub.name, ToClub.name)
        .outerjoin(Season, Season.id == Transfer.season_id)
        .outerjoin(FromClub, FromClub.id == Transfer.from_club_id)
        .outerjoin(ToClub, ToClub.id == Transfer.to_club_id)
        .filter(Transfer.player_id == player_id)
        .order_by(Season.year.desc(), Transfer.created_at.desc())
        .all()
    )
    transfers = [
        {
            "season_year": row[1],
            "from_club_name": row[2] or "Free Agent",
            "to_club_name": row[3] or "Free Agent",
            "fee": row[0].fee or 0.0,
            "type": row[0].type or "transfer"
        }
        for row in transfer_rows
    ]
    
    # Query Awards
    award_rows = (
        db.query(Award, Season.year)
        .outerjoin(Season, Season.id == Award.season_id)
        .filter(Award.player_id == player_id)
        .order_by(Season.year.desc())
        .all()
    )
    awards = [
        {
            "season_year": row[1],
            "name": row[0].name
        }
        for row in award_rows
    ]
    
    # Query Timeline Events
    timeline_rows = (
        db.query(TimelineEvent, Season.year)
        .outerjoin(Season, Season.id == TimelineEvent.season_id)
        .filter(TimelineEvent.related_player_id == player_id)
        .order_by(Season.year.desc(), TimelineEvent.created_at.desc())
        .all()
    )
    timeline = [
        {
            "season_year": row[1],
            "event_type": row[0].event_type,
            "description": row[0].description,
            "created_at": row[0].created_at
        }
        for row in timeline_rows
    ]
    
    return {
        "player": player,
        "stats": stats,
        "transfers": transfers,
        "awards": awards,
        "timeline": timeline
    }
