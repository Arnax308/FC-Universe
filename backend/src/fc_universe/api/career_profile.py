"""Career Profile API - Legacy Hub endpoint for the manager's career overview."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from fc_universe.database import get_db
from fc_universe.models import (
    Career, Season, Club, Manager, TimelineEvent, ManagerSeasonHistory, Award
)

router = APIRouter(tags=["career_profile"])


def _resolve_trophy_icon(desc: str) -> str:
    """Pick the best available trophy PNG based on description keywords."""
    dl = desc.lower()
    if "champions league" in dl or "ucl" in dl:
        return "/api/images/trophy/ucl"
    if "europa league" in dl:
        return "/api/images/trophy/uel"
    if "conference" in dl:
        return "/api/images/trophy/uecl"
    if "premier league" in dl:
        return "/api/images/trophy/pl"
    if "bundesliga" in dl:
        return "/api/images/trophy/bundesliga"
    if "serie a" in dl or "scudetto" in dl:
        return "/api/images/trophy/seria_a"
    if "la liga" in dl or "laliga" in dl or "primera divis" in dl:
        return "/api/images/trophy/la_liga"
    if "copa del rey" in dl:
        return "/api/images/trophy/copa_del_rey"
    if "coppa italia" in dl:
        return "/api/images/trophy/coppa_italia"
    if "dfb" in dl or "pokal" in dl:
        return "/api/images/trophy/dfb_pokal"
    if "efl" in dl or "carabao" in dl or "league cup" in dl:
        return "/api/images/trophy/carabao"
    if "ligue 1" in dl:
        return "/api/images/trophy/ligue_1"
    if "coupe de france" in dl:
        return "/api/images/trophy/coupe_de_france"
    if "fa cup" in dl or "community shield" in dl:
        return "/api/images/trophy/fa"
    if "wsl" in dl or "nwsl" in dl or "liga f" in dl or "frauen" in dl:
        return "/api/images/trophy/pl"
    return "/api/images/trophy/fa"


def _classify_trophy(desc: str) -> str:
    """Classify a trophy event description into a category."""
    dl = desc.lower()
    if "champions league" in dl:
        return "champions_league"
    if "europa" in dl:
        return "europa_league"
    if any(k in dl for k in ["premier league", "la liga", "laliga", "bundesliga", "serie a", "ligue 1"]):
        return "league_title"
    if any(k in dl for k in ["cup", "copa", "coppa", "pokal", "coupe"]):
        return "domestic_cup"
    return "other"


@router.get("/careers/{career_id}/profile")
def get_career_profile(career_id: int, db: Session = Depends(get_db)):
    """Get the full career profile for the Legacy Hub screen.
    
    Returns manager info, trophy summary, club journey with tenure dates,
    and season-by-season mastermind statistics.
    """
    career = db.query(Career).filter(Career.id == career_id).first()
    if not career:
        raise HTTPException(status_code=404, detail="Career not found")
    
    # --- Manager Info ---
    seasons = db.query(Season).filter(Season.career_id == career_id).order_by(Season.year).all()
    season_years = [s.year for s in seasons]
    start_year = min(season_years) if season_years else 2025
    end_year = max(season_years) if season_years else 2025
    
    # --- Manager Career History (from AGmV) ---
    history_rows = db.query(ManagerSeasonHistory).filter(
        ManagerSeasonHistory.career_id == career_id
    ).order_by(ManagerSeasonHistory.season_number).all()
    
    # --- All trophy events in this career ---
    all_trophies = db.query(TimelineEvent).filter(
        TimelineEvent.career_id == career_id,
        TimelineEvent.event_type == "trophy"
    ).all()
    
    # --- Manager Awards ---
    all_awards = db.query(Award).filter(Award.career_id == career_id).all()
    
    # --- Build Club Journey from history ---
    # Group consecutive seasons at the same club
    club_journey = []
    current_club_game_id = None
    current_tenure = None
    
    # Also build a map: club_id -> list of trophy events
    club_id_to_trophies = {}
    for t in all_trophies:
        if t.related_club_id not in club_id_to_trophies:
            club_id_to_trophies[t.related_club_id] = []
        club_id_to_trophies[t.related_club_id].append(t)
    
    for h in history_rows:
        season_year = 2025 + (h.season_number or 0)
        
        if h.club_game_id != current_club_game_id:
            # New tenure
            if current_tenure:
                club_journey.append(current_tenure)
            
            # Resolve club info
            club_obj = db.query(Club).filter(
                Club.career_id == career_id,
                Club.game_id == h.club_game_id
            ).first() if h.club_game_id else None
            
            current_club_game_id = h.club_game_id
            current_tenure = {
                "club_name": club_obj.name if club_obj else f"Club #{h.club_game_id}",
                "club_game_id": h.club_game_id,
                "club_id": club_obj.id if club_obj else None,
                "league": club_obj.league if club_obj else None,
                "start_year": season_year,
                "end_year": season_year,
                "is_current": False,
                "seasons": [],
                "trophies": []
            }
        
        if current_tenure:
            current_tenure["end_year"] = season_year
            current_tenure["seasons"].append({
                "year": season_year,
                "matches": h.matches or 0,
                "wins": h.wins or 0,
                "draws": h.draws or 0,
                "losses": h.losses or 0,
                "goals_for": h.goals_for or 0,
                "goals_against": h.goals_against or 0,
            })
    
    if current_tenure:
        current_tenure["is_current"] = True  # Last tenure is current
        club_journey.append(current_tenure)
    
    # Attach trophies to each tenure
    for tenure in club_journey:
        club_db_id = tenure.get("club_id")
        if club_db_id and club_db_id in club_id_to_trophies:
            for t_event in club_id_to_trophies[club_db_id]:
                # Only include trophies within this tenure's date range
                t_season = db.query(Season).filter(Season.id == t_event.season_id).first() if t_event.season_id else None
                t_year = t_season.year if t_season else None
                if t_year and tenure["start_year"] <= t_year <= tenure["end_year"]:
                    tenure["trophies"].append({
                        "name": t_event.description,
                        "year": t_year,
                        "icon": _resolve_trophy_icon(t_event.description),
                        "category": _classify_trophy(t_event.description)
                    })
    
    # --- Aggregate Trophy Counts ---
    trophy_counts = {
        "champions_league": 0,
        "league_title": 0,
        "domestic_cup": 0,
        "europa_league": 0,
        "other": 0,
        "total": len(all_trophies)
    }
    for t in all_trophies:
        cat = _classify_trophy(t.description)
        if cat in trophy_counts:
            trophy_counts[cat] += 1
    
    # --- Mastermind Statistics (per club aggregate) ---
    mastermind_stats = []
    for tenure in club_journey:
        total_m = sum(s["matches"] for s in tenure["seasons"])
        total_w = sum(s["wins"] for s in tenure["seasons"])
        total_d = sum(s["draws"] for s in tenure["seasons"])
        total_l = sum(s["losses"] for s in tenure["seasons"])
        total_gf = sum(s["goals_for"] for s in tenure["seasons"])
        total_ga = sum(s["goals_against"] for s in tenure["seasons"])
        win_pct = round((total_w / total_m * 100), 1) if total_m > 0 else 0.0
        
        tenure_label = f"{tenure['start_year']}-{str(tenure['end_year'])[2:]}"
        if tenure["is_current"]:
            tenure_label = f"{tenure['start_year']}-Present"
        
        mastermind_stats.append({
            "club_name": tenure["club_name"],
            "club_game_id": tenure["club_game_id"],
            "club_id": tenure["club_id"],
            "tenure": tenure_label,
            "matches": total_m,
            "wins": total_w,
            "draws": total_d,
            "losses": total_l,
            "goals_for": total_gf,
            "goals_against": total_ga,
            "win_pct": win_pct,
            "trophies_count": len(tenure["trophies"]),
        })
    
    # --- Career-wide aggregate ---
    total_career_matches = sum(s["matches"] for s in mastermind_stats)
    total_career_wins = sum(s["wins"] for s in mastermind_stats)
    career_win_pct = round((total_career_wins / total_career_matches * 100), 1) if total_career_matches > 0 else 0.0
    
    return {
        "success": True,
        "data": {
            "manager_name": career.manager_name or "Unknown Manager",
            "team_name": career.team_name,
            "team_id": career.team_id,
            "career_start": start_year,
            "career_end": end_year,
            "total_seasons": len(season_years),
            "total_trophies": trophy_counts["total"],
            "trophy_counts": trophy_counts,
            "career_matches": total_career_matches,
            "career_wins": total_career_wins,
            "career_win_pct": career_win_pct,
            "awards_count": len(all_awards),
            "club_journey": club_journey,
            "mastermind_stats": mastermind_stats,
        }
    }
