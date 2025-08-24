import os, json, time
from app.utils.storage import DATA_DIR, read_json, write_json

AUDIT_FILE = os.path.join(DATA_DIR, "audit.json")

def audit(action: str, **meta):
    log = read_json(AUDIT_FILE) or []
    log.append({"ts": int(time.time()), "action": action, **meta})
    write_json(AUDIT_FILE, log)
