from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str
    name: str

class Dashboard(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int
    title: str
    widgets_json: str = "[]"
    is_public: bool = False
    public_token: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DashboardMember(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    dashboard_id: int
    user_id: int
    role: str  # owner|editor|viewer

class Comment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    dashboard_id: int
    author_id: int
    body: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = None
    action: str
    target: str
    meta: str = "{}"
    created_at: datetime = Field(default_factory=datetime.utcnow)

