"""Import service to process parsed save data into the database.

Save-table and field codes are obfuscated four-letter keys; their real names come
from backend/db_meta.json and are noted next to each lookup.

An import is one transaction guarded by a process-wide lock, so a half-finished
import never reaches the database and the startup auto-import can't race a manual one.
Timeline events carry a stable ``event_key`` and are only ever added, so re-importing
the same save is a no-op for history and new saves extend it.
"""

import logging
import re
import threading
from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy.orm import Session

from fc_universe.models import (
    Career,
    Season,
    Club,
    Player,
    Competition,
    PlayerSeasonStats,
    ClubSeasonStats,
    Transfer,
    TimelineEvent,
    Manager,
    Award,
    ManagerSeasonHistory,
)
from fc_universe.parser.models import ParsedSaveData
from fc_universe.services.nations import nation_for

logger = logging.getLogger(__name__)

_import_lock = threading.Lock()

# Season 1 of every FC 26 career is 2025/26 (season numbers in the save are 1-based).
BASE_SEASON_YEAR = 2025
# EA stores dates as days since the start of the Gregorian calendar.
EA_EPOCH = date(1582, 10, 14)
FREE_AGENTS_TEAM_ID = 111592
GENERATED_PLAYER_ID_START = 280000

POSITION_CODE_MAP = {
    0: "GK", 3: "RB", 5: "CB", 7: "LB", 10: "CDM", 12: "RM",
    14: "CM", 16: "LM", 18: "CAM", 23: "RW", 25: "ST", 27: "LW",
}

# Cup competitions are addressed by "compobjid" in competition progress (NgwF).
CUP_COMPETITIONS = {
    135: ("UEFA Champions League", "continental"),
    136: ("UEFA Europa League", "continental"),
    223: ("UEFA Conference League", "continental"),
    139: ("FIFA Club World Cup", "continental"),
    1335: ("Copa del Rey", "cup"),
    5335: ("Copa del Rey", "cup"),
    1327: ("Supercopa de España", "cup"),
    1313: ("FA Cup", "cup"),
    5313: ("FA Cup", "cup"),
    1314: ("EFL Cup (Carabao)", "cup"),
    5314: ("EFL Cup (Carabao)", "cup"),
    1319: ("DFB-Pokal", "cup"),
    5319: ("DFB-Pokal", "cup"),
    1331: ("Coppa Italia", "cup"),
    5331: ("Coppa Italia", "cup"),
    1316: ("Coupe de France", "cup"),
    5316: ("Coupe de France", "cup"),
}
TOP_5_LEAGUES = {13, 53, 19, 31, 16}

PLAYER_AWARDS = {
    0: "Player of the Month",
    1: "Player of the Year (Ballon d'Or)",
    2: "Golden Boot",
    3: "Golden Glove",
    4: "Best Player in the World",
}
MANAGER_AWARDS = {
    0: "Manager of the Month",
    1: "Manager of the Year",
}

# Player attribute columns (players table, CZUM)
PLAYER_ATTRIBUTES = {
    "sprint_speed": "NrcP", "acceleration": "SPge", "finishing": "xJZL", "shot_power": "ohpV",
    "short_passing": "vObb", "long_passing": "kerE", "dribbling": "nEbM", "ball_control": "MgwU",
    "standing_tackle": "CsyD", "sliding_tackle": "PhuM", "strength": "nmgT", "stamina": "XjDq",
    "agility": "RRQB", "balance": "onkY", "reactions": "YCnI", "composure": "jlQJ",
    "interceptions": "wWzG", "positioning": "XsFD", "vision": "ZoOK", "crossing": "wGOH",
    "jumping": "URGo", "heading_accuracy": "aReg", "aggression": "iTce", "long_shots": "CsBG",
    "penalties": "AGsE", "free_kick_accuracy": "VgKc", "curve": "YFaA", "volleys": "Dydz",
    "gk_diving": "xrSG", "gk_handling": "GBGj", "gk_kicking": "kqda", "gk_positioning": "yfhq",
    "gk_reflexes": "eYFI", "defensive_awareness": "SJKz", "weak_foot_ability": "aOBn",
    "skill_moves": "BAPc", "international_rep": "WVsa",
}


