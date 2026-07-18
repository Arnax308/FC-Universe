"""Record model - tracks records across the universe."""

from datetime import datetime

from sqlalchemy import Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from fc_universe.database import Base


class Record(Base):
    """Tracks records (e.g., most goals in a season, highest transfer fee)."""

    __tablename__ = "records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    career_id: Mapped[int] = mapped_column(ForeignKey("careers.id"), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    holder_type: Mapped[str | None] = mapped_column(String(20))  # player, club, manager
    holder_id: Mapped[int | None] = mapped_column(Integer)
    value: Mapped[float | None] = mapped_column(Float)
    season_id: Mapped[int | None] = mapped_column(ForeignKey("seasons.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    career: Mapped["Career"] = relationship(back_populates="records")

    def __repr__(self) -> str:
        return f"<Record(id={self.id}, category='{self.category}')>"
