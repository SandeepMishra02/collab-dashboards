from fastapi import APIRouter, WebSocket, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os, json, secrets, time

# NOTE: No prefix here because main.py already mounts with prefix="/dashboards"
router = APIRouter()

# ---------- storage ----------
DATA_ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "data")
DASH_DIR = os.path.abspath(os.path.join(DATA_ROOT, "dashboards"))
os.makedirs(DASH_DIR, exist_ok=True)

COMMENTS_PATH = os.path.join(DASH_DIR, "_comments.json")
if not os.path.exists(COMMENTS_PATH):
    with open(COMMENTS_PATH, "w") as f:
        json.dump({}, f)

def _comments_load() -> Dict[str, Dict[str, list]]:
    try:
        with open(COMMENTS_PATH, "r") as f:
            return json.load(f)
    except Exception:
        return {}

def _comments_save(store: Dict[str, Dict[str, list]]):
    tmp = COMMENTS_PATH + ".tmp"
    with open(tmp, "w") as f:
        json.dump(store, f)
    os.replace(tmp, COMMENTS_PATH)

def _path(dash_id: int) -> str:
    return os.path.join(DASH_DIR, f"{dash_id}.json")

def _load(dash_id: int) -> Dict[str, Any]:
    fp = _path(dash_id)
    if not os.path.exists(fp):
        doc = {"layout": {"widgets": []}, "published_token": None}
        with open(fp, "w") as f:
            json.dump(doc, f)
        return doc
    with open(fp, "r") as f:
        return json.load(f)

def _save(dash_id: int, doc: Dict[str, Any]) -> None:
    with open(_path(dash_id), "w") as f:
        json.dump(doc, f)

# ---------- models -----------
class Widget(BaseModel):
    id: str
    title: str = ""
    note: Optional[str] = None

class Layout(BaseModel):
    widgets: List[Widget] = Field(default_factory=list)

class DashboardDoc(BaseModel):
    layout: Layout = Field(default_factory=Layout)
    published_token: Optional[str] = None

class NewComment(BaseModel):
    widgetId: str
    text: str
    author: Optional[str] = "anon"

# ---------- REST -------------
@router.get("")
def list_dashboards() -> List[Dict[str, int]]:
    ids: List[Dict[str, int]] = []
    for name in os.listdir(DASH_DIR):
        if name.endswith(".json"):
            base = name[:-5]
            if base.isdigit():
                ids.append({"id": int(base)})
    if not ids:
        ids = [{"id": 1}, {"id": 2}, {"id": 3}]
    return ids

@router.get("/{dash_id}")
def get_dashboard(dash_id: int) -> DashboardDoc:
    return DashboardDoc(**_load(dash_id))

@router.post("/{dash_id}")
def save_dashboard(dash_id: int, body: Any = Body(...)):
    """
    Accepts:
      - { "layout": { "widgets": [...] } }
      - { "widgets": [...] }
      - [ ... ]  (raw widgets array)
    """
    doc = _load(dash_id)

    def coerce(b: Any) -> Layout:
        if isinstance(b, dict) and "layout" in b:
            return Layout(**b["layout"])
        if isinstance(b, dict) and "widgets" in b:
            return Layout(widgets=b["widgets"])
        if isinstance(b, list):
            return Layout(widgets=b)
        raise HTTPException(status_code=422, detail="Invalid payload; send widgets[] or {widgets} or {layout}.")

    layout = coerce(body)
    doc["layout"] = json.loads(layout.model_dump_json())
    _save(dash_id, doc)
    return {"ok": True}

@router.post("/{dash_id}/publish")
def publish_dashboard(dash_id: int):
    doc = _load(dash_id)
    doc["published_token"] = secrets.token_urlsafe(16)
    _save(dash_id, doc)
    return {"ok": True, "token": doc["published_token"]}

# ---------- Comments (per-widget) ----------
@router.get("/{dash_id}/comments")
def list_comments(dash_id: int) -> List[Dict[str, Any]]:
    store = _comments_load()
    dash = store.get(str(dash_id), {})
    out: List[Dict[str, Any]] = []
    for wid, arr in dash.items():
        for c in arr:
            out.append({**c, "widgetId": wid})
    return sorted(out, key=lambda c: c.get("ts", 0))

@router.post("/{dash_id}/comments")
def add_comment(dash_id: int, c: NewComment):
    store = _comments_load()
    d = store.setdefault(str(dash_id), {})
    arr = d.setdefault(c.widgetId, [])
    arr.append({
        "text": c.text,
        "author": c.author or "anon",
        "ts": int(time.time())
    })
    _comments_save(store)
    return {"ok": True}














