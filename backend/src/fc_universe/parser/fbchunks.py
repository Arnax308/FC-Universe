"""FBCHUNKS binary parser for EA FC 26 Career Mode save files.

This is a Python port of sammygriffiths/fifa-career-save-parser.
It reads the Frostbite Chunks binary format used by EA's save system.

Binary Structure:
    - File starts with "FBCHUNKS" magic bytes
    - Contains embedded databases identified by header: 0x44 0x42 0x00 0x08 0x00 0x00 0x00 0x00
    - Each DB contains tables with bit-packed records
    - Field definitions specify type (0=string, 3=int, 4=float), bit offset, and bit depth
"""

import hashlib
import io
import json
import struct
import logging
import re
from pathlib import Path

from fc_universe.parser.base import SaveParser
from fc_universe.parser.models import (
    ParsedSaveData,
    SaveHeaderInfo,
    ParsedPlayer,
    ParsedClub,
)

logger = logging.getLogger(__name__)

# Database section header signature
DB_HEADER = b"\x44\x42\x00\x08\x00\x00\x00\x00"

# FBCHUNKS file magic
FBCHUNKS_MAGIC = b"FBCHUNKS"
# Load rangeLow offsets for integer fields
# This is generated from the fifa_ng_db-meta.xml
try:
    with open(Path(__file__).parent / "range_lows.json", "r", encoding="utf-8") as _f:
        RANGE_LOWS = json.load(_f)
except Exception as e:
    logger.warning(f"Failed to load range_lows.json: {e}")
    RANGE_LOWS = {}

def apply_team_offset_overrides(offset: int):
    """Dynamically updates team-related field offsets in RANGE_LOWS based on relative shift."""
    shift = offset - 1
    original_range_lows = {
        "lyxL": {"mCXg": 1},
        "mPrV": {"NTyS": -1},
        "RrqT": {"mCXg": 1},
        "qdZF": {"mCXg": 1},
        "gBTf": {"mCXg": 1},
    }
    for table, fields in original_range_lows.items():
        if table not in RANGE_LOWS:
            RANGE_LOWS[table] = {}
        for field, orig_val in fields.items():
            RANGE_LOWS[table][field] = orig_val + shift

try:
    from fc_universe.config import settings
    apply_team_offset_overrides(settings.team_id_offset)
except Exception as e:
    # Fallback to default offset override of 1 if settings are not loaded
    apply_team_offset_overrides(1)

class BinaryReader:
    """Reads binary data with position tracking, matching the JS BufferReader API."""

    def __init__(self, data: bytes):
        self.data = data
        self.position = 0

    @property
    def length(self) -> int:
        return len(self.data)

    def read_bytes(self, count: int) -> bytes:
        result = self.data[self.position : self.position + count]
        self.position += count
        return result

    def read_uint8(self) -> int:
        val = self.data[self.position]
        self.position += 1
        return val

    def read_uint16_le(self) -> int:
        val = struct.unpack_from("<H", self.data, self.position)[0]
        self.position += 2
        return val

    def read_uint32_le(self) -> int:
        val = struct.unpack_from("<I", self.data, self.position)[0]
        self.position += 4
        return val

    def read_int32_le(self) -> int:
        val = struct.unpack_from("<i", self.data, self.position)[0]
        self.position += 4
        return val

    def read_float_le(self) -> float:
        val = struct.unpack_from("<f", self.data, self.position)[0]
        self.position += 4
        return val

    def read_null_terminated_string(self, max_length: int) -> str:
        """Read a null-terminated string up to max_length bytes."""
        raw = self.data[self.position : self.position + max_length]
        self.position += max_length
        null_idx = raw.find(b"\x00")
        if null_idx >= 0:
            raw = raw[:null_idx]
        try:
            return raw.decode("utf-8", errors="replace")
        except Exception:
            return raw.decode("ascii", errors="replace")


