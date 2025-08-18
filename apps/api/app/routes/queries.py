from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import duckdb, pandas as pd
from .datasets import resolve_dataset

router = APIRouter(prefix="/queries", tags=["queries"])

class RunQueryIn(BaseModel):
    dataset_id: int
    sql: str

@router.post("/run")
def run_query(data: RunQueryIn):
    path = resolve_dataset(data.dataset_id)
    if not path:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        df = pd.read_csv(path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read dataset: {e}")

    con = duckdb.connect(database=":memory:")
    con.register("t", df)
    sql = (data.sql or "").replace("{{table}}", "t").strip()
    if not sql:
        raise HTTPException(status_code=422, detail="SQL is required")
    try:
        out = con.execute(sql).fetchdf()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query error: {e}")

    return {"columns": list(out.columns), "rows": out.head(1000).to_dict(orient="records")}




