"""Club API schemas."""

from datetime import datetime
from fc_universe.schemas.common import BaseSchema


class ClubBase(BaseSchema):
    game_id: int | None = None
    name: str
    short_name: str | None = None
    league: str | None = None
    country: str | None = None
    overall_rating: int | None = None
    defense_rating: int | None = None
    midfield_rating: int | None = None
    attack_rating: int | None = None
    club_worth: int | None = None
    domestic_prestige: int | None = None
    international_prestige: int | None = None
    foundation_year: int | None = None
    rival_team_id: int | None = None


class ClubOut(ClubBase):
    id: int
    career_id: int
    created_at: datetime
    updated_at: datetime
