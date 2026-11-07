"""Season-by-season stats: leaderboards, awards and club seasons."""

from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from fc_universe.api.common import club_brief, resolve_trophy_icon, season_label, trophy_dict, trophy_rows
from fc_universe.database import get_db
from fc_universe.models import (
    Club, ClubSeasonStats, Competition, Player, PlayerCompetitionStats, PlayerSeasonStats, Season,
)
from fc_universe.services.awards import compute_awards

router = APIRouter(tags=["stats"])

STATS = ("appearances", "goals", "assists", "clean_sheets", "yellow_cards", "red_cards", "avg_rating")
COMP_ORDER = {"league": 0, "continental": 1, "cup": 2}


def player_brief(p: Player | None) -> dict | None:
    if not p:
        return None
    return {
        "id": p.id, "game_id": p.game_id, "position": p.position, "overall": p.overall,
        "name": p.known_name or f"{p.first_name or ''} {p.last_name or ''}".strip() or f"Player #{p.game_id}",
        "nation_code": p.nation_code, "nationality": p.nationality, "gender": p.gender,
    }


def stat_line(row) -> dict:
    return {k: getattr(row, k) for k in STATS}


def _seasons(db: Session, career_id: int) -> dict[int, int]:
    return {s.id: s.year for s in db.query(Season).filter(Season.career_id == career_id)}


def stat_years(db: Session, career_id: int) -> list[int]:
    seasons = _seasons(db, career_id)
    ids = {sid for (sid,) in db.query(PlayerCompetitionStats.season_id).filter(
        PlayerCompetitionStats.career_id == career_id).distinct()}
    return sorted((seasons[i] for i in ids if i in seasons), reverse=True)


@router.get("/careers/{career_id}/stats/leaders")
def leaders(career_id: int, season: int | None = None, competition: int | None = None, limit: int = 20,
            gender: int | None = None, db: Session = Depends(get_db)):
    """Leaderboards for a season. ``competition`` is an EA compobjid from ``competitions``;
    without it the numbers are every tracked competition added together."""
    years = stat_years(db, career_id)
    if not years:
        return {"seasons": [], "season": None, "competitions": [], "leaders": {}}
    season = season if season in years else years[0]
    season_row = db.query(Season).filter(Season.career_id == career_id, Season.year == season).first()

    rows = db.query(PlayerCompetitionStats).filter(
        PlayerCompetitionStats.career_id == career_id, PlayerCompetitionStats.season_id == season_row.id).all()
    comps = {}
    for r in rows:
        comps.setdefault(r.comp_obj_id, {"id": r.comp_obj_id, "name": r.competition_name,
                                         "type": r.competition_type, "competition_id": r.competition_id})
    competitions = sorted(comps.values(), key=lambda c: (COMP_ORDER.get(c["type"], 3), c["name"] or ""))

    if competition is not None:
        lines = [(r.player_id, r.club_id, stat_line(r)) for r in rows if r.comp_obj_id == competition]
    else:
        totals = defaultdict(lambda: {"club_id": None, "apps": -1, **{k: None for k in STATS}, "_rw": 0.0, "_rn": 0})
        for r in rows:
            t = totals[r.player_id]
            for k in STATS[:-1]:
                v = getattr(r, k)
                if v is not None:
                    t[k] = (t[k] or 0) + v
            if r.avg_rating and r.appearances:
                t["_rw"] += r.avg_rating * r.appearances
                t["_rn"] += r.appearances
            if (r.appearances or 0) > t["apps"]:
                t["apps"], t["club_id"] = r.appearances or 0, r.club_id
        lines = []
        for pid, t in totals.items():
            t["avg_rating"] = round(t["_rw"] / t["_rn"], 2) if t["_rn"] else None
            lines.append((pid, t["club_id"], {k: t[k] for k in STATS}))

    players = {p.id: p for p in db.query(Player).filter(Player.id.in_({pid for pid, _, _ in lines}))}
    clubs = {c.id: c for c in db.query(Club).filter(Club.id.in_({cid for _, cid, _ in lines if cid}))}
    if gender is not None:
        lines = [ln for ln in lines if (players.get(ln[0]) and (players[ln[0]].gender or 0) == gender)]

    def board(stat):
        ranked = sorted((ln for ln in lines if ln[2].get(stat)), key=lambda ln: (-ln[2][stat], ln[2].get("appearances") or 0))
        return [{"player": player_brief(players.get(pid)), "club": club_brief(clubs.get(cid)), **line}
                for pid, cid, line in ranked[:limit]]

    return {
        "seasons": years,
        "season": season,
        "season_label": season_label(season),
        "competitions": competitions,
        "competition": competition,
        "leaders": {stat: board(stat) for stat in ("goals", "assists", "clean_sheets", "avg_rating", "appearances")},
    }


