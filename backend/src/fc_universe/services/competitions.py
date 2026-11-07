"""What FC 26 calls its competitions.

A competition has three ids in a career save:

* ``compobjid`` - the competition engine's id, used by competition progress, the user's primary
  league (career_users.primarycompobjid) and the season leaderboards.
* the asset id - ``competition.competitionid`` (whose ``competitionchampionid`` is the reigning
  champion). Competition progress names it in ``compshortname`` as ``C<asset id>``. For leagues
  the asset id is the ``leagueid``.
* ``leagueid`` - leagues table / leagueteamlinks.

Cup and continental competitions are stored with ``Competition.game_id = compobjid`` when that is
known, otherwise ``SYNTHETIC_BASE + asset id``; leagues use their leagueid.
"""

SYNTHETIC_BASE = 100000

# Cup asset ids (competition.competitionid), verified against real-world winners in a fresh save.
ASSET_COMPETITIONS: dict[int, tuple[str, str]] = {
    201: ("FA Cup", "cup"),
    202: ("EFL Cup (Carabao)", "cup"),
    203: ("EFL Trophy", "cup"),
    204: ("Coupe de France", "cup"),
    206: ("DFB-Pokal", "cup"),
    208: ("Copa del Rey", "cup"),
    210: ("Coppa Italia", "cup"),
    212: ("ÖFB-Cup", "cup"),
    213: ("Belgian Cup", "cup"),
    215: ("Danish Cup", "cup"),
    218: ("Taça de Portugal", "cup"),
    219: ("Scottish Cup", "cup"),
    220: ("Svenska Cupen", "cup"),
    221: ("Swiss Cup", "cup"),
    223: ("UEFA Champions League", "continental"),
    224: ("UEFA Europa League", "continental"),
    226: ("UEFA Conference League", "continental"),
}

# compobjid -> asset id, as seen in competition progress short names (C223 = Champions League ...)
COMPOBJ_ASSETS: dict[int, int] = {135: 223, 234: 224, 1335: 208, 514: 201, 630: 202, 950: 206}

# compobjids that carry no short name, identified from who plays them and when.
COMPOBJ_NAMED: dict[int, tuple[str, str]] = {
    132: ("UEFA Super Cup", "continental"),
    1327: ("Supercopa de España", "cup"),
    511: ("FA Community Shield", "cup"),
    945: ("DFL-Supercup", "cup"),
}

# International tournaments: asset id -> (name, first edition in a career, cycle years,
# (final month, final day), gender, EA's stale default champion team id in a fresh save).
INTERNATIONAL: dict[int, tuple[str, int, int, tuple[int, int], int, int | None]] = {
    1991: ("FIFA World Cup", 2026, 4, (7, 19), 0, None),
    980: ("UEFA EURO", 2028, 4, (7, 9), 0, 1343),        # a fresh save still says Italy (2021)
    990: ("Copa América", 2028, 4, (7, 14), 0, 1369),    # Argentina (2024)
    2136: ("FIFA Women's World Cup", 2027, 4, (7, 25), 1, 113012),  # Spain (2023)
}

# When each cup's season gets going (month, day). Numbers seen before that date belong to the
# previous edition. Only one-off finals and cups that start well after the leagues are listed.
COMPOBJ_STARTS: dict[int, tuple[int, int]] = {
    132: (8, 12),   # UEFA Super Cup
    945: (8, 14),   # DFL-Supercup
    1327: (1, 5),   # Supercopa de España
    1335: (10, 25),  # Copa del Rey
    514: (11, 1),   # FA Cup (top-flight clubs enter in January; early rounds in autumn)
}

TOP_5_LEAGUES = {13, 53, 19, 31, 16}

# Trophy weight in the Ballon d'Or score, by kind.
HONOUR_WEIGHT = {
    "FIFA World Cup": 22, "UEFA EURO": 15, "Copa América": 15, "FIFA Women's World Cup": 22,
    "UEFA Champions League": 18, "UEFA Europa League": 8, "UEFA Conference League": 5,
}


def known_cups() -> dict[int, tuple[str, str]]:
    """Every compobjid we can name, with (name, type)."""
    out = {cid: ASSET_COMPETITIONS[asset] for cid, asset in COMPOBJ_ASSETS.items()}
    out.update(COMPOBJ_NAMED)
    return out


def asset_from_shortname(short: str | None) -> int | None:
    if short and short[:1] == "C" and short[1:].isdigit():
        return int(short[1:])
    return None


def latest_edition(asset: int, game_date: int) -> int | None:
    """Year of the most recent edition of an international tournament finished by game_date."""
    _, first, cycle, (month, day), _, _ = INTERNATIONAL[asset]
    year = game_date // 10000
    for y in range(year, first - 1, -1):
        if (y - first) % cycle == 0 and game_date >= y * 10000 + month * 100 + day:
            return y
    return None


def honour_weight(name: str, comp_type: str | None) -> int:
    if name in HONOUR_WEIGHT:
        return HONOUR_WEIGHT[name]
    if comp_type == "league":
        return 10
    if "super" in name.lower() or "shield" in name.lower():
        return 1
    return 4
