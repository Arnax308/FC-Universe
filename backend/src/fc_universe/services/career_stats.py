"""Season stats, reigning champions and the user's transfer ledger (mixed into ImportService).

EA keeps one season of leaderboards and league tables at a time and wipes them when the
competition restarts, so every sync files what it sees under the right season:

* If what we already hold for the current season is a strict prefix of it (no stat went down),
  it is the current season continuing.
* Otherwise, if it continues what we hold for the previous season, it is last season's numbers
  (the save is in pre-season and the competition hasn't restarted yet).
* With no history to compare, it is last season's if the user hasn't played this season yet or
  the numbers are bigger than the user's own games this season.
"""

import logging
from collections import defaultdict
from datetime import datetime

from fc_universe.models import (
    Club, ClubSeasonStats, Competition, CompetitionChampion, PlayerCompetitionStats, PlayerSeasonStats,
    Transfer,
)
from fc_universe.parser.managers import (
    STAT_ASSISTS, STAT_CLEAN_SHEETS, STAT_GOALS, STAT_RATING, STAT_REDS, STAT_YELLOWS,
)
from fc_universe.services.competitions import (
    ASSET_COMPETITIONS, COMPOBJ_STARTS, INTERNATIONAL, SYNTHETIC_BASE, latest_edition,
)

logger = logging.getLogger(__name__)

STAT_FIELDS = {
    STAT_GOALS: "goals", STAT_ASSISTS: "assists", STAT_CLEAN_SHEETS: "clean_sheets",
    STAT_YELLOWS: "yellow_cards", STAT_REDS: "red_cards",
}
COUNT_FIELDS = ("appearances", *STAT_FIELDS.values())
FREE_AGENTS_TEAM_ID = 111592


def game_date_from(raw: dict, fallback_year: int) -> int:
    """Today's in-game date (yyyymmdd): the newest persistent event, else the season start."""
    dates = [r.get("GHrs") for r in raw.get("gCOv", [])]  # persistent_events.eventdate
    dates = [d for d in dates if d and 20200101 <= d <= 21001231]
    return max(dates) if dates else fallback_year * 10000 + 701


def season_start_for_date(date: int) -> int:
    """Calendar year the season containing ``date`` started in (seasons roll over in July)."""
    year, month = date // 10000, date // 100 % 100
    return year if month >= 7 else year - 1


