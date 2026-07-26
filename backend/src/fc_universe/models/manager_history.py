"""ManagerSeasonHistory model - per-season career stats for the user's managed club."""

from datetime import datetime

from sqlalchemy import Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from fc_universe.database import Base


class ManagerSeasonHistory(Base):
    """Tracks manager career data per season from the AGmV save table.

    Each row represents one season of the user's career at a specific club,
    containing match results, goals, and other aggregate stats.
    This is the core data for the Career Profile / Legacy Hub screen.
    """

    __tablename__ = "manager_season_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    career_id: Mapped[int] = mapped_column(ForeignKey("careers.id"), nullable=False)
    season_id: Mapped[int | None] = mapped_column(ForeignKey("seasons.id"))
    club_id: Mapped[int | None] = mapped_column(ForeignKey("clubs.id"))
    club_game_id: Mapped[int | None] = mapped_column(Integer)
    season_number: Mapped[int | None] = mapped_column(Integer)  # 0-indexed from career start

    # Match stats
    matches: Mapped[int | None] = mapped_column(Integer, default=0)
    wins: Mapped[int | None] = mapped_column(Integer, default=0)
    draws: Mapped[int | None] = mapped_column(Integer, default=0)
    losses: Mapped[int | None] = mapped_column(Integer, default=0)
    goals_for: Mapped[int | None] = mapped_column(Integer, default=0)
    goals_against: Mapped[int | None] = mapped_column(Integer, default=0)
    points: Mapped[int | None] = mapped_column(Integer, default=0)
    table_position: Mapped[int | None] = mapped_column(Integer, default=0)
    league_trophies: Mapped[int | None] = mapped_column(Integer, default=0)
    cup_trophies: Mapped[int | None] = mapped_column(Integer, default=0)
    euro_trophies: Mapped[int | None] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    career: Mapped["Career"] = relationship()

    def __repr__(self) -> str:
        return f"<ManagerSeasonHistory(career={self.career_id}, season={self.season_number}, club_game_id={self.club_game_id})>"
