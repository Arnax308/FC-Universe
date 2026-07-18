"""Normalized intermediate data models.

These Pydantic models represent the neutral format between the parser
and the database. This is the critical architectural separation:

    FC Save File → Parser → Normalized Models → Import Engine → Database

If EA changes the save format, only the parser changes. Everything
downstream (import, DB, analytics, UI) stays the same.
"""

from pydantic import BaseModel


class SaveHeaderInfo(BaseModel):
    """Quick header information extracted without full parsing."""

    career_name: str
    manager_name: str | None = None
    team_name: str | None = None
    team_id: int | None = None
    file_path: str | None = None
    save_identifier: str | None = None


class ParsedPlayer(BaseModel):
    """A player extracted from the save file."""

    game_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    known_name: str | None = None
    overall: int | None = None
    potential: int | None = None
    position: str | None = None
    nationality: int | None = None
    birth_year: int | None = None
    height_cm: int | None = None
    weight_kg: int | None = None
    foot: str | None = None
    jersey_number: int | None = None
    club_id: int | None = None

    # New detailed fields
    jumping: int | None = None
    heading_accuracy: int | None = None
    aggression: int | None = None
    long_shots: int | None = None
    penalties: int | None = None
    free_kick_accuracy: int | None = None
    curve: int | None = None
    volleys: int | None = None
    gk_diving: int | None = None
    gk_handling: int | None = None
    gk_kicking: int | None = None
    gk_positioning: int | None = None
    gk_reflexes: int | None = None
    defensive_awareness: int | None = None
    weak_foot_ability: int | None = None
    skill_moves: int | None = None
    international_rep: int | None = None


class ParsedClub(BaseModel):
    """A club extracted from the save file."""

    game_id: int | None = None
    name: str | None = None
    short_name: str | None = None
    league_id: int | None = None
    overall_rating: int | None = None
    defense_rating: int | None = None
    midfield_rating: int | None = None
    attack_rating: int | None = None
    club_worth: int | None = None
    domestic_prestige: int | None = None
    international_prestige: int | None = None
    foundation_year: int | None = None
    rival_team_id: int | None = None


class ParsedTransfer(BaseModel):
    """A transfer record extracted from the save file."""

    player_id: int | None = None
    from_club_id: int | None = None
    to_club_id: int | None = None
    fee: float | None = None
    type: str | None = None


class ParsedCompetition(BaseModel):
    """A competition extracted from the save file."""

    game_id: int | None = None
    name: str | None = None
    type: str | None = None
    country: str | None = None


class ParsedSaveData(BaseModel):
    """Complete data extracted from a single save file.

    This is the normalized JSON representation that the import engine
    consumes. It is completely decoupled from both the save format
    and the database schema.
    """

    header: SaveHeaderInfo
    players: list[ParsedPlayer] = []
    clubs: list[ParsedClub] = []
    transfers: list[ParsedTransfer] = []
    competitions: list[ParsedCompetition] = []
    raw_tables: dict[str, list[dict]] = {}  # All raw tables for exploration
