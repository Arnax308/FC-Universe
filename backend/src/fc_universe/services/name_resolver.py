"""Name resolution service for players.

Resolves player names using a local cache of game_id -> name,
and dynamic names from the save file's bneD table.
"""
import csv
import logging
import urllib.request
import re
from pathlib import Path

logger = logging.getLogger(__name__)


class NameResolver:
    def __init__(self, cache_file: str = "player_names_cache.csv"):
        self.cache_path = Path(__file__).parent.parent / "data" / cache_file
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        self.name_cache = {}
        self.master_players = {}
        self.base_name_map = {}
        self._load_master_players()
        self._load_cache()
        self._load_base_names()

    def _load_master_players(self):
        json_path = Path(__file__).parent.parent / "data" / "master_players.json"
        if not json_path.exists():
            return
        try:
            import json
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for gid_str, entry in data.items():
                    if isinstance(entry, dict) and entry.get("name"):
                        self.master_players[int(gid_str)] = entry["name"]
            logger.info(f"Loaded {len(self.master_players)} master player names")
        except Exception as e:
            logger.error(f"Failed to load master_players.json: {e}")

    def _load_base_names(self):
        csv_path = Path(__file__).parent.parent.parent.parent.parent / "parser_repo" / "fc-cm-web-parser-main" / "public" / "playernames.csv"
        if not csv_path.exists():
            return
        try:
            with open(csv_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self.base_name_map[int(row['nameid'])] = row['name']
        except Exception as e:
            logger.error(f"Failed to load playernames.csv fallback: {e}")

    def _load_cache(self):
        if not self.cache_path.exists():
            return
        
        try:
            with open(self.cache_path, "r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    game_id = int(row["game_id"])
                    self.name_cache[game_id] = row["name"]
            logger.info(f"Loaded {len(self.name_cache)} names from cache")
        except Exception as e:
            logger.error(f"Failed to load name cache: {e}")

    def save_cache(self):
        try:
            with open(self.cache_path, "w", encoding="utf-8-sig", newline='') as f:
                writer = csv.DictWriter(f, fieldnames=["game_id", "name"])
                writer.writeheader()
                for game_id, name in sorted(self.name_cache.items()):
                    writer.writerow({"game_id": game_id, "name": name})
        except Exception as e:
            logger.error(f"Failed to save name cache: {e}")

    def update_cache(self, game_id: int, name: str):
        if name and self.name_cache.get(game_id) != name:
            self.name_cache[game_id] = name
            self.save_cache()
            
    def fetch_from_fifacm(self, game_id: int) -> str | None:
        """Fetch a single player's name from fut.gg (previously fifacm.com)."""
        # FUT.GG works without HTTP 403 blocks for all real players
        url = f"https://www.fut.gg/players/{game_id}/"
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        try:
            resp = urllib.request.urlopen(req, timeout=5)
            html = resp.read().decode('utf-8')
            match = re.search(r'<title>([^<]+?)\s+(?:EA\s+FC|FIFA|Fifa|FC\s+\d+)', html, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                self.update_cache(game_id, name)
                return name
        except Exception as e:
            logger.debug(f"Failed to fetch {game_id} from fut.gg: {e}")
        return None

    def resolve_name(self, game_id: int, first_id: int, last_id: int, common_id: int, dc_names: dict) -> str:
        """Resolve a player's name using cache and DC names (bneD).
        
        Strategy:
        - Real players (game_id < 280000): use name cache only. If not cached,
          return empty string and let the background scraper fill it in.
        - Generated players (game_id >= 280000): use dc_names (bneD) + playernames.csv
          to build composite first/last/common name.
        """
        # 1. Check master players dataset (single source of truth for real players)
        if game_id in self.master_players and self.master_players[game_id]:
            return self.master_players[game_id]

        # 2. Check local cache (contains resolved names for real players)
        if game_id in self.name_cache and self.name_cache[game_id]:
            return self.name_cache[game_id]
            
        # 3. For real players not in master or cache: try to fetch from FUT.GG on the fly
        if game_id < 280000:
            fetched_name = self.fetch_from_fifacm(game_id)
            if fetched_name:
                return fetched_name
            return f"Player #{game_id}"

        # 3. For generated/youth players (game_id >= 280000): use dc_names (bneD) + playernames.csv
        if game_id >= 280000:
            first = dc_names.get(first_id) or self.base_name_map.get(first_id, "") if first_id else ""
            last = dc_names.get(last_id) or self.base_name_map.get(last_id, "") if last_id else ""
            common = dc_names.get(common_id) or self.base_name_map.get(common_id, "") if common_id else ""
            
            if first or last or common:
                # Insert spaces into camelCase names like JongEun -> Jong Eun
                first = re.sub(r'([a-z])([A-Z])', r'\1 \2', first)
                last = re.sub(r'([a-z])([A-Z])', r'\1 \2', last)
                common = re.sub(r'([a-z])([A-Z])', r'\1 \2', common)
                
                full_name = common if common else f"{first} {last}".strip()
                return full_name
            
        return f"Youth Player #{game_id}"