def _resolve_awards(db: Session, career_id: int, awards: dict[int, list[dict]]):
    ids_p = {e["player_id"] for lst in awards.values() for a in lst for e in [a, *a["podium"]]}
    ids_c = {e["club_id"] for lst in awards.values() for a in lst for e in [a, *a["podium"]] if e.get("club_id")}
    players = {p.id: p for p in db.query(Player).filter(Player.id.in_(ids_p))} if ids_p else {}
    clubs = {c.id: c for c in db.query(Club).filter(Club.id.in_(ids_c))} if ids_c else {}

    def entry(e):
        return {"player": player_brief(players.get(e["player_id"])), "club": club_brief(clubs.get(e.get("club_id"))),
                "value": e["value"]}

    out = []
    for year in sorted(awards, reverse=True):
        out.append({
            "season_year": year,
            "season_label": season_label(year),
            "awards": [
                {"key": a["key"], "name": a["name"], "scope": a["scope"], "competition": a["competition"],
                 "icon": resolve_trophy_icon(a["name"]), **entry(a), "podium": [entry(e) for e in a["podium"]]}
                for a in awards[year]
            ],
        })
    return out


@router.get("/careers/{career_id}/awards")
def season_awards(career_id: int, db: Session = Depends(get_db)):
    """Ballon d'Or, Golden Boots, Golden Gloves and Players of the Season for finished seasons."""
    return _resolve_awards(db, career_id, compute_awards(db, career_id))


def player_awards(db: Session, career_id: int, player_id: int) -> list[dict]:
    out = []
    for season in _resolve_awards(db, career_id, compute_awards(db, career_id)):
        for a in season["awards"]:
            if a["player"] and a["player"]["id"] == player_id:
                out.append({"season_year": season["season_year"], "name": a["name"], "competition": a["competition"],
                            "icon": a["icon"], "value": a["value"], "kind": "Award"})
    return out


