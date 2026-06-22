"""
services/analytics.py
======================
Pure-Python / Pandas analytics that derive fleet-level statistics and
rule-based AI insights from the loaded dataset. No ML inference here.
"""

from __future__ import annotations
import pandas as pd
from services.model_loader import get_store
from services.predictor import predict_all, predict_driver
from utils.driver_id import normalize_driver_id


# ── Fleet summary ─────────────────────────────────────────────────────────────

def fleet_summary() -> dict:
    df = get_store()["df"]

    total   = len(df)
    counts  = df["risk_label"].value_counts().to_dict()
    high    = int(counts.get("HIGH",   0))
    medium  = int(counts.get("MEDIUM", 0))
    low     = int(counts.get("LOW",    0))

    avg_prod   = round(float(df["daily_productivity"].mean()),  2)
    avg_rating = round(float(df["rating"].mean()),              2)

    # City breakdown
    city_grp = (
        df.groupby("city")
        .agg(
            total_drivers=("driver_id", "count"),
            high_risk=(    "risk_label", lambda s: (s == "HIGH").sum()),
            avg_rating=(   "rating",     "mean"),
            avg_productivity=("daily_productivity", "mean"),
        )
        .reset_index()
    )
    city_breakdown = [
        {
            "city":              str(r["city"]),
            "total_drivers":     int(r["total_drivers"]),
            "high_risk":         int(r["high_risk"]),
            "avg_rating":        round(float(r["avg_rating"]),        2),
            "avg_productivity":  round(float(r["avg_productivity"]),  2),
        }
        for _, r in city_grp.iterrows()
    ]

    return {
        "total_drivers":       total,
        "high_risk":           high,
        "medium_risk":         medium,
        "low_risk":            low,
        "average_productivity": avg_prod,
        "average_rating":       avg_rating,
        "city_breakdown":      city_breakdown,
    }


# ── Leaderboard ───────────────────────────────────────────────────────────────

_RISK_SCORE_MAP = {"LOW": 3, "MEDIUM": 2, "HIGH": 1}


def compute_leaderboard(top_n: int = 10) -> list[dict]:
    """
    Score = predicted_safety_score
    """
    df = predict_all()

    top = df.sort_values("predicted_safety_score", ascending=False).head(top_n).reset_index(drop=True)

    result = []
    for rank, (_, row) in enumerate(top.iterrows(), start=1):
        result.append({
            "rank":               rank,
            "driver_id":          str(row["driver_id"]),
            "name":               str(row["name"]),
            "city":               str(row["city"]),
            "risk_label":         str(row["predicted_risk_label"]),
            "rating":             round(float(row["rating"]),            2),
            "daily_productivity": round(float(row["daily_productivity"]), 2),
            "score":              round(float(row["predicted_safety_score"]), 4),
        })
    return result


# ── AI Insights ───────────────────────────────────────────────────────────────

def generate_insights(driver_id: str = None, language: str = 'en') -> list[dict]:
    """
    Generate personalized, deterministic insights for a driver.

    Pulls ML prediction + CSV row fields and delegates to insights_engine.
    Falls back to a generic fleet insight if driver_id is absent or unknown.
    """
    from services.insights_engine import generate_driver_insights

    if driver_id:
        driver_id = normalize_driver_id(driver_id)  # DRV001 → DRV0001
        try:
            pred = predict_driver(driver_id)

            # If driver needs assessment, return the pending insight
            if pred.get("needs_assessment"):
                return generate_driver_insights(
                    driver_id   = driver_id,
                    risk_level  = None,
                    confidence  = 0.0,
                    top_features= [],
                )

            risk  = pred["final_hybrid_risk"]
            ml_risk = pred.get("ml_risk", risk)
            rule_risk = pred.get("rule_risk", risk)
            conf  = pred["confidence"]
            feats = pred["top_features"]

            # Pull raw CSV row so we have all metric fields
            df  = get_store()["df"]
            row = df[df["driver_id"] == driver_id]

            if not row.empty:
                r = row.iloc[0]
                return generate_driver_insights(
                    driver_id          = driver_id,
                    risk_level         = risk,
                    ml_risk            = ml_risk,
                    rule_risk          = rule_risk,
                    confidence         = conf,
                    top_features       = feats,
                    total_flags        = int(r.get("total_flags",         0)),
                    rating             = float(r.get("rating",            4.0)),
                    daily_productivity = float(r.get("daily_productivity",1000.0)),
                    experience_months  = float(r.get("experience_months", 12.0)),
                    avg_motion_score   = float(r.get("avg_motion_score",  0.75)),
                    avg_audio_score    = float(r.get("avg_audio_score",   0.75)),
                    avg_combined_score = float(r.get("avg_combined_score",0.75)),
                    shift_preference   = str(r.get("shift_preference",  "Morning")),
                    avg_hours_per_day  = float(r.get("avg_hours_per_day", 8.0)),
                    language           = language,
                )
            else:
                # Driver found in DB (CASE 2) — use prediction fields only
                return generate_driver_insights(
                    driver_id    = driver_id,
                    risk_level   = risk,
                    ml_risk      = ml_risk,
                    rule_risk    = rule_risk,
                    confidence   = conf,
                    top_features = feats,
                    language     = language,
                )

        except Exception as e:
            print(f"[analytics] generate_insights failed for driver_id={driver_id}: {e}")

    # Fleet-level fallback (no driver_id supplied)
    df        = predict_all()
    high_risk = len(df[df["predicted_risk_label"] == "HIGH"])
    total     = len(df)

    return [
        {
            "type":        "fleet_risk",
            "title":       "Fleet Risk Overview",
            "description": f"AI model predicts {high_risk} HIGH risk drivers out of {total}.",
            "summary":     f"{high_risk} of {total} fleet drivers are currently HIGH risk.",
            "value":       high_risk,
            "severity":    "warning" if high_risk > total * 0.2 else "neutral",
        }
    ]

