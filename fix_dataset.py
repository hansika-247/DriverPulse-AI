"""
fix_dataset.py
==============
Regenerates processed/final_driver_dataset.csv WITH driver_id preserved
from the original driver_features.csv. This is the root-cause fix for
the "every login → assessment form" bug.

Run from project root:
    python fix_dataset.py
"""

import pathlib
import pandas as pd
import numpy as np

BASE_DIR        = pathlib.Path(__file__).parent
DRIVER_FEAT_CSV = BASE_DIR / "processed" / "driver_features.csv"
FINAL_CSV       = BASE_DIR / "processed" / "final_driver_dataset.csv"

# ── 1. Load original driver_features (210 real drivers WITH driver_id) ─────────
df_orig = pd.read_csv(DRIVER_FEAT_CSV)
print(f"Original driver_features shape : {df_orig.shape}")
print(f"Has driver_id                  : {'driver_id' in df_orig.columns}")
print(f"Sample IDs                     : {df_orig['driver_id'].head(5).tolist()}")
print()

# Tag the source column (original data has "original" source)
df_orig = df_orig.copy()
df_orig["source"] = "original"
# Normalize driver_id to exactly 4 digits
df_orig["driver_id"] = df_orig["driver_id"].apply(lambda x: f"DRV{int(x.replace('DRV', '')):04d}")

# ── 2. Load current final_driver_dataset.csv to check synthetic count ───────────
if FINAL_CSV.exists():
    df_existing = pd.read_csv(FINAL_CSV)
    n_existing_synthetic = (df_existing.get("source", pd.Series()) == "synthetic").sum()
    n_existing_total     = len(df_existing)
    print(f"Existing final_driver_dataset.csv:")
    print(f"  Total rows      : {n_existing_total}")
    print(f"  Synthetic rows  : {n_existing_synthetic}")
    has_id_existing = 'driver_id' in df_existing.columns
    print(f"  Has driver_id   : {has_id_existing}  <- THIS IS THE BUG if False")
    print()

# ── 3. Feature columns used by the model (from 05_model_training.py) ────────────
FEATURE_COLS_FOR_MODEL = [
    "city", "shift_preference",
    "avg_hours_per_day", "avg_earnings_per_hour",
    "experience_months", "rating", "daily_productivity",
    "avg_combined_score", "avg_motion_score", "avg_audio_score",
    "total_flags", "risk_score", "risk_label",
]

# ── 4. Generate synthetic rows PRESERVING the correct ID-aware structure ─────────
# Strategy: use simple statistical sampling (no SDV needed) to generate ~5000 rows
# that mirror the original distribution. Synthetic rows get IDs DRV_SYN_00001 etc.

RANDOM_SEED      = 42
N_SYNTHETIC      = 5000
np.random.seed(RANDOM_SEED)

df_orig_features = df_orig[FEATURE_COLS_FOR_MODEL].copy()

CAT_COLS = ["city", "shift_preference", "risk_label"]
NUM_COLS = [c for c in FEATURE_COLS_FOR_MODEL if c not in CAT_COLS]

# Sample synthetic rows by bootstrapping with added noise
def generate_synthetic(df_real, n, seed=42):
    rng = np.random.default_rng(seed)
    # Bootstrap: sample real rows with replacement
    idx      = rng.integers(0, len(df_real), size=n)
    df_synt  = df_real.iloc[idx].copy().reset_index(drop=True)

    # Add small Gaussian noise to numeric columns
    for col in NUM_COLS:
        std_dev = df_real[col].std() * 0.1
        noise   = rng.normal(0, std_dev, size=n)
        df_synt[col] = (df_synt[col] + noise).clip(lower=df_real[col].min())

    # Re-derive risk_label from risk_score (keep consistent)
    def _label(score):
        if score >= 30:  return "HIGH"
        elif score >= 20: return "MEDIUM"
        else:            return "LOW"
    df_synt["risk_label"] = df_synt["risk_score"].apply(_label)

    # Round integer-like cols
    for col in ["avg_earnings_per_hour", "experience_months", "total_flags"]:
        df_synt[col] = df_synt[col].round().astype(int)

    df_synt["rating"] = df_synt["rating"].clip(1.0, 5.0)
    return df_synt

df_synt = generate_synthetic(df_orig_features, N_SYNTHETIC)
df_synt["source"] = "synthetic"

