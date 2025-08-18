from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models import Comment
from ..schemas import CommentIn

router = APIRouter(prefix="/comments", tags=["comments"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/{dashboard_id}")
def add_comment(dashboard_id: int, data: CommentIn, db: Session = Depends(get_db)):
    c = Comment(dashboard_id=dashboard_id, author_id=0, target=data.target, body=data.body)
    db.add(c); db.commit(); db.refresh(c)
    return {"id": c.id, "target": c.target, "body": c.body}

@router.get("/{dashboard_id}")
def list_comments(dashboard_id: int, db: Session = Depends(get_db)):
    cs = db.query(Comment).filter(Comment.dashboard_id==dashboard_id).order_by(Comment.created_at.desc()).all()
    return [{"id": c.id, "target": c.target, "body": c.body, "created_at": c.created_at.isoformat()} for c in cs]
