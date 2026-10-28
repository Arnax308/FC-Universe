from fc_universe.services.import_service import ea_date_year, ordinal, rgb_hex, season_year


def test_season_numbers_are_one_based_from_2025():
    assert season_year(1) == 2025
    assert season_year(4) == 2028
    assert season_year(None) == 2025


def test_ea_birthdates_are_days_since_gregorian_epoch():
    assert ea_date_year(154318) == 2005
    assert ea_date_year(0) is None


def test_kit_colours_become_hex():
    assert rgb_hex({"r": 247, "g": 124, "b": 67}, "r", "g", "b") == "#f77c43"
    assert rgb_hex({"r": 300, "g": 0, "b": 0}, "r", "g", "b") is None


def test_ordinals():
    assert [ordinal(n) for n in (1, 2, 3, 4, 11, 12, 13, 21, 22)] == [
        "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]