def season_year(season_number: int | None) -> int:
    """Calendar year a season starts in (season 1 -> 2025 for 2025/26)."""
    return BASE_SEASON_YEAR + max(int(season_number or 1), 1) - 1


def ea_date_year(days: int | None) -> int | None:
    if not days or days <= 0:
        return None
    try:
        return (EA_EPOCH + timedelta(days=int(days))).year
    except OverflowError:
        return None


def ordinal(n: int) -> str:
    suffix = "th" if 10 <= n % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def rgb_hex(row: dict, r: str, g: str, b: str) -> str | None:
    vals = [row.get(r), row.get(g), row.get(b)]
    if any(v is None or not 0 <= v <= 255 for v in vals):
        return None
    return "#{:02x}{:02x}{:02x}".format(*vals)


def get_award_name(type_id: int, is_manager: bool = False) -> str:
    if is_manager:
        return MANAGER_AWARDS.get(type_id, f"Manager Award #{type_id}")
    return PLAYER_AWARDS.get(type_id, f"Player Award #{type_id}")


def is_women_club(club) -> bool:
    if not club:
        return False
    c_name = club.name or ""
    c_league = club.league or ""
    return "(W)" in c_name or "Women" in c_name or "Femenina" in c_league or "WSL" in c_league or "NWSL" in c_league or "Femenino" in c_name or "Feminine" in c_name


def player_display_name(player) -> str:
    if not player:
        return "Unknown Player"
    return player.known_name or f"{player.first_name or ''} {player.last_name or ''}".strip() or "Unknown Player"


