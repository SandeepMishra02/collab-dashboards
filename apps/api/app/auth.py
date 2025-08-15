from fastapi import Depends, Header
from sqlalchemy.orm import Session
from .db import SessionLocal, User

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def current_user(x_user_email: str | None = Header(None), db: Session = Depends(get_db)) -> User:
    email = x_user_email or "dev@local.test"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, name=email.split("@")[0])
        db.add(user); db.commit(); db.refresh(user)
    return user
