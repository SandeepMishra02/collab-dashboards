from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from uuid import UUID
import duckdb, json, os, sqlite3, re
from .db import Dataset, Dashboard, Widget, Permission, User, AuditLog
from .auth import current_user, get_db
from .schemas import *
from .storage import save_upload, duck_expr

router = APIRouter()

# --- Local SQLite bootstrap helpers (safe for local dev) ---------------------
DB_PATH = os.getenv("DATABASE_URL", "sqlite:///../data/app.db")
# We only touch sqlite file directly for bootstrap when using sqlite:/// scheme.
_is_sqlite = DB_PATH.startswith("sqlite:///")
_fs_path = None
if _is_sqlite:
    # DATABASE_URL like sqlite:///../data/app.db  -> fs path ../data/app.db
    _fs_path = DB_PATH.replace("sqlite:///", "", 1)

def _open_sqlite():
    if not _is_sqlite:
        return None
    os.makedirs(os.path.dirname(_fs_path), exist_ok=True)
    return sqlite3.connect(_fs_path)

def _ensure_datasets_table():
    if not _is_sqlite:
        return
    conn = _open_sqlite()
    try:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS datasets(
          id           TEXT PRIMARY KEY,
          name         TEXT UNIQUE NOT NULL,
          storage_url  TEXT NOT NULL,
          schema_json  TEXT NOT NULL,
          created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        # Ensure UNIQUE(name) exists (older tables won’t have it)
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_datasets_name ON datasets(name)")
        # Backfill id for any rows missing it (older bad migrations)
        cur = conn.execute("SELECT rowid, id FROM datasets")
        rows = cur.fetchall()
        for rowid, idv in rows:
            if idv is None or idv == "":
                # cheap uuid-ish: lower(hex(randomblob(16)))
                nid = conn.execute("SELECT lower(hex(randomblob(16)))").fetchone()[0]
                conn.execute("UPDATE datasets SET id=? WHERE rowid=?", (nid, rowid))
        conn.commit()
    finally:
        conn.close()

_ensure_datasets_table()

def _row_to_ds(row):
    # row is tuple in sqlite (id, name, storage_url, schema_json, created_at)
    return {
        "id": row[0],
        "name": row[1],
        "storage_url": row[2],
        "schema_json": json.loads(row[3]) if isinstance(row[3], str) else row[3],
        "created_at": row[4]
    }

def _get_dataset_by_key(key: str):
    """
    Accepts either id or name. Returns sqlite row or None.
    """
    if not _is_sqlite:
        return None
    conn = _open_sqlite()
    try:
        # try id first, then name
        row = conn.execute(
            "SELECT id,name,storage_url,schema_json,created_at FROM datasets WHERE id=?",
            (key,)
        ).fetchone()
        if not row:
            row = conn.execute(
                "SELECT id,name,storage_url,schema_json,created_at FROM datasets WHERE name=?",
                (key,)
            ).fetchone()
        return row
    finally:
        conn.close()

# --- Endpoints ----------------------------------------------------------------

@router.get("/datasets")
def list_datasets():
    """
    List datasets newest-first.
    """
    if _is_sqlite:
        conn = _open_sqlite()
        try:
            rows = conn.execute(
                "SELECT id,name,storage_url,schema_json,created_at "
                "FROM datasets ORDER BY created_at DESC"
            ).fetchall()
            return [{"id": r[0], "name": r[1]} for r in rows]
        finally:
            conn.close()
    else:
        # (Optional) SQLAlchemy path if you switch back to Postgres
        raise HTTPException(501, "Only SQLite is wired in local dev")

@router.post("/datasets")
async def create_dataset(
    name: str = Body(None),
    file: UploadFile = File(...),
):
    """
    Multipart upload: 'name' + 'file'.
    Upsert by name (replace file + schema if same name).
    """
    if not name:
        raise HTTPException(422, detail="Field 'name' is required")

    # Save bytes to local storage
    path = save_upload(file.file, file.filename)

    # Peek schema using duckdb; LIMIT keeps it quick
    con = duckdb.connect()
    df = con.execute(f"SELECT * FROM {duck_expr(path)} LIMIT 50").fetch_df()
    schema = [{"name": c, "dtype": str(df[c].dtype)} for c in df.columns]

    if _is_sqlite:
        conn = _open_sqlite()
        try:
            # Generate an id eagerly; ON CONFLICT(name) will keep original id if exists
            new_id = conn.execute("SELECT lower(hex(randomblob(16)))").fetchone()[0]
            conn.execute("""
              INSERT INTO datasets(id, name, storage_url, schema_json)
              VALUES(?, ?, ?, ?)
              ON CONFLICT(name) DO UPDATE SET
                storage_url=excluded.storage_url,
                schema_json=excluded.schema_json,
                created_at=CURRENT_TIMESTAMP
            """, (new_id, name, path, json.dumps(schema)))
            conn.commit()

            row = _get_dataset_by_key(name)
            return {"id": row[0], "name": row[1], "storage_url": row[2], "schema_json": schema}
        finally:
            conn.close()
    else:
        raise HTTPException(501, "Only SQLite is wired in local dev")

@router.get("/datasets/{key}/preview")
def preview_dataset(key: str):
    """
    Get a quick preview by id or name (key).
    """
    row = _get_dataset_by_key(key) if _is_sqlite else None
    if not row:
        raise HTTPException(404, "Dataset not found")

    _, _name, storage_url, _, _ = row
    con = duckdb.connect()
    df = con.execute(f"SELECT * FROM {duck_expr(storage_url)} LIMIT 100").fetch_df()
    return {
        "id": row[0],
        "name": _name,
        "columns": list(df.columns),
        "rows": df.to_dict(orient="records"),
    }

@router.post("/query")
def run_query(body: dict = Body(...)):
    """
    { "datasetId": "<id or name>", "sql": "SELECT ..." }
    Replaces {{table}} with the physical duckdb table expr.
    """
    ds_key = body.get("datasetId")
    sql = body.get("sql")
    if not ds_key or not sql:
        raise HTTPException(400, "datasetId and sql are required")

    row = _get_dataset_by_key(ds_key) if _is_sqlite else None
    if not row:
        raise HTTPException(404, "Dataset not found")

    storage_url = row[2]
    sql_final = sql.replace("{{table}}", duck_expr(storage_url))

    con = duckdb.connect()
    df = con.execute(sql_final).fetch_df()
    return {"columns": list(df.columns), "rows": df.to_dict(orient="records")}
