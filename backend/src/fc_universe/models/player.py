"""Player model - tracks every player across the universe."""

from datetime import datetime

from sqlalchemy import Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from fc_universe.database import Base


class Player(Base):
    """Represents a player within a career universe.

    Player records are append-only per season. When a new season is imported,
    new stat snapshots are created rather than overwriting previous data.
    """

    __tablename__ = "players"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    career_id: Mapped[int] = mapped_column(ForeignKey("careers.id"), nullable=False)
    game_id: Mapped[int | None] = mapped_column(Integer, index=True)
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    known_name: Mapped[str | None] = mapped_column(String(100))
    position: Mapped[str | None] = mapped_column(String(20))
    secondary_positions: Mapped[str | None] = mapped_column(String(100))
    nationality: Mapped[str | None] = mapped_column(String(100))
    birth_year: Mapped[int | None] = mapped_column(Integer)
    overall: Mapped[int | None] = mapped_column(Integer)
    potential: Mapped[int | None] = mapped_column(Integer)
    current_club_id: Mapped[int | None] = mapped_column(ForeignKey("clubs.id"))
    height_cm: Mapped[int | None] = mapped_column(Integer)
    weight_kg: Mapped[int | None] = mapped_column(Integer)
    foot: Mapped[str | None] = mapped_column(String(10))
    jersey_number: Mapped[int | None] = mapped_column(Integer)
    is_retired: Mapped[bool | None] = mapped_column(default=False)
    gender: Mapped[int | None] = mapped_column(Integer, default=0)
    
    # Detailed Stats
    sprint_speed: Mapped[int | None] = mapped_column(Integer)
    acceleration: Mapped[int | None] = mapped_column(Integer)
    finishing: Mapped[int | None] = mapped_column(Integer)
    shot_power: Mapped[int | None] = mapped_column(Integer)
    short_passing: Mapped[int | None] = mapped_column(Integer)
    long_passing: Mapped[int | None] = mapped_column(Integer)
    dribbling: Mapped[int | None] = mapped_column(Integer)
    ball_control: Mapped[int | None] = mapped_column(Integer)
    standing_tackle: Mapped[int | None] = mapped_column(Integer)
    sliding_tackle: Mapped[int | None] = mapped_column(Integer)
    strength: Mapped[int | None] = mapped_column(Integer)
    stamina: Mapped[int | None] = mapped_column(Integer)
    agility: Mapped[int | None] = mapped_column(Integer)
    balance: Mapped[int | None] = mapped_column(Integer)
    reactions: Mapped[int | None] = mapped_column(Integer)
    composure: Mapped[int | None] = mapped_column(Integer)
    interceptions: Mapped[int | None] = mapped_column(Integer)
    positioning: Mapped[int | None] = mapped_column(Integer)
    vision: Mapped[int | None] = mapped_column(Integer)
    crossing: Mapped[int | None] = mapped_column(Integer)
    jumping: Mapped[int | None] = mapped_column(Integer)
    heading_accuracy: Mapped[int | None] = mapped_column(Integer)
    aggression: Mapped[int | None] = mapped_column(Integer)
    long_shots: Mapped[int | None] = mapped_column(Integer)
    penalties: Mapped[int | None] = mapped_column(Integer)
    free_kick_accuracy: Mapped[int | None] = mapped_column(Integer)
    curve: Mapped[int | None] = mapped_column(Integer)
    volleys: Mapped[int | None] = mapped_column(Integer)
    gk_diving: Mapped[int | None] = mapped_column(Integer)
    gk_handling: Mapped[int | None] = mapped_column(Integer)
    gk_kicking: Mapped[int | None] = mapped_column(Integer)
    gk_positioning: Mapped[int | None] = mapped_column(Integer)
    gk_reflexes: Mapped[int | None] = mapped_column(Integer)
    defensive_awareness: Mapped[int | None] = mapped_column(Integer)
    weak_foot_ability: Mapped[int | None] = mapped_column(Integer)
    skill_moves: Mapped[int | None] = mapped_column(Integer)
    international_rep: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    career: Mapped["Career"] = relationship(back_populates="players")
    current_club: Mapped["Club | None"] = relationship(foreign_keys=[current_club_id])

    def __repr__(self) -> str:
        name = self.known_name or f"{self.first_name} {self.last_name}"
        return f"<Player(id={self.id}, name='{name}', ovr={self.overall})>"
