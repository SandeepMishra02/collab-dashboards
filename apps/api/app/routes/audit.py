from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models import AuditLog

router = APIRouter(prefix="/audit", tags=["audit"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("")
def list_audit(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(200).all()
    return [{"id": l.id, "action": l.action, "payload": l.payload, "created_at": l.created_at.isoformat()} for l in logs]
