from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from fc_universe.api.common import TROPHY_EVENT_TYPES, club_brief, season_label, user_club
from fc_universe.config import settings
from fc_universe.database import get_db
from fc_universe.models import (
    Career, Club, ManagerSeasonHistory, Player, Season, TimelineEvent, Transfer,
)
from fc_universe.schemas.common import APIResponse
from fc_universe.schemas.career import CareerOut
from fc_universe.parser.fbchunks import FbChunksParser, apply_team_offset_overrides
from fc_universe.services.import_service import ImportService
from fc_universe.services.career_admin import delete_career, save_exists, sync_save_folder

router = APIRouter(tags=["careers"])


def _managed_club_ids(db: Session, career: Career) -> list[int]:
    """Database ids of every club this career's manager has coached."""
    game_ids = {
        gid for (gid,) in db.query(ManagerSeasonHistory.club_game_id)
        .filter(ManagerSeasonHistory.career_id == career.id)
    }
    if career.team_id is not None:
        game_ids.add(career.team_id)
    if not game_ids:
        return []
    return [cid for (cid,) in db.query(Club.id).filter(Club.career_id == career.id, Club.game_id.in_(game_ids))]


def _career_out(db: Session, career: Career) -> dict:
    years = [y for (y,) in db.query(Season.year).filter(Season.career_id == career.id)]
    start, end = (min(years), max(years)) if years else (None, None)
    club_ids = _managed_club_ids(db, career)
    trophies = db.query(func.count(TimelineEvent.id)).filter(
        TimelineEvent.career_id == career.id,
        TimelineEvent.event_type.in_(TROPHY_EVENT_TYPES),
        TimelineEvent.related_club_id.in_(club_ids),
    ).scalar() if club_ids else 0
    seasons = (end - start + 1) if years else 0
    return {
        "id": career.id,
        "name": career.name,
        "save_identifier": career.save_identifier,
        "game_version": career.game_version,
        "manager_name": career.manager_name,
        "team_name": career.team_name,
        "team_id": career.team_id,
        "save_file_path": career.save_file_path,
        "created_at": career.created_at,
        "updated_at": career.updated_at,
        "current_season": season_label(end),
        "start_season": season_label(start),
        "seasons_count": seasons,
        "duration_years": f"{seasons} Season{'s' if seasons != 1 else ''}" if seasons else None,
        "trophies_count": trophies,
        "team": club_brief(user_club(db, career)),
        "is_preserved": career.is_preserved,
        "save_exists": save_exists(career),
    }


@router.get("/careers", response_model=APIResponse[list[CareerOut]])
def list_careers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all imported careers, most recently imported first."""
    careers = db.query(Career).order_by(Career.updated_at.desc()).offset(skip).limit(limit).all()
    data = [_career_out(db, c) for c in careers]
    if data:
        data[0]["is_last_played"] = True
    return {"success": True, "data": data}


@router.post("/careers/sync")
def sync_all_saves():
    """Import every new or changed save in the EA folder, then drop careers whose save is gone
    (unless kept forever)."""
    from fc_universe.database import SessionLocal

    if not settings.save_directory.exists():
        raise HTTPException(status_code=400, detail=f"Save folder not found: {settings.save_directory}")
    return {"success": True, "data": sync_save_folder(SessionLocal)}


@router.post("/careers/{career_id}/preserve", response_model=APIResponse[CareerOut])
def preserve_career(career_id: int, keep: bool = True, db: Session = Depends(get_db)):
    """Keep a career forever (it survives its save being deleted), or stop keeping it."""
    career = db.get(Career, career_id)
    if not career:
        raise HTTPException(status_code=404, detail="Career not found")
    career.is_preserved = keep
    db.commit()
    return {"success": True, "data": _career_out(db, career)}


@router.delete("/careers/{career_id}")
def remove_career(career_id: int, db: Session = Depends(get_db)):
    """Delete a career and its whole universe from FC Universe (the save file is untouched)."""
    career = db.get(Career, career_id)
    if not career:
        raise HTTPException(status_code=404, detail="Career not found")
    name = career.name
    delete_career(db, career)
    db.commit()
    return {"success": True, "data": {"id": career_id, "name": name}}


@router.get("/careers/local-saves")
def list_local_saves(db: Session = Depends(get_db)):
    """Scan the EA FC save folder and list career saves."""
    save_dir = settings.save_directory
    if not save_dir.exists():
        return {"success": True, "data": []}

    imported_ids = {sid for (sid,) in db.query(Career.save_identifier)}
    parser = FbChunksParser()
    saves = []
    for file in save_dir.glob("CmMgrC*"):
        try:
            stat = file.stat()
            header = parser.read_header(file)
            saves.append({
                "filename": file.name,
                "path": str(file),
                "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "size_kb": round(stat.st_size / 1024, 1),
                "imported": header.save_identifier in imported_ids,
                "save_identifier": header.save_identifier,
                "name": header.career_name,
                "manager_name": header.manager_name,
                "team_name": header.team_name,
            })
        except Exception:
            continue

    saves.sort(key=lambda s: s["modified_at"], reverse=True)
    return {"success": True, "data": saves}


@router.get("/careers/{career_id}", response_model=APIResponse[CareerOut])
def get_career(career_id: int, db: Session = Depends(get_db)):
    """Get a specific career by ID."""
    career = db.get(Career, career_id)
    if not career:
        raise HTTPException(status_code=404, detail="Career not found")
    return {"success": True, "data": _career_out(db, career)}


@router.get("/careers/{career_id}/summary")
def get_career_summary(career_id: int, db: Session = Depends(get_db)):
    """Headline counts and the user's current-season record, for dashboards and the scoreboard."""
    career = db.get(Career, career_id)
    if not career:
        raise HTTPException(status_code=404, detail="Career not found")
    current = (
        db.query(ManagerSeasonHistory)
        .filter(ManagerSeasonHistory.career_id == career_id, ManagerSeasonHistory.club_game_id == career.team_id)
        .order_by(ManagerSeasonHistory.season_number.desc())
        .first()
    )
    return {
        "success": True,
        "data": {
            **_career_out(db, career),
            "clubs": db.query(func.count(Club.id)).filter(Club.career_id == career_id).scalar(),
            "players": db.query(func.count(Player.id)).filter(
                Player.career_id == career_id, Player.is_retired.isnot(True)).scalar(),
            "transfers": db.query(func.count(Transfer.id)).filter(Transfer.career_id == career_id).scalar(),
            "events": db.query(func.count(TimelineEvent.id)).filter(TimelineEvent.career_id == career_id).scalar(),
            "record": {
                "played": current.matches, "wins": current.wins, "draws": current.draws,
                "losses": current.losses, "goals_for": current.goals_for,
                "goals_against": current.goals_against, "points": current.points,
            } if current else None,
        },
    }


@router.post("/import")
def import_save_file(file_path: str, team_offset: int | None = None, db: Session = Depends(get_db)):
    """Parse and import an EA FC save file from the configured save folder."""
    path = Path(file_path).resolve()
    if not path.is_relative_to(settings.save_directory.resolve()):
        raise HTTPException(status_code=400, detail=f"Saves must live in {settings.save_directory}")
    if not path.is_file():
        raise HTTPException(status_code=400, detail=f"File not found: {file_path}")

    try:
        if team_offset is not None:
            apply_team_offset_overrides(team_offset)
            settings.team_id_offset = team_offset
        parsed_data = FbChunksParser().parse(path)
        career = ImportService(db).import_save(parsed_data)
        return {
            "success": True,
            "message": "Import successful",
            "data": {"career_id": career.id, "name": career.name},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")
