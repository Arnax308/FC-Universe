"""Competition models - leagues, cups, and continental competitions."""

from datetime import datetime

from sqlalchemy import Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from fc_universe.database import Base


class Competition(Base):
    """Represents a football competition (league, cup, or continental)."""

    __tablename__ = "competitions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    career_id: Mapped[int] = mapped_column(ForeignKey("careers.id"), nullable=False)
    game_id: Mapped[int | None] = mapped_column(Integer, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(50))
    type: Mapped[str | None] = mapped_column(String(30))  # league, cup, continental
    country: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    career: Mapped["Career"] = relationship(back_populates="competitions")
    seasons: Mapped[list["CompetitionSeason"]] = relationship(back_populates="competition")

    def __repr__(self) -> str:
        return f"<Competition(id={self.id}, name='{self.name}')>"


class CompetitionSeason(Base):
    """Tracks a competition's results for a specific season."""

    __tablename__ = "competition_seasons"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"), nullable=False)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), nullable=False)
    winner_club_id: Mapped[int | None] = mapped_column(ForeignKey("clubs.id"))
    runner_up_club_id: Mapped[int | None] = mapped_column(ForeignKey("clubs.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    competition: Mapped["Competition"] = relationship(back_populates="seasons")

    def __repr__(self) -> str:
        return f"<CompetitionSeason(comp={self.competition_id}, season={self.season_id})>"