class FbChunksParser(SaveParser):
    """Parser for EA FC FBCHUNKS save file format.

    Reads the binary save file, extracts embedded databases,
    and decodes the bit-packed table records into structured data.
    """

    def read_header(self, file_path: Path) -> SaveHeaderInfo:
        """Read quick header info from a save file."""
        with open(file_path, "rb") as f:
            header_bytes = f.read(512)

        if not header_bytes.startswith(FBCHUNKS_MAGIC):
            raise ValueError(f"Not an FBCHUNKS file: {file_path}")

        reader = BinaryReader(header_bytes)

        # Skip magic "FBCHUNKS" (8 bytes) + some header fields (8 bytes)
        reader.position = 16

        # Use regex to find readable strings in the header (excluding magic/markers)
        
        # Clean null bytes to help ascii string finding, or just find ascii runs
        ascii_strings = [
            m.group(0).decode("ascii", errors="ignore").strip() 
            for m in re.finditer(b'[a-zA-Z0-9 _-]{4,}', header_bytes)
        ]
        
        # Filter out known binary markers
        ignore = {"FBCHUNKS", "BNRY", "LTLE"}
        valid_strings = [s for s in ascii_strings if s not in ignore and len(s) > 2]
        
        career_name = valid_strings[0] if len(valid_strings) > 0 else "Career Save"
        team_name = valid_strings[1] if len(valid_strings) > 1 else "Unknown Club"
        manager_name = valid_strings[2] if len(valid_strings) > 2 else "Unknown Manager"

        # Generate a stable identifier from career_name + manager_name
        # That way, different save files for the same career Mode update the same Career in DB
        stable_str = f"{career_name}_{manager_name}".strip().lower()
        save_id = hashlib.md5(stable_str.encode()).hexdigest()

        return SaveHeaderInfo(
            career_name=career_name,
            manager_name=manager_name,
            team_name=team_name,
            file_path=str(file_path),
            save_identifier=save_id,
        )

    def get_career_identifier(self, file_path: Path) -> str:
        """Generate a unique career identifier."""
        header = self.read_header(file_path)
        return header.save_identifier or hashlib.md5(str(file_path).encode()).hexdigest()

    def _find_databases(self, data: bytes) -> list[bytes]:
        """Find all embedded database sections in the binary data."""
        databases = []
        offset = data.find(DB_HEADER)

        while offset >= 0:
            # Read database size (4 bytes after the 8-byte header)
            db_size = struct.unpack_from("<I", data, offset + len(DB_HEADER))[0]
            if db_size <= 0 or offset + db_size > len(data):
                logger.warning(f"Invalid DB size {db_size} at offset {offset}")
                offset = data.find(DB_HEADER, offset + 1)
                continue

            db_data = data[offset : offset + db_size]
            databases.append(db_data)
            logger.info(f"Found DB at offset {offset}, size {db_size} bytes")

            offset = data.find(DB_HEADER, offset + db_size)

        return databases

    def _read_database(self, db_data: bytes) -> dict[str, list[dict]]:
        """Read a single embedded database and extract all tables.

        Returns a dict mapping table short names to lists of records.
        """
        reader = BinaryReader(db_data)
        tables = {}

        # Find the DB header within this chunk
        header_offset = db_data.find(DB_HEADER)
        if header_offset < 0:
            return tables

        reader.position = header_offset + len(DB_HEADER)

        # Database size
        db_size = reader.read_uint32_le()

        # Skip 4 bytes
        reader.read_bytes(4)

        # Table count
        table_count = reader.read_uint32_le()

        # Skip 4 bytes
        reader.read_bytes(4)

        logger.info(f"Database has {table_count} tables")

        # Read table directory (short names + offsets)
        table_short_names = []
        table_offsets = []
        for _ in range(table_count):
            short_name = reader.read_bytes(4).decode("ascii", errors="replace")
            offset = reader.read_uint32_le()
            table_short_names.append(short_name)
            table_offsets.append(offset)

        # Skip 4 bytes
        reader.read_bytes(4)

        tables_start_offset = reader.position

        # Read each table
        for i in range(table_count):
            short_name = table_short_names[i]

            reader.position = tables_start_offset + table_offsets[i]

            try:
                records = self._read_table(reader, short_name)
                if records:
                    tables[short_name] = records
                    logger.info(f"Table '{short_name}': {len(records)} records")
            except Exception as e:
                logger.warning(f"Failed to read table '{short_name}': {e}")
                continue

        return tables

    def _read_table(self, reader: BinaryReader, table_short_name: str) -> list[dict]:
        """Read a single table's records."""
        # Skip 4 bytes
        reader.read_bytes(4)

        # Record size
        record_size = reader.read_uint32_le()

        # Skip 10 bytes
        reader.read_bytes(10)

        # Valid records count
        valid_records = reader.read_uint16_le()

        # Skip 4 bytes
        reader.read_bytes(4)

        # Fields count
        fields_count = reader.read_uint8()

        # Skip 11 bytes
        reader.read_bytes(11)

        if valid_records <= 0 or fields_count <= 0:
            return []

        # Read field definitions
        field_types = []
        bit_offsets = []
        short_names = []
        bit_depths = []

        for _ in range(fields_count):
            field_type = reader.read_uint32_le()
            bit_offset = reader.read_uint32_le()
            field_short_name = reader.read_bytes(4).decode("ascii", errors="replace")
            bit_depth = reader.read_uint32_le()

            field_types.append(field_type)
            bit_offsets.append(bit_offset)
            short_names.append(field_short_name)
            bit_depths.append(bit_depth)

        # Sort fields by bit offset for correct reading order
        sorted_indices = sorted(range(fields_count), key=lambda k: bit_offsets[k])

        sorted_field_types = [field_types[i] for i in sorted_indices]
        sorted_bit_offsets = [bit_offsets[i] for i in sorted_indices]
        sorted_short_names = [short_names[i] for i in sorted_indices]
        sorted_bit_depths = [bit_depths[i] for i in sorted_indices]

        # Read records
        records = []
        for _ in range(valid_records):
            record = {}
            current_position = reader.position
            tmp_byte = 0
            current_bit_pos = 0

            for field_idx in range(fields_count):
                field_type = sorted_field_types[field_idx]
                field_name = sorted_short_names[field_idx]
                value = None

                try:
                    if field_type == 0:  # String
                        tmp_byte = 0
                        current_bit_pos = 0
                        reader.position = current_position + (sorted_bit_offsets[field_idx] >> 3)
                        str_len = sorted_bit_depths[field_idx] >> 3
                        value = reader.read_null_terminated_string(str_len)

                    elif field_type == 3:  # Integer (bit-packed)
                        val = 0
                        start_bit = 0
                        depth = sorted_bit_depths[field_idx]

                        if current_bit_pos != 0:
                            start_bit = 8 - current_bit_pos
                            val = tmp_byte >> current_bit_pos

                        while start_bit < depth:
                            tmp_byte = reader.read_uint8()
                            val += tmp_byte << start_bit
                            start_bit += 8

                        current_bit_pos = (depth + 8 - start_bit) & 7
                        val &= (1 << depth) - 1
                        value = val + RANGE_LOWS.get(table_short_name, {}).get(
                            field_name, 0
                        )

                    elif field_type == 4:  # Float
                        reader.position = current_position + (sorted_bit_offsets[field_idx] >> 3)
                        value = reader.read_float_le()

                    else:
                        value = None

                except Exception:
                    value = None

                record[field_name] = value

            reader.position = current_position + record_size
            records.append(record)

        return records

    def parse(self, file_path: Path) -> ParsedSaveData:
        """Parse a full save file and return structured data."""
        logger.info(f"Parsing save file: {file_path}")

        with open(file_path, "rb") as f:
            data = f.read()

        if not data.startswith(FBCHUNKS_MAGIC):
            raise ValueError(f"Not an FBCHUNKS file: {file_path}")

        # Read header info
        header = self.read_header(file_path)

        # Find and parse all embedded databases
        databases = self._find_databases(data)
        logger.info(f"Found {len(databases)} embedded database(s)")

        all_tables: dict[str, list[dict]] = {}
        for db_data in databases:
            tables = self._read_database(db_data)
            all_tables.update(tables)

        logger.info(f"Extracted {len(all_tables)} table(s) total: {list(all_tables.keys())}")

        # Post-process header with true database mappings
        try:
            self._populate_header_from_tables(header, all_tables)
        except Exception as e:
            logger.warning(f"Failed to post-process header from tables: {e}")

        # Build parsed data
        parsed = ParsedSaveData(
            header=header,
            raw_tables=all_tables,
        )

        return parsed

    @staticmethod
    def _populate_header_from_tables(
        header: SaveHeaderInfo, all_tables: dict[str, list[dict]]
    ) -> None:
        """Fill manager and club details from already-normalized table values."""
        career_users = all_tables.get("mPrV", [])
        if not career_users:
            return

        user_row = career_users[0]
        first_name = user_row.get("HdeP", "").strip()
        last_name = user_row.get("rREd", "").strip()
        if first_name or last_name:
            header.manager_name = f"{first_name} {last_name}".strip()

        club_team_id = user_row.get("NTyS")
        if club_team_id is None:
            return

        for team in all_tables.get("lyxL", []):
            if team.get("mCXg") == club_team_id:
                header.team_id = club_team_id
                team_name = team.get("AUsv")
                if team_name:
                    header.team_name = team_name
                return

