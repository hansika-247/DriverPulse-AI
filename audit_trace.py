import sys, os
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
from services.model_loader import load_all_assets, get_store

def _experience_level(months: float) -> str:
    if months < 6:
        return "junior"
    elif months < 24:
        return "mid"
    return "senior"

def trace_driver(driver_id: str):
    print(f"\\n{'='*60}\\nTRACE FOR DRIVER_ID: {driver_id}\\n{'='*60}")
    
    store = get_store()
    df = store["df"]
    model = store["model"]
    encoders = store["encoders"]
    feature_cols = store["feature_cols"]

    # 1. Was driver found?
    row = df[df["driver_id"] == driver_id]
    found = not row.empty
    print(f"1. Found in final_driver_dataset.csv: {found}")
    
    if not found:
        print("Driver not found in CSV. Checking padded version...")
        padded_id = f"DRV{int(driver_id.replace('DRV', '')):04d}" if driver_id.startswith('DRV') and driver_id[3:].isdigit() else driver_id
        row = df[df["driver_id"] == padded_id]
        if not row.empty:
            print(f"   -> Found padded version: {padded_id}. Using this row for trace.")
            driver_id = padded_id
        else:
            print("   -> Padded version not found either.")
            print("   -> Fallback to DB or needs_assessment (CASE 2 or 3 in predictor.py, lines 129-153).")
            return
            
    # 2. Row index returned
    row_idx = row.index[0]
    print(f"2. Row index returned: {row_idx}")
    
    row_data = row.iloc[0].copy()
    row_data["experience_level"] = _experience_level(float(row_data["experience_months"]))
    
    # 3. Feature values used
    feat_row = {}
    print("3. Feature values used for prediction (raw):")
    for col in feature_cols:
        val = row_data.get(col, np.nan)
        feat_row[col] = val
        print(f"   {col}: {val}")
        
    for col in feature_cols:
        if pd.isna(feat_row.get(col)):
            feat_row[col] = 0.0
            
    # 4. Encoded values
    print("4. Encoded values after preprocessing:")
    for nom_col in ["city", "shift_preference"]:
        if nom_col in feature_cols:
            le = encoders[nom_col]
            val = str(feat_row[nom_col])
            orig_val = val
            if val not in le.classes_:
                val = le.classes_[0]
            feat_row[nom_col] = int(le.transform([val])[0])
            print(f"   {nom_col}: {orig_val} -> {feat_row[nom_col]}")
            
    if "experience_level" in feature_cols:
        oe  = encoders["experience_level"]
        val = str(feat_row["experience_level"])
        feat_row["experience_level"] = int(oe.transform([[val]])[0][0])
        print(f"   experience_level: {val} -> {feat_row['experience_level']}")
        
    # 5. Model input vector
    X = pd.DataFrame([feat_row])[feature_cols].astype(float)
    print("5. Model input vector:")
    print(f"   {X.values.tolist()[0]}")
    
    # 6. Raw model probabilities
    pred_idx = model.predict(X)[0]
    proba = model.predict_proba(X)[0]
    print("6. Raw model probabilities:")
    print(f"   {proba.tolist()} (Class indices: {encoders['risk_label'].classes_})")
    
    # 7. Final risk level
    confidence = float(round(float(proba[pred_idx]), 4))
    risk_level = str(encoders["risk_label"].inverse_transform([pred_idx])[0])
    print(f"7. Final risk level: {risk_level} (Confidence: {confidence})")
    
    # 8. Final safety score
    if risk_level == "LOW":
        predicted_safety_score = round(85 + (15 * confidence), 1)
    elif risk_level == "MEDIUM":
        predicted_safety_score = round(65 + (15 * confidence), 1)
    else:
        predicted_safety_score = round(30 + (30 * confidence), 1)
        
    print(f"8. Final safety score: {predicted_safety_score}")


if __name__ == "__main__":
    load_all_assets()
    test_ids = ["DRV001", "DRV050", "DRV100", "DRV150", "DRV200"]
    for d in test_ids:
        trace_driver(d)
