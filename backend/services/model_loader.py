"""
services/model_loader.py
========================
Loads risk_classifier.pkl, encoders.pkl, and final_driver_dataset.csv
exactly once at application startup. Results are held in a module-level
dict (_STORE) and exposed via get_store().
"""

import os
import pickle
import pandas as pd

# backend/services/model_loader.py lives 2 levels below the project root,
# so __file__ = .../backend/services/model_loader.py
# dirname once  → .../backend/services/
# dirname twice → .../backend/
# dirname three → project root (driver-pulse-hackathon/)
_SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))  # .../backend/services/
_BACKEND_DIR  = os.path.dirname(_SERVICES_DIR)               # .../backend/
PROJECT_ROOT  = os.path.dirname(_BACKEND_DIR)                # project root

BASE_DIR   = PROJECT_ROOT
MODEL_PATH = os.path.join(BASE_DIR, "models", "risk_classifier.pkl")
ENC_PATH   = os.path.join(BASE_DIR, "models", "encoders.pkl")

# The CSV lives in processed/ at project root; also allow a local data/ copy.
_CSV_CANDIDATES = [
    os.path.join(BASE_DIR, "data",      "final_driver_dataset.csv"),
    os.path.join(BASE_DIR, "processed", "final_driver_dataset.csv"),
    os.path.join(_BACKEND_DIR, "data",  "final_driver_dataset.csv"),
]

_STORE: dict = {}


def load_all_assets() -> None:
    """Load model bundle, encoders, and dataset into _STORE."""
    global _STORE

    # ── Model bundle ──────────────────────────────────────────────────────────
    with open(MODEL_PATH, "rb") as f:
        bundle = pickle.load(f)

    _STORE["model"]        = bundle["model"]
    _STORE["feature_cols"] = bundle["feature_cols"]
    _STORE["class_names"]  = bundle["class_names"]   # e.g. ['HIGH','LOW','MEDIUM']
    _STORE["model_name"]   = bundle["model_name"]

    # ── Encoders ──────────────────────────────────────────────────────────────
    with open(ENC_PATH, "rb") as f:
        _STORE["encoders"] = pickle.load(f)

    # ── Dataset ───────────────────────────────────────────────────────────────
    csv_path = None
    for p in _CSV_CANDIDATES:
        if os.path.isfile(p):
            csv_path = p
            break
    if csv_path is None:
        raise FileNotFoundError(
            f"final_driver_dataset.csv not found. Tried: {_CSV_CANDIDATES}"
        )

    df = pd.read_csv(csv_path)

    # ── Driver ID resolution ──────────────────────────────────────────────────
    # IMPORTANT: If the CSV already contains a driver_id column (which it SHOULD
    # after running fix_dataset.py), use it directly. The IDs in the CSV are the
    # authoritative ones that match what the Node auth server assigns to users.
    # Only fall back to row-index generation if driver_id is completely absent.
    if "driver_id" not in df.columns or df["driver_id"].isnull().all():
        # Legacy fallback — CSV was generated without driver_id (the old bug).
        # This regenerates IDs by row index which will NOT match auth IDs.
        # Fix the dataset by running fix_dataset.py at the project root.
        print("[model_loader] WARNING: driver_id missing from CSV — using row-index fallback.")
        print("[model_loader] Run fix_dataset.py to regenerate the dataset correctly.")
        df = df.reset_index(drop=True)
        df["driver_id"] = df.index.map(lambda i: f"DRV{i+1:04d}")
        df["name"] = df["driver_id"].map(_generate_name)
    else:
        # driver_id is already in the CSV — use it as-is.
        df = df.reset_index(drop=True)
        # Fill in name column if missing or empty
        if "name" not in df.columns or df["name"].isnull().all():
            df["name"] = df["driver_id"].map(_generate_name)
        else:
            # Fill only rows that have a null name
            mask = df["name"].isnull() | (df["name"].astype(str).str.strip() == "")
            df.loc[mask, "name"] = df.loc[mask, "driver_id"].map(_generate_name)

    _STORE["df"] = df

    print(
        f"[model_loader] Loaded {len(df):,} drivers | "
        f"model={_STORE['model_name']} | "
        f"classes={_STORE['class_names']}"
    )


def get_store() -> dict:
    return _STORE


# ── Helpers ───────────────────────────────────────────────────────────────────
_FIRST_NAMES = [
    "Arjun","Priya","Rahul","Anjali","Vikram","Meera","Suresh","Kavita",
    "Amit","Pooja","Rajesh","Sunita","Deepak","Nisha","Ramesh","Lakshmi",
    "Ashok","Geeta","Manoj","Sushma","Vivek","Rekha","Arun","Uma",
    "Sanjay","Smita","Kishore","Usha","Narayan","Shanti",
]
_LAST_NAMES = [
    "Sharma","Kumar","Singh","Patel","Gupta","Verma","Mishra","Joshi",
    "Nair","Reddy","Iyer","Rao","Das","Mehta","Shah","Bose","Malhotra",
    "Chopra","Pillai","Menon",
]


def _generate_name(driver_id: str) -> str:
    """Deterministically generate a readable name from a driver_id string."""
    idx = int(driver_id[3:]) - 1
    first = _FIRST_NAMES[idx % len(_FIRST_NAMES)]
    last  = _LAST_NAMES[idx % len(_LAST_NAMES)]
    return f"{first} {last}"
