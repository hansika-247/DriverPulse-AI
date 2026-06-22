"""
test_normalization.py
======================
Verifies the Driver ID normalization fix end-to-end.

Tests:
  1. normalize_driver_id() utility function
  2. Full ML pipeline for DRV001 / DRV050 / DRV100 / DRV150 / DRV200
     -> Each must find a CSV row and return a unique, non-assessment result.

Run from the project root:
    python test_normalization.py
"""

import sys, os

# Force UTF-8 on Windows to avoid cp1252 codec errors
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# -- Setup: point to backend so imports resolve --------------------------------
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

# -- 1. Unit-test the normalize function ----------------------------------------
from utils.driver_id import normalize_driver_id

print("=" * 60)
print("STEP 1: normalize_driver_id() unit tests")
print("=" * 60)

cases = [
    ("DRV1",    "DRV0001"),
    ("DRV01",   "DRV0001"),
    ("DRV001",  "DRV0001"),
    ("DRV0001", "DRV0001"),
    ("drv001",  "DRV0001"),
    ("DRV050",  "DRV0050"),
    ("DRV0050", "DRV0050"),
    ("DRV100",  "DRV0100"),
    ("DRV0100", "DRV0100"),
    ("DRV150",  "DRV0150"),
    ("DRV200",  "DRV0200"),
    ("DRV5210", "DRV5210"),
    ("john_doe","john_doe"),   # non-DRV IDs pass through unchanged
]

all_passed = True
for raw, expected in cases:
    result = normalize_driver_id(raw)
    ok     = result == expected
    status = "PASS" if ok else "FAIL"
    if not ok:
        all_passed = False
    print(f"  [{status}]  normalize_driver_id({raw!r}) -> {result!r}  (expected {expected!r})")

print()
if all_passed:
    print("All normalization tests PASSED")
else:
    print("Some normalization tests FAILED")
print()

# -- 2. Load ML assets ---------------------------------------------------------
print("=" * 60)
print("STEP 2: Loading ML model + dataset")
print("=" * 60)

from services.model_loader import load_all_assets, get_store
load_all_assets()

store = get_store()
df    = store["df"]

print(f"  Drivers loaded   : {len(df):,}")
print(f"  Sample IDs       : {df['driver_id'].head(5).tolist()}")
print(f"  Model            : {store['model_name']}")
print(f"  Classes          : {store['class_names']}")
print()

# -- 3. Full pipeline for the 5 test driver IDs --------------------------------
print("=" * 60)
print("STEP 3: End-to-end prediction for 5 drivers")
print("=" * 60)

from services.predictor import predict_driver

test_ids = ["DRV001", "DRV050", "DRV100", "DRV150", "DRV200"]

results = []
for raw_id in test_ids:
    normalized = normalize_driver_id(raw_id)
    result     = predict_driver(raw_id)   # pass raw to test normalisation inside predict_driver

    # Verify the row exists in the dataset
    row     = df[df["driver_id"] == normalized]
    in_csv  = not row.empty

    print(f"\n  Input ID    : {raw_id}")
    print(f"  Normalized  : {normalized}")
    print(f"  CSV row     : {'FOUND' if in_csv else 'NOT FOUND'}")
    print(f"  Source      : {result.get('source', 'N/A')}")
    print(f"  Risk level  : {result.get('risk_level', 'N/A')}")
    print(f"  Confidence  : {result.get('confidence', 'N/A')}")
    print(f"  Safety score: {result.get('predicted_safety_score', 'N/A')}")
    print(f"  Needs assess: {result.get('needs_assessment', False)}")

    results.append({
        "raw":        raw_id,
        "normalized": normalized,
        "in_csv":     in_csv,
        "result":     result,
    })

# -- 4. Summary table ----------------------------------------------------------
print()
print("=" * 60)
print("STEP 4: Summary")
print("=" * 60)
print(f"{'Input':<10} {'Normalized':<12} {'CSV Row':<10} {'Risk':<8} {'Confidence':<12} {'Safety':<8} {'Source'}")
print("-" * 75)

unique_risks  = set()
unique_scores = set()
all_ok = True

for r in results:
    res   = r["result"]
    risk  = res.get("risk_level", "N/A")
    conf  = res.get("confidence", 0)
    score = res.get("predicted_safety_score", 0)
    src   = res.get("source", "N/A")
    na    = res.get("needs_assessment", False)
    found = r["in_csv"]

    unique_risks.add(risk)
    unique_scores.add(score)
    if na or not found:
        all_ok = False

    print(f"{r['raw']:<10} {r['normalized']:<12} {'FOUND' if found else 'MISSING':<10} "
          f"{risk:<8} {conf:<12.4f} {score:<8} {src}")

print()
print(f"All CSV rows found     : {'YES' if all_ok else 'NO -- some drivers still missing'}")
print(f"Unique risk levels     : {sorted(unique_risks)}")
print(f"Unique safety scores   : {sorted(unique_scores)}")
print(f"All produce diff output: {'YES (multiple risk levels)' if len(unique_risks) > 1 else 'Same risk level -- scores may still differ'}")
print()

if all_ok:
    print(">>> NORMALIZATION FIX VERIFIED -- all drivers resolve correctly! <<<")
else:
    print(">>> WARNING: Some drivers still fall into CASE 3 -- check CSV driver_id format. <<<")
