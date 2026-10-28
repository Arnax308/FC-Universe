from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CareerBase(BaseModel):
    name: str | None = None
    save_identifier: str | None = None
    game_version: str | None = None
    manager_name: str | None = None
    team_name: str | None = None
    team_id: int | None = None
    save_file_path: str | None = None


class CareerOut(CareerBase):
    id: int
    created_at: datetime
    updated_at: datetime
    current_season: str | None = None
    start_season: str | None = None
    seasons_count: int | None = 0
    duration_years: str | None = None
    trophies_count: int | None = 0
    team: dict | None = None
    is_last_played: bool | None = False
    model_config = ConfigDict(from_attributes=True)
