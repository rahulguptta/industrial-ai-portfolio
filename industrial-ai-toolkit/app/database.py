import sqlite3
import os
import uuid
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "sessions.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # lets us access columns by name
    return conn


def init_db():
    """Create the sessions table if it doesn't already exist."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            created_at TEXT,
            updated_at TEXT,
            filename TEXT,
            final_filename TEXT,
            columns TEXT,
            rows INTEGER,
            project_id TEXT,
            target_variable TEXT,
            current_step TEXT,
            column_types TEXT,
            algorithm TEXT,
            metrics TEXT
        )
    """)
    conn.commit()
    conn.close()


def create_session(filename: str, columns: list, rows: int, project_id: str = "", target_variable: str = "") -> str:
    session_id = str(uuid.uuid4())
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO sessions (session_id, created_at, updated_at, filename, columns, rows, project_id, target_variable, current_step)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (session_id, datetime.utcnow().isoformat(), datetime.utcnow().isoformat(), filename, ",".join(columns), rows, project_id, target_variable, "basic-info"))
    conn.commit()
    conn.close()
    return session_id

def get_session(session_id: str):
    """Fetch a session's saved state by ID. Returns None if not found."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()

    if row is None:
        return None

    return {
        "session_id": row["session_id"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "filename": row["filename"],
        "final_filename": row["final_filename"],
        "columns": row["columns"].split(",") if row["columns"] else [],
        "rows": row["rows"],
        "project_id": row["project_id"],
        "target_variable": row["target_variable"],
        "current_step": row["current_step"],
        "column_types": row["column_types"],
        "algorithm": row["algorithm"],
        "metrics": row["metrics"],
    }


def update_session(session_id: str, **fields):
    if not fields:
        return

    allowed = {"target_variable", "algorithm", "metrics", "current_step", "final_filename", "column_types", "updated_at"}
    set_clause = []
    values = []
    for key, value in fields.items():
        if key in allowed:
            set_clause.append(f"{key} = ?")
            values.append(value)

    if not set_clause:
        return

    values.append(session_id)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(f"UPDATE sessions SET {', '.join(set_clause)} WHERE session_id = ?", values)
    conn.commit()
    conn.close()