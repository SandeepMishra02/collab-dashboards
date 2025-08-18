from __future__ import annotations
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models import Dashboard, AuditLog
from ..schemas import DashboardIn
from ..utils.security import require_role

router = APIRouter(prefix="/dashboards", tags=["dashboards"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("", dependencies=[Depends(require_role({"owner","editor"}))])
def create_dash(data: DashboardIn, user=Depends(require_role({"owner","editor"})), db: Session = Depends(get_db)):
    d = Dashboard(owner_id=user["id"], title=data.title, layout=data.layout)
    db.add(d); db.add(AuditLog(user_id=user["id"], action="dashboard.create", payload={"id":None}))
    db.commit(); db.refresh(d)
    return {"id": d.id, "title": d.title, "layout": d.layout}

@router.get("/{dash_id}")
def get_dash(dash_id: int, db: Session = Depends(get_db)):
    d = db.get(Dashboard, dash_id)
    if not d: raise HTTPException(404)
    return {"id": d.id, "title": d.title, "layout": d.layout, "public_token": d.public_token}

@router.post("/{dash_id}/publish")
def publish(dash_id: int, db: Session = Depends(get_db)):
    d = db.get(Dashboard, dash_id)
    if not d: raise HTTPException(404)
    d.public_token = secrets.token_hex(16)
    db.commit()
    return {"public_token": d.public_token}
