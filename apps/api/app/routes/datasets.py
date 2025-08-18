import os, json
from typing import Optional
import pandas as pd
from fastapi import APIRouter, File, UploadFile, Query, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/datasets", tags=["datasets"])

UPLOAD_DIR = "uploads"
INDEX_FILE = os.path.join(UPLOAD_DIR, "index.json")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def _load_index():
    if not os.path.exists(INDEX_FILE):
        return {"last_id": 0, "items": {}}
    with open(INDEX_FILE, "r") as f:
        return json.load(f)

def _save_index(idx): 
    with open(INDEX_FILE, "w") as f:
        json.dump(idx, f)

def resolve_dataset(dataset_id: int) -> Optional[str]:
    idx = _load_index()
    it = idx["items"].get(str(dataset_id))
    return (it or {}).get("path")

@router.post("/upload")
async def upload_dataset(
    name: str = Query(..., description="Logical dataset name"),
    file: UploadFile = File(...),
):
    try:
        idx = _load_index()
        new_id = int(idx.get("last_id", 0)) + 1
        path = os.path.join(UPLOAD_DIR, f"{new_id}_{file.filename}")
        with open(path, "wb") as f:
            f.write(await file.read())
        idx["last_id"] = new_id
        idx["items"][str(new_id)] = {"name": name, "path": path}
        _save_index(idx)
        # quick schema
        df = pd.read_csv(path, nrows=50)
        cols = [{"name": c, "dtype": str(df[c].dtype)} for c in df.columns]
        return {"id": new_id, "name": name, "columns": cols}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{id}/preview")
def preview_dataset(id: int):
    path = resolve_dataset(id)
    if not path:
        raise HTTPException(status_code=404, detail="Dataset not found")
    df = pd.read_csv(path, nrows=50)
    return {"columns": list(df.columns), "rows": df.to_dict(orient="records")}



