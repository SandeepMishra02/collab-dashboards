from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlmodel import select
from ..db import get_session, init_db
from ..models import User

router = APIRouter(prefix="/auth", tags=["auth"])

# initialize tables
init_db()

class DevLoginIn(BaseModel):
    email: str
    name: str

@router.post("/dev-login")
def dev_login(data: DevLoginIn):
    with get_session() as db:
        user = db.exec(select(User).where(User.email == data.email)).first()
        if not user:
            user = User(email=data.email, name=data.name)
            db.add(user); db.commit(); db.refresh(user)
        # Return pseudo token: in real use JWT
        return {"token": f"user-{user.id}", "user": {"id": user.id, "email": user.email, "name": user.name}}

def get_user_id_from_token(token: str | None) -> int | None:
    if not token: return None
    if token.startswith("Bearer "): token = token.split(" ", 1)[1]
    if not token.startswith("user-"): return None
    try: return int(token.split("-", 1)[1])
    except: return None

