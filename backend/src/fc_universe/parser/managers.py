"""Readers for the career "manager" blocks that live outside the save's database tables.

After the two embedded databases, an FC 26 career save carries a serialized state chunk made
of named blocks. Each block starts with a length-prefixed four-letter tag (``04 00 00 00`` +
tag, the tag being an abbreviation spelt backwards). Two of them hold data the tables lack:

``mvts`` - season leaderboards, one per competition (keyed by compobjid)::

    01 01 01 <u32 competition count>
      01 <u32 compobjid> 01 01 <u32 category count>
        01 01 <u8 stat type> 01 <u32 entry count>
          01 <u32 playerid> <u16 appearances> <u16 value>      (top 20 per stat)

    stat types: 0 goals, 1 assists, 2 clean sheets, 3 yellow cards, 4 red cards,
                5 average rating x100 (EA applies its own minimum-appearances cut)

  EA keeps only the season in progress (or, before the new season's first match, the one just
  finished) and wipes it when the competition restarts, so FC Universe snapshots it on every sync.

``mnft`` - the user club's finance ledger, which includes its recent transfers::

    ff ff ff ff <u32 date yyyymmdd> <u32 fee> <u32 other team> <u32 playerid>
                (<u32 wage> 01  for a signing | ff ff ff ff 00  for a sale)
"""

import logging
import re
import struct

logger = logging.getLogger(__name__)

STAT_GOALS, STAT_ASSISTS, STAT_CLEAN_SHEETS, STAT_YELLOWS, STAT_REDS, STAT_RATING = range(6)

_TAG = re.compile(rb"\x04\x00\x00\x00([a-z]{4})")


def _block(data: bytes, tag: str) -> tuple[int, int] | None:
    """(start, end) of a named block: from its tag to the next block tag."""
    m = re.search(rb"\x04\x00\x00\x00" + tag.encode(), data)
    if not m:
        return None
    nxt = _TAG.search(data, m.end())
    return m.end(), (nxt.start() if nxt else len(data))


def read_leaderboards(data: bytes) -> dict[int, dict[int, list[tuple[int, int, int]]]]:
    """{compobjid: {stat_type: [(playerid, appearances, value), ...]}} from the ``mvts`` block."""
    span = _block(data, "mvts")
    if not span:
        return {}
    pos, end = span
    out: dict[int, dict[int, list[tuple[int, int, int]]]] = {}
    try:
        if data[pos:pos + 3] != b"\x01\x01\x01":
            return {}
        (n_comps,) = struct.unpack_from("<I", data, pos + 3)
        pos += 7
        for _ in range(min(n_comps, 512)):
            if data[pos] != 1:
                break
            (comp_id,) = struct.unpack_from("<I", data, pos + 1)
            (n_cats,) = struct.unpack_from("<I", data, pos + 7)
            pos += 11
            cats = {}
            for _ in range(min(n_cats, 16)):
                stat_type = data[pos + 2]
                (n,) = struct.unpack_from("<I", data, pos + 4)
                pos += 8
                entries = []
                for _ in range(min(n, 64)):
                    if data[pos] != 1:
                        raise ValueError(f"bad leaderboard entry at {pos}")
                    pid, apps, value = struct.unpack_from("<IHH", data, pos + 1)
                    entries.append((pid, apps, value))
                    pos += 9
                cats[stat_type] = entries
            out[comp_id] = cats
            if pos >= end:
                break
    except (IndexError, struct.error, ValueError) as e:
        logger.warning(f"Leaderboard block only partly readable: {e}")
    return out


def read_transfer_ledger(data: bytes) -> list[dict]:
    """The user club's recent signings and sales, from the ``mnft`` finance block.

    Rows are only candidates: the caller drops any whose team or player isn't in the save.
    """
    span = _block(data, "mnft")
    if not span:
        return []
    seg = data[span[0]:span[1]]
    rows, seen = [], set()
    # Rows usually follow an ff ff ff ff marker, but the first row of a list follows its count,
    # so scan every offset for the row shape and let the date / fee checks reject noise.
    for pos in range(0, len(seg) - 20):  # a row is 21 bytes
        date, fee, team, pid = struct.unpack_from("<IIII", seg, pos)
        if not (20200101 <= date <= 21001231 and 1 <= date % 100 <= 31 and 1 <= date // 100 % 100 <= 12):
            continue
        if fee >= 2_000_000_000 or fee % 1000:
            continue
        tail = seg[pos + 16:pos + 21]
        if tail == b"\xff\xff\xff\xff\x00":
            direction = "out"
        elif tail[4:5] == b"\x01":
            direction = "in"
        else:
            continue
        key = (date, pid, team)
        if key not in seen:
            seen.add(key)
            rows.append({"date": date, "fee": fee, "team_id": team, "player_id": pid, "direction": direction})
    return rows
