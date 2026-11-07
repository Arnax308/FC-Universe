"""Per-competition player statistics and reigning-champion snapshots."""

from datetime import datetime

from sqlalchemy import Integer, Float, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from fc_universe.database import Base


class PlayerCompetitionStats(Base):
    """A player's numbers in one competition in one season.

    Captured from EA's season leaderboards (top 20 per stat per competition), which the game
    wipes when the competition restarts; FC Universe keeps every season it has seen. A stat is
    None when the player wasn't on that leaderboard.
    """

    __tablename__ = "player_competition_stats"
    __table_args__ = (UniqueConstraint("player_id", "season_id", "comp_obj_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    career_id: Mapped[int] = mapped_column(ForeignKey("careers.id"), nullable=False, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False, index=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), nullable=False)
    comp_obj_id: Mapped[int] = mapped_column(Integer, nullable=False)  # EA compobjid
    competition_id: Mapped[int | None] = mapped_column(ForeignKey("competitions.id"))
    competition_name: Mapped[str | None] = mapped_column(String(200))
    competition_type: Mapped[str | None] = mapped_column(String(30))  # league, cup, continental
    club_id: Mapped[int | None] = mapped_column(ForeignKey("clubs.id"))
    appearances: Mapped[int | None] = mapped_column(Integer)
    goals: Mapped[int | None] = mapped_column(Integer)
    assists: Mapped[int | None] = mapped_column(Integer)
    clean_sheets: Mapped[int | None] = mapped_column(Integer)
    yellow_cards: Mapped[int | None] = mapped_column(Integer)
    red_cards: Mapped[int | None] = mapped_column(Integer)
    avg_rating: Mapped[float | None] = mapped_column(Float)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CompetitionChampion(Base):
    """Last reigning champion seen for a competition (competition.competitionchampionid).

    Comparing against the previous sync tells FC Universe when a title changed hands, including
    international tournaments that never show up in the career's own competition progress.
    """

    __tablename__ = "competition_champions"
    __table_args__ = (UniqueConstraint("career_id", "competition_game_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    career_id: Mapped[int] = mapped_column(ForeignKey("careers.id"), nullable=False)
    competition_game_id: Mapped[int] = mapped_column(Integer, nullable=False)
    champion_team_game_id: Mapped[int | None] = mapped_column(Integer)
    observed_date: Mapped[int | None] = mapped_column(Integer)  # in-game yyyymmdd
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
