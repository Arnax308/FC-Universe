from pathlib import Path

from fc_universe.config import settings
from fc_universe.database import get_db, engine, create_tables
from fc_universe.parser.fbchunks import FbChunksParser
from fc_universe.services.import_service import ImportService

def get_latest_save():
    save_dir = settings.save_directory
    saves = list(save_dir.glob('CmMgr*'))
    if not saves:
        return None
    return max(saves, key=lambda p: p.stat().st_mtime)

def main():
    print("Creating tables...")
    create_tables()

    save_path = get_latest_save()
    if not save_path:
        print("No save found!")
        return

    print(f"Parsing save file: {save_path.name}")
    parser = FbChunksParser()
    parsed_data = parser.parse(save_path)

    print("Importing into DB...")
    db = next(get_db())
    importer = ImportService(db)
    
    career = importer.import_save(parsed_data)
    print(f"Success! Imported career: {career.name} (ID: {career.id})")
    
if __name__ == '__main__':
    main()
