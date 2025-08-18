from fastapi import APIRouter
from sqlmodel import select
from ..db import get_session
from ..models import AuditLog

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("")
def recent(limit: int = 50):
    with get_session() as db:
        rows = db.exec(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)).all()
        return [
            {"id": r.id, "user_id": r.user_id, "action": r.action, "target": r.target, "meta": r.meta, "created_at": r.created_at.isoformat()}
            for r in rows
        ]

