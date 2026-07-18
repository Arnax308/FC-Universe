"""Manager model - tracks managers across clubs and seasons."""

from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from fc_universe.database import Base


class Manager(Base):
    """Represents a football manager."""

    __tablename__ = "managers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    career_id: Mapped[int] = mapped_column(ForeignKey("careers.id"), nullable=False)
    game_id: Mapped[int | None] = mapped_column(Integer, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    club_id: Mapped[int | None] = mapped_column(ForeignKey("clubs.id"))
    start_season_id: Mapped[int | None] = mapped_column(ForeignKey("seasons.id"))
    end_season_id: Mapped[int | None] = mapped_column(ForeignKey("seasons.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    career: Mapped["Career"] = relationship(back_populates="managers")

    def __repr__(self) -> str:
        return f"<Manager(id={self.id}, name='{self.name}')>"
