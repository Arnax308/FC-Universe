"""Club model - tracks football clubs across the universe."""

from datetime import datetime

from sqlalchemy import Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from fc_universe.database import Base


class Club(Base):
    """Represents a football club within a career universe."""

    __tablename__ = "clubs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    career_id: Mapped[int] = mapped_column(ForeignKey("careers.id"), nullable=False)
    game_id: Mapped[int | None] = mapped_column(Integer, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(50))
    league: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str | None] = mapped_column(String(100))
    overall_rating: Mapped[int | None] = mapped_column(Integer)
    defense_rating: Mapped[int | None] = mapped_column(Integer)
    midfield_rating: Mapped[int | None] = mapped_column(Integer)
    attack_rating: Mapped[int | None] = mapped_column(Integer)
    club_worth: Mapped[int | None] = mapped_column(Integer)
    domestic_prestige: Mapped[int | None] = mapped_column(Integer)
    international_prestige: Mapped[int | None] = mapped_column(Integer)
    foundation_year: Mapped[int | None] = mapped_column(Integer)
    rival_team_id: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    career: Mapped["Career"] = relationship(back_populates="clubs")

    def __repr__(self) -> str:
        return f"<Club(id={self.id}, name='{self.name}')>"
