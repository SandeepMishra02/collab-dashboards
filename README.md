# Collaborative Data Visualization & Dashboard Builder

Upload CSV/JSON → query with SQL/visual builder → build charts → co-edit dashboards (Yjs) → share links.

## Dev stack
- FE: Next.js + TS + Zustand + Plotly
- BE: FastAPI + SQLAlchemy + DuckDB
- DB: Postgres (Docker)
- Collab: y-websocket (Yjs)

## Quickstart
1) `docker compose up -d`
2) API:
   ```bash
   cd apps/api
   python -m venv .venv && source .venv/bin/activate
   pip install -U pip && pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000

