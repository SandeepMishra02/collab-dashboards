from pydantic import BaseModel
from uuid import UUID
from typing import Any, Literal

class DatasetOut(BaseModel):
    id: UUID; name: str; storage_url: str; schema_json: Any | None = None

class QueryIn(BaseModel):
    datasetId: UUID
    sql: str

class TransformStep(BaseModel):
    op: Literal["select","filter","groupby","rename"]
    args: dict

class WidgetCreateIn(BaseModel):
    dashboardId: UUID
    type: str
    position: dict
    config: dict

class DashboardCreateIn(BaseModel):
    title: str

class ShareIn(BaseModel):
    dashboardId: UUID
    emails: list[str]
    role: Literal["editor","viewer"]
