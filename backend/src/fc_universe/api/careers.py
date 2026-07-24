from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from fc_universe.config import settings
from fc_universe.database import get_db
from fc_universe.models import Career
from fc_universe.schemas.common import APIResponse
from fc_universe.schemas.career import CareerOut
from fc_universe.parser.fbchunks import FbChunksParser, apply_team_offset_overrides
from fc_universe.services.import_service import ImportService
from fc_universe.repositories.career_repo import CareerRepository

router = APIRouter(tags=["careers"])


@router.get("/careers", response_model=APIResponse[list[CareerOut]])
def list_careers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all imported careers with rich metadata for universe selection."""
    repo = CareerRepository(db)
    careers = repo.get_all(skip=skip, limit=limit)
    
    res = []
    for idx, c in enumerate(careers):
        seasons = c.seasons or []
        season_years = [s.year for s in seasons if s.year]
        if season_years:
            start_yr = min(season_years)
            max_yr = max(season_years)
            current_season_str = f"{max_yr}/{(max_yr+1)%100:02d}"
            dur_num = max(1, max_yr - start_yr + 1)
            duration_str = f"{dur_num} Year" + ("s" if dur_num > 1 else "")
        else:
            current_season_str = "2025/26"
            duration_str = "1 Year"

        awards = c.awards or []
        trophies_count = len(awards)
        
        honours = []
        if trophies_count > 0:
            honours.append({"icon": "🏆", "count": trophies_count})

        c_dict = {
            "id": c.id,
            "name": c.name,
            "save_identifier": c.save_identifier,
            "game_version": c.game_version,
            "manager_name": c.manager_name,
            "team_name": c.team_name,
            "team_id": c.team_id,
            "save_file_path": c.save_file_path,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "current_season": current_season_str,
            "duration_years": duration_str,
            "trophies_count": trophies_count,
            "trophies_summary": honours,
            "is_last_played": idx == 0
        }
        res.append(c_dict)

    return {"success": True, "data": res}


@router.get("/careers/local-saves")
def list_local_saves(db: Session = Depends(get_db)):
    """Scan EA FC save folder and list candidate saves."""
    import hashlib
    
    save_dir = settings.save_directory
    if not save_dir.exists():
        return {"success": True, "data": []}
        
    parser = FbChunksParser()
    saves = []
    for file in save_dir.glob("CmMgrC*"):
        try:
            stat = file.stat()
            # Generate MD5 hash of filename stem to get expected save identifier
            save_id = hashlib.md5(file.stem.encode()).hexdigest()
            
            # Read quick header information from save file (instant <1ms read)
            header_info = parser.read_header(file)
            
            # Check if already imported
            imported = db.query(Career).filter(Career.save_identifier == save_id).first() is not None
            
            saves.append({
                "filename": file.name,
                "path": str(file),
                "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "size_kb": round(stat.st_size / 1024, 1),
                "imported": imported,
                "save_identifier": save_id,
                "name": header_info.career_name,
                "manager_name": header_info.manager_name,
                "team_name": header_info.team_name,
            })
        except Exception:
            continue
            
    saves.sort(key=lambda s: s["modified_at"], reverse=True)
    return {"success": True, "data": saves}


@router.get("/careers/{career_id}", response_model=APIResponse[CareerOut])
def get_career(career_id: int, db: Session = Depends(get_db)):
    """Get a specific career by ID."""
    repo = CareerRepository(db)
    career = repo.get_by_id(career_id)
    if not career:
        raise HTTPException(status_code=404, detail="Career not found")
    return {"success": True, "data": career}


@router.post("/import")
def import_save_file(file_path: str, team_offset: int | None = None, db: Session = Depends(get_db)):
    """Parse and import an EA FC save file.
    
    In a real app, you might accept an uploaded file or just a path.
    Since this is a local app, a file path works well.
    """
    path = Path(file_path)
    if not path.exists():
        raise HTTPException(status_code=400, detail=f"File not found: {file_path}")

    try:
        if team_offset is not None:
            apply_team_offset_overrides(team_offset)
            from fc_universe.config import settings
            settings.team_id_offset = team_offset

        # Parse the binary save file
        parser = FbChunksParser()
        parsed_data = parser.parse(path)

        # Import the parsed data into the database
        import_service = ImportService(db)
        career = import_service.import_save(parsed_data)

        return {
            "success": True,
            "message": "Import successful",
            "data": {
                "career_id": career.id,
                "name": career.name
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
