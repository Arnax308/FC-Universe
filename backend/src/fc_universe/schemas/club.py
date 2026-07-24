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
    manager_name: str | None = None
    stadium_name: str | None = None
    squad_count: int | None = 0
    top_player_name: str | None = None
    top_player_overall: int | None = None
    transfers_count: int | None = 0
    total_spent: int | None = 0
    total_received: int | None = 0
    net_spend: int | None = 0
    historical_trophies: list[dict] | None = None
    universe_trophies: list[dict] | None = None


