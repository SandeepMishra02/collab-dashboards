from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import datasets
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