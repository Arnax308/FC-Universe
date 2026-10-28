"""Timeline API routes."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from fc_universe.api.common import club_brief
from fc_universe.database import get_db
from fc_universe.models import TimelineEvent, Season, Club, Player
from fc_universe.schemas.timeline import TimelineEventOut

router = APIRouter(tags=["timeline"])


@router.get("/careers/{career_id}/timeline", response_model=list[TimelineEventOut])
def list_timeline_events(
    career_id: int,
    event_type: list[str] | None = Query(None),
    gender: int | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List timeline events, newest season first. ``event_type`` may be repeated."""
    query = (
        db.query(TimelineEvent, Season.year, Club, Player.game_id)
        .outerjoin(Season, Season.id == TimelineEvent.season_id)
        .outerjoin(Club, Club.id == TimelineEvent.related_club_id)
        .outerjoin(Player, Player.id == TimelineEvent.related_player_id)
        .filter(TimelineEvent.career_id == career_id)
    )
    if event_type:
        query = query.filter(TimelineEvent.event_type.in_(event_type))
    if gender is not None:
        query = query.filter((TimelineEvent.gender == gender) | (TimelineEvent.gender == 2))

    # Within a season, season_start sorts last so it sits at the bottom of that season's block.
    rows = (
        query.order_by(Season.year.desc(), (TimelineEvent.event_type == "season_start").asc(), TimelineEvent.id.desc())
        .offset(skip)
        .limit(min(limit, 500))
        .all()
    )
    return [
        {
            "id": e.id,
            "career_id": e.career_id,
            "season_id": e.season_id,
            "event_type": e.event_type,
            "description": e.description,
            "related_player_id": e.related_player_id,
            "related_player_game_id": player_game_id,
            "related_club_id": e.related_club_id,
            "related_competition_id": e.related_competition_id,
            "gender": e.gender or 0,
            "created_at": e.created_at,
            "season_year": year,
            "club": club_brief(club),
        }
        for e, year, club, player_game_id in rows
    ]
