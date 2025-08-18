from __future__ import annotations
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..services.realtime import presence_hub

router = APIRouter(prefix="/collab", tags=["collab"])

@router.websocket("/{dashboard_id}")
async def ws_room(websocket: WebSocket, dashboard_id: str):
    await presence_hub.join(dashboard_id, websocket)
    try:
        while True:
            msg = await websocket.receive_json()
            # broadcast edits (client sends CRDT updates or patches)
            await presence_hub.broadcast(dashboard_id, {"type":"patch","payload":msg})
    except WebSocketDisconnect:
        await presence_hub.leave(dashboard_id, websocket)
