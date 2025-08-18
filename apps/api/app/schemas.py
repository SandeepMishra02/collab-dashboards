
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
    table_schema: dict

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
