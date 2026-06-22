"""
deep_audit.py
=============
Full pipeline trace for DRV001, DRV050, DRV100, DRV150, DRV200.
Mirrors exactly what services/predictor.py + services/model_loader.py do.
READ-ONLY — no side effects, no DB writes.
"""

import os, sys, pickle, json
import numpy as np
import pandas as pd

# ── Paths (same logic as model_loader.py) ─────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH   = os.path.join(SCRIPT_DIR, "models", "risk_classifier.pkl")
ENC_PATH     = os.path.join(SCRIPT_DIR, "models", "encoders.pkl")
CSV_PATH     = os.path.join(SCRIPT_DIR, "processed", "final_driver_dataset.csv")

TARGET_IDS   = ["DRV001", "DRV050", "DRV100", "DRV150", "DRV200"]


# ── Load assets ───────────────────────────────────────────────────────────────
print("=" * 80)
print("STEP 1 — LOADING ASSETS")
print("=" * 80)

with open(MODEL_PATH, "rb") as f:
    bundle = pickle.load(f)

model        = bundle["model"]
feature_cols = bundle["feature_cols"]
class_names  = bundle["class_names"]
model_name   = bundle["model_name"]

print(f"Model name   : {model_name}")
print(f"Feature cols : {feature_cols}")
print(f"Class names  : {class_names}")
print(f"n_estimators : {getattr(model, 'n_estimators', 'N/A')}")
print()

with open(ENC_PATH, "rb") as f:
    encoders = pickle.load(f)

print(f"Encoders keys: {list(encoders.keys())}")
for k, v in encoders.items():
    try:
        print(f"  {k}: classes={list(v.classes_)}")
    except AttributeError:
        try:
            print(f"  {k}: categories={[list(c) for c in v.categories_]}")
        except:
            print(f"  {k}: {type(v)}")
print()


# ── Load CSV ──────────────────────────────────────────────────────────────────
print("=" * 80)
print("STEP 2 — LOADING CSV")
print("=" * 80)

csv_exists = os.path.isfile(CSV_PATH)
print(f"CSV path     : {CSV_PATH}")
print(f"CSV exists   : {csv_exists}")

df_raw = pd.read_csv(CSV_PATH)
print(f"Shape        : {df_raw.shape}")
print(f"Columns      : {list(df_raw.columns)}")

# Replicate model_loader.py logic exactly
if "driver_id" not in df_raw.columns or df_raw["driver_id"].isnull().all():
    print("WARNING: driver_id column MISSING — row-index fallback ACTIVE")
    df = df_raw.reset_index(drop=True)
    df["driver_id"] = df.index.map(lambda i: f"DRV{i+1:04d}")
    id_source = "row_index_fallback"
else:
    print("driver_id column is present — using as-is")
    df = df_raw.reset_index(drop=True)
    id_source = "csv_column"

print(f"ID source    : {id_source}")
print(f"Sample IDs   : {list(df['driver_id'].head(10))}")
print(f"Total rows   : {len(df)}")
print()


# ── Per-driver trace ──────────────────────────────────────────────────────────

def _experience_level(months: float) -> str:
    if months < 6:
        return "junior"
    elif months < 24:
        return "mid"
    return "senior"


results = []