class ImportService:
    def __init__(self, db: Session):
        self.db = db

    def import_save(self, parsed_data: ParsedSaveData) -> Career:
        """Import a parsed save file into the database as a single transaction."""
        with _import_lock:
            try:
                career = self._import(parsed_data)
                self.db.commit()
                logger.info(f"Import complete for career {career.id}")
                return career
            except Exception:
                self.db.rollback()
                logger.exception("Import failed; rolled back")
                raise

    # ------------------------------------------------------------------ helpers

    def _add_event(self, key: str, **fields) -> None:
        """Add a timeline event unless one with the same stable key already exists."""
        if key in self._event_keys:
            return
        self._event_keys.add(key)
        self.db.add(TimelineEvent(career_id=self.career.id, event_key=key, **fields))

    # ------------------------------------------------------------------ import

    def _import(self, parsed_data: ParsedSaveData) -> Career:
        raw = parsed_data.raw_tables
        header = parsed_data.header

        # 1. Career
        career = self.db.query(Career).filter(Career.save_identifier == header.save_identifier).first()
        is_first_import = career is None
        if is_first_import:
            logger.info(f"Creating new career: {header.career_name}")
            career = Career(
                name=header.career_name,
                save_identifier=header.save_identifier,
                manager_name=header.manager_name,
                team_name=header.team_name,
                team_id=header.team_id,
                save_file_path=header.file_path,
            )
            self.db.add(career)
            self.db.flush()
        else:
            logger.info(f"Updating existing career: {career.name}")
            career.save_file_path = header.file_path
        self.career = career
        self._event_keys = {
            k for (k,) in self.db.query(TimelineEvent.event_key).filter(
                TimelineEvent.career_id == career.id, TimelineEvent.event_key.isnot(None)
            )
        }

        user_row = (raw.get("mPrV") or [{}])[0]  # career_users
        user_team_game_id = user_row.get("NTyS")  # clubteamid

        # 2. Competitions: built-in cups + leagues (onMQ)
        comps = {c.game_id: c for c in self.db.query(Competition).filter(Competition.career_id == career.id)}

        def upsert_comp(game_id, name, c_type, country=""):
            comp = comps.get(game_id)
            if not comp:
                comp = Competition(career_id=career.id, game_id=game_id, name=name, type=c_type, country=country)
                self.db.add(comp)
                comps[game_id] = comp
            else:
                comp.name, comp.type = name, c_type
            return comp

        for c_id, (c_name, c_type) in CUP_COMPETITIONS.items():
            upsert_comp(c_id, c_name, c_type)
        for league in raw.get("onMQ", []):
            l_id, l_name = league.get("aQrQ"), league.get("HEQX")  # leagueid, leaguename
            if l_id is not None and l_name:
                # EA suffixes league names with their tier, e.g. "England Premier League (1)"
                l_name = re.sub(r"\s*\(\d+\)$", "", l_name)
                upsert_comp(l_id, l_name, "league", str(league.get("WDGJ", "")))  # countryid
        self.db.flush()

        # Competition-progress rows reference the user's league by its compobjid.
        compobj_to_comp = {c_id: comps[c_id] for c_id in CUP_COMPETITIONS}
        if user_row.get("XGBd") is not None and user_row.get("aQrQ") in comps:  # primarycompobjid, leagueid
            compobj_to_comp[user_row["XGBd"]] = comps[user_row["aQrQ"]]

        # 3. Seasons
        history_rows = raw.get("zgrE", [])  # career_managerhistory
        current_number = user_row.get("CXJt") or max(  # seasoncount
            [h.get("vojK") or 0 for h in history_rows] + [1]
        )
        current_year = season_year(current_number)
        seasons = {s.year: s for s in self.db.query(Season).filter(Season.career_id == career.id)}
        for yr in range(BASE_SEASON_YEAR, current_year + 1):
            season = seasons.get(yr)
            if not season:
                season = Season(career_id=career.id, year=yr)
                self.db.add(season)
                seasons[yr] = season
            season.is_current = yr == current_year
        self.db.flush()
        active_season = seasons[current_year]
        for yr, season in seasons.items():
            self._add_event(
                f"season_start:{yr}",
                season_id=season.id,
                event_type="season_start",
                description=f"The {yr}/{(yr + 1) % 100:02d} season kicks off in the {career.name} universe!",
                gender=2,
            )

        def season_for(number):
            return seasons.get(season_year(number))

        # 4. Clubs (teams, lyxL) with league from standings (leagueteamlinks, qdZF)
        raw_standings = raw.get("qdZF", [])
        team_league = {}
        for s in raw_standings:
            t_id, l_id = s.get("mCXg"), s.get("aQrQ")
            if t_id is not None and l_id in comps and t_id not in team_league:
                team_league[t_id] = comps[l_id]

        clubs = {c.game_id: c for c in self.db.query(Club).filter(Club.career_id == career.id)}
        for c in raw.get("lyxL", []):
            game_id, name = c.get("mCXg"), c.get("AUsv")  # teamid, teamname
            if not name or game_id is None:
                continue
            if c.get("EveZ") == 1 and not name.endswith(" (W)"):  # gender
                name = f"{name} (W)"
            club = clubs.get(game_id)
            if not club:
                club = Club(career_id=career.id, game_id=game_id, name=name)
                self.db.add(club)
                clubs[game_id] = club
            club.name = name
            league = team_league.get(game_id)
            club.league = league.name if league else None
            club.overall_rating = c.get("UERs")
            club.defense_rating = c.get("btsS")
            club.midfield_rating = c.get("SqFN")
            club.attack_rating = c.get("UAKP")
            club.club_worth = c.get("QSnJ")
            club.domestic_prestige = c.get("ppLE")
            club.international_prestige = c.get("edvw")
            club.foundation_year = c.get("yDDQ")
            club.rival_team_id = c.get("erSL")
            club.color_primary = rgb_hex(c, "lWTE", "UrDD", "EVjc")  # teamcolor1
            club.color_secondary = rgb_hex(c, "KzYP", "rags", "PcIL")  # teamcolor2
            club.color_tertiary = rgb_hex(c, "Tsda", "Olxh", "Gzty")  # teamcolor3
        self.db.flush()
        club_game_id_by_db_id = {c.id: gid for gid, c in clubs.items()}

        # 5. User's team and manager name
        user_club = clubs.get(user_team_game_id)
        if user_club:
            career.team_id = user_club.game_id
            career.team_name = user_club.name
        mgr_name = " ".join(
            p for p in ((user_row.get("HdeP") or "").strip(), (user_row.get("rREd") or "").strip()) if p
        )
        if mgr_name:
            career.manager_name = mgr_name

        managed_team_game_ids = {h.get("mCXg") for h in history_rows if h.get("mCXg") is not None}
        if career.team_id:
            managed_team_game_ids.add(career.team_id)

        # 6. Players
        self._import_players(raw, clubs, club_game_id_by_db_id, active_season, is_first_import)

        # 7. Season statistics
        self._import_club_stats(raw_standings, clubs, comps, active_season)
        self._import_player_stats(raw, clubs, active_season)

        # 8. Managers
        self._import_managers(raw, clubs, active_season, is_first_import)

        # 9. Awards
        self._import_awards(raw, clubs, season_for)

        # 10. Trophies
        managed_leagues = {
            team_league[t].game_id for t in managed_team_game_ids if t in team_league
        }

        def trophy(comp, club, season, is_user_club=False):
            if not (comp and club and season):
                return
            relevant = comp.game_id in TOP_5_LEAGUES or comp.game_id in CUP_COMPETITIONS or comp.game_id in managed_leagues
            if not (relevant or is_user_club):
                return
            # One winner per competition per season, whichever source reports it first.
            self._add_event(
                f"trophy:{comp.game_id}:{season.year}",
                season_id=season.id,
                event_type="trophy",
                description=f"{club.name} have won the {comp.name} in {season.year}/{(season.year + 1) % 100:02d}!",
                related_club_id=club.id,
                related_competition_id=comp.id,
                gender=1 if is_women_club(club) else 0,
            )

        for p in raw.get("NgwF", []):  # career_competitionprogress
            if p.get("SDel") == 1:  # hasteamwon
                t_id = p.get("mCXg")
                trophy(compobj_to_comp.get(p.get("OvfW")), clubs.get(t_id), season_for(p.get("vojK")),
                       t_id in managed_team_game_ids)

        # League champions: the "champion" flag marks the reigning (last season's) winner.
        if current_number > 1:
            last_season = season_for(current_number - 1)
            for s in raw_standings:
                if s.get("wEjP") == 1 and s.get("MDeW") == 1:  # champion, previousyeartableposition
                    t_id = s.get("mCXg")
                    trophy(comps.get(s.get("PSlV")), clubs.get(t_id), last_season, t_id in managed_team_game_ids)

        for h in history_rows:
            if (h.get("npBO") or 0) > 0:  # leaguetrophies
                trophy(comps.get(h.get("aQrQ")), clubs.get(h.get("mCXg")), season_for(h.get("vojK")), True)

        # 11. Manager career history (rebuilt from the save every time)
        self.db.query(ManagerSeasonHistory).filter(ManagerSeasonHistory.career_id == career.id).delete()
        for h in history_rows:
            club_game_id = h.get("mCXg")
            if club_game_id is None:
                continue
            club_obj = clubs.get(club_game_id)
            season_obj = season_for(h.get("vojK"))
            if club_obj and season_obj and (h.get("NJUU") or 0) > 0 and (h.get("vojK") or 0) < current_number:
                league = comps.get(h.get("aQrQ"))
                pos = h.get("zhaq") or 0
                parts = [f"{club_obj.name} finish {ordinal(pos)} in {league.name}" if pos and league
                         else f"{club_obj.name} complete the season"]
                parts.append(f"{h.get('zjtP') or 0}W {h.get('EBvI') or 0}D {h.get('cxMK') or 0}L, {h.get('Yyym') or 0} pts")
                if h.get("XBwS") and h.get("XjNj"):
                    parts.append(f"marquee signing {h['XjNj']} (€{h['XBwS'] / 1e6:.1f}M)")
                self._add_event(
                    f"season_review:{club_game_id}:{season_obj.year}",
                    season_id=season_obj.id, event_type="season_review",
                    description=" · ".join(parts),
                    related_club_id=club_obj.id, gender=1 if is_women_club(club_obj) else 0,
                )
            self.db.add(ManagerSeasonHistory(
                career_id=career.id,
                season_id=season_obj.id if season_obj else None,
                club_id=club_obj.id if club_obj else None,
                club_game_id=club_game_id,
                season_number=h.get("vojK"),
                matches=h.get("NJUU") or 0,
                wins=h.get("zjtP") or 0,
                draws=h.get("EBvI") or 0,
                losses=h.get("cxMK") or 0,
                goals_for=h.get("EwYk") or 0,
                goals_against=h.get("IoBz") or 0,
                points=h.get("Yyym") or 0,
                table_position=h.get("zhaq") or 0,
                league_trophies=h.get("npBO") or 0,
                cup_trophies=h.get("uQOP") or 0,
                euro_trophies=h.get("jpwC") or 0,
                big_buy_amount=h.get("XBwS") or None,
                big_buy_player=h.get("XjNj") or None,
                big_sell_amount=h.get("tyaM") or None,
                big_sell_player=h.get("JkVn") or None,
            ))

        return career

    # ------------------------------------------------------------------ players

    def _import_players(self, raw, clubs, club_game_id_by_db_id, active_season, is_first_import):
        from fc_universe.services.name_resolver import NameResolver

        career = self.career
        raw_players = raw.get("CZUM", [])
        if not raw_players:
            return
        logger.info(f"Importing {len(raw_players)} players...")
        name_resolver = NameResolver()

        dc_names = {r.get("FuiB"): r.get("vIys") for r in raw.get("bneD", []) if r.get("FuiB") is not None and r.get("vIys")}

        # National teams (teamnationlinks) so club links win over national-team links
        national_team_ids = {r.get("mCXg") for r in raw.get("CxJp", []) if r.get("mCXg") is not None}
        self.player_links = {}
        for link in raw.get("RrqT", []):  # teamplayerlinks
            p_id, c_id = link.get("ykFq"), link.get("mCXg")
            if p_id is None or c_id is None:
                continue
            current = self.player_links.get(p_id)
            if current is None or (current.get("mCXg") in national_team_ids and c_id not in national_team_ids):
                self.player_links[p_id] = link

        loans = {r.get("ykFq") for r in raw.get("ZrAO", []) if r.get("ykFq") is not None}  # playerloans
        # Agreed fees from pre-signed contracts (career_presignedcontract): (player, buying team) -> fee
        agreed_fees = {
            (r.get("ykFq"), r.get("mCXg")): r.get("bmPU")  # playerid, teamid, offeredfee
            for r in raw.get("gllz", []) if (r.get("bmPU") or 0) > 0
        }

        players = {p.game_id: p for p in self.db.query(Player).filter(Player.career_id == career.id)}
        user_club = clubs.get(career.team_id)
        pending_transfers = []

        for p in raw_players:
            game_id = p.get("ykFq")  # playerid
            if game_id is None:
                continue
            existing = players.get(game_id)

            name_str = existing.known_name if existing else None
            if not name_str or name_str.startswith(("Player #", "Youth Player #")):
                name_str = name_resolver.resolve_name(
                    game_id, p.get("tHlO"), p.get("QCfa"), p.get("HDYx"), dc_names
                ) or (f"Youth Player #{game_id}" if game_id >= GENERATED_PLAYER_ID_START else f"Player #{game_id}")

            link = self.player_links.get(game_id)
            club = clubs.get(link.get("mCXg")) if link else None
            club_db_id = club.id if club else None

            if existing and not is_first_import and existing.current_club_id and club_db_id \
                    and existing.current_club_id != club_db_id:
                old_gid = club_game_id_by_db_id.get(existing.current_club_id)
                new_gid = club.game_id
                if new_gid == FREE_AGENTS_TEAM_ID:
                    t_type = "release"
                elif old_gid == FREE_AGENTS_TEAM_ID:
                    t_type = "free"
                elif game_id in loans:
                    t_type = "loan"
                else:
                    t_type = "buy"
                pending_transfers.append((game_id, existing.current_club_id, club_db_id, t_type,
                                          agreed_fees.get((game_id, new_gid))))

            primary_pos = POSITION_CODE_MAP.get(p.get("wZQU"))
            secondary = [POSITION_CODE_MAP.get(p.get(col)) for col in ("NgVS", "OblE")]
            secondary = [s for s in secondary if s and s != primary_pos]
            nation_name, nation_code = nation_for(p.get("enmm"))  # nationality

            if game_id < GENERATED_PLAYER_ID_START:
                player_type = "real"
            elif existing and existing.player_type == "youth":
                player_type = "youth"  # academy graduates stay "youth" after leaving
            else:
                player_type = "youth" if user_club and club_db_id == user_club.id else "regen"

            foot = {1: "Right", 2: "Left"}.get(p.get("MDvm"))  # preferredfoot
            data = dict(
                known_name=name_str,
                position=primary_pos,
                secondary_positions=", ".join(dict.fromkeys(secondary)) or None,
                player_type=player_type,
                birth_year=ea_date_year(p.get("WVIU")),  # birthdate
                nationality=nation_name,
                nation_code=nation_code,
                overall=p.get("UERs"),
                potential=p.get("mpuH"),
                gender=p.get("EveZ") or 0,
                height_cm=p.get("ypBQ"),
                weight_kg=p.get("sNZW"),
                foot=foot,
                jersey_number=link.get("JFiY") if link else None,
                current_club_id=club_db_id,
                is_retired=False,
                **{attr: p.get(code) for attr, code in PLAYER_ATTRIBUTES.items()},
            )
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
            else:
                player = Player(career_id=career.id, game_id=game_id, first_name="", last_name="", **data)
                self.db.add(player)
                players[game_id] = player
        self.db.flush()

        # Transfers + timeline
        for game_id, from_id, to_id, t_type, fee in pending_transfers:
            player = players[game_id]
            from_club = self.db.get(Club, from_id)
            to_club = self.db.get(Club, to_id)
            self.db.add(Transfer(
                career_id=career.id, season_id=active_season.id, player_id=player.id,
                from_club_id=from_id, to_club_id=to_id, type=t_type, fee=float(fee or 0),
            ))
            name = player_display_name(player)
            desc = {
                "buy": f"{name} completes a move from {from_club.name} to {to_club.name}.",
                "loan": f"{name} joins {to_club.name} on loan from {from_club.name}.",
                "free": f"{name} signs for {to_club.name} as a free agent.",
                "release": f"{name} has been released by {from_club.name}.",
            }[t_type]
            self._add_event(
                f"transfer:{game_id}:{from_id}:{to_id}:{active_season.year}",
                season_id=active_season.id, event_type="transfer", description=desc,
                related_player_id=player.id, related_club_id=to_id, gender=player.gender or 0,
            )

        # Retirements: players that vanished from the save since the last import
        save_ids = {p.get("ykFq") for p in raw_players}
        for player in players.values():
            if player.game_id in save_ids or player.is_retired:
                continue
            player.is_retired = True
            player.current_club_id = None
            if not is_first_import:
                self._add_event(
                    f"retirement:{player.game_id}",
                    season_id=active_season.id, event_type="retirement",
                    description=f"{player_display_name(player)} has retired from professional football.",
                    related_player_id=player.id, gender=player.gender or 0,
                )
        self._players = players

    # ------------------------------------------------------------------ stats

    def _import_club_stats(self, raw_standings, clubs, comps, active_season):
        existing = {
            cs.club_id: cs for cs in
            self.db.query(ClubSeasonStats).filter(ClubSeasonStats.season_id == active_season.id)
        }
        seen = set()
        for s in raw_standings:
            club = clubs.get(s.get("mCXg"))
            comp = comps.get(s.get("aQrQ"))
            if not club or club.id in seen:
                continue  # first standings row per club wins (matches club.league)
            seen.add(club.id)
            stats = existing.get(club.id)
            if not stats:
                stats = ClubSeasonStats(club_id=club.id, season_id=active_season.id)
                self.db.add(stats)
                existing[club.id] = stats
            stats.competition_id = comp.id if comp else None
            stats.position = s.get("fNOl")  # currenttableposition
            stats.previous_position = s.get("MDeW")  # previousyeartableposition
            stats.matches_played = s.get("QbIe")  # nummatchesplayed
            stats.wins = (s.get("oxHc") or 0) + (s.get("txAm") or 0)  # home + away wins
            stats.draws = (s.get("HjBw") or 0) + (s.get("vmpt") or 0)
            stats.losses = (s.get("oQGq") or 0) + (s.get("QMes") or 0)
            stats.goals_for = (s.get("gazb") or 0) + (s.get("Unns") or 0)  # homegf + awaygf
            stats.goals_against = (s.get("WWGU") or 0) + (s.get("uruv") or 0)  # homega + awayga
            stats.points = s.get("Yyym") or 0

    def _import_player_stats(self, raw, clubs, active_season):
        players = getattr(self, "_players", {})
        if not players:
            return
        # Match ratings (career_playermatchratinghistory) are only kept for recent matches
        ratings = defaultdict(list)
        for r in raw.get("TtHG", []):
            if r.get("Xxmh") is not None and (r.get("Amxm") or 0) > 0:  # rating, minsplayed
                ratings[r.get("ykFq")].append(r["Xxmh"])

        existing = {
            ps.player_id: ps for ps in
            self.db.query(PlayerSeasonStats).filter(PlayerSeasonStats.season_id == active_season.id)
        }
        for game_id, link in self.player_links.items():
            player = players.get(game_id)
            if not player:
                continue
            club = clubs.get(link.get("mCXg"))
            stats = existing.get(player.id)
            if not stats:
                stats = PlayerSeasonStats(player_id=player.id, season_id=active_season.id)
                self.db.add(stats)
            stats.club_id = club.id if club else None
            stats.appearances = link.get("stFk") or 0  # leagueappearances
            stats.goals = link.get("UMDX") or 0  # leaguegoals
            stats.yellow_cards = link.get("jtWI") or 0
            stats.red_cards = link.get("jIcz") or 0
            # The save has no assist or clean-sheet counters.
            stats.assists = None
            stats.clean_sheets = None
            r = ratings.get(game_id)
            stats.avg_rating = round(sum(r) / len(r), 2) if r else None

    # ------------------------------------------------------------------ managers

    def _import_managers(self, raw, clubs, active_season, is_first_import):
        career = self.career
        managers = {m.game_id: m for m in self.db.query(Manager).filter(Manager.career_id == career.id)}
        clubs_by_id = {c.id: c for c in clubs.values()}
        national_team_ids = {r.get("mCXg") for r in raw.get("CxJp", []) if r.get("mCXg") is not None}
        # A manager can have several rows (club + national team); keep one, preferring the club.
        rows = {}
        for rm in raw.get("Knen", []):  # manager
            game_id = rm.get("VHIB")
            if game_id is None:
                continue
            current = rows.get(game_id)
            if current is None or (current.get("mCXg") in national_team_ids
                                   and rm.get("mCXg") not in national_team_ids):
                rows[game_id] = rm
        for game_id, rm in rows.items():
            first, last = (rm.get("HdeP") or "").strip(), (rm.get("rREd") or "").strip()
            name = (rm.get("xnfZ") or "").strip() or f"{first} {last}".strip() or f"Manager #{game_id}"
            new_club = clubs.get(rm.get("mCXg"))
            new_id = new_club.id if new_club else None

            mgr = managers.get(game_id)
            if not mgr:
                # The first import is the baseline: every existing manager is already in post.
                mgr = Manager(career_id=career.id, game_id=game_id, name=name, club_id=new_id,
                              start_season_id=active_season.id)
                self.db.add(mgr)
                managers[game_id] = mgr
                if is_first_import or not new_club:
                    continue
                old_club = None
            else:
                mgr.name = name
                if mgr.club_id == new_id:
                    continue
                old_club = clubs_by_id.get(mgr.club_id)
                mgr.club_id = new_id
                mgr.start_season_id = active_season.id

            if old_club and new_club:
                desc = f"{name} leaves {old_club.name} to take charge of {new_club.name}."
            elif new_club:
                desc = f"{name} has been appointed manager of {new_club.name}."
            else:
                desc = f"{name} has left {old_club.name}."
            self._add_event(
                f"manager:{game_id}:{new_club.game_id if new_club else 'none'}:{active_season.year}",
                season_id=active_season.id,
                event_type="manager_move" if old_club else "manager_appointment",
                description=desc,
                related_club_id=new_id or (old_club.id if old_club else None),
                gender=1 if is_women_club(new_club) or is_women_club(old_club) else 0,
            )

    # ------------------------------------------------------------------ awards

    def _import_awards(self, raw, clubs, season_for):
        """Awards are rebuilt from the save; their timeline events are keyed so they persist."""
        career = self.career
        players = getattr(self, "_players", {})
        self.db.query(Award).filter(Award.career_id == career.id).delete()

        # Merge duplicate rows and keep the save's per-row count (e.g. 3x Player of the Month)
        player_awards = defaultdict(int)
        for ra in raw.get("cPet", []):  # career_playerawards
            key = (ra.get("ykFq"), ra.get("Bwgx"), ra.get("vojK"), ra.get("mCXg"))
            if key[0] is not None and key[1] is not None:
                player_awards[key] += max(ra.get("ytjZ") or 1, 1)
        for (p_gid, type_id, season_num, team_gid), count in player_awards.items():
            player, season, club = players.get(p_gid), season_for(season_num), clubs.get(team_gid)
            if not player or not season:
                continue
            name = get_award_name(type_id)
            for _ in range(count):
                self.db.add(Award(career_id=career.id, season_id=season.id, player_id=player.id,
                                  club_id=club.id if club else None, name=name, type="player"))
            suffix = f" (x{count})" if count > 1 else ""
            self._add_event(
                f"award:player:{p_gid}:{type_id}:{season.year}:{team_gid}",
                season_id=season.id, event_type="award",
                description=f"{player_display_name(player)} wins {name}{suffix}!",
                related_player_id=player.id, related_club_id=club.id if club else None,
                gender=player.gender or 0,
            )

        manager_awards = defaultdict(int)
        for ra in raw.get("ShPa", []):  # career_managerawards
            key = (ra.get("mCXg"), ra.get("Bwgx"), ra.get("vojK"))
            if key[1] is not None:
                manager_awards[key] += max(ra.get("ytjZ") or 1, 1)
        for (team_gid, type_id, season_num), count in manager_awards.items():
            season, club = season_for(season_num), clubs.get(team_gid)
            if not season:
                continue
            name = get_award_name(type_id, is_manager=True)
            for _ in range(count):
                self.db.add(Award(career_id=career.id, season_id=season.id,
                                  club_id=club.id if club else None, name=name, type="manager"))
            suffix = f" (x{count})" if count > 1 else ""
            self._add_event(
                f"award:manager:{team_gid}:{type_id}:{season.year}",
                season_id=season.id, event_type="award",
                description=f"The {club.name if club else 'club'} manager wins {name}{suffix}!",
                related_club_id=club.id if club else None,
                gender=1 if is_women_club(club) else 0,
            )
