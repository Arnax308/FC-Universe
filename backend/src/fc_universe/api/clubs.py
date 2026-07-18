"""Clubs API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from fc_universe.database import get_db
from fc_universe.models import Club
from fc_universe.schemas.club import ClubOut

router = APIRouter(tags=["clubs"])


@router.get("/careers/{career_id}/clubs", response_model=list[ClubOut])
def list_clubs(career_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List clubs in a specific career."""
    clubs = db.query(Club).filter(Club.career_id == career_id).offset(skip).limit(limit).all()
    return clubs
