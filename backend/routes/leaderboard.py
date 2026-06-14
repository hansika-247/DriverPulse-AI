"""
routes/leaderboard.py
======================
GET /fleet-summary   — aggregated KPIs + city breakdown
GET /leaderboard     — top 10 drivers by composite score
"""

from fastapi import APIRouter, Query
from services.analytics import fleet_summary, compute_leaderboard

router = APIRouter()


@router.get(
    "/fleet-summary",
    summary="Fleet-wide KPI summary",
    response_description="Total drivers, risk distribution, averages, city breakdown",
)
def get_fleet_summary():
    """
    **Sample response**
    ```json
    {
      "total_drivers": 5211,
      "high_risk": 1302,
      "medium_risk": 987,
      "low_risk": 2922,
      "average_productivity": 1456.32,
      "average_rating": 4.72,
      "city_breakdown": [
        {"city": "Mumbai", "total_drivers": 650, "high_risk": 180, ...}
      ]
    }
    ```
    """
    return fleet_summary()


@router.get(
    "/leaderboard",
    summary="Top-N driver leaderboard",
    response_description="Ranked list of best-performing drivers",
)
def get_leaderboard(
    top: int = Query(default=10, ge=1, le=100, description="Number of top drivers to return"),
):
    """
    Drivers are scored by:
    - Normalised daily productivity  (0–1)
    - Normalised rating              (0–1)
    - Risk bonus: LOW=1.0, MEDIUM=0.5, HIGH=0.0

    **Sample response (first entry)**
    ```json
    [
      {
        "rank": 1,
        "driver_id": "DRV0042",
        "name": "Priya Sharma",
        "city": "Bangalore",
        "risk_label": "LOW",
        "rating": 5.0,
        "daily_productivity": 1886.0,
        "score": 2.9921
      }
    ]
    ```
    """
    return compute_leaderboard(top_n=top)
