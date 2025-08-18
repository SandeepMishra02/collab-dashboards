from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set

router = APIRouter(prefix="/ws", tags=["collab"])

rooms: Dict[str, Set[WebSocket]] = {}

@router.websocket("/dashboards/{dash_id}")
async def ws_dashboard(ws: WebSocket, dash_id: str):
    await ws.accept()
    group = rooms.setdefault(dash_id, set())
    group.add(ws)
    try:
        # broadcast join
        await broadcast(group, {"type": "presence", "event": "join", "count": len(group)})
        while True:
            msg = await ws.receive_json()
            # naive relay (cursor, msg, etc.)
            await broadcast(group, msg, exclude=ws)
    except WebSocketDisconnect:
        group.remove(ws)
        await broadcast(group, {"type": "presence", "event": "leave", "count": len(group)})

async def broadcast(group: Set[WebSocket], payload: dict, exclude: WebSocket | None = None):
    for s in list(group):
        if s is exclude: 
            continue
        try:
            await s.send_json(payload)
        except:
            group.discard(s)

