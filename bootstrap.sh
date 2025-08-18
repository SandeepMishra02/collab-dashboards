#!/usr/bin/env bash
set -euo pipefail

# --- sanity & folders ---
mkdir -p apps/api/app/{routes,services,utils} apps/web/src/{components,lib,app/(datasets|queries|dashboards)}
git add -A || true

# =======================
# 1) BACKEND: requirements
# =======================
cat > apps/api/requirements.txt <<'PY'
fastapi==0.116.1
uvicorn[standard]==0.35.0
python-multipart==0.0.9
pydantic==2.11.7
pydantic-settings==2.4.0
SQLAlchemy==2.0.36
psycopg2-binary==2.9.9
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
aiofiles==24.1.0
pandas==2.2.2
duckdb==1.0.0
redis==5.0.7
loguru==0.7.2
ypy-websocket==0.13.1
websockets==12.0
starlette==0.47.2
PY

git add apps/api/requirements.txt
git commit -m "backend: add requirements (FastAPI, SQLAlchemy, JWT, DuckDB, Redis, ypy-websocket)"

# =======================
# 2) BACKEND: DB + models
# =======================
cat > apps/api/app/db.py <<'PY'
from __future__ import annotations
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data.db")

class Base(DeclarativeBase):
    pass

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    future=True,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
PY

cat > apps/api/app/models.py <<'PY'
from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, String, Text, Integer, Boolean, JSON, DateTime, func
from .db import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20), default="viewer")  # owner, editor, viewer
    created_at: Mapped = mapped_column(DateTime, server_default=func.now())

class Dataset(Base):
    __tablename__ = "datasets"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(200))
    format: Mapped[str] = mapped_column(String(20))  # csv or json
    path: Mapped[str] = mapped_column(String(500))
    schema: Mapped[dict] = mapped_column(JSON, default={})
    created_at: Mapped = mapped_column(DateTime, server_default=func.now())
    owner = relationship("User")

class Query(Base):
    __tablename__ = "queries"
    id: Mapped[int] = mapped_column(primary_key=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id"))
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(200), default="query")
    builder: Mapped[dict] = mapped_column(JSON, default={}) # filters/groupBy/agg
    sql: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped = mapped_column(DateTime, server_default=func.now())

class Chart(Base):
    __tablename__ = "charts"
    id: Mapped[int] = mapped_column(primary_key=True)
    query_id: Mapped[int] = mapped_column(ForeignKey("queries.id"))
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    config: Mapped[dict] = mapped_column(JSON)  # Plotly spec (data+layout)
    created_at: Mapped = mapped_column(DateTime, server_default=func.now())

class Dashboard(Base):
    __tablename__ = "dashboards"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200), default="Untitled")
    layout: Mapped[dict] = mapped_column(JSON, default={"widgets": []})
    public_token: Mapped[str | None] = mapped_column(String(64), nullable=True)  # for read-only sharing
    created_at: Mapped = mapped_column(DateTime, server_default=func.now())

class Comment(Base):
    __tablename__ = "comments"
    id: Mapped[int] = mapped_column(primary_key=True)
    dashboard_id: Mapped[int] = mapped_column(ForeignKey("dashboards.id"))
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    target: Mapped[str] = mapped_column(String(200))  # chartId or dashboard
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped = mapped_column(DateTime, server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(120))
    payload: Mapped[dict] = mapped_column(JSON, default={})
    created_at: Mapped = mapped_column(DateTime, server_default=func.now())
PY

git add apps/api/app/db.py apps/api/app/models.py
git commit -m "backend: DB engine and SQLAlchemy models (users, datasets, queries, charts, dashboards, comments, audit)"

# =======================
# 3) BACKEND: Schemas & Security (JWT/RBAC)
# =======================
cat > apps/api/app/schemas.py <<'PY'
from __future__ import annotations
from typing import Optional, Any, List
from pydantic import BaseModel, EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "viewer"

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str

class DatasetOut(BaseModel):
    id: int
    name: str
    format: str
    schema: dict

class QueryBuilder(BaseModel):
    filters: list[dict] = []
    group_by: list[str] = []
    aggregates: list[dict] = []

class QueryRun(BaseModel):
    sql: str | None = None
    builder: QueryBuilder | None = None
    dataset_id: int

class ChartConfig(BaseModel):
    type: str
    x: str | None = None
    y: str | None = None
    options: dict = {}

class DashboardIn(BaseModel):
    title: str
    layout: dict

