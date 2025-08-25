# app/routes/comments.py
from fastapi import APIRouter, HTTPException, Body, Depends
from typing import List, Dict, Any
from app.utils.storage import COMMENTS_FILE, read_json, write_json
from app.utils.auth import current_identity, require_role

router = APIRouter()

@router.get("/{dash_id}/{widget_id}", response_model=List[Dict[str, Any]])
async def list_comments(dash_id: int, widget_id: str):
    store = read_json(COMMENTS_FILE) or {}
    return store.get(str(dash_id), {}).get(widget_id, [])

@router.post("/{dash_id}/{widget_id}")
async def add_comment(
    dash_id: int,
    widget_id: str,
    comment: Dict[str, Any] = Body(...),
    ident=Depends(current_identity)
):
    user, role = ident
    # viewers can also comment (adjust if you want stricter)
    require_role("viewer", role)

    store = read_json(COMMENTS_FILE) or {}
    d = store.setdefault(str(dash_id), {})
    arr = d.setdefault(widget_id, [])
    arr.append({
        "user": user or "anon",
        "text": comment.get("text", ""),
        "ts": comment.get("ts") or None
    })
    write_json(COMMENTS_FILE, store)
    return {"ok": True}


