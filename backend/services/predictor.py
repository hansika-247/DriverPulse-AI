"""
services/predictor.py
======================
Applies the saved encoders and Random Forest to produce a risk prediction
for a single driver row. Also returns the top-5 contributing features.

DUAL-PATH PREDICTION
--------------------
  CASE 1 — Driver exists in CSV dataset:
      Encode row → run RF → return live prediction

  CASE 2 — Driver NOT in dataset but has a DB-saved prediction:
      Return stored result (from a previous assessment-form submission)

  CASE 3 — Driver unknown, never assessed:
      Return { needs_assessment: True } — no ValueError, no HTTP 404

No 404 is ever raised for a legitimately registered user.
"""

import numpy as np
import pandas as pd
import subprocess
import json
import os
from services.model_loader import get_store


def _experience_level(months: float) -> str:
    if months < 6:
        return "junior"
    elif months < 24:
        return "mid"
    return "senior"


# ─────────────────────────────────────────────────────────────────────────────
# Primary prediction entry point
# ─────────────────────────────────────────────────────────────────────────────

def predict_driver(driver_id: str) -> dict:
    """
    Dual-path prediction — never raises, never 404s.

    Returns one of:
      { driver_id, risk_level, confidence, predicted_safety_score,
        top_features, source }              ← CASE 1 or CASE 2

      { driver_id, needs_assessment: True,
        risk_level: None, confidence: 0.0,
        predicted_safety_score: 0.0 }      ← CASE 3
    """
    store        = get_store()
    df           = store["df"]
    model        = store["model"]
    encoders     = store["encoders"]
    feature_cols = store["feature_cols"]

    # ── CASE 1: Driver exists in dataset ─────────────────────────────────────
    row = df[df["driver_id"] == driver_id]
    if not row.empty:
        row = row.iloc[0].copy()

        # Add derived feature used during training
        row["experience_level"] = _experience_level(float(row["experience_months"]))

        feat_row = {}
        for col in feature_cols:
            feat_row[col] = row.get(col, np.nan)

        # Fill missing values
        for col in feature_cols:
            if pd.isna(feat_row.get(col)):
                feat_row[col] = 0.0

        # Nominal encoders: city, shift_preference
        for nom_col in ["city", "shift_preference"]:
            if nom_col in feature_cols:
                le = encoders[nom_col]
                val = str(feat_row[nom_col])
                if val not in le.classes_:
                    val = le.classes_[0]
                feat_row[nom_col] = int(le.transform([val])[0])

        # Ordinal encoder: experience_level
        if "experience_level" in feature_cols:
            oe  = encoders["experience_level"]
            val = str(feat_row["experience_level"])
            feat_row["experience_level"] = int(oe.transform([[val]])[0][0])

        X          = pd.DataFrame([feat_row])[feature_cols].astype(float)
        pred_idx   = model.predict(X)[0]
        proba      = model.predict_proba(X)[0]
        confidence = float(round(float(proba[pred_idx]), 4))

        target_le  = encoders["risk_label"]
        risk_level = str(target_le.inverse_transform([pred_idx])[0])

        importances  = model.feature_importances_
        top_idx      = np.argsort(importances)[::-1][:5]
        top_features = [
            {"feature": feature_cols[i], "importance": round(float(importances[i]), 4)}
            for i in top_idx
        ]

        if risk_level == "LOW":
            predicted_safety_score = round(85 + (15 * confidence), 1)
        elif risk_level == "MEDIUM":
            predicted_safety_score = round(65 + (15 * confidence), 1)
        else:
            predicted_safety_score = round(30 + (30 * confidence), 1)

        return {
            "driver_id":              driver_id,
            "risk_level":             risk_level,
            "confidence":             confidence,
            "predicted_safety_score": predicted_safety_score,
            "top_features":           top_features,
            "source":                 "dataset",
        }

    # ── CASE 2: Not in dataset — check DB for previously saved prediction ────
    saved = get_prediction_from_db(driver_id)
    if saved and "riskLabel" in saved:
        risk_level   = str(saved["riskLabel"])
        confidence   = float(saved.get("confidence", 0.0))
        safety_score = float(saved.get("safetyScore", 0.0))
        return {
            "driver_id":              driver_id,
            "risk_level":             risk_level,
            "confidence":             confidence,
            "predicted_safety_score": safety_score,
            "top_features":           [],
            "source":                 "db_assessment",
        }

    # ── CASE 3: Unknown driver, never assessed ───────────────────────────────
    return {
        "driver_id":              driver_id,
        "needs_assessment":       True,
        "risk_level":             None,
        "confidence":             0.0,
        "predicted_safety_score": 0.0,
        "top_features":           [],
        "source":                 "none",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Fleet-wide batch prediction
# ─────────────────────────────────────────────────────────────────────────────

def predict_all() -> pd.DataFrame:
    """Predict risk level, confidence, and safety score for the entire fleet at once."""
    store        = get_store()
    df           = store["df"].copy()
    model        = store["model"]
    encoders     = store["encoders"]
    feature_cols = store["feature_cols"]

    # Add experience level
    df["experience_level"] = df["experience_months"].astype(float).apply(_experience_level)

    # Encode nominal columns
    for nom_col in ["city", "shift_preference"]:
        if nom_col in feature_cols:
            le = encoders[nom_col]
            known_classes = set(le.classes_)
            df[nom_col] = df[nom_col].apply(
                lambda x: x if x in known_classes else le.classes_[0]
            )
            df[nom_col] = le.transform(df[nom_col])

    if "experience_level" in feature_cols:
        oe = encoders["experience_level"]
        df["experience_level"] = oe.transform(df[["experience_level"]])

    X = df[feature_cols].fillna(0.0).astype(float)

    pred_indices = model.predict(X)
    probas       = model.predict_proba(X)
    confidences  = np.max(probas, axis=1)

    target_le  = encoders["risk_label"]
    risk_labels = target_le.inverse_transform(pred_indices)

    df["predicted_risk_label"]  = risk_labels
    df["prediction_confidence"] = confidences

    def calc_score(row):
        r = row["predicted_risk_label"]
        c = row["prediction_confidence"]
        if r == "LOW":    return round(85 + (15 * c), 1)
        if r == "MEDIUM": return round(65 + (15 * c), 1)
        return round(30 + (30 * c), 1)

    df["predicted_safety_score"] = df.apply(calc_score, axis=1)
    return df


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers — write / read predictions via Node scripts
# ─────────────────────────────────────────────────────────────────────────────

def save_prediction_to_db(driver_id, risk_label, confidence, safety_score):
    """Persist prediction to the driver_predictions table via insertPrediction.cjs."""
    script_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "server", "insertPrediction.cjs")
    )
    try:
        subprocess.run(
            ["node", script_path, str(driver_id), str(risk_label), str(confidence), str(safety_score)],
            check=True,
            capture_output=True,
        )
        print(f"[predictor] Saved prediction for {driver_id} → {risk_label}")
    except Exception as e:
        print(f"[predictor] DB insert failed for {driver_id}: {e}")


