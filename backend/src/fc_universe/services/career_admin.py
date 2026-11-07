"""Keeping the list of careers in step with the EA save folder.

A career lives as long as its save does. When the save disappears (deleted in game, or replaced
by a newer save of the same career, which is matched by identity), the career is removed unless
the user chose to keep it forever. Careers imported before that choice existed
(``is_preserved`` NULL) are only removed when they are an older copy of a live career.
"""

import logging
from datetime import datetime
from pathlib import Path

from sqlalchemy import or_
from sqlalchemy.orm import Session

from fc_universe.config import settings
from fc_universe.models import (
    Award, Career, Club, ClubSeasonStats, Competition, CompetitionChampion, CompetitionSeason, Manager,
    ManagerSeasonHistory, Player, PlayerCompetitionStats, PlayerSeasonStats, Record, Season, TimelineEvent,
    Transfer,
)

logger = logging.getLogger(__name__)


def save_files(save_dir: Path | None = None) -> list[Path]:
    save_dir = save_dir or settings.save_directory
    if not save_dir.exists():
        return []
    return sorted(save_dir.glob("CmMgrC*"), key=lambda p: p.stat().st_mtime)


def live_identities(files: list[Path]) -> dict[str, Path]:
    """save_identifier -> newest file holding that career."""
    from fc_universe.parser.fbchunks import FbChunksParser

    parser, out = FbChunksParser(), {}
    for f in files:
        try:
            out[parser.read_header(f).save_identifier] = f  # files are oldest first
        except Exception:
            logger.warning(f"Could not read header of {f.name}")
    return out


def save_exists(career: Career, identities: dict[str, Path] | None = None) -> bool:
    if identities is not None and career.save_identifier in identities:
        return True
    return bool(career.save_file_path) and Path(career.save_file_path).is_file()


def delete_career(db: Session, career: Career) -> None:
    """Remove a career and everything in its universe."""
    cid = career.id
    season_ids = [s for (s,) in db.query(Season.id).filter(Season.career_id == cid)]
    player_ids = db.query(Player.id).filter(Player.career_id == cid)
    club_ids = db.query(Club.id).filter(Club.career_id == cid)
    comp_ids = db.query(Competition.id).filter(Competition.career_id == cid)
    db.query(PlayerSeasonStats).filter(or_(
        PlayerSeasonStats.season_id.in_(season_ids), PlayerSeasonStats.player_id.in_(player_ids),
    )).delete(synchronize_session=False)
    db.query(ClubSeasonStats).filter(or_(
        ClubSeasonStats.season_id.in_(season_ids), ClubSeasonStats.club_id.in_(club_ids),
    )).delete(synchronize_session=False)
    db.query(CompetitionSeason).filter(CompetitionSeason.competition_id.in_(comp_ids)).delete(
        synchronize_session=False)
    for model in (PlayerCompetitionStats, CompetitionChampion, ManagerSeasonHistory, TimelineEvent, Transfer,
                  Award, Record, Manager):
        db.query(model).filter(model.career_id == cid).delete(synchronize_session=False)
    for model in (Player, Club, Competition, Season):
        db.query(model).filter(model.career_id == cid).delete(synchronize_session=False)
    db.query(Career).filter(Career.id == cid).delete(synchronize_session=False)


def prune_missing(db: Session, identities: dict[str, Path], files_found: bool) -> list[str]:
    """Delete careers whose save is gone, unless kept forever. Returns removed career names.

    Nothing is removed when the save folder looks empty or unreadable, so a missing drive or a
    moved folder never wipes the database.
    """
    if not files_found:
        return []
    careers = db.query(Career).all()
    live = {
        c.id: ((c.name or "").lower(), (c.manager_name or "").lower())
        for c in careers if save_exists(c, identities)
    }
    removed = []
    for career in careers:
        if career.is_preserved or career.id in live:
            continue
        if career.is_preserved is None:
            # Imported before "keep forever" existed: only drop it when it is an older copy of a
            # career that is still live; otherwise the user decides.
            key = ((career.name or "").lower(), (career.manager_name or "").lower())
            if key not in live.values():
                continue
        logger.info(f"Save for career {career.id} ('{career.name}') is gone; removing it")
        removed.append(career.name)
        delete_career(db, career)
    if removed:
        db.commit()
    return removed


def sync_save_folder(db_factory) -> dict:
    """Import every save that is new or changed since its last import, then prune careers whose
    save no longer exists. Imports are idempotent, so this is always safe to run."""
    from fc_universe.parser.fbchunks import FbChunksParser, apply_team_offset_overrides
    from fc_universe.services.import_service import ImportService

    files = save_files()
    identities = live_identities(files)
    apply_team_offset_overrides(settings.team_id_offset)
    parser = FbChunksParser()
    synced, failed = [], []
    for save_id, save_file in identities.items():  # oldest first: newest career ends up on top
        db = db_factory()
        try:
            career = db.query(Career).filter(Career.save_identifier == save_id).first()
            modified = datetime.utcfromtimestamp(save_file.stat().st_mtime)
            if career and career.updated_at and career.updated_at >= modified:
                if career.save_file_path != str(save_file):
                    career.save_file_path = str(save_file)
                    db.commit()
                continue
            logger.info(f"Syncing save {save_file.name}...")
            career = ImportService(db).import_save(parser.parse(save_file))
            synced.append(career.name)
        except Exception:
            logger.exception(f"Import of {save_file.name} failed")
            failed.append(save_file.name)
        finally:
            db.close()

    db = db_factory()
    try:
        removed = prune_missing(db, identities, files_found=bool(files) and not failed)
    finally:
        db.close()
    return {"synced": synced, "failed": failed, "removed": removed}
