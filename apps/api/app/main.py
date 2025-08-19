from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import auth, datasets, queries, dashboards, comments, audit, collab

app = FastAPI(title="Collab Dashboards MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(datasets.router)
app.include_router(queries.router)
app.include_router(dashboards.router)
app.include_router(comments.router)
app.include_router(audit.router)
app.include_router(collab.router)

@app.get("/")
def root():
    return {"ok": True}