def get_prediction_from_db(driver_id: str) -> dict:
    """
    Retrieve the latest saved prediction for driver_id from the DB.
    Returns {} if none found or if the Node script fails.
    """
    script_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "server", "getPrediction.cjs")
    )
    try:
        result = subprocess.run(
            ["node", script_path, str(driver_id)],
            check=True,
            capture_output=True,
            text=True,
        )
        if not result.stdout.strip():
            return {}
        return json.loads(result.stdout.strip())
    except Exception as e:
        print(f"[predictor] DB get failed for {driver_id}: {e}")
        return {}


# ─────────────────────────────────────────────────────────────────────────────
# Assessment-form prediction (new drivers)
# ─────────────────────────────────────────────────────────────────────────────

def predict_new_driver_features(driver_id: str, features: dict) -> dict:
    """
    Run ML prediction from raw assessment-form feature dict.
    Saves result to DB so subsequent logins bypass the form entirely.
    """
    store        = get_store()
    model        = store["model"]
    encoders     = store["encoders"]
    feature_cols = store["feature_cols"]

    df = pd.DataFrame([features])

    if "experience_months" in df.columns:
        df["experience_level"] = df["experience_months"].astype(float).apply(_experience_level)

    for nom_col in ["city", "shift_preference"]:
        if nom_col in feature_cols and nom_col in df.columns:
            le = encoders[nom_col]
            known_classes = set(le.classes_)
            df[nom_col] = df[nom_col].apply(
                lambda x: x if x in known_classes else le.classes_[0]
            )
            df[nom_col] = le.transform(df[nom_col])

    if "experience_level" in feature_cols and "experience_level" in df.columns:
        oe = encoders["experience_level"]
        df["experience_level"] = oe.transform(df[["experience_level"]])

    for col in feature_cols:
        if col not in df.columns:
            df[col] = 0.0

    X = df[feature_cols].fillna(0.0).astype(float)

    pred_idx   = model.predict(X)[0]
    probas     = model.predict_proba(X)[0]
    confidence = float(np.max(probas))

    target_le  = encoders["risk_label"]
    risk_level = str(target_le.inverse_transform([pred_idx])[0])

    if risk_level == "LOW":
        predicted_safety_score = round(85 + (15 * confidence), 1)
    elif risk_level == "MEDIUM":
        predicted_safety_score = round(65 + (15 * confidence), 1)
    else:
        predicted_safety_score = round(30 + (30 * confidence), 1)

    feature_importances = model.feature_importances_
    top_idx             = np.argsort(feature_importances)[::-1][:5]
    top_features = [
        {"feature": feature_cols[i], "importance": round(float(feature_importances[i]), 4)}
        for i in top_idx
    ]

    # Persist so future logins load instantly from DB
    save_prediction_to_db(driver_id, risk_level, confidence, predicted_safety_score)

    return {
        "driver_id":              driver_id,
        "risk_level":             risk_level,
        "confidence":             confidence,
        "predicted_safety_score": predicted_safety_score,
        "top_features":           top_features,
        "source":                 "assessment_form",
    }
