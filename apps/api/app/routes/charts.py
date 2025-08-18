from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models import Chart, Query
from ..schemas import ChartConfig

router = APIRouter(prefix="/charts", tags=["charts"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/config")
def save_chart(cfg: ChartConfig, db: Session = Depends(get_db)):
    # minimal persistence stub; frontend usually builds plotly spec client-side
    ch = Chart(query_id=0, owner_id=0, config=cfg.model_dump())
    db.add(ch); db.commit(); db.refresh(ch)
    return {"id": ch.id, "config": ch.config}
