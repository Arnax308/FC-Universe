"""Award model - Ballon d'Or, Golden Boot, etc."""

from datetime import datetime

from sqlalchemy import Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from fc_universe.database import Base


class Award(Base):
    """Represents an individual award given to a player."""

    __tablename__ = "awards"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    career_id: Mapped[int] = mapped_column(ForeignKey("careers.id"), nullable=False)
    season_id: Mapped[int | None] = mapped_column(ForeignKey("seasons.id"))
    player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str | None] = mapped_column(String(50))  # individual, team
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    career: Mapped["Career"] = relationship(back_populates="awards")

    def __repr__(self) -> str:
        return f"<Award(id={self.id}, name='{self.name}')>"
