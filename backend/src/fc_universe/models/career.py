"""Career model - the top-level container for a Career Mode universe."""

from datetime import datetime

from sqlalchemy import String, DateTime, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from fc_universe.database import Base


class Career(Base):
    """Represents a single Career Mode save / universe.

    Every Career Mode is an independent football universe with its own
    isolated history. A career is identified by a unique hash derived
    from immutable metadata in the save file.
    """

    __tablename__ = "careers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    save_identifier: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    game_version: Mapped[str] = mapped_column(String(20), default="FC 26")
    manager_name: Mapped[str | None] = mapped_column(String(100))
    team_name: Mapped[str | None] = mapped_column(String(100))
    team_id: Mapped[int | None] = mapped_column(Integer)
    save_file_path: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    seasons: Mapped[list["Season"]] = relationship(back_populates="career", cascade="all, delete-orphan")
    clubs: Mapped[list["Club"]] = relationship(back_populates="career", cascade="all, delete-orphan")
    players: Mapped[list["Player"]] = relationship(back_populates="career", cascade="all, delete-orphan")
    competitions: Mapped[list["Competition"]] = relationship(back_populates="career", cascade="all, delete-orphan")
    transfers: Mapped[list["Transfer"]] = relationship(back_populates="career", cascade="all, delete-orphan")
    awards: Mapped[list["Award"]] = relationship(back_populates="career", cascade="all, delete-orphan")
    managers: Mapped[list["Manager"]] = relationship(back_populates="career", cascade="all, delete-orphan")
    timeline_events: Mapped[list["TimelineEvent"]] = relationship(back_populates="career", cascade="all, delete-orphan")
    records: Mapped[list["Record"]] = relationship(back_populates="career", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Career(id={self.id}, name='{self.name}', manager='{self.manager_name}')>"
