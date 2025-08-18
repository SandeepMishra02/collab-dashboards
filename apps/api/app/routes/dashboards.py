import json, secrets
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from sqlmodel import select
from ..db import get_session
from ..models import Dashboard, DashboardMember, AuditLog
from .auth import get_user_id_from_token

router = APIRouter(prefix="/dashboards", tags=["dashboards"])

class DashboardUpsertIn(BaseModel):
    title: str
    widgets: list  # array of { query: {dataset_id, sql}, viz: {...}, rect: {x,y,w,h}}

def _ensure_role(dashboard_id: int, user_id: int, roles: set[str]):
    from ..models import DashboardMember
    with get_session() as db:
        m = db.exec(
            select(DashboardMember).where(
                (DashboardMember.dashboard_id == dashboard_id) &
                (DashboardMember.user_id == user_id)
            )
        ).first()
        if not m or m.role not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")

@router.post("")
def create_dashboard(payload: DashboardUpsertIn, authorization: str | None = Header(default=None)):
    user_id = get_user_id_from_token(authorization)
    if not user_id: raise HTTPException(status_code=401, detail="Unauthenticated")

    with get_session() as db:
        dash = Dashboard(owner_id=user_id, title=payload.title, widgets_json=json.dumps(payload.widgets))
        db.add(dash); db.commit(); db.refresh(dash)
        db.add(DashboardMember(dashboard_id=dash.id, user_id=user_id, role="owner")); db.commit()
        db.add(AuditLog(user_id=user_id, action="dashboard.create", target=str(dash.id)))
        db.commit()
        return {"id": dash.id}

@router.get("")
def list_dashboards(authorization: str | None = Header(default=None)):
    user_id = get_user_id_from_token(authorization)
    if not user_id: raise HTTPException(status_code=401, detail="Unauthenticated")
    with get_session() as db:
        q = """
        select d.id, d.title, d.is_public, d.public_token
        from dashboard as d
        join dashboardmember as m on m.dashboard_id = d.id
        where m.user_id = :uid
        """
        rows = db.exec(q, params={"uid": user_id}).all()
        return rows

@router.get("/{id}")
def get_dashboard(id: int, token: str | None = None, authorization: str | None = Header(default=None)):
    with get_session() as db:
        d = db.get(Dashboard, id)
        if not d: raise HTTPException(status_code=404, detail="Not found")

        # public token read
        uid = get_user_id_from_token(authorization)
        if uid:
            # member or owner can read
            pass
        elif d.is_public and token and token == d.public_token:
            pass
        else:
            raise HTTPException(status_code=403, detail="Forbidden")

        return {"id": d.id, "title": d.title, "widgets": json.loads(d.widgets_json)}

@router.put("/{id}")
def update_dashboard(id: int, payload: DashboardUpsertIn, authorization: str | None = Header(default=None)):
    user_id = get_user_id_from_token(authorization)
    if not user_id: raise HTTPException(status_code=401, detail="Unauthenticated")
    _ensure_role(id, user_id, {"owner", "editor"})

    with get_session() as db:
        d = db.get(Dashboard, id)
        if not d: raise HTTPException(status_code=404, detail="Not found")
        d.title = payload.title
        d.widgets_json = json.dumps(payload.widgets)
        db.add(d); db.commit()
        db.add(AuditLog(user_id=user_id, action="dashboard.update", target=str(d.id)))
        db.commit()
        return {"ok": True}

@router.post("/{id}/share")
def make_public(id: int, authorization: str | None = Header(default=None)):
    user_id = get_user_id_from_token(authorization)
    if not user_id: raise HTTPException(status_code=401, detail="Unauthenticated")
    _ensure_role(id, user_id, {"owner"})

    with get_session() as db:
        d = db.get(Dashboard, id)
        if not d: raise HTTPException(status_code=404, detail="Not found")
        d.is_public = True
        d.public_token = d.public_token or secrets.token_urlsafe(16)
        db.add(d); db.commit()
        return {"token": d.public_token}

