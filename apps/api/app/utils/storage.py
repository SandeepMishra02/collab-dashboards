import json, os
from typing import Any

DATA_DIR = "data"
DATASETS_DIR = os.path.join(DATA_DIR, "datasets")
DASH_DIR = os.path.join(DATA_DIR, "dashboards")
INDEX_FILE = os.path.join(DASH_DIR, "index.json")
AUDIT_FILE = os.path.join(DATA_DIR, "audit.json")
COMMENTS_FILE = os.path.join(DATA_DIR, "comments.json")
CACHE_FILE = os.path.join(DATA_DIR, "cache.json")

def ensure_data_dirs():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(DATASETS_DIR, exist_ok=True)
    os.makedirs(DASH_DIR, exist_ok=True)
    for f in (INDEX_FILE, AUDIT_FILE, COMMENTS_FILE, CACHE_FILE):
        if not os.path.exists(f):
            with open(f, "w") as fh:
                json.dump({} if f == CACHE_FILE else {}, fh)

def read_json(path: str) -> Any:
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        return {}

def write_json(path: str, data: Any) -> None:
    tmp = f"{path}.tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)