class CareerStatsMixin:
    # ------------------------------------------------------------------ attribution

    def _not_started(self, comp_obj: int) -> bool:
        """True when this season's edition of a cup can't have kicked off yet by the game date."""
        start = COMPOBJ_STARTS.get(comp_obj)
        if not start:
            return False
        month, day = start
        year = self.current_year if month >= 7 else self.current_year + 1
        return self.game_date < year * 10000 + month * 100 + day

    def _pick_season(self, has_cur: bool, continues_cur: bool, has_prev: bool, continues_prev: bool,
                     biggest: int, not_started: bool = False):
        """(season_year, merge) for a snapshot, or (None, False) to drop it."""
        cur = self.current_year
        if not_started:
            return cur - 1, True
        # Pre-season: the user hasn't kicked a ball, so a long run of games can only be last
        # season's (a few early qualifiers or an earlier-starting league can be new).
        if self.user_games_now == 0 and biggest > 8:
            return cur - 1, True
        if has_cur and continues_cur:
            return cur, True
        if has_prev:
            return (cur - 1, True) if continues_prev else (cur, False)
        # Before the user's first match of the season, whatever EA shows is last season's.
        if self.user_games_now == 0 or biggest > self.user_games_now + 2:
            return cur - 1, True
        return cur, False

    # ------------------------------------------------------------------ leaderboards

    def _board_competition(self, comp_obj: int, entries: list[tuple[int, int, int]]):
        """(Competition | None, name, type) for a leaderboard compobjid."""
        comp = self.compobj_to_comp.get(comp_obj)
        if comp:
            return comp, comp.name, comp.type
        # Unknown compobj: a league if its players' clubs are (nearly) all in one league whose
        # table has played as many games as the leaderboard shows.
        leagues = defaultdict(int)
        for pid, _, _ in entries:
            link = self.player_links.get(pid)
            league = self.team_league.get(link.get("mCXg")) if link else None
            if league:
                leagues[league.game_id] += 1
        if not leagues:
            return None, None, None
        league_id, hits = max(leagues.items(), key=lambda kv: kv[1])
        if hits < 0.7 * len(entries):
            return None, None, None
        biggest = max((a for _, a, _ in entries), default=0)
        played = self.league_played.get(league_id, 0)
        if abs(biggest - played) > 3:
            return None, None, None
        comp = self.comps.get(league_id)
        self.compobj_to_comp[comp_obj] = comp
        return comp, comp.name, comp.type

    def _ingest_leaderboards(self, boards: dict) -> set[int]:
        """Store EA's leaderboards as per-competition season stats. Returns touched season ids."""
        if not boards:
            return set()
        career = self.career
        cur_season = self.seasons.get(self.current_year)
        prev_season = self.seasons.get(self.current_year - 1)
        season_ids = [s.id for s in (cur_season, prev_season) if s]
        stored = defaultdict(dict)  # (season_id, comp_obj) -> {player_id: row}
        for row in self.db.query(PlayerCompetitionStats).filter(
            PlayerCompetitionStats.career_id == career.id, PlayerCompetitionStats.season_id.in_(season_ids)
        ):
            stored[(row.season_id, row.comp_obj_id)][row.player_id] = row
        prev_clubs = {}
        if prev_season:
            prev_clubs = dict(self.db.query(PlayerSeasonStats.player_id, PlayerSeasonStats.club_id).filter(
                PlayerSeasonStats.season_id == prev_season.id))

        touched = set()
        for comp_obj, cats in boards.items():
            entries = [e for lst in cats.values() for e in lst]
            comp, comp_name, comp_type = self._board_competition(comp_obj, entries)
            if not comp_name:
                continue

            # Fold the stat lists into one line per player
            lines = {}
            for stat_type, lst in cats.items():
                for pid, apps, value in lst:
                    player = self._players.get(pid)
                    if not player:
                        continue
                    line = lines.setdefault(player.id, {"appearances": 0})
                    line["appearances"] = max(line["appearances"], apps)
                    if stat_type == STAT_RATING:
                        line["avg_rating"] = round(value / 100, 2)
                    elif stat_type in STAT_FIELDS:
                        line[STAT_FIELDS[stat_type]] = value
            if not lines:
                continue

            def continues(rows: dict) -> bool:
                compared = False
                for player_id, line in lines.items():
                    row = rows.get(player_id)
                    if not row:
                        continue
                    for field in COUNT_FIELDS:
                        new, old = line.get(field), getattr(row, field)
                        if new is not None and old is not None:
                            compared = True
                            if new < old:
                                return False
                return compared

            cur_rows = stored.get((cur_season.id, comp_obj), {}) if cur_season else {}
            prev_rows = stored.get((prev_season.id, comp_obj), {}) if prev_season else {}
            biggest = max(line["appearances"] for line in lines.values())
            year, merge = self._pick_season(bool(cur_rows), continues(cur_rows), bool(prev_rows),
                                            continues(prev_rows), biggest, self._not_started(comp_obj))
            season = self.seasons.get(year) if year else None
            if season and year != self.current_year and cur_rows and self._not_started(comp_obj):
                for row in cur_rows.values():  # misfiled under this season by an earlier sync
                    self.db.delete(row)
                cur_rows.clear()
            if not season:
                continue  # numbers from before the career started
            rows = stored[(season.id, comp_obj)]
            if not merge:
                for row in rows.values():
                    self.db.delete(row)
                rows.clear()

            for player_id, line in lines.items():
                row = rows.get(player_id)
                if not row:
                    row = PlayerCompetitionStats(career_id=career.id, player_id=player_id,
                                                 season_id=season.id, comp_obj_id=comp_obj)
                    self.db.add(row)
                    rows[player_id] = row
                row.competition_id = comp.id if comp else None
                row.competition_name, row.competition_type = comp_name, comp_type
                if season is cur_season or player_id not in prev_clubs:
                    row.club_id = self.player_club_ids.get(player_id) or row.club_id
                else:
                    row.club_id = prev_clubs[player_id] or row.club_id
                for field in COUNT_FIELDS:
                    new, old = line.get(field), getattr(row, field)
                    if new is not None:
                        setattr(row, field, max(new, old or 0))
                if line.get("avg_rating") is not None:
                    row.avg_rating = line["avg_rating"]
            touched.add(season.id)
        self.db.flush()
        return touched

    def _recompute_season_totals(self) -> None:
        """PlayerSeasonStats totals are the sum of the player's competition lines."""
        career = self.career
        season_ids = [s.id for s in self.seasons.values()]
        self.db.query(PlayerSeasonStats).filter(PlayerSeasonStats.season_id.in_(season_ids)).update(
            {f: None for f in COUNT_FIELDS} | {"avg_rating": None}, synchronize_session=False)
        totals = defaultdict(lambda: {"club_id": None, "apps_for_club": -1, "rating_w": 0.0, "rating_n": 0,
                                      **{f: None for f in COUNT_FIELDS}})
        for row in self.db.query(PlayerCompetitionStats).filter(PlayerCompetitionStats.career_id == career.id):
            t = totals[(row.player_id, row.season_id)]
            for f in COUNT_FIELDS:
                v = getattr(row, f)
                if v is not None:
                    t[f] = (t[f] or 0) + v
            if row.avg_rating and row.appearances:
                t["rating_w"] += row.avg_rating * row.appearances
                t["rating_n"] += row.appearances
            if row.club_id and (row.appearances or 0) > t["apps_for_club"]:
                t["club_id"], t["apps_for_club"] = row.club_id, row.appearances or 0
        if not totals:
            return
        existing = {
            (r.player_id, r.season_id): r for r in self.db.query(PlayerSeasonStats).filter(
                PlayerSeasonStats.season_id.in_({s for _, s in totals}))
        }
        for key, t in totals.items():
            row = existing.get(key)
            if not row:
                row = PlayerSeasonStats(player_id=key[0], season_id=key[1], club_id=t["club_id"])
                self.db.add(row)
            for f in COUNT_FIELDS:
                setattr(row, f, t[f])
            row.avg_rating = round(t["rating_w"] / t["rating_n"], 2) if t["rating_n"] else None

    # ------------------------------------------------------------------ league tables

    def _attribute_standings(self, league_rows: dict[int, list[dict]]) -> dict[int, int]:
        """{league_id: season_year} for each league table in the save."""
        cur, prev = self.seasons.get(self.current_year), self.seasons.get(self.current_year - 1)
        stored = defaultdict(dict)  # (season_id, competition_id) -> {club_id: matches_played}
        ids = [s.id for s in (cur, prev) if s]
        for cs in self.db.query(ClubSeasonStats).filter(ClubSeasonStats.season_id.in_(ids)):
            stored[(cs.season_id, cs.competition_id)][cs.club_id] = cs.matches_played or 0
        out = {}
        for league_id, rows in league_rows.items():
            comp = self.comps.get(league_id)
            played = {}
            for s in rows:
                club = self.clubs.get(s.get("mCXg"))
                if club:  # W + D + L (nummatchesplayed goes stale between seasons)
                    played[club.id] = sum((s.get(k) or 0) for k in ("oxHc", "txAm", "HjBw", "vmpt", "oQGq", "QMes"))

            def continues(old: dict) -> bool:
                common = [c for c in played if c in old]
                return bool(common) and all(played[c] >= old[c] for c in common)

            cur_rows = stored.get((cur.id, comp.id), {}) if cur and comp else {}
            prev_rows = stored.get((prev.id, comp.id), {}) if prev and comp else {}
            year, _ = self._pick_season(bool(cur_rows), continues(cur_rows), bool(prev_rows),
                                        continues(prev_rows), max(played.values(), default=0))
            out[league_id] = year
        return out

    # ------------------------------------------------------------------ champions

    def _synthetic_comp(self, asset: int, name: str, c_type: str) -> Competition:
        game_id = SYNTHETIC_BASE + asset
        comp = self.comps.get(game_id)
        if not comp:
            comp = Competition(career_id=self.career.id, game_id=game_id, name=name, type=c_type)
            self.db.add(comp)
            self.db.flush()
            self.comps[game_id] = comp
        comp.name, comp.type = name, c_type
        return comp

    def _import_champions(self, raw: dict) -> None:
        """Reigning champions (competition.competitionchampionid) -> trophies.

        Club competitions finish in May, so the champion seen on a date belongs to the season
        that ended before it. International tournaments run on fixed cycles; the edition is
        the latest one whose final has been played.
        """
        career = self.career
        snapshots = {s.competition_game_id: s for s in self.db.query(CompetitionChampion).filter(
            CompetitionChampion.career_id == career.id)}
        league_ids = {c.game_id for c in self.comps.values() if c.type == "league"}
        asset_comp = {asset: self.comps.get(cobj) for cobj, asset in self.compobj_assets.items()}
        date = self.game_date
        year, month = date // 10000, date // 100 % 100
        club_season = self.seasons.get(year - 1 if month >= 6 else year - 2)

        for row in raw.get("FMpz", []):
            asset, champ_gid = row.get("LhXN"), row.get("BcJx")  # competitionid, competitionchampionid
            if asset is None or champ_gid is None or champ_gid < 0:
                continue
            club = self.clubs.get(champ_gid)
            snap = snapshots.get(asset)
            changed = snap is None or snap.champion_team_game_id != champ_gid
            if not snap:
                snap = CompetitionChampion(career_id=career.id, competition_game_id=asset)
                self.db.add(snap)
                snapshots[asset] = snap
            previous_champion, previous_date = snap.champion_team_game_id, snap.observed_date
            snap.champion_team_game_id, snap.observed_date = champ_gid, date
            if not club:
                continue

            if asset in INTERNATIONAL:
                name, *_rest = INTERNATIONAL[asset]
                stale_default = INTERNATIONAL[asset][5]
                edition = latest_edition(asset, date)
                season = self.seasons.get(edition - 1) if edition else None
                if not season:
                    continue
                final = edition * 10000 + INTERNATIONAL[asset][3][0] * 100 + INTERNATIONAL[asset][3][1]
                # A champion seen before this edition's final is the previous holder; EA's fresh
                # save also carries stale holders, which only count once they change hands.
                proven = changed and previous_date is not None and previous_date < final \
                    and previous_champion != champ_gid
                if champ_gid == stale_default and not proven:
                    continue
                comp = self._synthetic_comp(asset, name, "international")
                self.trophy(comp, club, season, is_user_club=False, major=True)
                continue

            if not club_season:
                continue
            if asset in league_ids:
                comp = self.comps.get(asset)
                if "rest of world" in (comp.name or "").lower():
                    continue  # EA's holding pen for unattached clubs, not a real league
            elif asset in ASSET_COMPETITIONS:
                comp = asset_comp.get(asset) or self._synthetic_comp(asset, *ASSET_COMPETITIONS[asset])
            else:
                continue
            self.trophy(comp, club, club_season, is_user_club=champ_gid in self.managed_team_game_ids)

    # ------------------------------------------------------------------ transfers

    def _user_club_for_year(self, year: int) -> Club | None:
        number = year - self.base_year + 1
        best = None
        for h in self.history_rows:
            if h.get("vojK") == number and (best is None or (h.get("NJUU") or 0) > (best.get("NJUU") or 0)):
                best = h
        if best and best.get("mCXg") in self.clubs:
            return self.clubs[best["mCXg"]]
        return self.clubs.get(self.career.team_id)

    def _import_transfer_ledger(self, ledger: list[dict]) -> None:
        """The user club's own signings and sales, with real fees and dates."""
        from fc_universe.services.import_service import player_display_name

        career = self.career
        existing = {
            (t.player_id, t.season_id): t for t in self.db.query(Transfer).filter(Transfer.career_id == career.id)
        }
        for r in ledger:
            player = self._players.get(r["player_id"])
            other = self.clubs.get(r["team_id"])
            if not player or not other:
                continue
            if r["fee"] < 100_000 and other.game_id != FREE_AGENTS_TEAM_ID:
                continue
            year = season_start_for_date(r["date"])
            season = self.seasons.get(year)
            user = self._user_club_for_year(year)
            if not season or not user or user.id == other.id:
                continue
            src, dst = (other, user) if r["direction"] == "in" else (user, other)
            t_type = "free" if src.game_id == FREE_AGENTS_TEAM_ID or not r["fee"] else "buy"
            t = existing.get((player.id, season.id))
            if t and {t.from_club_id, t.to_club_id} == {src.id, dst.id}:
                if not t.fee and r["fee"]:
                    t.fee = float(r["fee"])
                continue
            t = Transfer(career_id=career.id, season_id=season.id, player_id=player.id,
                         from_club_id=src.id, to_club_id=dst.id, fee=float(r["fee"]), type=t_type,
                         created_at=datetime(r["date"] // 10000, r["date"] // 100 % 100, r["date"] % 100))
            self.db.add(t)
            existing[(player.id, season.id)] = t
            name = player_display_name(player)
            fee = f" for €{r['fee'] / 1e6:.1f}M" if r["fee"] else ""
            desc = (f"{name} completes a move from {src.name} to {dst.name}{fee}." if t_type == "buy"
                    else f"{name} signs for {dst.name} as a free agent.")
            self._add_event(
                f"transfer:{player.game_id}:{src.id}:{dst.id}:{year}",
                season_id=season.id, event_type="transfer", description=desc,
                related_player_id=player.id, related_club_id=dst.id, gender=player.gender or 0,
            )
