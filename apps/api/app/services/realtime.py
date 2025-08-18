# Minimal presence + Yjs rooms using ypy-websocket
from __future__ import annotations
from typing import Dict, Set
from fastapi import WebSocket
from loguru import logger

class PresenceHub:
    def __init__(self) -> None:
        self.rooms: Dict[str, Set[WebSocket]] = {}

    async def join(self, room: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(room, set()).add(ws)
        await self.broadcast(room, {"type":"join","count":len(self.rooms[room])})

    async def leave(self, room: str, ws: WebSocket):
        try:
            self.rooms.get(room, set()).discard(ws)
            await self.broadcast(room, {"type":"leave","count":len(self.rooms.get(room,set()))})
        except Exception as e:
            logger.error(e)

    async def broadcast(self, room: str, msg: dict):
        dead=set()
        for ws in self.rooms.get(room,set()):
            try:
                await ws.send_json(msg)
            except Exception:
                dead.add(ws)
        for d in dead:
            self.rooms[room].discard(d)

presence_hub = PresenceHub()
