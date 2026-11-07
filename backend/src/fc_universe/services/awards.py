"""Season awards computed from the stats FC Universe has tracked.

The save's own award tables (career_playerawards) are empty in FC 26, so the Ballon d'Or,
Golden Boots and Players of the Season are decided here from each completed season's numbers:

* Golden Boot / Playmaker / Golden Glove - most league goals / assists / clean sheets.
* Player of the Season (league) - best league average rating on EA's own rating table, which
  already applies a minimum-appearances cut.
* Club Player of the Season - best all-competition score at each club the user managed.
* Ballon d'Or (and Ballon d'Or Féminin) - all-competition output plus rating plus team honours.
"""

from collections import defaultdict

from sqlalchemy.orm import Session

from fc_universe.models import (
    Club, ManagerSeasonHistory, Player, PlayerCompetitionStats, PlayerSeasonStats, Season, TimelineEvent,
)
from fc_universe.services.competitions import honour_weight

COMP_WEIGHT = {"league": 1.0, "continental": 1.3, "cup": 0.6}


def _num(v):
    return v or 0


def player_score(rows: list[PlayerCompetitionStats], is_gk: bool) -> float:
    """All-competition output: goals and assists (weighted by competition), keeper clean sheets
    and the best league rating."""
    score, best_rating = 0.0, None
    for r in rows:
        w = COMP_WEIGHT.get(r.competition_type or "cup", 0.6)
        score += (_num(r.goals) * 4 + _num(r.assists) * 3) * w
        if is_gk:
            score += _num(r.clean_sheets) * 3 * w
        if r.avg_rating and r.competition_type == "league":
            best_rating = max(best_rating or 0, r.avg_rating)
    if best_rating:
        score += max(0.0, best_rating - 6.8) * 15
    return score


def completed_season_years(db: Session, career_id: int) -> list[int]:
    current = db.query(Season).filter(Season.career_id == career_id, Season.is_current.is_(True)).first()
    years = [y for (y,) in db.query(Season.year).filter(Season.career_id == career_id)]
    return sorted(y for y in years if current is None or y < current.year)


