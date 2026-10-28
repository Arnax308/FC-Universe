"""Configuration management for FC Universe."""

from pathlib import Path
from pydantic_settings import BaseSettings

# backend/ — resolved from this file so every entry point (uvicorn from src/, scripts from
# backend/, alembic) reads the same .env and the same database regardless of cwd.
BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings loaded from environment or defaults."""

    # Application
    app_name: str = "FC Universe"
    app_version: str = "0.1.0"
    debug: bool = False
    sql_echo: bool = False

    # Database
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'fc_universe.db').as_posix()}"
    team_id_offset: int = 1

    # EA FC 26 Save File Location
    save_directory: Path = Path.home() / "AppData" / "Local" / "EA SPORTS FC 26" / "settings"

    # API
    api_prefix: str = "/api"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]

    model_config = {"env_prefix": "FC_UNIVERSE_", "env_file": str(BACKEND_DIR / ".env")}

    def model_post_init(self, __context) -> None:
        # A relative sqlite path in .env is relative to backend/, not to the process cwd.
        prefix = "sqlite:///"
        if self.database_url.startswith(prefix):
            raw = self.database_url[len(prefix):]
            if raw and raw != ":memory:" and not Path(raw).is_absolute():
                self.database_url = prefix + (BACKEND_DIR / raw).resolve().as_posix()


settings = Settings()
