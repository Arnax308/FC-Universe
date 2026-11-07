"""FC 26's player-name dictionary, rebuilt from a career save.

Generated players (regens, academy graduates) store their names as ids into EA's
``playernames`` table, which ships with the game and is not in the save. The table is
alphabetical; FC 26's is the older list we bundle (parser_repo/.../playernames.csv) with
names added and removed, so ids drift by hundreds and the old file can't be used as is.

Real players in the save use the same table and we know their names (master_players.json),
which pins thousands of FC 26 ids to a name. Between two pinned ids the old list supplies the
names in order: when both lists have the same number of names in that span they line up
exactly; otherwise the position is interpolated (a best guess).

If a real FC 26 table is available (``data/playernames_fc26.csv`` with nameid,name columns,
e.g. exported with the FC 26 Live Editor) it is used instead and every name is exact.
"""

import bisect
import csv
import logging
from collections import defaultdict
from pathlib import Path

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OLD_NAMES = Path(__file__).resolve().parents[4] / "parser_repo" / "fc-cm-web-parser-main" / "public" / "playernames.csv"
EXACT_NAMES = DATA_DIR / "playernames_fc26.csv"
GENERATED_PLAYER_ID_START = 280000


def _read_csv(path: Path) -> dict[int, str]:
    out = {}
    with open(path, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            try:
                out[int(row["nameid"])] = row["name"]
            except (KeyError, ValueError):
                continue
    return out


class NameDictionary:
    def __init__(self, raw_players: list[dict], master_names: dict[int, str]):
        self.exact = _read_csv(EXACT_NAMES) if EXACT_NAMES.exists() else None
        self.anchors: dict[int, str] = {}
        self._ids: list[int] = []
        self._old_pos: list[int] = []
        self._old: list[str | None] = []
        self.first_counts: dict[str, int] = defaultdict(int)
        for name in master_names.values():
            parts = name.split()
            if len(parts) > 1:
                self.first_counts[parts[0]] += 1
        if self.exact is None and OLD_NAMES.exists():
            self._build(raw_players, master_names)

    # ------------------------------------------------------------------ build

    def _build(self, raw_players, master_names):
        old_by_id = _read_csv(OLD_NAMES)
        self._old = [old_by_id.get(i) for i in range(max(old_by_id) + 1)]
        positions = defaultdict(list)
        for i, n in enumerate(self._old):
            if n:
                positions[n].append(i)

        clashes = set()

        def pin(name_id, name):
            if not name_id or not name or name_id in clashes:
                return
            if self.anchors.get(name_id, name) != name:
                clashes.add(name_id)
                self.anchors.pop(name_id, None)
                return
            self.anchors[name_id] = name

        for p in raw_players:
            gid = p.get("ykFq")
            name = master_names.get(gid)
            if not name or gid is None or gid >= GENERATED_PLAYER_ID_START:
                continue
            common = p.get("HDYx")  # commonnameid
            if common:
                pin(common, name)
                continue
            tokens = name.split()
            for k in range(1, len(tokens)):
                first, last = " ".join(tokens[:k]), " ".join(tokens[k:])
                if first in positions and last in positions:
                    pin(p.get("tHlO"), first)
                    pin(p.get("QCfa"), last)
                    break

        # Pair each pinned id with its name's place in the old list, keeping the longest run
        # where both go up together (both lists are sorted the same way).
        chain = []
        for name_id in sorted(self.anchors):
            cands = positions.get(self.anchors[name_id])
            if not cands:
                continue
            guess = chain[-1][1] + (name_id - chain[-1][0]) if chain else name_id
            chain.append((name_id, min(cands, key=lambda c: abs(c - guess))))
        tails, prev = [], [-1] * len(chain)
        for k, (_, pos) in enumerate(chain):
            j = bisect.bisect_left([chain[t][1] for t in tails], pos)
            if j == len(tails):
                tails.append(k)
            else:
                tails[j] = k
            prev[k] = tails[j - 1] if j else -1
        seq, k = [], tails[-1] if tails else -1
        while k != -1:
            seq.append(chain[k])
            k = prev[k]
        seq.reverse()
        self._ids = [a for a, _ in seq]
        self._old_pos = [b for _, b in seq]
        logger.info(f"Rebuilt FC 26 name dictionary from {len(self.anchors)} known names")

    # ------------------------------------------------------------------ repair

    def complete(self, tail: str, first_name_counts: dict[str, int]) -> str | None:
        """The name that lost its first two bytes and now reads ``tail``: a known name exactly
        two UTF-8 bytes longer ending in ``tail``, the most common first name winning."""
        size = len(tail.encode("utf-8")) + 2
        pool = set(self.exact.values()) if self.exact is not None else set(n for n in self._old if n)
        pool |= set(self.anchors.values()) | set(first_name_counts)
        cands = [n for n in pool if n.endswith(tail) and len(n.encode("utf-8")) == size]
        if not cands or not tail:
            return None
        return max(cands, key=lambda n: (first_name_counts.get(n, 0), n))

    # ------------------------------------------------------------------ lookup

    def lookup(self, name_id: int | None) -> tuple[str | None, bool]:
        """(name, certain) for a name id."""
        if not name_id:
            return None, False
        if self.exact is not None:
            return self.exact.get(name_id), name_id in self.exact
        if name_id in self.anchors:
            return self.anchors[name_id], True
        j = bisect.bisect_left(self._ids, name_id)
        if j == 0 or j == len(self._ids):
            return None, False
        a, b = self._ids[j - 1], self._ids[j]
        ca, cb = self._old_pos[j - 1], self._old_pos[j]
        if b - a == cb - ca:
            return self._old[ca + (name_id - a)], False
        return self._old[ca + round((name_id - a) * (cb - ca) / (b - a))], False

