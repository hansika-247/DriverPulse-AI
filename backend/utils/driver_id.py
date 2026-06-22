"""
utils/driver_id.py
==================
Single source of truth for Driver ID normalization.

All driver IDs in DriverPulse MUST be in the format:
    DRV0001 … DRV5210

normalize_driver_id() accepts any variant and returns the canonical form:
    DRV1     → DRV0001
    DRV01    → DRV0001
    DRV001   → DRV0001
    DRV0001  → DRV0001  (already canonical — no-op)
    drv0001  → DRV0001  (case-insensitive)

Usage:
    from utils.driver_id import normalize_driver_id
    canonical = normalize_driver_id(raw_id)
"""

import re

_DRV_RE = re.compile(r'^[Dd][Rr][Vv](\d+)$')


def normalize_driver_id(driver_id: str) -> str:
    """
    Normalise a Driver ID to the canonical 4-digit-padded form.

    DRV1 / DRV01 / DRV001 / DRV0001 → DRV0001
    Returns the original string unchanged if it doesn't match the DRVnnn pattern
    (so non-DRV identifiers pass through without crashing).
    """
    if not driver_id:
        return driver_id
    m = _DRV_RE.match(driver_id.strip())
    if m:
        numeric = m.group(1).lstrip('0') or '0'   # strip leading zeros, keep at least one digit
        return f"DRV{int(numeric):04d}"             # pad to 4 digits → DRV0001
    return driver_id.strip()
