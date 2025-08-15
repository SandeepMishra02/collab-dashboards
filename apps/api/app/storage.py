from .settings import settings
from pathlib import Path
import shutil, uuid

def save_upload(fileobj, filename: str) -> str:
    Path(settings.STORAGE_LOCAL_DIR).mkdir(parents=True, exist_ok=True)
    key = f"{uuid.uuid4()}-{filename}"
    dest = Path(settings.STORAGE_LOCAL_DIR) / key
    with open(dest, "wb") as f: shutil.copyfileobj(fileobj, f)
    return str(dest.resolve())

def duck_expr(storage_url: str) -> str:
    su = storage_url.lower()
    if su.endswith(".json"): return f"read_json_auto('{storage_url}')"
    if su.endswith(".parquet"): return f"read_parquet('{storage_url}')"
    return f"read_csv_auto('{storage_url}')"