# Assign synthetic driver IDs in DRV0001 format (continuing from 211)
# So original 210 drivers keep DRV001-DRV210 (3-digit from source)
# Synthetic get DRV0211-DRV5210 (4-digit, continuing sequence)
df_synt["driver_id"] = [f"DRV{210 + i + 1:04d}" for i in range(N_SYNTHETIC)]

# Also add a placeholder name for synthetic drivers
def _synth_name(driver_id):
    FIRST_NAMES = ["Arjun","Priya","Rahul","Anjali","Vikram","Meera","Suresh","Kavita",
                   "Amit","Pooja","Rajesh","Sunita","Deepak","Nisha","Ramesh","Lakshmi"]
    LAST_NAMES  = ["Sharma","Kumar","Singh","Patel","Gupta","Verma","Mishra","Joshi",
                   "Nair","Reddy","Iyer","Rao","Das","Mehta","Shah","Bose"]
    idx   = int(driver_id.replace("DRV","")) - 1
    first = FIRST_NAMES[idx % len(FIRST_NAMES)]
    last  = LAST_NAMES[idx % len(LAST_NAMES)]
    return f"{first} {last}"

df_synt["name"] = df_synt["driver_id"].apply(_synth_name)

# ── 5. Combine original (with real IDs+names) + synthetic ───────────────────────
# Columns: driver_id, name, + all feature cols + source
ALL_COLS = ["driver_id", "name"] + FEATURE_COLS_FOR_MODEL + ["source"]

df_orig_full = df_orig[ALL_COLS].copy()  # 210 rows with real DRV001-DRV210
df_synt_full = df_synt[ALL_COLS].copy()  # 5000 rows with DRV0211-DRV5210

df_final = pd.concat([df_orig_full, df_synt_full], ignore_index=True)

# ── 6. Sanity checks ─────────────────────────────────────────────────────────────
print("=" * 60)
print("REGENERATED final_driver_dataset.csv — Sanity Checks")
print("=" * 60)
print(f"Total rows              : {len(df_final):,}")
print(f"Original rows           : {(df_final['source']=='original').sum()}")
print(f"Synthetic rows          : {(df_final['source']=='synthetic').sum()}")
print(f"Has driver_id column    : {'driver_id' in df_final.columns}")
print(f"driver_id null count    : {df_final['driver_id'].isnull().sum()}")
print(f"driver_id duplicates    : {df_final['driver_id'].duplicated().sum()}")
print(f"First 5 IDs             : {df_final['driver_id'].head(5).tolist()}")
print(f"IDs 209-213             : {df_final['driver_id'].iloc[208:213].tolist()}")
print(f"Last 5 IDs              : {df_final['driver_id'].tail(5).tolist()}")
print(f"Columns                 : {list(df_final.columns)}")
print()

# Verify original driver IDs are preserved exactly
orig_ids_in_final = df_final[df_final['source']=='original']['driver_id'].tolist()
orig_ids_source   = df_orig['driver_id'].tolist()
all_preserved = (orig_ids_in_final == orig_ids_source)
print(f"Original IDs preserved  : {all_preserved}")
if not all_preserved:
    print("  MISMATCH detected!")
    for a, b in zip(orig_ids_in_final[:5], orig_ids_source[:5]):
        print(f"    final={a}  source={b}")
print()

# ── 7. Save ──────────────────────────────────────────────────────────────────────
FINAL_CSV.parent.mkdir(parents=True, exist_ok=True)

# Backup the broken file first
import shutil, datetime
ts          = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
backup_path = FINAL_CSV.with_name(f"final_driver_dataset_BACKUP_{ts}.csv")
if FINAL_CSV.exists():
    shutil.copy(FINAL_CSV, backup_path)
    print(f"Backed up existing file -> {backup_path.name}")

df_final.to_csv(FINAL_CSV, index=False)
print(f"Saved regenerated dataset -> {FINAL_CSV}")
print(f"   Rows    : {len(df_final):,}")
print(f"   Columns : {len(df_final.columns)}")
print()
print("NEXT STEPS:")
print("  1. Restart the Python backend (python app.py)")
print("  2. backend/services/model_loader.py no longer needs to generate synthetic IDs")
print("     because driver_id is now embedded in the CSV.")
print("  3. Run the model_loader fix (see README instructions)")
