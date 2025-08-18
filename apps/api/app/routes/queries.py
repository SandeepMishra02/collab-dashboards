from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models import Dataset, Query, AuditLog
from ..schemas import QueryRun
from ..services.query_engine import run_sql_over_file, build_sql_from_builder, _mk_rel

router = APIRouter(prefix="/queries", tags=["queries"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/run")
def run_query(data: QueryRun, db: Session = Depends(get_db)):
    ds = db.get(Dataset, data.dataset_id)
    if not ds: raise HTTPException(404,"Dataset not found")
    if data.sql:
        res = run_sql_over_file(ds.path, ds.format, data.sql)
    else:
        rel = _mk_rel(ds.path, ds.format)
        sql = build_sql_from_builder(data.builder.dict() if data.builder else {}, rel)
        res = run_sql_over_file(ds.path, ds.format, sql)
    db.add(AuditLog(action="query.run", payload={"dataset":ds.id}))
    db.commit()
    return res
