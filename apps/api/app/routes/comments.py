from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from sqlmodel import select
from ..db import get_session
from ..models import Comment, AuditLog
from .auth import get_user_id_from_token

router = APIRouter(prefix="/comments", tags=["comments"])

class AddCommentIn(BaseModel):
    dashboard_id: int
    body: str

@router.get("/{dashboard_id}")
def list_comments(dashboard_id: int):
    with get_session() as db:
        rows = db.exec(select(Comment).where(Comment.dashboard_id == dashboard_id).order_by(Comment.created_at)).all()
        return [{"id": c.id, "author_id": c.author_id, "body": c.body, "created_at": c.created_at.isoformat()} for c in rows]

@router.post("")
def add_comment(payload: AddCommentIn, authorization: str | None = Header(default=None)):
    user_id = get_user_id_from_token(authorization)
    if not user_id: raise HTTPException(status_code=401, detail="Unauthenticated")
    with get_session() as db:
        c = Comment(dashboard_id=payload.dashboard_id, author_id=user_id, body=payload.body)
        db.add(c); db.commit(); db.refresh(c)
        db.add(AuditLog(user_id=user_id, action="comment.add", target=str(payload.dashboard_id)))
        db.commit()
        return {"id": c.id}

