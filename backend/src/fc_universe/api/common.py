"""Helpers shared by the API routers."""

from sqlalchemy.orm import Session

from fc_universe.models import Career, Club, Competition, Season, TimelineEvent

BASE_SEASON_YEAR = 2025


def current_season_year(db: Session, career_id: int) -> int:
    season = db.query(Season).filter(Season.career_id == career_id, Season.is_current.is_(True)).first()
    return season.year if season else BASE_SEASON_YEAR


def season_label(year: int | None) -> str | None:
    return f"{year}/{(year + 1) % 100:02d}" if year else None


def club_brief(club: Club | None) -> dict | None:
    """The bits of a club every card in the UI needs (crest id + kit colours)."""
    if not club:
        return None
    return {
        "id": club.id,
        "game_id": club.game_id,
        "name": club.name,
        "league": club.league,
        "color_primary": club.color_primary,
        "color_secondary": club.color_secondary,
        "color_tertiary": club.color_tertiary,
    }


def user_club(db: Session, career: Career | None) -> Club | None:
    if not career or career.team_id is None:
        return None
    return db.query(Club).filter(Club.career_id == career.id, Club.game_id == career.team_id).first()


def resolve_trophy_icon(name: str) -> str:
    """Pick the best available trophy PNG (served from data/image_cache/trophies)."""
    dl = (name or "").lower()
    rules = [
        (("champions league", "ucl"), "ucl"),
        (("europa league",), "uel"),
        (("conference",), "uecl"),
        (("premier league",), "pl"),
        (("2. bundesliga",), "bundesliga"),
        (("bundesliga",), "bundesliga"),
        (("serie a", "scudetto"), "seria_a"),
        (("la liga", "laliga", "primera divis"), "la_liga"),
        (("copa del rey", "supercopa"), "copa_del_rey"),
        (("coppa italia",), "coppa_italia"),
        (("dfb", "pokal"), "dfb_pokal"),
        (("efl", "carabao", "league cup"), "carabao"),
        (("ligue 1",), "ligue_1"),
        (("coupe de france",), "coupe_de_france"),
        (("ballon", "player of the year", "best player"), "balondor"),
        (("fa cup", "community shield"), "fa"),
    ]
    for keys, icon in rules:
        if any(k in dl for k in keys):
            return f"/api/images/trophy/{icon}"
    return "/api/images/trophy/fa"


def classify_competition(comp: Competition | None) -> str:
    if not comp:
        return "other"
    name = comp.name.lower()
    if "champions league" in name:
        return "champions_league"
    if "europa" in name or "conference" in name:
        return "europa_league"
    if comp.type == "league":
        return "league_title"
    if comp.type == "cup":
        return "domestic_cup"
    return "other"


def trophy_rows(db: Session, career_id: int, club_ids: list[int] | None = None):
    """Trophy events joined with season year, competition and club."""
    q = (
        db.query(TimelineEvent, Season.year, Competition, Club)
        .outerjoin(Season, Season.id == TimelineEvent.season_id)
        .outerjoin(Competition, Competition.id == TimelineEvent.related_competition_id)
        .outerjoin(Club, Club.id == TimelineEvent.related_club_id)
        .filter(TimelineEvent.career_id == career_id, TimelineEvent.event_type == "trophy")
    )
    if club_ids is not None:
        if not club_ids:
            return []
        q = q.filter(TimelineEvent.related_club_id.in_(club_ids))
    return q.order_by(Season.year.desc()).all()


def trophy_dict(event, year, comp, club) -> dict:
    name = comp.name if comp else event.description
    return {
        "name": name,
        "year": year,
        "season_label": season_label(year),
        "icon": resolve_trophy_icon(name),
        "category": classify_competition(comp),
        "club": club_brief(club),
        "description": event.description,
    }
