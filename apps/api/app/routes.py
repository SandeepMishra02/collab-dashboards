from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Body, Form
from sqlalchemy.orm import Session
from uuid import UUID
import duckdb
from .db import Dataset, Dashboard, Widget, Permission, User, AuditLog
from .auth import current_user, get_db
from .schemas import *
from .storage import save_upload, duck_expr
from .sqlgen import build_sql_from_steps

router = APIRouter()

@router.post("/datasets")
async def create_dataset(
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    path = save_upload(file.file, file.filename)
    con = duckdb.connect()
    df = con.execute(f"SELECT * FROM {duck_expr(path)} LIMIT 50").fetch_df()
    schema = [{"name": c, "dtype": str(df[c].dtype)} for c in df.columns]
    ds = Dataset(owner_id=user.id, name=name, storage_url=path, schema_json=schema)
    db.add(ds); db.commit(); db.refresh(ds)
    return {"id": str(ds.id), "name": ds.name, "storage_url": ds.storage_url, "schema_json": schema}

@router.get("/datasets")
def list_datasets(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = (
        db.query(Dataset)
        .filter(Dataset.owner_id == user.id)
        .order_by(Dataset.id.desc())   
        .all()
    )
    return [
        {"id": str(d.id), "name": d.name, "storage_url": d.storage_url, "schema_json": d.schema_json}
        for d in rows
    ]



@router.get("/datasets/{dataset_id}/preview")
def preview_dataset(dataset_id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)):
    ds = db.query(Dataset).get(dataset_id)
    if not ds: raise HTTPException(404, "Dataset not found")
    con = duckdb.connect()
    df = con.execute(f"SELECT * FROM {duck_expr(ds.storage_url)} LIMIT 100").fetch_df()
    return {"columns": list(df.columns), "rows": df.to_dict(orient="records")}

@router.post("/query")
def run_query(body: QueryIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    ds = db.query(Dataset).get(body.datasetId)
    if not ds: raise HTTPException(404, "Dataset not found")
    sql = body.sql.replace("{{table}}", duck_expr(ds.storage_url))
    con = duckdb.connect(); df = con.execute(sql).fetch_df()
    return {"columns": list(df.columns), "rows": df.to_dict(orient="records")}

@router.post("/dashboards")
def create_dashboard(payload: DashboardCreateIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    import uuid
    d = Dashboard(owner_id=user.id, title=payload.title, is_public=False, ydoc_room=f"dashboard:{user.id}:{uuid.uuid4()}")
    db.add(d); db.commit(); db.refresh(d)
    db.merge(Permission(dashboard_id=d.id, user_id=user.id, role="owner")); db.commit()
    return {"id": str(d.id), "title": d.title, "is_public": d.is_public, "ydoc_room": d.ydoc_room}

@router.get("/dashboards/{dashboard_id}")
def get_dashboard(dashboard_id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)):
    d = db.query(Dashboard).get(dashboard_id)
    if not d: raise HTTPException(404, "Not found")
    widgets = db.query(Widget).filter(Widget.dashboard_id == d.id).all()
    return {"id": str(d.id), "title": d.title, "is_public": d.is_public, "ydoc_room": d.ydoc_room,
            "widgets": [{"id": str(w.id), "type": w.type, "position": w.position_json, "config": w.config_json} for w in widgets]}

@router.post("/widgets")
def create_widget(payload: WidgetCreateIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    w = Widget(dashboard_id=payload.dashboardId, type=payload.type, position_json=payload.position, config_json=payload.config)
    db.add(w); db.commit(); db.refresh(w)
    return {"id": str(w.id)}

@router.patch("/widgets/{widget_id}")
def update_widget(widget_id: UUID, body: dict = Body(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    w = db.query(Widget).get(widget_id)
    if not w: raise HTTPException(404, "Not found")
    if "position" in body: w.position_json = body["position"]
    if "config" in body: w.config_json = body["config"]
    db.commit(); return {"ok": True}

@router.post("/share")
def share(payload: ShareIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    d = db.query(Dashboard).get(payload.dashboardId)
    if not d: raise HTTPException(404, "Dashboard not found")
    perm = db.query(Permission).filter_by(dashboard_id=d.id, user_id=user.id).first()
    if not perm or perm.role not in ("owner","editor"): raise HTTPException(403, "No permission")
    out = []
    for email in payload.emails:
        u = db.query(User).filter_by(email=email).first()
        if not u: u = User(email=email, name=email.split("@")[0]); db.add(u); db.commit(); db.refresh(u)
        db.merge(Permission(dashboard_id=d.id, user_id=u.id, role=payload.role)); db.commit(); out.append(email)
    return {"shared": out}

@router.post("/dashboards/{dashboard_id}/toggle-public")
def toggle_public(dashboard_id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)):
    d = db.query(Dashboard).get(dashboard_id)
    if not d: raise HTTPException(404, "Dashboard not found")
    d.is_public = not d.is_public; db.commit(); return {"is_public": d.is_public}

@router.get("/public/{dashboard_id}")
def public_view(dashboard_id: UUID, db: Session = Depends(get_db)):
    d = db.query(Dashboard).get(dashboard_id)
    if not d or not d.is_public: raise HTTPException(404, "Not public")
    widgets = db.query(Widget).filter(Widget.dashboard_id == d.id).all()
    return {"id": str(d.id), "title": d.title, "widgets": [{"id": str(w.id), "type": w.type, "position": w.position_json, "config": w.config_json} for w in widgets]}

@router.post("/transform/query")
def transform_query(datasetId: UUID, steps: list[dict], db: Session = Depends(get_db), user: User = Depends(current_user)):
    ds = db.query(Dataset).get(datasetId)
    if not ds: raise HTTPException(404, "Dataset not found")
    sql = build_sql_from_steps(duck_expr(ds.storage_url), steps)
    con = duckdb.connect(); df = con.execute(sql).fetch_df()
    return {"sql": sql, "columns": list(df.columns), "rows": df.to_dict(orient="records")}
