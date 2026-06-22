"""
routes/drivers.py
==================
GET /drivers       — list all drivers (id, name, city)
GET /driver/{id}   — full driver profile
"""

from fastapi import APIRouter, HTTPException, Query
from services.model_loader import get_store
from services.predictor import predict_driver
from utils.driver_id import normalize_driver_id

router = APIRouter()


@router.get(
    "/drivers",
    summary="List all drivers",
    response_description="Array of driver stubs (id, name, city)",
)
def list_drivers(
    city: str | None = Query(default=None, description="Filter by city name"),
    risk: str | None = Query(default=None, description="Filter by risk_label (HIGH/MEDIUM/LOW)"),
    limit: int       = Query(default=500,  ge=1, le=5000, description="Max records to return"),
):
    df = get_store()["df"]

    if city:
        df = df[df["city"].str.lower() == city.lower()]
    if risk:
        df = df[df["risk_label"].str.upper() == risk.upper()]

    df = df.head(limit)

    return {
        "count":   len(df),
        "drivers": [
            {
                "driver_id":  str(r["driver_id"]),
                "name":       str(r["name"]),
                "city":       str(r["city"]),
                "risk_label": str(r["risk_label"]),
                "rating":     round(float(r["rating"]), 2),
            }
            for _, r in df.iterrows()
        ],
    }


@router.get(
    "/driver/{driver_id}",
    summary="Full driver profile",
    response_description="Complete driver record",
)
def driver_profile(driver_id: str):
    driver_id = normalize_driver_id(driver_id)  # DRV001 → DRV0001
    df = get_store()["df"]
    row = df[df["driver_id"] == driver_id]

    if row.empty:
        from services.predictor import get_prediction_from_db
        saved = get_prediction_from_db(driver_id)
        if saved and "riskLabel" in saved:
            return {
                "driver_id": driver_id,
                "predicted_risk_label": saved["riskLabel"],
                "prediction_confidence": saved["confidence"],
                "predicted_safety_score": saved["safetyScore"],
                "is_new_driver": True
            }
        return {"driver_id": driver_id, "needs_assessment": True}

    r = row.iloc[0]

    try:
        prediction = predict_driver(driver_id)
        predicted_risk_label = prediction["risk_level"]
        prediction_confidence = prediction["confidence"]
        predicted_safety_score = prediction["predicted_safety_score"]
        top_features = prediction["top_features"]
    except Exception:
        predicted_risk_label = str(r["risk_label"])
        prediction_confidence = 0.0
        predicted_safety_score = round((float(r["rating"]) / 5) * 100, 1)
        top_features = []

    return {
        "driver_id":           str(r["driver_id"]),
        "name":                str(r["name"]),
        "city":                str(r["city"]),
        "shift_preference":    str(r["shift_preference"]),
        "avg_hours_per_day":   round(float(r["avg_hours_per_day"]),    2),
        "avg_earnings_per_hour": round(float(r["avg_earnings_per_hour"]), 2),
        "experience_months":   int(r["experience_months"]),
        "rating":              round(float(r["rating"]),                2),
        "daily_productivity":  round(float(r["daily_productivity"]),    2),
        "avg_combined_score":  round(float(r["avg_combined_score"]),    4),
        "avg_motion_score":    round(float(r["avg_motion_score"]),      4),
        "avg_audio_score":     round(float(r["avg_audio_score"]),       4),
        "total_flags":         int(r["total_flags"]),
        "risk_score":          round(float(r["risk_score"]),            4),
        "risk_label":          str(r["risk_label"]),
        "predicted_risk_label": predicted_risk_label,
        "prediction_confidence": prediction_confidence,
        "predicted_safety_score": predicted_safety_score,
        "top_features":        top_features,
        "source":              str(r.get("source", "unknown")),
    }
