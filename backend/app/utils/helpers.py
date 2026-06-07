"""
Shared utility functions.
"""

import uuid
from datetime import datetime, timezone


def utc_now() -> datetime:
    """Return timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)


def is_valid_uuid(value: str) -> bool:
    """Check whether a string is a valid UUID v4."""
    try:
        uuid.UUID(value, version=4)
        return True
    except ValueError:
        return False


def pct_change(old: float, new: float) -> float:
    """Calculate percentage change between two values."""
    if old == 0:
        return 0.0
    return round(((new - old) / abs(old)) * 100, 4)
