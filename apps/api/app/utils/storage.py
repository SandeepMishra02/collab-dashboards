import os, json, threading

DATA_DIR = "data"
_LOCKS = {}
_LOCKS_LOCK = threading.Lock()

def ensure_data_dirs():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, "uploads"), exist_ok=True)

def _lock_for(path: str):
    with _LOCKS_LOCK:
        if path not in _LOCKS:
            _LOCKS[path] = threading.Lock()
        return _LOCKS[path]

def read_json(path: str):
    if not os.path.exists(path):
        return None
    with _lock_for(path):
        with open(path, "r") as f:
            return json.load(f)

def write_json(path: str, obj):
    with _lock_for(path):
        with open(path, "w") as f:
            json.dump(obj, f)
