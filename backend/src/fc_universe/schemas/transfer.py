"""Transfer API schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TransferBase(BaseModel):
    career_id: int
    season_id: int | None = None
    player_id: int
    from_club_id: int | None = None
    to_club_id: int | None = None
    fee: float | None = 0.0
    type: str | None = None


class TransferOut(TransferBase):
    id: int
    created_at: datetime
    
    # Extra fields populated during query
    player_name: str | None = None
    player_game_id: int | None = None
    from_club_name: str | None = None
    from_club_game_id: int | None = None
    to_club_name: str | None = None
    to_club_game_id: int | None = None
    
    model_config = ConfigDict(from_attributes=True)
