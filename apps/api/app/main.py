from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import init_db
from .routes import router

def create_app():
    init_db()
    app = FastAPI(title="Collaborative Dashboards API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000","http://127.0.0.1:3000","*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    return app

app = create_app()
