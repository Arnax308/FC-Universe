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
    and season-by-season managerial statistics.
    """
    career = db.query(Career).filter(Career.id == career_id).first()
    if not career:
        raise HTTPException(status_code=404, detail="Career not found")
    
    # --- Manager Info ---
    seasons = db.query(Season).filter(Season.career_id == career_id).order_by(Season.year).all()
    season_years = [s.year for s in seasons]
    start_year = min(season_years) if season_years else 2025
    end_year = max(season_years) if season_years else 2025
    
    # --- Manager Career History (from zgrE) ---
    history_rows = db.query(ManagerSeasonHistory).filter(
        ManagerSeasonHistory.career_id == career_id
    ).order_by(ManagerSeasonHistory.season_number).all()
    
    # --- Group consecutive seasons in zgrE into tenures ---
    raw_tenures = []
    current_tenure = None
    
    for idx, h in enumerate(history_rows):
        season_year = 2025 + ((h.season_number or (idx + 1)) - 1)
        
        if current_tenure is None or current_tenure["club_game_id"] != h.club_game_id:
            if current_tenure:
                raw_tenures.append(current_tenure)
            
            club_obj = db.query(Club).filter(
                Club.career_id == career_id,
                Club.game_id == h.club_game_id
            ).first() if h.club_game_id else None
            
            current_tenure = {
                "club_name": club_obj.name if club_obj else f"Club #{h.club_game_id}",
                "club_game_id": h.club_game_id,
                "league": club_obj.league if club_obj else None,
                "start_year": season_year,
                "end_year": season_year,
                "is_current": False,
                "seasons": [],
                "trophies": [],
                "total_matches": 0,
                "total_wins": 0,
                "total_draws": 0,
                "total_losses": 0,
                "total_gf": 0,
                "total_ga": 0,
                "league_trophies": 0,
                "cup_trophies": 0,
                "euro_trophies": 0,
            }
        
        current_tenure["end_year"] = season_year
        m_val = h.matches or 0
        w_val = h.wins or 0
        d_val = h.draws or 0
        l_val = h.losses or 0
        gf_val = h.goals_for or 0
        ga_val = h.goals_against or 0
        
        current_tenure["seasons"].append({
            "season_number": h.season_number,
            "year": season_year,
            "matches": m_val,
            "wins": w_val,
            "draws": d_val,
            "losses": l_val,
            "goals_for": gf_val,
            "goals_against": ga_val,
            "points": h.points or 0,
            "table_position": h.table_position or 0,
        })
        current_tenure["total_matches"] += m_val
        current_tenure["total_wins"] += w_val
        current_tenure["total_draws"] += d_val
        current_tenure["total_losses"] += l_val
        current_tenure["total_gf"] += gf_val
        current_tenure["total_ga"] += ga_val
        current_tenure["league_trophies"] += (h.league_trophies or 0)
        current_tenure["cup_trophies"] += (h.cup_trophies or 0)
        current_tenure["euro_trophies"] += (h.euro_trophies or 0)

    if current_tenure:
        raw_tenures.append(current_tenure)
    
    # Filter valid tenures: keep if total_matches > 0 OR if it matches career.team_id OR is the last tenure
    club_journey = []
    manager_club_game_ids = set()
    
    for i, t in enumerate(raw_tenures):
        is_last = (i == len(raw_tenures) - 1)
        is_active_team = (career.team_id and t["club_game_id"] == career.team_id)
        
        if t["total_matches"] > 0 or is_active_team or is_last:
            t["is_current"] = (is_active_team or is_last)
            club_journey.append(t)
            if t["club_game_id"]:
                manager_club_game_ids.add(t["club_game_id"])
    
    # --- All trophy timeline events for manager's clubs ---
    manager_club_db_ids = [
        c.id for c in db.query(Club.id).filter(
            Club.career_id == career_id,
            Club.game_id.in_(list(manager_club_game_ids))
        ).all()
    ] if manager_club_game_ids else []
    
    manager_trophies = db.query(TimelineEvent).filter(
        TimelineEvent.career_id == career_id,
        TimelineEvent.event_type == "trophy",
        TimelineEvent.related_club_id.in_(manager_club_db_ids)
    ).all() if manager_club_db_ids else []
    
    # --- Manager Awards ---
    all_awards = db.query(Award).filter(Award.career_id == career_id).all()
    
    # Attach trophy items to each tenure
    for tenure in club_journey:
        if tenure["club_game_id"]:
            matching_club_ids = [
                c.id for c in db.query(Club.id).filter(
                    Club.career_id == career_id,
                    Club.game_id == tenure["club_game_id"]
                ).all()
            ]
            
            tenure_events = [
                t for t in manager_trophies 
                if t.related_club_id in matching_club_ids
            ]
            
            for t_event in tenure_events:
                t_season = db.query(Season).filter(Season.id == t_event.season_id).first() if t_event.season_id else None
                t_year = t_season.year if t_season else None
                
                clean_name = t_event.description
                if " have won the " in clean_name:
                    clean_name = clean_name.split(" have won the ", 1)[1]
                    if " title in the " in clean_name:
                        clean_name = clean_name.split(" title in the ", 1)[0]
                
                tenure["trophies"].append({
                    "name": clean_name,
                    "year": t_year,
                    "icon": _resolve_trophy_icon(t_event.description),
                    "category": _classify_trophy(t_event.description)
                })
    
    # --- Aggregate Trophy Counts (FOR MANAGER'S MANAGED CLUBS ONLY!) ---
    trophy_counts = {
        "champions_league": 0,
        "league_title": 0,
        "domestic_cup": 0,
        "europa_league": 0,
        "other": 0,
        "total": len(manager_trophies)
    }
    for t in manager_trophies:
        cat = _classify_trophy(t.description)
        if cat in trophy_counts:
            trophy_counts[cat] += 1
    
    # --- Managerial Statistics (per club aggregate) ---
    managerial_stats = []
    for tenure in club_journey:
        total_m = tenure["total_matches"]
        total_w = tenure["total_wins"]
        total_d = tenure["total_draws"]
        total_l = tenure["total_losses"]
        total_gf = tenure["total_gf"]
        total_ga = tenure["total_ga"]
        win_pct = round((total_w / total_m * 100), 1) if total_m > 0 else 0.0
        
        tenure_label = f"{tenure['start_year']}-{str(tenure['end_year'])[2:]}"
        if tenure["start_year"] == tenure["end_year"]:
            tenure_label = f"{tenure['start_year']}"
        if tenure["is_current"]:
            tenure_label = f"{tenure['start_year']}-Present"
        
        managerial_stats.append({
            "club_name": tenure["club_name"],
            "club_game_id": tenure["club_game_id"],
            "tenure": tenure_label,
            "seasons_count": len(tenure["seasons"]),
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
    total_career_matches = sum(s["matches"] for s in managerial_stats)
    total_career_wins = sum(s["wins"] for s in managerial_stats)
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
            "managerial_stats": managerial_stats,
        }
    }
