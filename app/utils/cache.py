import time
from typing import Any, Optional

class CacheManager:
    """
    In-memory dictionary cache to simulate Redis.
    Supports TTL (Time-To-Live) expiration.
    """
    def __init__(self):
        self._cache = {}

    def set(self, key: str, value: Any, ttl_seconds: int = 3600):
        expiration = time.time() + ttl_seconds
        self._cache[key] = {
            "value": value,
            "expiration": expiration
        }

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            entry = self._cache[key]
            if time.time() < entry["expiration"]:
                return entry["value"]
            else:
                del self._cache[key]  # Expired
        return None

    def clear(self):
        self._cache.clear()

# Global cache instance for the app
cache = CacheManager()
