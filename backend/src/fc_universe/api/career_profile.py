"""Career Profile API - Legacy Hub endpoint for the manager's career overview."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from fc_universe.api.common import BASE_SEASON_YEAR, club_brief, season_label, trophy_dict, trophy_rows
from fc_universe.database import get_db
from fc_universe.models import Award, Career, Club, Competition, ManagerSeasonHistory, Season

router = APIRouter(tags=["career_profile"])


@router.get("/careers/{career_id}/profile")
def get_career_profile(career_id: int, db: Session = Depends(get_db)):
    """Manager overview: trophies, club journey with tenures, season-by-season record."""
    career = db.get(Career, career_id)
    if not career:
        raise HTTPException(status_code=404, detail="Career not found")

    years = [y for (y,) in db.query(Season.year).filter(Season.career_id == career_id)]
    start_year = min(years) if years else BASE_SEASON_YEAR
    end_year = max(years) if years else BASE_SEASON_YEAR

    history = (
        db.query(ManagerSeasonHistory)
        .filter(ManagerSeasonHistory.career_id == career_id)
        .order_by(ManagerSeasonHistory.season_number, ManagerSeasonHistory.id)
        .all()
    )
    clubs = {
        c.game_id: c for c in db.query(Club).filter(
            Club.career_id == career_id, Club.game_id.in_({h.club_game_id for h in history} | {career.team_id})
        )
    }
    leagues = {c.game_id: c for c in db.query(Competition).filter(
        Competition.career_id == career_id, Competition.type == "league")}

    # Consecutive seasons at the same club form one tenure.
    tenures = []
    for h in history:
        year = BASE_SEASON_YEAR + (h.season_number or 1) - 1
        if not tenures or tenures[-1]["club_game_id"] != h.club_game_id:
            club = clubs.get(h.club_game_id)
            tenures.append({
                "club_name": club.name if club else f"Club #{h.club_game_id}",
                "club_game_id": h.club_game_id,
                "club": club_brief(club),
                "league": club.league if club else None,
                "start_year": year,
                "end_year": year,
                "is_current": False,
                "seasons": [],
                "trophies": [],
                "total_matches": 0, "total_wins": 0, "total_draws": 0, "total_losses": 0,
                "total_gf": 0, "total_ga": 0,
            })
        t = tenures[-1]
        t["end_year"] = year
        t["seasons"].append({
            "season_number": h.season_number,
            "year": year,
            "season_label": season_label(year),
            "matches": h.matches or 0,
            "wins": h.wins or 0,
            "draws": h.draws or 0,
            "losses": h.losses or 0,
            "goals_for": h.goals_for or 0,
            "goals_against": h.goals_against or 0,
            "points": h.points or 0,
            "table_position": h.table_position or None,
            "league_trophies": h.league_trophies or 0,
            "cup_trophies": h.cup_trophies or 0,
            "euro_trophies": h.euro_trophies or 0,
            "big_buy_player": h.big_buy_player,
            "big_buy_amount": h.big_buy_amount,
            "big_sell_player": h.big_sell_player,
            "big_sell_amount": h.big_sell_amount,
        })
        t["total_matches"] += h.matches or 0
        t["total_wins"] += h.wins or 0
        t["total_draws"] += h.draws or 0
        t["total_losses"] += h.losses or 0
        t["total_gf"] += h.goals_for or 0
        t["total_ga"] += h.goals_against or 0

    # Drop empty stints (e.g. a club you left before playing), but always keep the current club.
    club_journey = [
        t for i, t in enumerate(tenures)
        if t["total_matches"] > 0 or t["club_game_id"] == career.team_id or i == len(tenures) - 1
    ]
    if club_journey:
        club_journey[-1]["is_current"] = True

    # Trophies only count for the seasons the manager was in charge.
    tenure_seasons = {
        (t["club_game_id"], s["year"]) for t in club_journey for s in t["seasons"]
    }
    club_db_ids = [c.id for gid, c in clubs.items() if any(gid == g for g, _ in tenure_seasons)]
    trophies = [
        trophy_dict(e, year, comp, club)
        for e, year, comp, club in trophy_rows(db, career_id, club_db_ids)
        if club and (club.game_id, year) in tenure_seasons
    ]
    for t in club_journey:
        t["trophies"] = [tr for tr in trophies if tr["club"]["game_id"] == t["club_game_id"]]

    trophy_counts = {"champions_league": 0, "league_title": 0, "domestic_cup": 0, "europa_league": 0, "other": 0}
    for tr in trophies:
        trophy_counts[tr["category"]] = trophy_counts.get(tr["category"], 0) + 1
    trophy_counts["total"] = len(trophies)

    managerial_stats = []
    for t in club_journey:
        m, w = t["total_matches"], t["total_wins"]
        if t["is_current"]:
            label = f"{t['start_year']}-Present"
        elif t["start_year"] == t["end_year"]:
            label = season_label(t["start_year"])
        else:
            label = f"{t['start_year']}-{str(t['end_year'] + 1)[2:]}"
        managerial_stats.append({
            "club_name": t["club_name"],
            "club_game_id": t["club_game_id"],
            "club": t["club"],
            "tenure": label,
            "seasons_count": len(t["seasons"]),
            "matches": m,
            "wins": w,
            "draws": t["total_draws"],
            "losses": t["total_losses"],
            "goals_for": t["total_gf"],
            "goals_against": t["total_ga"],
            "win_pct": round(w / m * 100, 1) if m else 0.0,
            "trophies_count": len(t["trophies"]),
        })

    career_matches = sum(s["matches"] for s in managerial_stats)
    career_wins = sum(s["wins"] for s in managerial_stats)
    manager_awards = db.query(Award).filter(Award.career_id == career_id, Award.type == "manager",
                                            Award.club_id.in_(club_db_ids)).count() if club_db_ids else 0

    return {
        "success": True,
        "data": {
            "manager_name": career.manager_name or "Unknown Manager",
            "team_name": career.team_name,
            "team_id": career.team_id,
            "team": club_brief(clubs.get(career.team_id)),
            "career_start": start_year,
            "career_end": end_year,
            "current_season": season_label(end_year),
            "total_seasons": len(years),
            "total_trophies": trophy_counts["total"],
            "trophy_counts": trophy_counts,
            "trophies": trophies,
            "career_matches": career_matches,
            "career_wins": career_wins,
            "career_win_pct": round(career_wins / career_matches * 100, 1) if career_matches else 0.0,
            "awards_count": manager_awards,
            "club_journey": club_journey,
            "managerial_stats": managerial_stats,
        }
    }
