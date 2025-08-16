from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import sqlite3, csv, io, os, re
from typing import List, Dict, Any

router = APIRouter()

DB_PATH = os.environ.get("API_SQLITE_PATH", os.path.join(os.getcwd(), "data", "app.db"))
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def _ensure_datasets_table(conn: sqlite3.Connection) -> None:
    # Create table if it doesn't exist
    conn.execute("""
    CREATE TABLE IF NOT EXISTS datasets (
        name TEXT PRIMARY KEY,
        filename TEXT
        -- created_at may be added afterward by migration below
    )
    """)
    # Add created_at if missing
    info = conn.execute("PRAGMA table_info(datasets)").fetchall()
    cols = {row["name"] if isinstance(row, sqlite3.Row) else row[1] for row in info}
    if "created_at" not in cols:
        conn.execute("ALTER TABLE datasets ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    conn.commit()

def init_db():
    conn = connect()
    _ensure_datasets_table(conn)
    conn.close()

init_db()

_valid_ident = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

def safe_ident(name: str) -> str:
    """Ensure a safe SQLite identifier (table/column)."""
    if not _valid_ident.match(name):
        raise HTTPException(422, f"Invalid identifier: {name}")
    return name

@router.post("/upload")
async def upload_dataset(name: str = Form(...), file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Upload a CSV file and store as a SQLite table named `name`.
    Also registers it in datasets registry.
    """
    table = safe_ident(name)
    data = await file.read()
    text = data.decode("utf-8")

    reader = csv.reader(io.StringIO(text))
    try:
        headers = next(reader)
    except StopIteration:
        raise HTTPException(422, "Empty CSV")

    # validate headers -> identifiers
    cols = [safe_ident(h.strip() or f"col{i}") for i, h in enumerate(headers)]

    conn = connect()
    cur = conn.cursor()
    cur.execute(f"DROP TABLE IF EXISTS {table}")
    cur.execute(f"CREATE TABLE {table} ({', '.join([f'{c} TEXT' for c in cols])})")

    qs = ", ".join(["?"] * len(cols))
    for row in reader:
        cur.execute(f"INSERT INTO {table} VALUES ({qs})", row[:len(cols)])

    _ensure_datasets_table(conn)
    cur.execute("INSERT OR REPLACE INTO datasets (name, filename) VALUES (?, ?)", (table, file.filename))
    conn.commit()
    conn.close()
    return {"ok": True, "name": table, "columns": cols}

@router.get("/datasets")
def list_datasets() -> Dict[str, List[str]]:
    conn = connect()
    _ensure_datasets_table(conn)
    rows = conn.execute("SELECT name FROM datasets ORDER BY created_at DESC").fetchall()
    conn.close()
    return {"datasets": [r["name"] for r in rows]}

@router.get("/datasets/{name}/preview")
def preview_dataset(name: str) -> Dict[str, Any]:
    table = safe_ident(name)
    conn = connect()
    try:
        rows = conn.execute(f"SELECT * FROM {table} LIMIT 25").fetchall()
    except sqlite3.OperationalError:
        conn.close()
        raise HTTPException(404, "Dataset not found")

    columns = [k for k in rows[0].keys()] if rows else [
        r["name"] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()
    ]
    out_rows = [list(r) for r in rows]
    conn.close()
    return {"columns": columns, "rows": out_rows}

@router.post("/query")
def run_query(query: str = Form(...), dataset: str = Form(...)) -> Dict[str, Any]:
    """
    Run SQL string with {{table}} placeholder replaced by selected dataset.
    """
    table = safe_ident(dataset)
    sql = query.replace("{{table}}", table)

    conn = connect()
    cur = conn.cursor()
    try:
        cur.execute(sql)
    except sqlite3.Error as e:
        conn.close()
        raise HTTPException(400, f"SQL error: {e}")

    columns = [d[0] for d in cur.description] if cur.description else []
    rows = cur.fetchall()
    out_rows = [list(r) for r in rows]
    conn.close()
    return {"columns": columns, "rows": out_rows, "sql": sql}