def main():
    """CLI entry point for testing the parser."""
    import sys

    # Force UTF-8 for console output to avoid charmap errors on Windows
    if sys.stdout.encoding != 'utf-8':
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8')

    if len(sys.argv) < 2:
        print("Usage: python -m fc_universe.parser.fbchunks <save_file_path>")
        print()
        print("Example:")
        print('  python -m fc_universe.parser.fbchunks "C:\\Users\\arnav\\AppData\\Local\\EA SPORTS FC 26\\settings\\CmMgrC20260711160012077"')
        sys.exit(1)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    file_path = Path(sys.argv[1])
    if not file_path.exists():
        print(f"Error: File not found: {file_path}")
        sys.exit(1)

    parser = FbChunksParser()

    # Quick header read
    print("\n=== HEADER INFO ===")
    header = parser.read_header(file_path)
    print(f"  Career:  {header.career_name}")
    print(f"  Manager: {header.manager_name}")
    print(f"  Team:    {header.team_name}")
    print(f"  Save ID: {header.save_identifier}")

    # Full parse
    print("\n=== FULL PARSE ===")
    result = parser.parse(file_path)

    print(f"\nExtracted {len(result.raw_tables)} tables:")
    for table_name, records in result.raw_tables.items():
        print(f"  {table_name}: {len(records)} records")

    # Show sample data from first few tables
    print("\n=== SAMPLE DATA (first 3 records per table) ===")
    for table_name, records in list(result.raw_tables.items()):
        print(f"\n--- {table_name} ---")
        for record in records[:3]:
            # Trim long values for display
            display = {}
            for k, v in record.items():
                if isinstance(v, str) and len(v) > 50:
                    display[k] = v[:50] + "..."
                else:
                    display[k] = v
            print(f"  {display}")

    # Dump full data as JSON
    output_path = file_path.parent / f"{file_path.stem}_parsed.json"
    with open(output_path, "w", encoding="utf-8") as f:
        # Convert to serializable format
        serializable = {
            "header": result.header.model_dump(),
            "tables": {k: v for k, v in result.raw_tables.items()},
        }
        json.dump(serializable, f, indent=2, ensure_ascii=False, default=str)

    print(f"\nFull data exported to: {output_path}")


if __name__ == "__main__":
    main()
