"""Timeline Event API schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TimelineEventBase(BaseModel):
    career_id: int
    season_id: int | None = None
    event_type: str
    description: str
    related_player_id: int | None = None
    related_club_id: int | None = None
    related_competition_id: int | None = None
    gender: int = 0


class TimelineEventOut(TimelineEventBase):
    id: int
    created_at: datetime
    
    # Extra helper fields for frontend convenience
    season_year: int | None = None
    
    model_config = ConfigDict(from_attributes=True)
