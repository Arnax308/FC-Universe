"""Configuration management for FC Universe."""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment or defaults."""

    # Application
    app_name: str = "FC Universe"
    app_version: str = "0.1.0"
    debug: bool = True

    # Database
    database_url: str = "sqlite:///./fc_universe.db"
    team_id_offset: int = 1

    # EA FC 26 Save File Location
    save_directory: Path = Path.home() / "AppData" / "Local" / "EA SPORTS FC 26" / "settings"

    # API
    api_prefix: str = "/api"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]

    model_config = {"env_prefix": "FC_UNIVERSE_", "env_file": ".env"}


settings = Settings()
