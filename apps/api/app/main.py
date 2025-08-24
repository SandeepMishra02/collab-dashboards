from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routes import datasets, queries, dashboards
from app.utils.storage import ensure_data_dirs, read_json
from app.utils.audit import AUDIT_FILE



ensure_data_dirs()

app = FastAPI(title="Collab Dashboards API")

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
app.include_router(queries.router, prefix="/queries", tags=["queries"])
app.include_router(dashboards.router, prefix="/dashboards", tags=["dashboards"])

# -------- In-memory collab hubs (per dashboard) --------
class Hub:
    def __init__(self):
        self.clients: set[WebSocket] = set()
        self.last_payload = {"widgets": []}

    async def join(self, ws: WebSocket):
        await ws.accept()
        self.clients.add(ws)
        await self.broadcast({"type": "join", "count": len(self.clients)})
        # Sync current state to new client
        await ws.send_json({"type": "patch", "payload": self.last_payload})

    async def leave(self, ws: WebSocket):
        if ws in self.clients:
            self.clients.remove(ws)
            await self.broadcast({"type": "leave", "count": len(self.clients)})

    async def broadcast(self, msg: dict):
        dead = []
        for c in self.clients:
            try:
                await c.send_json(msg)
            except Exception:
                dead.append(c)
        for d in dead:
            self.clients.discard(d)

    async def handle_message(self, msg: dict):
        # We treat payload as source of truth and merge by widget id
        if msg.get("type") == "patch" and isinstance(msg.get("payload"), dict):
            payload = msg["payload"]
            # normalize
            widgets = payload.get("widgets") or []
            # de-dup by id
            dedup = {}
            for w in widgets:
                if not isinstance(w, dict): 
                    continue
                i = w.get("id")
                if i:
                    dedup[i] = {**dedup.get(i, {}), **w}
            self.last_payload = {"widgets": list(dedup.values())}
            await self.broadcast({"type": "patch", "payload": self.last_payload})

hubs: dict[int, Hub] = {}

def get_hub(dash_id: int) -> Hub:
    if dash_id not in hubs:
        hubs[dash_id] = Hub()
    return hubs[dash_id]

@app.websocket("/collab/{dash_id}")
async def collab_ws(ws: WebSocket, dash_id: int):
    hub = get_hub(dash_id)
    await hub.join(ws)
    try:
        while True:
            data = await ws.receive_json()
            await hub.handle_message(data)
    except WebSocketDisconnect:
        await hub.leave(ws)
    except Exception:
        await hub.leave(ws)
    finally:
        audit("ws_disconnect", dash_id=dash_id)

@app.get("/_debug/audit")
def dbg(request: Request):
    return read_json(AUDIT_FILE) or []