@router.get("/careers/{career_id}/clubs/{club_id}/seasons")
def club_seasons(career_id: int, club_id: int, db: Session = Depends(get_db)):
    """A club's season-by-season record: league finish, squad numbers, leaders and silverware."""
    club = db.query(Club).filter(Club.career_id == career_id, Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    seasons = _seasons(db, career_id)

    tables = {}
    for cs, comp in (
        db.query(ClubSeasonStats, Competition)
        .outerjoin(Competition, Competition.id == ClubSeasonStats.competition_id)
        .filter(ClubSeasonStats.club_id == club.id)
    ):
        if cs.season_id in seasons:
            tables[seasons[cs.season_id]] = {
                "competition": comp.name if comp else None, "competition_id": comp.id if comp else None,
                "position": cs.position, "played": cs.matches_played, "wins": cs.wins, "draws": cs.draws,
                "losses": cs.losses, "goals_for": cs.goals_for, "goals_against": cs.goals_against,
                "points": cs.points,
            }

    comp_rows = db.query(PlayerCompetitionStats).filter(
        PlayerCompetitionStats.career_id == career_id, PlayerCompetitionStats.club_id == club.id).all()
    players = {p.id: p for p in db.query(Player).filter(Player.id.in_({r.player_id for r in comp_rows}))}
    squads = defaultdict(lambda: defaultdict(lambda: {k: None for k in STATS} | {"competitions": []}))
    for r in comp_rows:
        y = seasons.get(r.season_id)
        line = squads[y][r.player_id]
        for k in STATS[:-1]:
            v = getattr(r, k)
            if v is not None:
                line[k] = (line[k] or 0) + v
        if r.avg_rating and (line["avg_rating"] is None or r.competition_type == "league"):
            line["avg_rating"] = r.avg_rating
        line["competitions"].append({"name": r.competition_name, "type": r.competition_type, **stat_line(r)})

    trophies = defaultdict(list)
    for row in trophy_rows(db, career_id, [club.id]):
        t = trophy_dict(*row)
        trophies[t["year"]].append(t)

    out = []
    for year in sorted(set(tables) | set(squads) | set(trophies), reverse=True):
        squad = sorted(
            ({"player": player_brief(players.get(pid)), **line} for pid, line in squads.get(year, {}).items()),
            key=lambda e: (-(e["goals"] or 0), -(e["assists"] or 0), -(e["appearances"] or 0)),
        )

        def top(stat):
            best = max((e for e in squad if e.get(stat)), key=lambda e: e[stat], default=None)
            return {"player": best["player"], "value": best[stat]} if best else None

        out.append({
            "season_year": year, "season_label": season_label(year), "league": tables.get(year),
            "top_scorer": top("goals"), "top_assister": top("assists"), "top_keeper": top("clean_sheets"),
            "squad": squad, "trophies": trophies.get(year, []),
        })
    return {"club": club_brief(club), "seasons": out}


@router.get("/careers/{career_id}/tables")
def league_tables(career_id: int, season: int | None = None, competition_id: int | None = None,
                  db: Session = Depends(get_db)):
    """Every league table on file. Without ``competition_id`` the user's league (or the first
    one) is shown; tables captured only after EA's summer reset carry final positions alone."""
    seasons = _seasons(db, career_id)
    have = defaultdict(set)  # year -> competition ids with a table
    for sid, cid in db.query(ClubSeasonStats.season_id, ClubSeasonStats.competition_id).filter(
            ClubSeasonStats.season_id.in_(seasons), ClubSeasonStats.competition_id.isnot(None)).distinct():
        have[seasons[sid]].add(cid)
    years = sorted(have, reverse=True)
    if not years:
        return {"seasons": [], "season": None, "competitions": [], "rows": [], "final_positions_only": False}
    if season not in have:
        from fc_universe.api.common import user_club
        from fc_universe.models import Career
        mine = user_club(db, db.get(Career, career_id))
        own_years = {seasons[sid] for (sid,) in db.query(ClubSeasonStats.season_id).filter(
            ClubSeasonStats.club_id == (mine.id if mine else -1), ClubSeasonStats.season_id.in_(seasons))}
        season = max(own_years & set(years), default=years[0])
    comps = {c.id: c for c in db.query(Competition).filter(Competition.id.in_(have[season]))
             if not any(k in (c.name or "").lower() for k in ("rest of world", "free agents"))}
    competitions = sorted(
        ({"id": c.id, "name": c.name, "game_id": c.game_id} for c in comps.values()),
        key=lambda c: (c["game_id"] not in {13, 53, 19, 31, 16}, c["name"]),
    )
    if competition_id not in comps:
        from fc_universe.api.common import user_club
        from fc_universe.models import Career
        mine = user_club(db, db.get(Career, career_id))
        own = db.query(ClubSeasonStats.competition_id).join(Season, Season.id == ClubSeasonStats.season_id).filter(
            ClubSeasonStats.club_id == (mine.id if mine else -1), Season.year == season).scalar()
        competition_id = own if own in comps else competitions[0]["id"]
    season_id = next(sid for sid, y in seasons.items() if y == season)
    rows = (
        db.query(ClubSeasonStats, Club)
        .join(Club, Club.id == ClubSeasonStats.club_id)
        .filter(ClubSeasonStats.season_id == season_id, ClubSeasonStats.competition_id == competition_id)
        .order_by(ClubSeasonStats.position.asc())
        .all()
    )
    return {
        "seasons": years,
        "season": season,
        "season_label": season_label(season),
        "competitions": competitions,
        "competition_id": competition_id,
        "final_positions_only": not any((s.matches_played or 0) for s, _ in rows),
        "rows": [
            {"position": s.position, "club": club_brief(c), "played": s.matches_played, "wins": s.wins,
             "draws": s.draws, "losses": s.losses, "goals_for": s.goals_for, "goals_against": s.goals_against,
             "points": s.points}
            for s, c in rows
        ],
    }
