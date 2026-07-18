from fc_universe.parser.fbchunks import FbChunksParser, RANGE_LOWS
from fc_universe.parser.models import SaveHeaderInfo


def test_fc_metadata_exposes_the_team_and_manager_id_offsets():
    assert RANGE_LOWS["lyxL"]["mCXg"] == 1
    assert RANGE_LOWS["mPrV"]["NTyS"] == 1

def test_manager_club_is_resolved_from_normalized_ids():
    header = SaveHeaderInfo(career_name="Career")
    tables = {
        "mPrV": [{"HdeP": "Arnav", "rREd": "Manager", "NTyS": 243}],
        "lyxL": [
            {"mCXg": 245, "AUsv": "Ajax"},
            {"mCXg": 243, "AUsv": "Real Madrid"},
        ],
    }

    FbChunksParser._populate_header_from_tables(header, tables)

    assert header.manager_name == "Arnav Manager"
    assert header.team_id == 243
    assert header.team_name == "Real Madrid"