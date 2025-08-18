import os
from sqlmodel import SQLModel, Session, create_engine

DB_PATH = os.getenv("DB_PATH", "data.db")
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    from contextlib import contextmanager
    @contextmanager
    def _session():
        with Session(engine) as s:
            yield s
    return _session()

