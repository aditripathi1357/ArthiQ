import time
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Cache store: { key: (timestamp, value) }
_CACHE = {}

def get_cached(key: Any, ttl_seconds: float) -> Any | None:
    """
    Get a value from cache if it exists and is not expired.
    
    Args:
        key: The cache key (can be a string or a tuple).
        ttl_seconds: Time to live in seconds.
        
    Returns:
        The cached value or None if expired/not found.
    """
    entry = _CACHE.get(key)
    if entry:
        timestamp, value = entry
        elapsed = time.time() - timestamp
        if elapsed < ttl_seconds:
            logger.debug("Cache HIT for key: %s (elapsed %.1fs < ttl %.1fs)", key, elapsed, ttl_seconds)
            return value
        else:
            logger.debug("Cache EXPIRED for key: %s (elapsed %.1fs >= ttl %.1fs)", key, elapsed, ttl_seconds)
    else:
        logger.debug("Cache MISS for key: %s", key)
    return None

def set_cached(key: Any, value: Any) -> None:
    """
    Set a value in the cache with the current timestamp.
    
    Args:
        key: The cache key.
        value: The value to store.
    """
    _CACHE[key] = (time.time(), value)

def clear_cache() -> None:
    """Clear all cached entries."""
    _CACHE.clear()
    logger.info("Backend cache cleared")
