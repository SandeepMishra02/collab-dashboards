from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..schemas import UserCreate, Token, UserOut
from ..services.auth_service import register_user, login_user

router = APIRouter(prefix="/auth", tags=["auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register", response_model=UserOut)
def register(data: UserCreate, db: Session = Depends(get_db)):
    u = register_user(db, data.email, data.password, data.role)
    return {"id": u.id, "email": u.email, "role": u.role}

@router.post("/login", response_model=Token)
def login(data: UserCreate, db: Session = Depends(get_db)):
    token = login_user(db, data.email, data.password)
    return {"access_token": token}
