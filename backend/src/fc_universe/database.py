"""Database engine and session management."""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from fc_universe.config import settings

connect_args = {}
if "sqlite" in settings.database_url:
    connect_args = {
        "check_same_thread": False,
        "timeout": 30,  # 30 seconds busy timeout
    }

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    echo=settings.debug,
)

# Enable WAL mode and optimize performance for SQLite
if "sqlite" in settings.database_url:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


def get_db():
    """Dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables in the database and run lightweight migrations."""
    Base.metadata.create_all(bind=engine)
    
    # Automatic Migration: Add 'gender' column to 'timeline_events' if missing
    import sqlite3
    from urllib.parse import urlparse
    
    db_url = settings.database_url
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(timeline_events)")
            cols = [col[1] for col in cursor.fetchall()]
            if cols and "gender" not in cols:
                cursor.execute("ALTER TABLE timeline_events ADD COLUMN gender INTEGER DEFAULT 0")
                conn.commit()
                print("Database migration: Added 'gender' column to 'timeline_events' table successfully.")
            
            cursor.execute("PRAGMA table_info(players)")
            p_cols = [col[1] for col in cursor.fetchall()]
            if p_cols and "player_type" not in p_cols:
                cursor.execute("ALTER TABLE players ADD COLUMN player_type VARCHAR(20) DEFAULT 'real'")
                cursor.execute("UPDATE players SET player_type = 'youth' WHERE game_id >= 280000")
                conn.commit()
                print("Database migration: Added 'player_type' column to 'players' table successfully.")
            conn.close()
        except Exception as e:
            print(f"Migration warning: Failed to check/add gender column: {e}")
