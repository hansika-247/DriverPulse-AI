"""
routes/insights.py
===================
GET /insights   — 5-10 AI-generated fleet observations (rule-based)
"""

from fastapi import APIRouter
from services.analytics import generate_insights

router = APIRouter()


@router.get(
    "/insights",
    summary="AI fleet insights (rule-based)",
    response_description="List of insight objects",
)
def get_insights(driver_id: str = None):
    """
    Returns 10 intelligent fleet observations derived from the dataset:
    - 🏆 Most productive city
    - ⚠️ Highest-risk city
    - 🌙 Riskiest shift
    - 📊 Fleet risk distribution
    - ⭐ Rating by shift
    - 🚩 Flag analysis
    - 🎓 Experience vs risk
    - 🌟 Highest-rated city
    - 🚀 Elite productivity drivers
    - 💎 Star (low-risk + high-rating) drivers

    **Sample response (first entry)**
    ```json
    {
      "insights": [
        {
          "type": "productivity",
          "title": "🏆 Most Productive City",
          "description": "Hyderabad drivers have the highest average daily productivity at ₹1,532.",
          "value": 1532.45
        }
      ],
      "count": 10
    }
    ```
    """
    items = generate_insights(driver_id)
    return {"count": len(items), "insights": items}