for driver_id in TARGET_IDS:
    print("=" * 80)
    print(f"TRACE: {driver_id}")
    print("=" * 80)

    # 1. Lookup
    row_match = df[df["driver_id"] == driver_id]
    found     = not row_match.empty

    print(f"[1] Driver found in CSV?  {found}")
    if found:
        row_index = row_match.index[0]
        row       = row_match.iloc[0].copy()
        print(f"[1] Row index (0-based) : {row_index}")
    else:
        print(f"[1] NOT FOUND — would fall through to DB / CASE 3")
        results.append({
            "driver_id": driver_id,
            "found":     False,
        })
        continue

    # 2. Raw feature values from CSV row
    print("\n[2] RAW FEATURE VALUES (from CSV row):")
    raw_vals = {}
    for col in feature_cols:
        v = row.get(col, np.nan)
        raw_vals[col] = v
        print(f"      {col:35s} = {v}")

    # 3. Add derived field
    exp_months = float(row.get("experience_months", 0))
    exp_level  = _experience_level(exp_months)
    print(f"\n[2b] Derived experience_level: '{exp_level}'  (from experience_months={exp_months})")

    # 4. Build feat_row (mirrors predictor.py lines 67-89)
    feat_row = {}
    for col in feature_cols:
        feat_row[col] = row.get(col, np.nan)

    # Fill NaN → 0
    for col in feature_cols:
        if pd.isna(feat_row.get(col)):
            feat_row[col] = 0.0

    # Set derived feature
    if "experience_level" in feature_cols:
        feat_row["experience_level"] = exp_level

    print("\n[3] ENCODED VALUES after preprocessing:")
    pre_encode = dict(feat_row)

    # Nominal encoders
    for nom_col in ["city", "shift_preference"]:
        if nom_col in feature_cols:
            le  = encoders[nom_col]
            val = str(feat_row[nom_col])
            if val not in le.classes_:
                print(f"      WARNING: '{val}' not in {nom_col} encoder classes → using fallback '{le.classes_[0]}'")
                val = le.classes_[0]
            encoded_val = int(le.transform([val])[0])
            feat_row[nom_col] = encoded_val
            print(f"      {nom_col:20s}: '{pre_encode[nom_col]}' → {encoded_val}")

    # Ordinal encoder
    if "experience_level" in feature_cols:
        oe  = encoders["experience_level"]
        val = str(feat_row["experience_level"])
        encoded_exp = int(oe.transform([[val]])[0][0])
        feat_row["experience_level"] = encoded_exp
        print(f"      {'experience_level':20s}: '{exp_level}' → {encoded_exp}")

    # 5. Model input vector
    X = pd.DataFrame([feat_row])[feature_cols].astype(float)
    print("\n[4] MODEL INPUT VECTOR:")
    for col in feature_cols:
        print(f"      {col:35s} = {X[col].values[0]}")

    vector = X.values[0]

    # 6. Raw model probabilities
    pred_idx = model.predict(X)[0]
    proba    = model.predict_proba(X)[0]

    print("\n[5] RAW MODEL PROBABILITIES:")
    for cls_idx, cls_name in enumerate(model.classes_):
        label = encoders["risk_label"].inverse_transform([cls_idx])[0]
        print(f"      class {cls_idx} ({label}): {proba[cls_idx]:.6f}")

    confidence = float(round(float(proba[pred_idx]), 4))
    target_le  = encoders["risk_label"]
    risk_level = str(target_le.inverse_transform([pred_idx])[0])

    print(f"\n[6] PREDICTION:")
    print(f"      pred_idx    = {pred_idx}")
    print(f"      risk_level  = {risk_level}")
    print(f"      confidence  = {confidence}")

    # 7. Safety score
    if risk_level == "LOW":
        predicted_safety_score = round(85 + (15 * confidence), 1)
    elif risk_level == "MEDIUM":
        predicted_safety_score = round(65 + (15 * confidence), 1)
    else:
        predicted_safety_score = round(30 + (30 * confidence), 1)

    print(f"      safety_score= {predicted_safety_score}")

    results.append({
        "driver_id":    driver_id,
        "found":        True,
        "row_index":    int(row_index),
        "raw_values":   {c: raw_vals[c] for c in feature_cols},
        "input_vector": {c: float(X[c].values[0]) for c in feature_cols},
        "probabilities": {str(encoders["risk_label"].inverse_transform([i])[0]): float(proba[i]) for i in range(len(proba))},
        "pred_idx":     int(pred_idx),
        "risk_level":   risk_level,
        "confidence":   confidence,
        "safety_score": predicted_safety_score,
    })
    print()


# ── Summary Table ─────────────────────────────────────────────────────────────
print("\n" + "=" * 80)
print("SUMMARY TABLE")
print("=" * 80)

header = f"{'Driver':8s} | {'Found':5s} | {'Row':6s} | {'Risk':8s} | {'Conf':6s} | {'Score':6s}"
print(header)
print("-" * len(header))
for r in results:
    if r["found"]:
        print(f"{r['driver_id']:8s} | {'YES':5s} | {r['row_index']:6d} | {r['risk_level']:8s} | {r['confidence']:6.4f} | {r['safety_score']:6.1f}")
    else:
        print(f"{r['driver_id']:8s} | {'NO':5s} | {'—':6s} | {'—':8s} | {'—':6s} | {'—':6s}")


# ── Identical vector check ────────────────────────────────────────────────────
print("\n" + "=" * 80)
print("IDENTICAL INPUT VECTOR CHECK")
print("=" * 80)

found_results = [r for r in results if r["found"]]
for i in range(len(found_results)):
    for j in range(i+1, len(found_results)):
        ri = found_results[i]
        rj = found_results[j]
        vi = np.array([ri["input_vector"][c] for c in feature_cols])
        vj = np.array([rj["input_vector"][c] for c in feature_cols])
        if np.allclose(vi, vj):
            print(f"IDENTICAL: {ri['driver_id']} and {rj['driver_id']} have THE SAME input vector!")
            for c in feature_cols:
                if ri["input_vector"][c] != rj["input_vector"][c]:
                    print(f"  DIFF {c}: {ri['input_vector'][c]} vs {rj['input_vector'][c]}")
        else:
            diffs = [(c, ri["input_vector"][c], rj["input_vector"][c])
                     for c in feature_cols
                     if abs(ri["input_vector"][c] - rj["input_vector"][c]) > 1e-9]
            print(f"{ri['driver_id']} vs {rj['driver_id']}: {len(diffs)} feature(s) differ")

print("\nDone.")
