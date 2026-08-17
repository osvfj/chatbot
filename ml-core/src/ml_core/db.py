import sqlite3
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"
DB_PATH = DATA_DIR / "cafebot.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = connect()
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    migrations = {
        "mensaje": {"foto_id": "TEXT"},
        "foto": {
            "description": "TEXT",
            "detector_status": "TEXT NOT NULL DEFAULT 'unavailable'",
            "top_predictions": "TEXT",
        },
        "dialogo_estado": {"foto_id": "TEXT", "vision_inicial": "TEXT NOT NULL DEFAULT '{}'"},
    }
    for table, columns in migrations.items():
        existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
        for name, definition in columns.items():
            if name not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")
    conn.commit()
    conn.close()
