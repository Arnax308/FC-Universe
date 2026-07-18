"""Script to initialize DB and run import directly."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path

# Setup DB
sys.path.insert(0, 'src')
from fc_universe.database import Base, engine
from fc_universe.database import SessionLocal
from fc_universe.parser.fbchunks import FbChunksParser
from fc_universe.services.import_service import ImportService

# Create tables
Base.metadata.create_all(bind=engine)
print("Database initialized.")

save_dir = Path.home() / "AppData" / "Local" / "EA SPORTS FC 26" / "settings"
save_files = list(save_dir.glob("CmMgrC*"))
if not save_files:
    print("No save files found!")
    sys.exit(1)

save_file = save_files[0]
print(f"Parsing: {save_file.name}")

parser = FbChunksParser()
parsed_data = parser.parse(save_file)

print("Importing to DB...")
db = SessionLocal()
try:
    import_service = ImportService(db)
    career = import_service.import_save(parsed_data)
    print(f"Import successful! Career ID: {career.id}")
finally:
    db.close()
