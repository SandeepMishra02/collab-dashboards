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
