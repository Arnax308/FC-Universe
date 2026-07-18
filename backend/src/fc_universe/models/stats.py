"""Stats models - per-season statistics for players and clubs."""

from datetime import datetime

from sqlalchemy import Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from fc_universe.database import Base


class PlayerSeasonStats(Base):
    """Season statistics for a single player at a single club."""

    __tablename__ = "player_season_stats"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), nullable=False)
    club_id: Mapped[int | None] = mapped_column(ForeignKey("clubs.id"))
    appearances: Mapped[int | None] = mapped_column(Integer, default=0)
    goals: Mapped[int | None] = mapped_column(Integer, default=0)
    assists: Mapped[int | None] = mapped_column(Integer, default=0)
    clean_sheets: Mapped[int | None] = mapped_column(Integer, default=0)
    yellow_cards: Mapped[int | None] = mapped_column(Integer, default=0)
    red_cards: Mapped[int | None] = mapped_column(Integer, default=0)
    avg_rating: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<PlayerSeasonStats(player={self.player_id}, season={self.season_id}, goals={self.goals})>"


class ClubSeasonStats(Base):
    """Season statistics for a club in a specific competition."""

    __tablename__ = "club_season_stats"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), nullable=False)
    competition_id: Mapped[int | None] = mapped_column(ForeignKey("competitions.id"))
    position: Mapped[int | None] = mapped_column(Integer)
    wins: Mapped[int | None] = mapped_column(Integer, default=0)
    draws: Mapped[int | None] = mapped_column(Integer, default=0)
    losses: Mapped[int | None] = mapped_column(Integer, default=0)
    goals_for: Mapped[int | None] = mapped_column(Integer, default=0)
    goals_against: Mapped[int | None] = mapped_column(Integer, default=0)
    points: Mapped[int | None] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<ClubSeasonStats(club={self.club_id}, season={self.season_id}, pos={self.position})>"
