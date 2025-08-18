from __future__ import annotations
import os, json, hashlib
from functools import lru_cache
try:
    from redis import Redis
except Exception:
    Redis = None

REDIS_URL = os.getenv("REDIS_URL")

def _hash_key(*parts) -> str:
    return hashlib.sha256("|".join(map(str, parts)).encode()).hexdigest()

if REDIS_URL and Redis:
    _redis = Redis.from_url(REDIS_URL)
else:
    _redis = None

def cached_query(key_parts: list[str], compute):
    key = _hash_key(*key_parts)
    if _redis:
        val = _redis.get(key)
        if val: 
            return json.loads(val)
        data = compute()
        _redis.setex(key, 3600, json.dumps(data))
        return data
    else:
        @lru_cache(maxsize=128)
        def _memo(key: str):
            return compute()
        return _memo(key)
