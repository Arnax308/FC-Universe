"""Timeline model - automatically generated historical events."""

from datetime import datetime

from sqlalchemy import Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from fc_universe.database import Base


class TimelineEvent(Base):
    """An automatically generated historical event.

    Examples: 'Manchester United win the Premier League',
    'Lamine Yamal wins Ballon d\\'Or', 'Record transfer: €200M'.
    """

    __tablename__ = "timeline_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    career_id: Mapped[int] = mapped_column(ForeignKey("careers.id"), nullable=False)
    season_id: Mapped[int | None] = mapped_column(ForeignKey("seasons.id"))
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    related_player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"))
    related_club_id: Mapped[int | None] = mapped_column(ForeignKey("clubs.id"))
    related_competition_id: Mapped[int | None] = mapped_column(ForeignKey("competitions.id"))
    gender: Mapped[int] = mapped_column(Integer, default=0) # 0: Men, 1: Women
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    career: Mapped["Career"] = relationship(back_populates="timeline_events")

    def __repr__(self) -> str:
        return f"<TimelineEvent(id={self.id}, type='{self.event_type}')>"
