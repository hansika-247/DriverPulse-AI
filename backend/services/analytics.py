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

def generate_insights(driver_id: str = None) -> list[dict]:
    if driver_id:
        try:
            pred = predict_driver(driver_id)
            risk = pred["risk_level"]
            conf = pred["confidence"]
            feats = pred["top_features"]
            
            insights = []
            insights.append({
                "type": "risk_assessment",
                "title": "🧠 ML Risk Assessment",
                "description": f"The AI model predicts a {risk} risk level with {conf*100:.1f}% confidence.",
                "value": conf,
                "summary": f"Your predicted risk level is {risk}.",
                "recommendation": "Maintain safe driving habits to improve your score." if risk != "LOW" else "Keep up the excellent driving!"
            })
            
            if feats:
                top_f = feats[0]
                fname = top_f["feature"].replace("_", " ").title()
                insights.append({
                    "type": "top_factor",
                    "title": f"Key Factor: {fname}",
                    "description": f"The most significant factor influencing your score is {fname} ({(top_f['importance']*100):.1f}% importance).",
                    "value": top_f["importance"],
                })
                
            if len(feats) > 1:
                sec_f = feats[1]
                fname2 = sec_f["feature"].replace("_", " ").title()
                insights.append({
                    "type": "secondary_factor",
                    "title": f"Secondary Factor: {fname2}",
                    "description": f"Another strong predictor for your risk profile is {fname2} ({(sec_f['importance']*100):.1f}% importance).",
                    "value": sec_f["importance"],
                })
                
            return insights
        except Exception:
            pass

    df = predict_all()
    high_risk = len(df[df["predicted_risk_label"] == "HIGH"])
    total = len(df)
    
    return [
        {
            "type": "fleet_risk",
            "title": "Fleet Risk",
            "description": f"AI model predicts {high_risk} HIGH risk drivers out of {total}.",
            "value": high_risk
        }
    ]
