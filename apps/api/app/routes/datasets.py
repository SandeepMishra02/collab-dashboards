from __future__ import annotations
import os, json
from typing import Annotated
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
import pandas as pd
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models import Dataset, AuditLog
from ..utils.security import require_role

router = APIRouter(prefix="/datasets", tags=["datasets"])
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "data/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/upload")
async def upload_dataset(
    name: Annotated[str, Form(...)],
    file: UploadFile = File(...),
    user=Depends(require_role({"owner","editor"})),
    db: Session = Depends(get_db)
):
    ext = file.filename.split(".")[-1].lower()
    if ext not in {"csv","json"}:
        raise HTTPException(400,"Only CSV/JSON supported")
    path = os.path.join(UPLOAD_DIR, f"{name}.{ext}")
    with open(path,"wb") as f: f.write(await file.read())
    # schema
    if ext=="csv":
        df = pd.read_csv(path, nrows=200)
    else:
        df = pd.read_json(path, lines=False)
    schema = {c: str(t) for c,t in df.dtypes.to_dict().items()}
    ds = Dataset(owner_id=user["id"], name=name, format=ext, path=path, schema=schema)
    db.add(ds); db.add(AuditLog(user_id=user["id"], action="dataset.upload", payload={"name":name}))
    db.commit(); db.refresh(ds)
    return {"id": ds.id, "name": ds.name, "format": ds.format, "schema": ds.schema}

@router.get("/{dataset_id}/preview")
def preview(dataset_id: int, db: Session = Depends(get_db)):
    ds = db.get(Dataset, dataset_id)
    if not ds: raise HTTPException(404)
    if ds.format=="csv":
        df = pd.read_csv(ds.path, nrows=50)
    else:
        df = pd.read_json(ds.path).head(50)
    return {"columns": list(df.columns), "rows": df.to_dict(orient="records")}
