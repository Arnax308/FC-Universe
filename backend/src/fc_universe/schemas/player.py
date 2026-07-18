"""Player API schemas."""

from datetime import datetime
from fc_universe.schemas.common import BaseSchema


class PlayerBase(BaseSchema):
    game_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    known_name: str | None = None
    position: str | None = None
    nationality: str | None = None
    birth_year: int | None = None
    overall: int | None = None
    potential: int | None = None
    current_club_id: int | None = None
    height_cm: int | None = None
    weight_kg: int | None = None
    foot: str | None = None
    jersey_number: int | None = None
    gender: int | None = None
    
    # Detailed Stats
    sprint_speed: int | None = None
    acceleration: int | None = None
    finishing: int | None = None
    shot_power: int | None = None
    short_passing: int | None = None
    long_passing: int | None = None
    dribbling: int | None = None
    ball_control: int | None = None
    standing_tackle: int | None = None
    sliding_tackle: int | None = None
    strength: int | None = None
    stamina: int | None = None
    agility: int | None = None
    balance: int | None = None
    reactions: int | None = None
    composure: int | None = None
    interceptions: int | None = None
    positioning: int | None = None
    vision: int | None = None
    crossing: int | None = None
    jumping: int | None = None
    heading_accuracy: int | None = None
    aggression: int | None = None
    long_shots: int | None = None
    penalties: int | None = None
    free_kick_accuracy: int | None = None
    curve: int | None = None
    volleys: int | None = None
    gk_diving: int | None = None
    gk_handling: int | None = None
    gk_kicking: int | None = None
    gk_positioning: int | None = None
    gk_reflexes: int | None = None
    defensive_awareness: int | None = None
    weak_foot_ability: int | None = None
    skill_moves: int | None = None
    international_rep: int | None = None


class PlayerOut(PlayerBase):
    id: int
    career_id: int
    club_name: str | None = None
    is_retired: bool | None = False
    created_at: datetime
    updated_at: datetime
