from fastapi import Header, HTTPException
from typing import Optional, Tuple

Role = str  # "owner" | "editor" | "viewer" | "public"

async def current_identity(
    x_user: Optional[str] = Header(None),
    x_role: Optional[str] = Header(None)
) -> Tuple[Optional[str], Role]:
    # In MVP we take identity/role from headers set by the frontend.
    # Default unauthenticated users are "public/viewer".
    user = x_user or None
    role: Role = (x_role or ("viewer" if user else "public")).lower()
    if role not in ("owner", "editor", "viewer", "public"):
        role = "viewer"
    return user, role

def require_role(role: Role, actual: Role):
    hierarchy = {"public": 0, "viewer": 1, "editor": 2, "owner": 3}
    if hierarchy.get(actual, 0) < hierarchy.get(role, 0):
        raise HTTPException(status_code=403, detail="Insufficient role")
