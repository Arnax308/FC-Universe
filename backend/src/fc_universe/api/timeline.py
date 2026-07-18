"""Timeline API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from fc_universe.database import get_db
from fc_universe.models import TimelineEvent, Season
from fc_universe.schemas.timeline import TimelineEventOut

router = APIRouter(tags=["timeline"])


@router.get("/careers/{career_id}/timeline", response_model=list[TimelineEventOut])
def list_timeline_events(
    career_id: int,
    event_type: str | None = None,
    gender: int | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List timeline events chronologically for a specific career."""
    query = (
        db.query(
            TimelineEvent.id,
            TimelineEvent.career_id,
            TimelineEvent.season_id,
            TimelineEvent.event_type,
            TimelineEvent.description,
            TimelineEvent.related_player_id,
            TimelineEvent.related_club_id,
            TimelineEvent.related_competition_id,
            TimelineEvent.gender,
            TimelineEvent.created_at,
            Season.year.label("season_year")
        )
        .outerjoin(Season, Season.id == TimelineEvent.season_id)
        .filter(TimelineEvent.career_id == career_id)
    )
    
    if event_type:
        query = query.filter(TimelineEvent.event_type == event_type)
        
    if gender is not None:
        query = query.filter((TimelineEvent.gender == gender) | (TimelineEvent.gender == 2))
        
    events = (
        query.order_by(TimelineEvent.created_at.desc(), TimelineEvent.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return events
