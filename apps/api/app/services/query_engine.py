from __future__ import annotations
import duckdb, os, pandas as pd
from typing import Any

def _mk_rel(path: str, fmt: str):
    if fmt == "csv":
        return f"read_csv_auto('{path}')"
    if fmt == "json":
        return f"read_json_auto('{path}')"
    raise ValueError("Unsupported format")

def run_sql_over_file(path: str, fmt: str, sql: str) -> dict[str, Any]:
    rel = _mk_rel(path, fmt)
    query = sql.replace("{{table}}", rel)
    con = duckdb.connect()
    df = con.execute(query).df()
    return {"columns": list(df.columns), "rows": df.to_dict(orient="records")}

def build_sql_from_builder(builder: dict, rel: str) -> str:
    where = []
    for f in builder.get("filters", []):
        col = f["column"]; op=f.get("op","="); val=f["value"]
        if isinstance(val, str): val = f"'{val}'"
        where.append(f"{col} {op} {val}")
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    group_by = builder.get("group_by", [])
    agg_parts = []
    for agg in builder.get("aggregates", []):
        func = agg.get("func","sum")
        col = agg["column"]
        alias = agg.get("as", f"{func}_{col}")
        agg_parts.append(f"{func.upper()}({col}) AS {alias}")
    select_cols = ", ".join(group_by + agg_parts) if agg_parts else "*"
    group_sql = f"GROUP BY {', '.join(group_by)}" if group_by else ""
    return f"SELECT {select_cols} FROM {rel} {where_sql} {group_sql};"
