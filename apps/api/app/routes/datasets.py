from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, Dict, Any
import os, json, pandas as pd

router = APIRouter(prefix="/datasets", tags=["datasets"])

UPLOAD_DIR = "uploads"
INDEX_FILE = os.path.join(UPLOAD_DIR, "index.json")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# -------- index helpers (robust / self-healing) --------
def _default_index() -> Dict[str, Any]:
    return {"last_id": 0, "items": {}}

def _load_index() -> Dict[str, Any]:
    """Load index.json and repair if missing/invalid structure."""
    if not os.path.exists(INDEX_FILE):
        return _default_index()
    try:
        with open(INDEX_FILE, "r") as f:
            raw = json.load(f)
    except Exception:
        # corrupted file
        return _default_index()

    if not isinstance(raw, dict):
        raw = {}

    # self-heal required keys
    if "last_id" not in raw or not isinstance(raw.get("last_id"), int):
        raw["last_id"] = 0
    if "items" not in raw or not isinstance(raw.get("items"), dict):
        raw["items"] = {}

    return raw

def _save_index(idx: Dict[str, Any]) -> None:
    # make sure structure is valid before saving
    if "last_id" not in idx or not isinstance(idx["last_id"], int):
        idx["last_id"] = 0
    if "items" not in idx or not isinstance(idx["items"], dict):
        idx["items"] = {}

    with open(INDEX_FILE, "w") as f:
        json.dump(idx, f)

def resolve_dataset(dataset_id: int) -> Optional[str]:
    idx = _load_index()
    item = idx["items"].get(str(dataset_id))
    return (item or {}).get("path")

# -------- endpoints --------
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

        # quick, best-effort schema sniff (optional)
        cols: list[str] = []
        try:
            if path.endswith(".csv"):
                df = pd.read_csv(path, nrows=50)
            elif path.endswith(".json"):
                df = pd.read_json(path)
            else:
                df = None
            if df is not None:
                cols = df.columns.tolist()
        except Exception:
            pass

        return {"id": new_id, "name": name, "columns": cols}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{id}/preview")
def preview_dataset(id: int):
    path = resolve_dataset(id)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        if path.endswith(".csv"):
            df = pd.read_csv(path, nrows=50)
        elif path.endswith(".json"):
            df = pd.read_json(path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "columns": df.columns.tolist(),
        "rows": df.to_dict(orient="records"),
    }





