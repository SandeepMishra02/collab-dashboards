from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Body, Form
from sqlalchemy.orm import Session
import duckdb, sqlite3, os
from .db import Dataset, Dashboard, Widget, Permission, User, AuditLog
from .auth import current_user, get_db
from .storage import save_upload, duck_expr

router = APIRouter()

# ---- Local SQLite registry for datasets (id, name, storage_url, created_at) ----

DATA_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "app.db")
os.makedirs(os.path.dirname(DATA_DB_PATH), exist_ok=True)

def _conn():
    return sqlite3.connect(DATA_DB_PATH)

def _ensure_datasets_table(conn: sqlite3.Connection):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS datasets(
            id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
            name TEXT UNIQUE NOT NULL,
            storage_url TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    """)
    conn.commit()

def init_db():
    conn = _conn()
    _ensure_datasets_table(conn)
    conn.close()

# initialize registry on import
init_db()

# -------------------- Datasets --------------------

@router.post("/datasets")
async def create_dataset(
    name: str = Form(...),
    file: UploadFile = File(...),
):
    """
    Upload a file and register it in the local SQLite datasets registry.
    """
    path = save_upload(file.file, file.filename)  # stores in apps/api/data/uploads/...
    conn = _conn()
    try:
        _ensure_datasets_table(conn)
        # Upsert by name: replace existing record’s file path
        cur = conn.execute("SELECT id FROM datasets WHERE name=?", (name,))
        row = cur.fetchone()
        if row:
            conn.execute("UPDATE datasets SET storage_url=?, created_at=datetime('now') WHERE id=?", (path, row[0]))
            ds_id = row[0]
        else:
            conn.execute("INSERT INTO datasets(name, storage_url) VALUES(?, ?)", (name, path))
            ds_id = conn.execute("SELECT id FROM datasets WHERE name=?", (name,)).fetchone()[0]
        conn.commit()
    finally:
        conn.close()
    return {"id": ds_id, "name": name, "storage_url": path}

@router.get("/datasets")
def list_datasets():
    """
    Return [{id, name}] ordered by created_at desc.
    """
    conn = _conn()
    try:
        _ensure_datasets_table(conn)
        rows = conn.execute(
            "SELECT id, name FROM datasets ORDER BY datetime(created_at) DESC"
        ).fetchall()
        return [{"id": r[0], "name": r[1]} for r in rows]
    finally:
        conn.close()

@router.get("/datasets/{dataset_id}/preview")
def preview_dataset(dataset_id: str):
    """
    Read first 100 rows via DuckDB from the uploaded file behind dataset_id.
    """
    conn = _conn()
    try:
        r = conn.execute("SELECT storage_url FROM datasets WHERE id=?", (dataset_id,)).fetchone()
        if not r:
            raise HTTPException(404, "Dataset not found")
        storage_url = r[0]
    finally:
        conn.close()

    con = duckdb.connect()
    df = con.execute(f"SELECT * FROM {duck_expr(storage_url)} LIMIT 100").fetch_df()
    return {"columns": list(df.columns), "rows": df.to_dict(orient="records")}

@router.post("/query")
def run_query(body: dict = Body(...)):
    """
    Body: { datasetId: string, sql: string }
    Replaces {{table}} in the SQL with a proper DuckDB table expression to the file.
    """
    dataset_id = body.get("datasetId")
    sql = body.get("sql")
    if not dataset_id or not sql:
        raise HTTPException(400, "datasetId and sql are required")

    conn = _conn()
    try:
        r = conn.execute("SELECT storage_url FROM datasets WHERE id=?", (dataset_id,)).fetchone()
        if not r:
            raise HTTPException(404, "Dataset not found")
        storage_url = r[0]
    finally:
        conn.close()

    con = duckdb.connect()
    final_sql = sql.replace("{{table}}", duck_expr(storage_url))
    try:
        df = con.execute(final_sql).fetch_df()
    except Exception as e:
        raise HTTPException(400, f"SQL error: {e}")
    return {"columns": list(df.columns), "rows": df.to_dict(orient="records")}

# -------------------- (other existing dashboard/widget routes keep working) --------------------
