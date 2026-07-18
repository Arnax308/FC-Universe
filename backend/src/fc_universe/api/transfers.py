"""Transfers API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, aliased

from fc_universe.database import get_db
from fc_universe.models import Transfer, Player, Club
from fc_universe.schemas.transfer import TransferOut

router = APIRouter(tags=["transfers"])


@router.get("/careers/{career_id}/transfers", response_model=list[TransferOut])
def list_transfers(career_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all player transfers for a specific career."""
    from_club = aliased(Club)
    to_club = aliased(Club)
    
    results = (
        db.query(
            Transfer.id,
            Transfer.career_id,
            Transfer.season_id,
            Transfer.player_id,
            Transfer.from_club_id,
            Transfer.to_club_id,
            Transfer.fee,
            Transfer.type,
            Transfer.created_at,
            Player.known_name.label("player_name"),
            Player.game_id.label("player_game_id"),
            from_club.name.label("from_club_name"),
            from_club.game_id.label("from_club_game_id"),
            to_club.name.label("to_club_name"),
            to_club.game_id.label("to_club_game_id")
        )
        .join(Player, Player.id == Transfer.player_id)
        .outerjoin(from_club, from_club.id == Transfer.from_club_id)
        .outerjoin(to_club, to_club.id == Transfer.to_club_id)
        .filter(Transfer.career_id == career_id)
        .order_by(Transfer.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    # Map raw query results into schema-compatible objects/dicts
    transfers = []
    for r in results:
        t_dict = dict(r._asdict())
        if not t_dict["player_name"]:
            # Fallback if known_name is empty
            p_obj = db.query(Player).filter(Player.id == t_dict["player_id"]).first()
            if p_obj:
                t_dict["player_name"] = f"{p_obj.first_name} {p_obj.last_name}".strip() or f"Player #{p_obj.game_id}"
        transfers.append(t_dict)
        
    return transfers
