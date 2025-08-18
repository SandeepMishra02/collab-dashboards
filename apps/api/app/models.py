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
