from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import duckdb, os, json, time
from app.routes.datasets import resolve_dataset

router = APIRouter()

# ---------- Query models ----------
class BuilderFilter(BaseModel):
    col: str
    op: str      # =, !=, >, <, >=, <=, contains, startswith, endswith
    val: str

class BuilderInput(BaseModel):
    dataset_id: int
    select: list[str] = []
    filters: list[BuilderFilter] = []
    group_by: list[str] = []
    aggregates: list[str] = []   # e.g. SUM(value) as total

class RunInput(BaseModel):
    dataset_id: int
    sql: str

# ---------- LRU-ish cache with TTL (store rows + columns) ----------
# key -> (ts, {"rows":[...], "columns":[...]})
_CACHE: dict[str, tuple[float, dict]] = {}
_TTL = 60.0  # seconds

def _cache_key(dataset_id: int, sql: str) -> str:
    return f"{dataset_id}:{hash(sql)}"

def _get_cached(dataset_id: int, sql: str):
    k = _cache_key(dataset_id, sql)
    ent = _CACHE.get(k)
    now = time.time()
    if ent and now - ent[0] < _TTL:
        return ent[1]
    return None

def _set_cached(dataset_id: int, sql: str, payload: dict):
    k = _cache_key(dataset_id, sql)
    _CACHE[k] = (time.time(), payload)

# ---------- Helpers ----------
def _connect(dataset_id: int):
    path = resolve_dataset(dataset_id)
    if not path:
        raise HTTPException(404, "Dataset not found")
    con = duckdb.connect(database=':memory:')
    con.execute(f"CREATE TABLE t AS SELECT * FROM read_csv_auto('{path}', HEADER=TRUE);")
    return con

def _build_sql(b: BuilderInput) -> str:
    select = b.select or ["*"]
    where = []
    for f in b.filters:
        col = f.col
        if f.op in ["=", "!=", ">", "<", ">=", "<="]:
            v = f.val.replace("'", "''")
            where.append(f"{col} {f.op} '{v}'")
        elif f.op == "contains":
            v = f"%%{f.val.replace('%','').replace('_','')}%%"
            where.append(f"lower({col}) like lower('{v}')")
        elif f.op == "startswith":
            v = f"{f.val.replace('%','').replace('_','')}%%"
            where.append(f"lower({col}) like lower('{v}')")
        elif f.op == "endswith":
            v = f"%%{f.val.replace('%','').replace('_','')}"
            where.append(f"lower({col}) like lower('{v}')")
    where_clause = f" WHERE {' AND '.join(where)}" if where else ""
    group_by = f" GROUP BY {', '.join(b.group_by)}" if b.group_by else ""
    aggs = [a for a in b.aggregates if '(' in a and ')' in a] if b.aggregates else []
    sel = ", ".join(select + aggs)
    return f"SELECT {sel} FROM t{where_clause}{group_by} LIMIT 500;"

# ---------- Endpoints ----------
@router.post("/build")
def build_query(b: BuilderInput):
    sql = _build_sql(b)
    return {"sql": sql}

@router.post("/run")
def run_query(inp: RunInput):
    # backward-compatible: {{table}} -> t
    sql = inp.sql.replace("{{table}}", "t") if "{{table}}" in inp.sql else inp.sql

    cached = _get_cached(inp.dataset_id, sql)
    if cached is not None:
        return cached

    con = _connect(inp.dataset_id)
    try:
        res = con.execute(sql).fetchall()
        cols = [d[0] for d in con.description]
        rows = [dict(zip(cols, r)) for r in res]
        payload = {"rows": rows, "columns": cols}
        _set_cached(inp.dataset_id, sql, payload)
        return payload
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query error: {e}")
    finally:
        con.close()







