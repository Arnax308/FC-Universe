import struct
from types import SimpleNamespace

from fc_universe.parser.fbchunks import _fixed_string, _slug
from fc_universe.parser.managers import read_leaderboards, read_transfer_ledger
from fc_universe.services.career_stats import CareerStatsMixin, season_start_for_date
from fc_universe.services.competitions import asset_from_shortname, latest_edition


def _tag(name: str) -> bytes:
    return b"\x04\x00\x00\x00" + name.encode()


def test_leaderboards_are_read_per_competition_and_stat():
    body = b"\x01\x01\x01" + struct.pack("<I", 1)            # one competition
    body += b"\x01" + struct.pack("<I", 1435) + b"\x01\x01" + struct.pack("<I", 2)  # LaLiga, 2 stats
    body += b"\x01\x01\x00\x01" + struct.pack("<I", 2)       # goals, 2 entries
    body += b"\x01" + struct.pack("<IHH", 238794, 38, 31) + b"\x01" + struct.pack("<IHH", 266895, 34, 26)
    body += b"\x01\x01\x05\x01" + struct.pack("<I", 1)       # rating x100, 1 entry
    body += b"\x01" + struct.pack("<IHH", 238794, 38, 790)
    data = b"junk" + _tag("mvts") + body + _tag("mlop")
    assert read_leaderboards(data) == {1435: {0: [(238794, 38, 31), (266895, 34, 26)], 5: [(238794, 38, 790)]}}


def test_transfer_ledger_reads_signings_and_sales():
    buy = b"\xff\xff\xff\xff" + struct.pack("<IIIII", 20290724, 130_000_000, 131682, 262863, 96000) + b"\x01"
    sale = b"\xff\xff\xff\xff" + struct.pack("<IIII", 20290710, 30_600_000, 1808, 261654) + b"\xff\xff\xff\xff\x00"
    rows = read_transfer_ledger(_tag("mnft") + buy + sale + _tag("mvmt"))
    assert {(r["player_id"], r["fee"], r["direction"]) for r in rows} == {
        (262863, 130_000_000, "in"), (261654, 30_600_000, "out")}


def test_career_identity_survives_new_save_files():
    header = bytearray(512)
    header[0x12:0x1A] = b"Valencia"
    header[0xFA:0x101] = b"E. Howe"
    assert _fixed_string(bytes(header), 0x12, 32) == "Valencia"
    assert "cm:" + _slug("Valencia") + ":" + _slug("E. Howe") == "cm:valencia:e-howe"


def test_international_editions_and_season_dates():
    assert latest_edition(1991, 20300708) == 2026   # 2030 World Cup final not played yet
    assert latest_edition(1991, 20300801) == 2030
    assert latest_edition(980, 20270101) is None    # no EURO inside the career yet
    assert season_start_for_date(20300811) == 2030
    assert season_start_for_date(20300129) == 2029
    assert asset_from_shortname("C223") == 223 and asset_from_shortname("") is None


def _picker(user_games, date=20300708):
    return SimpleNamespace(current_year=2030, user_games_now=user_games, game_date=date,
                           _pick_season=CareerStatsMixin._pick_season)


def test_preseason_numbers_go_to_last_season():
    p = _picker(user_games=0)
    assert CareerStatsMixin._pick_season(p, False, False, False, False, biggest=38) == (2029, True)


def test_numbers_that_continue_this_season_stay_put():
    p = _picker(user_games=20, date=20301201)
    assert CareerStatsMixin._pick_season(p, True, True, True, False, biggest=18) == (2030, True)
    # a restarted competition doesn't continue last season's numbers, so it's this season afresh
    assert CareerStatsMixin._pick_season(p, False, False, True, False, biggest=3) == (2030, False)
