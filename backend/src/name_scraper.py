import sqlite3
import time
import sys
from pathlib import Path

# Force UTF-8 for console output to avoid encoding errors on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Add src to path to import NameResolver
sys.path.insert(0, str(Path(__file__).parent / "fc_universe"))
from services.name_resolver import NameResolver

db_path = r'C:\Users\arnav\OneDrive\Documents\Self_Apps\FC-Universe\backend\src\fc_universe.db'

def main():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    resolver = NameResolver()
    
    # Get players needing names (excluding generated players 50K-100K), ordered by overall descending
    cursor.execute("""
        SELECT id, game_id, known_name 
        FROM players 
        WHERE (known_name = '' OR known_name IS NULL OR known_name LIKE 'Player #%' OR known_name LIKE 'Youth Player #%')
          AND NOT (game_id >= 50000 AND game_id < 100000)
        ORDER BY overall DESC 
        LIMIT 500
    """)
    players = cursor.fetchall()
    
    print(f"Fetching names for {len(players)} players via NameResolver...")
    count = 0
    for idx, (db_id, game_id, known_name) in enumerate(players):
        # Fetch using standard NameResolver method which caches to CSV automatically
        real_name = resolver.fetch_from_fifacm(game_id)
        if real_name:
            # Update SQLite DB
            cursor.execute("UPDATE players SET known_name = ? WHERE id = ?", (real_name, db_id))
            conn.commit()
            count += 1
            print(f"[{idx+1}/{len(players)}] {game_id} -> Success ({real_name})")
        else:
            print(f"[{idx+1}/{len(players)}] {game_id} -> Not Found")
        
        time.sleep(0.05)
        
    resolver.save_cache()
    print(f"Finished. Updated {count} players in DB and saved cache.")

if __name__ == "__main__":
    main()
