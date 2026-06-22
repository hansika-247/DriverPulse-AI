"""
normalize_driver_ids.py
========================
One-shot fix: converts driver_id values in final_driver_dataset.csv
from 3-digit format (DRV001) to 4-digit zero-padded format (DRV0001).

Only touches driver_id. All other columns are preserved exactly.
A timestamped backup is created before any write.

Usage:
    python normalize_driver_ids.py
"""

import os
import re
import shutil
import pandas as pd
from datetime import datetime

CSV_PATH = os.path.join(os.path.dirname(__file__), "processed", "final_driver_dataset.csv")


def normalize_id(driver_id: str) -> str:
    """
    Convert DRVxxx  → DRV0xxx  (3-digit → 4-digit).
    Leave DRV0xxx already-correct IDs unchanged.
    Raises ValueError for any unexpected format.
    """
    m = re.fullmatch(r"DRV(\d+)", driver_id)
    if not m:
        raise ValueError(f"Unexpected driver_id format: {driver_id!r}")
    digits = m.group(1)
    return f"DRV{digits.zfill(4)}"


def main():
    print(f"Reading: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    total = len(df)
    print(f"Total rows: {total:,}")

    # ── Backup ────────────────────────────────────────────────────────────────
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = CSV_PATH.replace(".csv", f"_BACKUP_{ts}.csv")
    shutil.copy2(CSV_PATH, backup_path)
    print(f"Backup saved: {backup_path}")

    # ── Identify rows that need normalizing ───────────────────────────────────
    needs_fix = ~df["driver_id"].str.match(r"^DRV\d{4}$")
    n_bad = needs_fix.sum()
    print(f"\nRows needing normalization: {n_bad}")

    if n_bad == 0:
    print("Nothing to do -- all IDs are already in DRV0001 format. [OK]")
        return

    # ── Show before/after for first 10 ───────────────────────────────────────
    print("\nBefore -> After (first 10 affected rows):")
    print(f"  {'Before':<12}  {'After':<12}")
    print(f"  {'------':<12}  {'-----':<12}")
    sample = df.loc[needs_fix, "driver_id"].head(10)
    for old_id in sample:
        new_id = normalize_id(old_id)
        print(f"  {old_id:<12}  {new_id:<12}")

    # ── Apply normalization ───────────────────────────────────────────────────
    df.loc[needs_fix, "driver_id"] = df.loc[needs_fix, "driver_id"].apply(normalize_id)

    # ── Verify no duplicates were introduced ──────────────────────────────────
    dupes = df["driver_id"].duplicated().sum()
    if dupes > 0:
        raise RuntimeError(f"Normalization introduced {dupes} duplicate driver_ids! Aborting.")

    # ── Verify all IDs now match 4-digit format ───────────────────────────────
    still_bad = ~df["driver_id"].str.match(r"^DRV\d{4}$")
    if still_bad.sum() > 0:
        raise RuntimeError(f"{still_bad.sum()} IDs still don't match DRV0000 format after fix.")

    # ── Write back ────────────────────────────────────────────────────────────
    df.to_csv(CSV_PATH, index=False)
    print(f"\nCSV written: {CSV_PATH}")
    print(f"Rows fixed : {n_bad}")
    print(f"Total rows : {total:,}")

    # ── Post-fix sanity check ─────────────────────────────────────────────────
    print("\nPost-fix verification:")
    print(f"  DRV0001 present: {'DRV0001' in df['driver_id'].values}")
    print(f"  DRV0002 present: {'DRV0002' in df['driver_id'].values}")
    print(f"  DRV0210 present: {'DRV0210' in df['driver_id'].values}")
    print(f"  DRV001  present: {'DRV001'  in df['driver_id'].values}  (should be False)")
    print(f"  DRV002  present: {'DRV002'  in df['driver_id'].values}  (should be False)")
    print(f"  All IDs 4-digit: {df['driver_id'].str.match(r'^DRV\\d{{4}}$').all()}")
    print(f"\nFirst 10 IDs after fix: {df['driver_id'].head(10).tolist()}")
    print("\n[OK] Normalization complete.")


if __name__ == "__main__":
    main()
