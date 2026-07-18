"""Abstract parser interface.

The parser is designed to be replaceable. If EA changes the save format
in FC 27 or FC 28, only the parser implementation needs to change.
The import logic, database schema, analytics, and UI remain untouched.
"""

from abc import ABC, abstractmethod
from pathlib import Path

from fc_universe.parser.models import ParsedSaveData, SaveHeaderInfo


class SaveParser(ABC):
    """Abstract interface for parsing EA FC save files."""

    @abstractmethod
    def parse(self, file_path: Path) -> ParsedSaveData:
        """Parse a save file and return normalized intermediate data.

        Args:
            file_path: Path to the Career Mode save file.

        Returns:
            ParsedSaveData containing all extracted entities.
        """

    @abstractmethod
    def read_header(self, file_path: Path) -> SaveHeaderInfo:
        """Extract quick header information without full parsing.

        Args:
            file_path: Path to the Career Mode save file.

        Returns:
            SaveHeaderInfo with career name, manager, team, etc.
        """

    @abstractmethod
    def get_career_identifier(self, file_path: Path) -> str:
        """Extract or compute a unique identifier for this career.

        Used to determine if a save belongs to an existing career
        or is a brand-new one. Must be stable across saves of the
        same career.

        Args:
            file_path: Path to the Career Mode save file.

        Returns:
            A unique string identifier for the career.
        """
