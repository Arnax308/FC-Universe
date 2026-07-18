"""Transfer model - tracks every player transfer in the universe."""

from datetime import datetime

from sqlalchemy import Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from fc_universe.database import Base


class Transfer(Base):
    """Represents a player transfer.

    Transfer records are permanent and append-only.
    """

    __tablename__ = "transfers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    career_id: Mapped[int] = mapped_column(ForeignKey("careers.id"), nullable=False)
    season_id: Mapped[int | None] = mapped_column(ForeignKey("seasons.id"))
    player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"))
    from_club_id: Mapped[int | None] = mapped_column(ForeignKey("clubs.id"))
    to_club_id: Mapped[int | None] = mapped_column(ForeignKey("clubs.id"))
    fee: Mapped[float | None] = mapped_column(Float)
    type: Mapped[str | None] = mapped_column(String(30))  # buy, sell, loan, free, release
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    career: Mapped["Career"] = relationship(back_populates="transfers")

    def __repr__(self) -> str:
        return f"<Transfer(id={self.id}, player={self.player_id}, fee={self.fee})>"
