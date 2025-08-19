from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import datasets, queries, charts, dashboards, comments, audit, collab , auth

app = FastAPI()

# Allow frontend (localhost:3000) to access backend (localhost:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI"}


app.include_router(datasets.router)
app.include_router(dashboards.router)
app.include_router(queries.router)
app.include_router(charts.router)
app.include_router(comments.router)
app.include_router(audit.router)
app.include_router(collab.router)
app.include_router(auth.router)