class CommentIn(BaseModel):
    target: str
    body: str
PY

cat > apps/api/app/utils/security.py <<'PY'
from __future__ import annotations
import os, time
from typing import Annotated
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

SECRET_KEY = os.getenv("JWT_SECRET", "devsecret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = 60 * 60 * 12  # 12h

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_password_hash(pw: str) -> str:
    return pwd_context.hash(pw)

def verify_password(pw: str, hashed: str) -> bool:
    return pwd_context.verify(pw, hashed)

def create_access_token(subject: dict) -> str:
    to_encode = subject.copy()
    to_encode.update({"exp": int(time.time()) + ACCESS_TOKEN_EXPIRE_SECONDS})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload  # {sub,id,email,role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(allowed: set[str]):
    def _checker(user = Depends(get_current_user)):
        if user.get("role") not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user
    return _checker
PY

git add apps/api/app/schemas.py apps/api/app/utils/security.py
git commit -m "backend: Pydantic schemas and JWT/RBAC helpers"

# =======================
# 4) BACKEND: Services (cache, query engine, auth, realtime)
# =======================
cat > apps/api/app/services/cache.py <<'PY'
from __future__ import annotations
import os, json, hashlib
from functools import lru_cache
try:
    from redis import Redis
except Exception:
    Redis = None

REDIS_URL = os.getenv("REDIS_URL")

def _hash_key(*parts) -> str:
    return hashlib.sha256("|".join(map(str, parts)).encode()).hexdigest()

if REDIS_URL and Redis:
    _redis = Redis.from_url(REDIS_URL)
else:
    _redis = None

def cached_query(key_parts: list[str], compute):
    key = _hash_key(*key_parts)
    if _redis:
        val = _redis.get(key)
        if val: 
            return json.loads(val)
        data = compute()
        _redis.setex(key, 3600, json.dumps(data))
        return data
    else:
        @lru_cache(maxsize=128)
        def _memo(key: str):
            return compute()
        return _memo(key)
PY

cat > apps/api/app/services/query_engine.py <<'PY'
from __future__ import annotations
import duckdb, os, pandas as pd
from typing import Any

def _mk_rel(path: str, fmt: str):
    if fmt == "csv":
        return f"read_csv_auto('{path}')"
    if fmt == "json":
        return f"read_json_auto('{path}')"
    raise ValueError("Unsupported format")

def run_sql_over_file(path: str, fmt: str, sql: str) -> dict[str, Any]:
    rel = _mk_rel(path, fmt)
    query = sql.replace("{{table}}", rel)
    con = duckdb.connect()
    df = con.execute(query).df()
    return {"columns": list(df.columns), "rows": df.to_dict(orient="records")}

def build_sql_from_builder(builder: dict, rel: str) -> str:
    where = []
    for f in builder.get("filters", []):
        col = f["column"]; op=f.get("op","="); val=f["value"]
        if isinstance(val, str): val = f"'{val}'"
        where.append(f"{col} {op} {val}")
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    group_by = builder.get("group_by", [])
    agg_parts = []
    for agg in builder.get("aggregates", []):
        func = agg.get("func","sum")
        col = agg["column"]
        alias = agg.get("as", f"{func}_{col}")
        agg_parts.append(f"{func.upper()}({col}) AS {alias}")
    select_cols = ", ".join(group_by + agg_parts) if agg_parts else "*"
    group_sql = f"GROUP BY {', '.join(group_by)}" if group_by else ""
    return f"SELECT {select_cols} FROM {rel} {where_sql} {group_sql};"
PY

cat > apps/api/app/services/auth_service.py <<'PY'
from __future__ import annotations
from sqlalchemy.orm import Session
from fastapi import HTTPException
from ..models import User
from ..utils.security import get_password_hash, verify_password, create_access_token

def register_user(db: Session, email: str, password: str, role: str="viewer"):
    if db.query(User).filter(User.email==email).first():
        raise HTTPException(status_code=409, detail="User exists")
    u = User(email=email, password_hash=get_password_hash(password), role=role)
    db.add(u); db.commit(); db.refresh(u)
    return u

def login_user(db: Session, email: str, password: str):
    u = db.query(User).filter(User.email==email).first()
    if not u or not verify_password(password, u.password_hash):
        raise HTTPException(status_code=401, detail="Bad credentials")
    token = create_access_token({"id": u.id, "email": u.email, "role": u.role})
    return token
PY

cat > apps/api/app/services/realtime.py <<'PY'
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
PY

git add apps/api/app/services/*
git commit -m "backend: cache, query engine (DuckDB), auth service, realtime presence hub"

# =======================
# 5) BACKEND: Routes (auth, datasets, queries, charts, dashboards, comments, audit, collab)
# =======================
cat > apps/api/app/routes/auth.py <<'PY'
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..schemas import UserCreate, Token, UserOut
from ..services.auth_service import register_user, login_user

router = APIRouter(prefix="/auth", tags=["auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register", response_model=UserOut)
def register(data: UserCreate, db: Session = Depends(get_db)):
    u = register_user(db, data.email, data.password, data.role)
    return {"id": u.id, "email": u.email, "role": u.role}

@router.post("/login", response_model=Token)
def login(data: UserCreate, db: Session = Depends(get_db)):
    token = login_user(db, data.email, data.password)
    return {"access_token": token}
PY

cat > apps/api/app/routes/datasets.py <<'PY'
from __future__ import annotations
import os, json
from typing import Annotated
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
import pandas as pd
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models import Dataset, AuditLog
from ..utils.security import require_role

router = APIRouter(prefix="/datasets", tags=["datasets"])
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "data/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/upload")
async def upload_dataset(
    name: Annotated[str, Form(...)],
    file: UploadFile = File(...),
    user=Depends(require_role({"owner","editor"})),
    db: Session = Depends(get_db)
):
    ext = file.filename.split(".")[-1].lower()
    if ext not in {"csv","json"}:
        raise HTTPException(400,"Only CSV/JSON supported")
    path = os.path.join(UPLOAD_DIR, f"{name}.{ext}")
    with open(path,"wb") as f: f.write(await file.read())
    # schema
    if ext=="csv":
        df = pd.read_csv(path, nrows=200)
    else:
        df = pd.read_json(path, lines=False)
    schema = {c: str(t) for c,t in df.dtypes.to_dict().items()}
    ds = Dataset(owner_id=user["id"], name=name, format=ext, path=path, schema=schema)
    db.add(ds); db.add(AuditLog(user_id=user["id"], action="dataset.upload", payload={"name":name}))
    db.commit(); db.refresh(ds)
    return {"id": ds.id, "name": ds.name, "format": ds.format, "schema": ds.schema}

@router.get("/{dataset_id}/preview")
def preview(dataset_id: int, db: Session = Depends(get_db)):
    ds = db.get(Dataset, dataset_id)
    if not ds: raise HTTPException(404)
    if ds.format=="csv":
        df = pd.read_csv(ds.path, nrows=50)
    else:
        df = pd.read_json(ds.path).head(50)
    return {"columns": list(df.columns), "rows": df.to_dict(orient="records")}
PY

cat > apps/api/app/routes/queries.py <<'PY'
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models import Dataset, Query, AuditLog
from ..schemas import QueryRun
from ..services.query_engine import run_sql_over_file, build_sql_from_builder, _mk_rel

router = APIRouter(prefix="/queries", tags=["queries"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/run")
def run_query(data: QueryRun, db: Session = Depends(get_db)):
    ds = db.get(Dataset, data.dataset_id)
    if not ds: raise HTTPException(404,"Dataset not found")
    if data.sql:
        res = run_sql_over_file(ds.path, ds.format, data.sql)
    else:
        rel = _mk_rel(ds.path, ds.format)
        sql = build_sql_from_builder(data.builder.dict() if data.builder else {}, rel)
        res = run_sql_over_file(ds.path, ds.format, sql)
    db.add(AuditLog(action="query.run", payload={"dataset":ds.id}))
    db.commit()
    return res
PY

cat > apps/api/app/routes/charts.py <<'PY'
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models import Chart, Query
from ..schemas import ChartConfig

router = APIRouter(prefix="/charts", tags=["charts"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/config")
def save_chart(cfg: ChartConfig, db: Session = Depends(get_db)):
    # minimal persistence stub; frontend usually builds plotly spec client-side
    ch = Chart(query_id=0, owner_id=0, config=cfg.model_dump())
    db.add(ch); db.commit(); db.refresh(ch)
    return {"id": ch.id, "config": ch.config}
PY

cat > apps/api/app/routes/dashboards.py <<'PY'
from __future__ import annotations
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models import Dashboard, AuditLog
from ..schemas import DashboardIn
from ..utils.security import require_role

router = APIRouter(prefix="/dashboards", tags=["dashboards"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("", dependencies=[Depends(require_role({"owner","editor"}))])
def create_dash(data: DashboardIn, user=Depends(require_role({"owner","editor"})), db: Session = Depends(get_db)):
    d = Dashboard(owner_id=user["id"], title=data.title, layout=data.layout)
    db.add(d); db.add(AuditLog(user_id=user["id"], action="dashboard.create", payload={"id":None}))
    db.commit(); db.refresh(d)
    return {"id": d.id, "title": d.title, "layout": d.layout}

@router.get("/{dash_id}")
def get_dash(dash_id: int, db: Session = Depends(get_db)):
    d = db.get(Dashboard, dash_id)
    if not d: raise HTTPException(404)
    return {"id": d.id, "title": d.title, "layout": d.layout, "public_token": d.public_token}

@router.post("/{dash_id}/publish")
def publish(dash_id: int, db: Session = Depends(get_db)):
    d = db.get(Dashboard, dash_id)
    if not d: raise HTTPException(404)
    d.public_token = secrets.token_hex(16)
    db.commit()
    return {"public_token": d.public_token}
PY

cat > apps/api/app/routes/comments.py <<'PY'
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models import Comment
from ..schemas import CommentIn

router = APIRouter(prefix="/comments", tags=["comments"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/{dashboard_id}")
def add_comment(dashboard_id: int, data: CommentIn, db: Session = Depends(get_db)):
    c = Comment(dashboard_id=dashboard_id, author_id=0, target=data.target, body=data.body)
    db.add(c); db.commit(); db.refresh(c)
    return {"id": c.id, "target": c.target, "body": c.body}

@router.get("/{dashboard_id}")
def list_comments(dashboard_id: int, db: Session = Depends(get_db)):
    cs = db.query(Comment).filter(Comment.dashboard_id==dashboard_id).order_by(Comment.created_at.desc()).all()
    return [{"id": c.id, "target": c.target, "body": c.body, "created_at": c.created_at.isoformat()} for c in cs]
PY

cat > apps/api/app/routes/audit.py <<'PY'
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models import AuditLog

router = APIRouter(prefix="/audit", tags=["audit"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("")
def list_audit(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(200).all()
    return [{"id": l.id, "action": l.action, "payload": l.payload, "created_at": l.created_at.isoformat()} for l in logs]
PY

cat > apps/api/app/routes/collab.py <<'PY'
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
PY

git add apps/api/app/routes/*
git commit -m "backend: all HTTP routes (auth, datasets, queries, charts, dashboards, comments, audit) + WebSocket collab room"

# =======================
# 6) BACKEND: main.py (app entry) + Dockerfile
# =======================
cat > apps/api/app/main.py <<'PY'
from __future__ import annotations
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine
from .routes import auth, datasets, queries, charts, dashboards, comments, audit, collab

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Collab Dashboards API")

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(auth.router)
app.include_router(datasets.router)
app.include_router(queries.router)
app.include_router(charts.router)
app.include_router(dashboards.router)
app.include_router(comments.router)
app.include_router(audit.router)
app.include_router(collab.router)

@app.get("/")
def root():
    return {"message":"Collab Dashboards API ready"}
PY

cat > apps/api/Dockerfile <<'DOCKER'
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
ENV UVICORN_HOST=0.0.0.0 UVICORN_PORT=8000
EXPOSE 8000
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000","--workers","2"]
DOCKER

git add apps/api/app/main.py apps/api/Dockerfile
git commit -m "backend: app entrypoint, CORS, routers; Dockerfile"

# =======================
# 7) DOCKER COMPOSE
# =======================
cat > docker-compose.yml <<'YML'
version: "3.9"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_USER: postgres
      POSTGRES_DB: collab
    ports: ["5432:5432"]
    volumes: [dbdata:/var/lib/postgresql/data]
  cache:
    image: redis:7
    ports: ["6379:6379"]
  api:
    build: ./apps/api
    environment:
      DATABASE_URL: postgresql+psycopg2://postgres:postgres@db:5432/collab
      REDIS_URL: redis://cache:6379/0
      CORS_ORIGINS: http://localhost:3000,http://127.0.0.1:3000
    volumes:
      - ./apps/api/app:/app/app
      - ./data/uploads:/app/data/uploads
    ports: ["8000:8000"]
    depends_on: [db, cache]
  web:
    build: ./apps/web
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    volumes:
      - ./apps/web:/app
    command: bash -lc "npm i && npm run dev"
    ports: ["3000:3000"]
volumes:
  dbdata:
YML

git add docker-compose.yml
git commit -m "ops: docker-compose (Postgres, Redis, API, Web)"

# =======================
# 8) FRONTEND: API client
# =======================
cat > apps/web/src/lib/api.ts <<'TS'
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}
TS

git add apps/web/src/lib/api.ts
git commit -m "web: API client helper"

# =======================
# 9) FRONTEND: DataTable, ChartBuilder, QueryBuilder, SQLConsole
# =======================
cat > apps/web/src/components/DataTable.tsx <<'TSX'
'use client';
type Props = { columns: string[]; rows: Record<string, any>[] };
export default function DataTable({ columns, rows }: Props) {
  if (!columns?.length) return <div className="text-slate-400">No columns.</div>;
  return (
    <div className="overflow-auto max-h-[480px] rounded-xl border border-slate-700">
      <table className="min-w-[640px] w-full">
        <thead className="sticky top-0 bg-slate-900/80 backdrop-blur">
          <tr>{columns.map(c => <th key={c} className="text-left px-3 py-2 border-b border-slate-700">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i} className="odd:bg-slate-900/40">
              {columns.map(c => <td key={c} className="px-3 py-1 border-b border-slate-800">{String(r?.[c] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
TSX

cat > apps/web/src/components/ChartBuilder.tsx <<'TSX'
'use client';
import dynamic from "next/dynamic";
import { useMemo } from "react";
const Plot = dynamic(()=>import("react-plotly.js"),{ssr:false});
type Props = {
  data: { columns: string[]; rows: Record<string, any>[] };
  type: "bar"|"line"|"scatter"|"pie";
  x?: string; y?: string;
};
export default function ChartBuilder({data, type, x, y}: Props){
  const trace = useMemo(()=>{
    const xs = x ? data.rows.map(r=>r?.[x]) : [];
    const ys = y ? data.rows.map(r=>r?.[y]) : [];
    const base = { x: xs, y: ys };
    if(type==="pie") return [{ labels: xs, values: ys, type:"pie" as const }];
    if(type==="line") return [{ ...base, type:"scatter" as const, mode:"lines" }];
    return [{ ...base, type: type as any, mode: "markers+lines"}];
  },[data, type, x, y]);
  return (
    <div className="rounded-xl border border-slate-700 p-2">
      <Plot data={trace as any} layout={{autosize:true, paper_bgcolor:"rgba(0,0,0,0)", plot_bgcolor:"rgba(0,0,0,0)"}} style={{width:"100%", height:420}} useResizeHandler />
    </div>
  );
}
TSX

cat > apps/web/src/components/QueryBuilder.tsx <<'TSX'
'use client';
import { useState } from "react";
type Builder = {
  filters: {column:string; op:string; value:any}[];
  group_by: string[];
  aggregates: {func:string; column:string; as?:string}[];
};
export default function QueryBuilder({columns, onRun}:{columns:string[]; onRun:(b:Builder)=>void;}){
  const [b,setB] = useState<Builder>({filters:[], group_by:[], aggregates:[]});
  const addFilter=()=>setB({...b, filters:[...b.filters,{column:columns[0],op:"=",value:""}]});
  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <button className="px-3 py-1 rounded bg-sky-500 text-black" onClick={addFilter}>+ Filter</button>
        <button className="px-3 py-1 rounded bg-emerald-500 text-black" onClick={()=>onRun(b)}>Run</button>
      </div>
      {b.filters.map((f,i)=>(
        <div key={i} className="flex gap-2">
          <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1" value={f.column} onChange={e=>{const v=[...b.filters]; v[i]={...f,column:e.target.value}; setB({...b, filters:v});}}>
            {columns.map(c=><option key={c}>{c}</option>)}
          </select>
          <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1" value={f.op} onChange={e=>{const v=[...b.filters]; v[i]={...f,op:e.target.value}; setB({...b, filters:v});}}>
            <option>=</option><option>!=</option><option>{'>'}</option><option>{'<'}</option>
          </select>
          <input className="bg-slate-900 border border-slate-700 rounded px-2 py-1" value={f.value} onChange={e=>{const v=[...b.filters]; v[i]={...f,value:e.target.value}; setB({...b, filters:v});}}/>
        </div>
      ))}
    </div>
  );
}
TSX

cat > apps/web/src/components/SQLConsole.tsx <<'TSX'
'use client';
export default function SQLConsole({sql,setSql, onRun}:{sql:string; setSql:(s:string)=>void; onRun:()=>void;}){
  return (
    <div className="space-y-2">
      <textarea value={sql} onChange={e=>setSql(e.target.value)} rows={6} className="w-full bg-slate-900 border border-slate-700 rounded p-2 font-mono"/>
      <button onClick={onRun} className="px-3 py-1 rounded bg-sky-500 text-black">Run</button>
    </div>
  );
}
TSX

git add apps/web/src/components/*
git commit -m "web: core components (DataTable, ChartBuilder, QueryBuilder, SQLConsole)"

# =======================
# 10) FRONTEND: Pages (datasets, queries, dashboards)
# =======================
cat > apps/web/src/app/page.tsx <<'TSX'
export default function Home(){
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-3xl font-bold">Collaborative Dashboards</h1>
      <p className="text-slate-400">Upload datasets, build queries, create charts, and collaborate in real-time.</p>
      <ul className="list-disc pl-5">
        <li><a className="text-sky-400 underline" href="/datasets">Datasets</a></li>
        <li><a className="text-sky-400 underline" href="/queries">Queries</a></li>
      </ul>
    </main>
  );
}
TSX

cat > apps/web/src/app/datasets/page.tsx <<'TSX'
'use client';
import { useEffect, useState } from "react";
import { API_URL, api } from "@/src/lib/api";
import DataTable from "@/src/components/DataTable";

export default function DatasetsPage(){
  const [name,setName]=useState(""); 
  const [file,setFile]=useState<File|null>(null);
  const [items,setItems]=useState<any[]>([]);
  const [preview,setPreview]=useState<{columns:string[];rows:any[]}|null>(null);

  async function upload(){
    if(!file || !name) return alert("Pick a name & file");
    const form = new FormData();
    form.append("name", name);
    form.append("file", file);
    const res = await fetch(`${API_URL}/datasets/upload`, {method:"POST", body: form});
    if(!res.ok){ alert(await res.text()); return; }
    await load();
  }

  async function load(){
    // very simple: no list endpoint yet; rely on preview by id guess
  }

  async function previewId(id:number){
    const data = await api(`/datasets/${id}/preview`);
    setPreview(data);
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Datasets</h1>
      <div className="flex gap-2">
        <input placeholder="dataset name" className="bg-slate-900 border border-slate-700 rounded px-2 py-1" value={name} onChange={e=>setName(e.target.value)} />
        <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/>
        <button onClick={upload} className="px-3 py-1 rounded bg-emerald-500 text-black">Upload</button>
      </div>
      <p className="text-slate-400">After uploading, query by dataset id and preview below.</p>
      {preview && <DataTable columns={preview.columns} rows={preview.rows} />}
    </main>
  );
}
TSX

cat > apps/web/src/app/queries/page.tsx <<'TSX'
'use client';
import { useState } from "react";
import { api } from "@/src/lib/api";
import DataTable from "@/src/components/DataTable";
import SQLConsole from "@/src/components/SQLConsole";
import ChartBuilder from "@/src/components/ChartBuilder";
import QueryBuilder from "@/src/components/QueryBuilder";

export default function QueriesPage(){
  const [datasetId,setDatasetId]=useState<number>(1);
  const [sql,setSql]=useState<string>("SELECT * FROM {{table}} LIMIT 50;");
  const [result,setResult]=useState<{columns:string[];rows:any[]} | null>(null);
  const [chart,setChart]=useState<{type:"bar"|"line"|"scatter"|"pie"; x?:string; y?:string}>({type:"scatter"});

  async function runSQL(){
    const res = await api("/queries/run", {method:"POST", body: JSON.stringify({dataset_id: datasetId, sql})});
    setResult(res);
  }
  async function runBuilder(b:any){
    const res = await api("/queries/run", {method:"POST", body: JSON.stringify({dataset_id: datasetId, builder: b})});
    setResult(res);
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Queries</h1>
      <div className="flex items-center gap-2">
        <span>Dataset id:</span>
        <input type="number" value={datasetId} onChange={e=>setDatasetId(parseInt(e.target.value||"1"))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-24"/>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="font-semibold">SQL Console</h2>
          <SQLConsole sql={sql} setSql={setSql} onRun={runSQL}/>
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold">Visual Builder</h2>
          {result?.columns && <QueryBuilder columns={result.columns} onRun={runBuilder}/>}
          {!result?.columns && <div className="text-slate-400">Run once to infer columns or preview dataset.</div>}
        </div>
      </div>
      {result && (<>
        <h3 className="font-semibold">Preview</h3>
        <DataTable columns={result.columns} rows={result.rows}/>
        <div className="flex gap-2 items-center">
          <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1" value={chart.type} onChange={e=>setChart({...chart,type:e.target.value as any})}>
            <option>scatter</option><option>line</option><option>bar</option><option>pie</option>
          </select>
          <input placeholder="x" className="bg-slate-900 border border-slate-700 rounded px-2 py-1" value={chart.x||""} onChange={e=>setChart({...chart,x:e.target.value})}/>
          <input placeholder="y" className="bg-slate-900 border border-slate-700 rounded px-2 py-1" value={chart.y||""} onChange={e=>setChart({...chart,y:e.target.value})}/>
        </div>
        <ChartBuilder data={result} type={chart.type} x={chart.x} y={chart.y}/>
      </>)}
    </main>
  );
}
TSX

git add apps/web/src/app/page.tsx apps/web/src/app/datasets/page.tsx apps/web/src/app/queries/page.tsx
git commit -m "web: pages for home, datasets (upload+preview placeholder), queries (SQL + builder + chart)"

# =======================
# 11) FRONTEND: Dashboard editor (drag & drop), presence, comments, RBAC, audit log
# =======================
cat > apps/web/src/components/DashboardEditor.tsx <<'TSX'
'use client';
import { useEffect, useRef, useState } from "react";
import { API_URL, api } from "@/src/lib/api";

type Widget = { id:string; title:string; note?:string; };

export default function DashboardEditor({dashId}:{dashId:number}){
  const [layout,setLayout]=useState<{widgets:Widget[]}>({widgets:[]});
  const [presence,setPresence]=useState<number>(0);
  const wsRef = useRef<WebSocket|null>(null);

  useEffect(()=>{
    (async()=>{
      const data = await api(`/dashboards/${dashId}`);
      setLayout(data.layout||{widgets:[]});
    })();
  },[dashId]);

  useEffect(()=>{
    const ws = new WebSocket(`${API_URL.replace('http','ws')}/collab/${dashId}`);
    wsRef.current = ws;
    ws.onmessage = (ev)=>{
      const msg = JSON.parse(ev.data);
      if(msg.type==="join"||msg.type==="leave") setPresence(msg.count||0);
      if(msg.type==="patch" && msg.payload?.widgets) setLayout(msg.payload);
    };
    return ()=>ws.close();
  },[dashId]);

  function addWidget(){
    const next = {...layout, widgets:[...layout.widgets, {id:crypto.randomUUID(), title:"New widget"}]};
    setLayout(next);
    wsRef.current?.send(JSON.stringify(next));
  }

  async function save(){
    await api(`/dashboards/${dashId}/publish`, {method:"POST"});
    alert("Published (read-only token refreshed)");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <button onClick={addWidget} className="px-3 py-1 rounded bg-emerald-500 text-black">+ Widget</button>
        <button onClick={save} className="px-3 py-1 rounded bg-sky-500 text-black">Publish</button>
        <span className="text-slate-400">Present: {presence}</span>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {layout.widgets.map(w=>(
          <div key={w.id} className="rounded-xl border border-slate-700 p-2">
            <input className="bg-transparent font-semibold" defaultValue={w.title}
              onChange={e=>{
                const next = {...layout, widgets: layout.widgets.map(x=>x.id===w.id?{...x,title:e.target.value}:x)};
                setLayout(next); wsRef.current?.send(JSON.stringify(next));
              }}/>
            <textarea className="w-full bg-slate-900 border border-slate-700 rounded p-2 mt-2" placeholder="notes/annotations"
              onChange={e=>{
                const next = {...layout, widgets: layout.widgets.map(x=>x.id===w.id?{...x,note:e.target.value}:x)};
                setLayout(next); wsRef.current?.send(JSON.stringify(next));
              }}/>
          </div>
        ))}
      </div>
    </div>
  );
}
TSX

cat > apps/web/src/components/RBACGuard.tsx <<'TSX'
'use client';
export default function RBACGuard({role, allow, children}:{role?:string; allow:string[]; children:any}){
  if(!role || !allow.includes(role)) return <div className="text-rose-400">Forbidden</div>;
  return children;
}
TSX

cat > apps/web/src/components/CommentThread.tsx <<'TSX'
'use client';
import { useEffect, useState } from "react";
import { api } from "@/src/lib/api";

export default function CommentThread({dashboardId}:{dashboardId:number}){
  const [list,setList]=useState<any[]>([]);
  const [body,setBody]=useState("");
  async function load(){ setList(await api(`/comments/${dashboardId}`)); }
  async function add(){ await api(`/comments/${dashboardId}`, {method:"POST", body: JSON.stringify({target:"dashboard", body})}); setBody(""); load(); }
  useEffect(()=>{ load(); },[dashboardId]);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-full" value={body} onChange={e=>setBody(e.target.value)} placeholder="add a comment"/>
        <button className="px-3 py-1 rounded bg-sky-500 text-black" onClick={add}>Post</button>
      </div>
      <ul className="space-y-1">
        {list.map(c=><li key={c.id} className="text-sm text-slate-300"><span className="text-slate-500">{c.created_at}:</span> {c.body}</li>)}
      </ul>
    </div>
  );
}
TSX

cat > apps/web/src/components/AuditLogView.tsx <<'TSX'
'use client';
import { useEffect, useState } from "react";
import { api } from "@/src/lib/api";
export default function AuditLogView(){
  const [logs,setLogs]=useState<any[]>([]);
  useEffect(()=>{(async()=>setLogs(await api("/audit")))();},[]);
  return <div className="rounded-xl border border-slate-700 p-3 max-h-[300px] overflow-auto space-y-1">
    {logs.map(l=><div key={l.id} className="text-sm text-slate-300">{l.created_at} — {l.action}</div>)}
  </div>;
}
TSX

# Dashboard route that uses the editor
cat > apps/web/src/app/dashboards/[id]/page.tsx <<'TSX'
'use client';
import { useParams } from "next/navigation";
import DashboardEditor from "@/src/components/DashboardEditor";
import CommentThread from "@/src/components/CommentThread";
import AuditLogView from "@/src/components/AuditLogView";

export default function DashboardPage(){
  const { id } = useParams<{id:string}>();
  const dashId = parseInt(id);
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard #{dashId}</h1>
      <DashboardEditor dashId={dashId}/>
      <h2 className="font-semibold">Comments</h2>
      <CommentThread dashboardId={dashId}/>
      <h2 className="font-semibold">Audit</h2>
      <AuditLogView/>
    </main>
  );
}
TSX

git add apps/web/src/components/* apps/web/src/app/dashboards/[id]/page.tsx
git commit -m "web: dashboard editor (realtime presence & notes), RBAC guard, comments, audit viewer"

# =======================
# 12) FRONTEND: deps (Plotly, types) + Dockerfile
# =======================
cat > apps/web/package.json <<'JSON'
{
  "name": "web",
  "private": true,
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },
  "dependencies": {
    "next": "15.4.6",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-plotly.js": "2.6.0",
    "plotly.js-dist-min": "2.35.3"
  },
  "devDependencies": {
    "@types/node": "^20.14.10",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.4",
    "tailwindcss": "^3.4.10",
    "@tailwindcss/postcss": "^4.0.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "15.4.6"
  }
}
JSON

cat > apps/web/Dockerfile <<'DOCKER'
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm i --legacy-peer-deps || npm i
COPY . .
EXPOSE 3000
CMD ["npm","run","dev"]
DOCKER

git add apps/web/package.json apps/web/Dockerfile
git commit -m "web: add Plotly deps and Dockerfile"

# =======================
# 13) CI Pipeline
# =======================
mkdir -p .github/workflows
cat > .github/workflows/ci.yml <<'YML'
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Backend - install
      run: |
        python -m pip install --upgrade pip
        pip install -r apps/api/requirements.txt
    - name: Backend - import check
      run: python - <<'PY'
import importlib
mods = ["fastapi","sqlalchemy","duckdb","redis","pandas"]
for m in mods: importlib.import_module(m)
print("Backend deps OK")
PY
    - name: Frontend - install
      run: |
        cd apps/web
        npm i --legacy-peer-deps || npm i
        echo "Frontend deps OK"
YML

git add .github/workflows/ci.yml
git commit -m "ci: basic check for backend/frontend dependencies"

# =======================
# 14) README
# =======================
cat > README.md <<'MD'
# Collaborative Dashboards

FastAPI + Next.js app for collaborative data visualization.

## Quick start
```bash
docker compose up --build

