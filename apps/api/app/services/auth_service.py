from __future__ import annotations
from sqlalchemy.orm import Session
from fastapi import HTTPException
from ..models import User
from ..utils.security import get_password_hash, verify_password, create_access_token

def register_user(db: Session, email: str, password: str, role: str="viewer"):
    if db.query(User).filter(User.email==email).first():
        raise HTTPException(status_code=409, detail="User exists")
    u = User(email=email, password_hash=get_password_hash(password), role=role)
    db.add(u); db.commit(); db.refresh(u)
    return u

def login_user(db: Session, email: str, password: str):
    u = db.query(User).filter(User.email==email).first()
    if not u or not verify_password(password, u.password_hash):
        raise HTTPException(status_code=401, detail="Bad credentials")
    token = create_access_token({"id": u.id, "email": u.email, "role": u.role})
    return token
