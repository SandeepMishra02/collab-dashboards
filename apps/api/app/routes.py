from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List
import os, json, sqlite3, duckdb

from .storage import save_upload, duck_expr

router = APIRouter()

# ---------- SQLite helpers ----------
ROOT_DIR = os.path.dirname(os.path.dirname(__file__))  # apps/api/app -> apps/api
DATA_DIR = os.path.join(ROOT_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "app.db")

def _ensure_dirs():
    os.makedirs(DATA_DIR, exist_ok=True)

def get_conn():
    _ensure_dirs()
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    # table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS datasets(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            storage_url TEXT NOT NULL,
            schema_json TEXT,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
    """)
    # make sure "name" is unique even if table was created earlier without it
    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_datasets_name ON datasets(name)")
    conn.commit()
    conn.close()

init_db()

# ---------- Schemas ----------
class QueryIn(BaseModel):
    datasetId: str
    sql: str

# ---------- Endpoints ----------
@router.post("/datasets")
async def create_dataset(
    name: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Save file, infer schema, upsert by dataset name.
    """
    # Save upload
    path = save_upload(file.file, file.filename)

    # Quick schema preview
    con = duckdb.connect()
    df = con.execute(f"SELECT * FROM {duck_expr(path)} LIMIT 50").fetch_df()
    schema = [{"name": c, "dtype": str(df[c].dtype)} for c in df.columns]

    # Upsert by name
    conn = get_conn()
    try:
        conn.execute(
            """
            INSERT INTO datasets(name, storage_url, schema_json)
            VALUES(?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                storage_url=excluded.storage_url,
                schema_json=excluded.schema_json,
                created_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
            """,
            (name, path, json.dumps(schema)),
        )
        conn.commit()
    except sqlite3.OperationalError:
        # If someone has an older DB without unique idx and the ON CONFLICT still fails for any reason,
        # fall back to manual upsert.
        conn.execute("INSERT OR IGNORE INTO datasets(name, storage_url, schema_json) VALUES(?, ?, ?)", (name, path, json.dumps(schema)))
        conn.execute(
            "UPDATE datasets SET storage_url=?, schema_json=?, created_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE name=?",
            (path, json.dumps(schema), name),
        )
        conn.commit()

    row = conn.execute("SELECT id, name, storage_url, schema_json FROM datasets WHERE name=?", (name,)).fetchone()
    conn.close()

    return {
        "id": row["id"],
        "name": row["name"],
        "storage_url": row["storage_url"],
        "schema_json": json.loads(row["schema_json"]) if row["schema_json"] else []
    }

@router.get("/datasets")
def list_datasets():
    conn = get_conn()
    rows = conn.execute("""
        SELECT id, name FROM datasets
        ORDER BY datetime(created_at) DESC, id DESC
    """).fetchall()
    conn.close()
    return [{"id": r["id"], "name": r["name"]} for r in rows]

@router.get("/datasets/{dataset_name}/preview")
def preview_dataset(dataset_name: str):
    conn = get_conn()
    row = conn.execute("SELECT id, name, storage_url, schema_json FROM datasets WHERE name=?", (dataset_name,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Dataset not found")

    path = row["storage_url"]
    con = duckdb.connect()
    df = con.execute(f"SELECT * FROM {duck_expr(path)} LIMIT 100").fetch_df()

    return {
        "id": row["id"],
        "name": row["name"],
        "storage_url": path,
        "schema_json": json.loads(row["schema_json"]) if row["schema_json"] else [],
        "columns": list(df.columns),
        "rows": df.to_dict(orient="records"),
    }

@router.post("/query")
def run_query(body: QueryIn):
    dataset_key = body.datasetId
    conn = get_conn()
    row = conn.execute(
        "SELECT storage_url FROM datasets WHERE name=? OR CAST(id AS TEXT)=?",
        (dataset_key, dataset_key),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Dataset not found")

    table_expr = duck_expr(row["storage_url"])
    sql = body.sql.replace("{{table}}", table_expr)
    try:
        con = duckdb.connect()
        df = con.execute(sql).fetch_df()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SQL error: {e}")

    return {"columns": list(df.columns), "rows": df.to_dict(orient="records")}
