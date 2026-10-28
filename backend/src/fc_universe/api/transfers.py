"""Transfers API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, aliased

from fc_universe.api.common import club_brief
from fc_universe.database import get_db
from fc_universe.models import Transfer, Player, Club, Season
from fc_universe.schemas.transfer import TransferOut

router = APIRouter(tags=["transfers"])


@router.get("/careers/{career_id}/transfers", response_model=list[TransferOut])
def list_transfers(
    career_id: int,
    skip: int = 0,
    limit: int = 100,
    club_id: int | None = None,
    type: str | None = None,
    db: Session = Depends(get_db),
):
    """List player transfers for a career, newest first. ``club_id`` is a database club id."""
    from_club = aliased(Club)
    to_club = aliased(Club)
    query = (
        db.query(Transfer, Player, from_club, to_club, Season.year)
        .join(Player, Player.id == Transfer.player_id)
        .outerjoin(from_club, from_club.id == Transfer.from_club_id)
        .outerjoin(to_club, to_club.id == Transfer.to_club_id)
        .outerjoin(Season, Season.id == Transfer.season_id)
        .filter(Transfer.career_id == career_id)
    )
    if club_id is not None:
        query = query.filter((Transfer.from_club_id == club_id) | (Transfer.to_club_id == club_id))
    if type:
        query = query.filter(Transfer.type == type)

    rows = query.order_by(Season.year.desc(), Transfer.id.desc()).offset(skip).limit(min(limit, 500)).all()
    return [
        {
            "id": t.id,
            "career_id": t.career_id,
            "season_id": t.season_id,
            "season_year": year,
            "player_id": t.player_id,
            "from_club_id": t.from_club_id,
            "to_club_id": t.to_club_id,
            "fee": t.fee or 0.0,
            "type": t.type,
            "created_at": t.created_at,
            "player_name": p.known_name or f"{p.first_name or ''} {p.last_name or ''}".strip() or f"Player #{p.game_id}",
            "player_game_id": p.game_id,
            "player_type": p.player_type,
            "player_position": p.position,
            "player_overall": p.overall,
            "from_club_name": f.name if f else None,
            "from_club_game_id": f.game_id if f else None,
            "to_club_name": to.name if to else None,
            "to_club_game_id": to.game_id if to else None,
            "from_club": club_brief(f),
            "to_club": club_brief(to),
        }
        for t, p, f, to, year in rows
    ]
