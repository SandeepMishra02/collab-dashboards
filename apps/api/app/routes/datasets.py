from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Form
import pandas as pd
import os, json, uuid

router = APIRouter()

DATA_DIR = "data"
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
INDEX_FILE = os.path.join(DATA_DIR, "datasets_index.json")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def _load_index():
    if not os.path.exists(INDEX_FILE):
        return {"last_id": 0, "items": {}}
    with open(INDEX_FILE, "r") as f:
        return json.load(f)

def _save_index(idx):
    with open(INDEX_FILE, "w") as f:
        json.dump(idx, f)

def resolve_dataset(dataset_id: int) -> str | None:
    idx = _load_index()
    it = idx["items"].get(str(dataset_id))
    return (it or {}).get("path")

@router.post("/upload")
async def upload_dataset(
    name: str = Form(..., description="Logical dataset name"),
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
        # quick schema check
        try:
            pd.read_csv(path, nrows=5)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid CSV")
        return {"id": new_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{id}/preview")
def preview_dataset(id: int):
    path = resolve_dataset(id)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Dataset not found")
    try:
        df = pd.read_csv(path)
        cols = df.columns.tolist()
        rows = df.head(50).to_dict(orient="records")
        # simple schema inference
        schema = {c: str(df[c].dtype) for c in cols}
        return {"columns": cols, "rows": rows, "schema": schema}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/last_id")
def last_id():
    idx = _load_index()
    return {"last_id": int(idx.get("last_id", 0))}






