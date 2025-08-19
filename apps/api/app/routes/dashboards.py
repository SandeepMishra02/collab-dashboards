from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os, json

router = APIRouter(prefix="/dashboards", tags=["dashboards"])

DATA_DIR = "storage"
os.makedirs(DATA_DIR, exist_ok=True)

def _path(dash_id: int) -> str:
    return os.path.join(DATA_DIR, f"dashboard_{dash_id}.json")

class Widget(BaseModel):
    id: str
    title: str
    note: Optional[str] = None

class Layout(BaseModel):
    widgets: List[Widget] = Field(default_factory=list)

class DashboardDoc(BaseModel):
    id: int
    title: str = ""
    layout: Layout = Field(default_factory=Layout)

def _load(dash_id: int) -> DashboardDoc:
    p = _path(dash_id)
    if not os.path.exists(p):
        # fresh stub
        return DashboardDoc(id=dash_id, title=f"Dashboard #{dash_id}")
    with open(p, "r") as f:
        data = json.load(f)
    # normalize
    widgets = data.get("layout", {}).get("widgets", [])
    if not isinstance(widgets, list):
        widgets = []
    return DashboardDoc(
        id=data.get("id", dash_id),
        title=data.get("title", f"Dashboard #{dash_id}"),
        layout=Layout(widgets=[Widget(**w) for w in widgets])
    )

def _save(doc: DashboardDoc):
    with open(_path(doc.id), "w") as f:
        json.dump(doc.dict(), f, indent=2)

@router.get("/{dash_id}")
def get_dashboard(dash_id: int) -> Dict[str, Any]:
    doc = _load(dash_id)
    return doc.dict()

@router.post("/{dash_id}")
def save_dashboard(dash_id: int, payload: Dict[str, Any]):
    # very forgiving normalization
    title = payload.get("title") or f"Dashboard #{dash_id}"
    widgets = payload.get("layout", {}).get("widgets", [])
    if not isinstance(widgets, list):
        raise HTTPException(status_code=422, detail="layout.widgets must be a list")
    # coerce items
    parsed = []
    for w in widgets:
        try:
            parsed.append(Widget(**w).dict())
        except Exception:
            pass
    doc = DashboardDoc(id=dash_id, title=title, layout=Layout(widgets=[Widget(**w) for w in parsed]))
    _save(doc)
    return {"ok": True}

@router.post("/{dash_id}/publish")
def publish_dashboard(dash_id: int):
    # no-op stub; integrate your token/link logic here if desired
    _ = _load(dash_id)  # ensure it exists
    return {"ok": True, "public_url": f"/embed/dashboards/{dash_id}"}






