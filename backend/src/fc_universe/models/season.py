"""Season model - tracks each in-game season within a career."""

from datetime import datetime

from sqlalchemy import Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from fc_universe.database import Base


class Season(Base):
    """Represents a single season within a career.

    Seasons are append-only: once a season is completed and stored,
    it is never modified or deleted.
    """

    __tablename__ = "seasons"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    career_id: Mapped[int] = mapped_column(ForeignKey("careers.id"), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    career: Mapped["Career"] = relationship(back_populates="seasons")

    def __repr__(self) -> str:
        return f"<Season(id={self.id}, career_id={self.career_id}, year={self.year})>"
