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
    
    # Get DISTINCT unresolved real players (game_id < 280000), ordered by overall desc.
    # We use DISTINCT game_id to avoid scraping the same player multiple times across careers.
    cursor.execute("""
        SELECT DISTINCT game_id, MAX(overall) as max_ovr
        FROM players 
        WHERE (known_name = '' OR known_name IS NULL OR known_name LIKE 'Player #%')
          AND game_id < 280000
        GROUP BY game_id
        ORDER BY max_ovr DESC 
        LIMIT 1000
    """)
    players = cursor.fetchall()
    
    print(f"Fetching names for {len(players)} unique real players via NameResolver...")
    count = 0
    for idx, (game_id, max_ovr) in enumerate(players):
        # Fetch using standard NameResolver method which caches to CSV automatically
        real_name = resolver.fetch_from_fifacm(game_id)
        if real_name:
            # Update ALL rows with this game_id across ALL careers
            cursor.execute("UPDATE players SET known_name = ? WHERE game_id = ?", (real_name, game_id))
            conn.commit()
            count += 1
            print(f"[{idx+1}/{len(players)}] {game_id} -> Success ({real_name})")
        else:
            print(f"[{idx+1}/{len(players)}] {game_id} -> Not Found")
        
        time.sleep(0.05)
        
    resolver.save_cache()
    print(f"Finished. Updated {count} players (all career copies) in DB and saved cache.")

if __name__ == "__main__":
    main()