def compute_awards(db: Session, career_id: int, years: list[int] | None = None) -> dict[int, list[dict]]:
    """{season_year: [award, ...]} for completed seasons. An award is
    {key, name, scope, competition, player_id, club_id, value, podium: [...]}."""
    years = completed_season_years(db, career_id) if years is None else years
    if not years:
        return {}
    seasons = {s.id: s.year for s in db.query(Season).filter(Season.career_id == career_id, Season.year.in_(years))}
    rows = (
        db.query(PlayerCompetitionStats)
        .filter(PlayerCompetitionStats.career_id == career_id, PlayerCompetitionStats.season_id.in_(seasons))
        .all()
    )
    if not rows:
        return {}
    player_ids = {r.player_id for r in rows}
    players = {p.id: p for p in db.query(Player).filter(Player.id.in_(player_ids))}

    # Squad membership per season, so team honours count toward individual awards
    tenure = defaultdict(set)  # (player_id, year) -> {club ids incl. national team}
    for pss in db.query(PlayerSeasonStats).filter(
        PlayerSeasonStats.player_id.in_(player_ids), PlayerSeasonStats.season_id.in_(seasons)
    ):
        y = seasons[pss.season_id]
        for cid in (pss.club_id, pss.national_team_id):
            if cid:
                tenure[(pss.player_id, y)].add(cid)
    for r in rows:
        if r.club_id:
            tenure[(r.player_id, seasons[r.season_id])].add(r.club_id)

    honours = defaultdict(list)  # (club_id, year) -> [(name, weight)]
    for e, comp_name, comp_type in _trophy_events(db, career_id, seasons):
        honours[(e.related_club_id, seasons[e.season_id])].append(honour_weight(comp_name, comp_type))

    managed = defaultdict(set)  # year -> managed club ids
    for h in db.query(ManagerSeasonHistory).filter(ManagerSeasonHistory.career_id == career_id):
        if h.club_id and h.season_id in seasons and (h.matches or 0) > 0:
            managed[seasons[h.season_id]].add(h.club_id)

    by_season = defaultdict(list)
    for r in rows:
        by_season[seasons[r.season_id]].append(r)

    out = {}
    for year, season_rows in by_season.items():
        awards = []
        by_comp = defaultdict(list)
        by_player = defaultdict(list)
        for r in season_rows:
            by_comp[(r.comp_obj_id, r.competition_name, r.competition_type)].append(r)
            by_player[r.player_id].append(r)

        def entry(r, value):
            return {"player_id": r.player_id, "club_id": r.club_id, "value": value}

        # League awards
        for (comp_obj, comp_name, comp_type), comp_rows in by_comp.items():
            if comp_type != "league" or not comp_name:
                continue
            for key, label, field, minimum in (
                ("golden_boot", "Golden Boot", "goals", 1),
                ("playmaker", "Playmaker of the Season", "assists", 1),
                ("golden_glove", "Golden Glove", "clean_sheets", 1),
            ):
                ranked = sorted(
                    (r for r in comp_rows if _num(getattr(r, field)) >= minimum),
                    key=lambda r: (-_num(getattr(r, field)), _num(r.appearances)),
                )
                if ranked:
                    awards.append({
                        "key": f"{key}:{comp_obj}", "name": label, "scope": "league", "competition": comp_name,
                        **entry(ranked[0], getattr(ranked[0], field)),
                        "podium": [entry(r, getattr(r, field)) for r in ranked[:3]],
                    })
            rated = sorted((r for r in comp_rows if r.avg_rating), key=lambda r: (-r.avg_rating, -_num(r.appearances)))
            if rated:
                awards.append({
                    "key": f"player_of_season:{comp_obj}", "name": "Player of the Season", "scope": "league",
                    "competition": comp_name, **entry(rated[0], rated[0].avg_rating),
                    "podium": [entry(r, r.avg_rating) for r in rated[:3]],
                })

        # Ballon d'Or: output + rating + team honours, men and women separately
        scored = defaultdict(list)
        for pid, prow in by_player.items():
            p = players.get(pid)
            if not p:
                continue
            s = player_score(prow, p.position == "GK")
            s += sum(sum(honours.get((cid, year), [])) for cid in tenure.get((pid, year), ()))
            main = max(prow, key=lambda r: _num(r.appearances))
            scored[p.gender or 0].append({"player_id": pid, "club_id": main.club_id, "value": round(s, 1)})
        for gender, label in ((0, "Ballon d'Or"), (1, "Ballon d'Or Féminin")):
            ranked = sorted(scored.get(gender, []), key=lambda e: -e["value"])
            if ranked and ranked[0]["value"] > 0:
                awards.append({
                    "key": f"ballon_dor:{gender}", "name": label, "scope": "world", "competition": None,
                    **ranked[0], "podium": ranked[:3],
                })

        # Club Player of the Season for the user's clubs
        for club_id in managed.get(year, ()):
            ranked = sorted(
                ({"player_id": pid, "club_id": club_id,
                  "value": round(player_score([r for r in prow if r.club_id == club_id],
                                              players[pid].position == "GK"), 1)}
                 for pid, prow in by_player.items()
                 if pid in players and any(r.club_id == club_id for r in prow)),
                key=lambda e: -e["value"],
            )
            if ranked and ranked[0]["value"] > 0:
                awards.append({
                    "key": f"club_player_of_season:{club_id}", "name": "Club Player of the Season",
                    "scope": "club", "competition": None, **ranked[0], "podium": ranked[:3],
                })
        out[year] = awards
    return out


def _trophy_events(db: Session, career_id: int, seasons: dict[int, int]):
    from fc_universe.models import Competition
    return (
        db.query(TimelineEvent, Competition.name, Competition.type)
        .outerjoin(Competition, Competition.id == TimelineEvent.related_competition_id)
        .filter(
            TimelineEvent.career_id == career_id,
            TimelineEvent.event_type.in_(("trophy", "honour")),
            TimelineEvent.season_id.in_(seasons),
            TimelineEvent.related_club_id.isnot(None),
        )
        .all()
    )


def club_names(db: Session, ids) -> dict[int, Club]:
    ids = {i for i in ids if i}
    return {c.id: c for c in db.query(Club).filter(Club.id.in_(ids))} if ids else {}
