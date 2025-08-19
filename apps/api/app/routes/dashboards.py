from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import os, json, time

router = APIRouter(prefix="/dashboards", tags=["dashboards"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

DB_FILE = os.path.join(UPLOAD_DIR, "dashboards.json")


# ---------- storage helpers (self-healing) ----------
def _default_store() -> Dict[str, Any]:
    return {"last_id": 0, "items": {}}

def _load_store() -> Dict[str, Any]:
    if not os.path.exists(DB_FILE):
        return _default_store()
    try:
        with open(DB_FILE, "r") as f:
            raw = json.load(f)
    except Exception:
        return _default_store()

    if not isinstance(raw, dict):
        raw = {}
    if "last_id" not in raw or not isinstance(raw.get("last_id"), int):
        raw["last_id"] = 0
    if "items" not in raw or not isinstance(raw.get("items"), dict):
        raw["items"] = {}
    return raw

def _save_store(store: Dict[str, Any]) -> None:
    if "last_id" not in store or not isinstance(store["last_id"], int):
        store["last_id"] = 0
    if "items" not in store or not isinstance(store["items"], dict):
        store["items"] = {}
    with open(DB_FILE, "w") as f:
        json.dump(store, f)


# ---------- models ----------
class DashboardIn(BaseModel):
    title: str
    state: Dict[str, Any] = {}

class DashboardOut(BaseModel):
    id: int
    title: str
    state: Dict[str, Any]
    created_at: float
    updated_at: float


# ---------- endpoints ----------
@router.get("/", response_model=list[DashboardOut])
def list_dashboards():
    store = _load_store()
    out = []
    for sid, item in store["items"].items():
        out.append(DashboardOut(
            id=int(sid),
            title=item.get("title", f"Dashboard {sid}"),
            state=item.get("state", {}),
            created_at=item.get("created_at", 0.0),
            updated_at=item.get("updated_at", 0.0),
        ))
    # newest first
    out.sort(key=lambda x: x.updated_at, reverse=True)
    return out

@router.post("/", response_model=DashboardOut)
def create_dashboard(data: DashboardIn):
    store = _load_store()
    new_id = int(store.get("last_id", 0)) + 1
    now = time.time()
    store["items"][str(new_id)] = {
        "title": data.title,
        "state": data.state,
        "created_at": now,
        "updated_at": now,
    }
    store["last_id"] = new_id
    _save_store(store)
    return DashboardOut(id=new_id, title=data.title, state=data.state,
                        created_at=now, updated_at=now)

@router.get("/{id}", response_model=DashboardOut)
def get_dashboard(id: int):
    store = _load_store()
    item = store["items"].get(str(id))
    if not item:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return DashboardOut(
        id=id,
        title=item.get("title", f"Dashboard {id}"),
        state=item.get("state", {}),
        created_at=item.get("created_at", 0.0),
        updated_at=item.get("updated_at", 0.0),
    )

@router.put("/{id}", response_model=DashboardOut)
def update_dashboard(id: int, data: DashboardIn):
    store = _load_store()
    if str(id) not in store["items"]:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    now = time.time()
    store["items"][str(id)].update({
        "title": data.title,
        "state": data.state,
        "updated_at": now,
    })
    _save_store(store)
    item = store["items"][str(id)]
    return DashboardOut(
        id=id,
        title=item["title"],
        state=item["state"],
        created_at=item.get("created_at", now),
        updated_at=item.get("updated_at", now),
    )



