"""Import every career save (or the paths given) into the app database.

Usage: python run_import.py [save_path ...]
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'src'))
from fc_universe.config import settings
from fc_universe.database import SessionLocal, create_tables
from fc_universe.parser.fbchunks import FbChunksParser
from fc_universe.services.import_service import ImportService

create_tables()
print(f"Database: {settings.database_url}")

save_files = [Path(p) for p in sys.argv[1:]] or sorted(
    settings.save_directory.glob("CmMgrC*"), key=lambda p: p.stat().st_mtime
)
if not save_files:
    print("No save files found!")
    sys.exit(1)

parser = FbChunksParser()
for save_file in save_files:
    print(f"Importing {save_file.name}...")
    db = SessionLocal()
    try:
        career = ImportService(db).import_save(parser.parse(save_file))
        print(f"  -> career {career.id}: {career.name} ({career.team_name}, {career.manager_name})")
    finally:
        db.close()
