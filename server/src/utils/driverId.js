/**
 * server/src/utils/driverId.js
 * ==============================
 * Single source of truth for Driver ID normalization in the Node server.
 *
 * All driver IDs in DriverPulse are stored in the canonical format:
 *   DRV0001 … DRV5210
 *
 * normalizeDriverId() accepts any variant and returns the canonical form:
 *   DRV1     → DRV0001
 *   DRV01    → DRV0001
 *   DRV001   → DRV0001
 *   DRV0001  → DRV0001  (no-op — already canonical)
 *   drv0001  → DRV0001  (case-insensitive)
 *
 * Apply BEFORE every database lookup and every FastAPI call that uses driverId.
 *
 * Usage:
 *   import { normalizeDriverId } from '../utils/driverId.js';
 *   const canonical = normalizeDriverId(rawId);
 */

const DRV_RE = /^[Dd][Rr][Vv](\d+)$/;

/**
 * @param {string} driverId — raw driver ID from user input or JWT
 * @returns {string}        — canonical DRV0001 form, or original if non-DRV
 */
export function normalizeDriverId(driverId) {
  if (!driverId) return driverId;
  const str = driverId.trim();
  const m   = DRV_RE.exec(str);
  if (m) {
    const numeric = parseInt(m[1], 10);   // strips all leading zeros, parses int
    return `DRV${String(numeric).padStart(4, '0')}`;  // DRV0001
  }
  return str;
}
