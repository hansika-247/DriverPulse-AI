/**
 * frontend/src/utils/driverId.js
 * ==============================
 * Single source of truth for Driver ID normalization in the React frontend.
 *
 * All driver IDs in DriverPulse are stored in the canonical format:
 *   DRV0001 … DRV5210
 *
 * normalizeDriverId() accepts any variant and returns the canonical form:
 *   DRV1     → DRV0001
 *   DRV01    → DRV0001
 *   DRV001   → DRV0001
 *   DRV0001  → DRV0001
 *   drv0001  → DRV0001
 */

const DRV_RE = /^[Dd][Rr][Vv](\d+)$/;

export function normalizeDriverId(driverId) {
  if (!driverId) return driverId;
  const str = driverId.trim();
  const m   = DRV_RE.exec(str);
  if (m) {
    const numeric = parseInt(m[1], 10);
    return `DRV${String(numeric).padStart(4, '0')}`;
  }
  return str;
}
