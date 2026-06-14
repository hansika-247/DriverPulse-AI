from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from services.model_loader import get_store
from services.predictor import predict_driver
from services.analytics import compute_leaderboard, generate_insights
from routes.drivers import list_drivers, driver_profile

router = APIRouter(prefix="/api", tags=["Production API"])

# ── Health ────────────────────────────────────────────────────────────────────
@router.get(
    "/health",
    summary="API Health check",
    response_description="Returns system health, model and dataset loaded status."
)
def health_check():
    """
    **Sample response**
    ```json
    {
      "status": "ok",
      "model_loaded": true,
      "drivers_loaded": true,
      "total_drivers": 5211
    }
    ```
    """
    store = get_store()
    return {
        "status": "ok",
        "model_loaded": store.get("model") is not None,
        "drivers_loaded": store.get("df") is not None,
        "total_drivers": len(store["df"]) if store.get("df") is not None else 0,
    }


# ── Drivers ───────────────────────────────────────────────────────────────────
@router.get(
    "/drivers",
    summary="List all drivers",
    response_description="Array of driver stubs (id, name, city)"
)
def get_api_drivers(
    city: Optional[str] = Query(default=None, description="Filter by city name"),
    risk: Optional[str] = Query(default=None, description="Filter by risk_label (HIGH/MEDIUM/LOW)"),
    limit: int = Query(default=500, ge=1, le=5000, description="Max records to return"),
):
    """
    **Sample response**
    ```json
    {
      "count": 1,
      "drivers": [
        {
          "driver_id": "DRV0001",
          "name": "Arjun Sharma",
          "city": "Mumbai",
          "risk_label": "HIGH",
          "rating": 4.2
        }
      ]
    }
    ```
    """
    return list_drivers(city=city, risk=risk, limit=limit)


@router.get(
    "/drivers/top-performers",
    summary="Top-N driver leaderboard",
    response_description="Ranked list of best-performing drivers"
)
def get_api_top_performers(
    limit: int = Query(default=10, ge=1, le=100, description="Number of top drivers to return")
):
    """
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
    return compute_leaderboard(top_n=limit)


@router.get(
    "/drivers/{driver_id}",
    summary="Full driver profile",
    response_description="Complete driver record"
)
def get_api_driver_by_id(driver_id: str):
    """
    **Sample response**
    ```json
    {
      "driver_id": "DRV0001",
      "name": "Arjun Sharma",
      "city": "Mumbai",
      "shift_preference": "night",
      "avg_hours_per_day": 8.5,
      "avg_earnings_per_hour": 150.0,
      "experience_months": 24,
      "rating": 4.2,
      "daily_productivity": 1275.0,
      "avg_combined_score": 0.85,
      "avg_motion_score": 0.82,
      "avg_audio_score": 0.88,
      "total_flags": 5,
      "risk_score": 0.75,
      "risk_label": "HIGH",
      "source": "unknown"
    }
    ```
    """
    return driver_profile(driver_id)


# ── Prediction ────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    driver_id: str

@router.post(
    "/predict-risk",
    summary="Predict risk level for a driver — never returns 404 for registered users",
    response_description=(
        "Risk classification result with confidence score and top 5 feature importances. "
        "May include needs_assessment=True for new drivers who haven't filled the assessment form yet."
    )
)
def predict_risk_api(req: PredictRequest):
    """
    **Dual-path prediction — never 404s for registered users.**

    - If driver exists in dataset → ML prediction from CSV row
    - If driver has a saved DB prediction → returns stored result
    - If driver is new and unassessed → returns `{ needs_assessment: true }`

    **Sample response (existing driver)**
    ```json
    {
      "driver_id": "DRV20260001",
      "risk_level": "LOW",
      "confidence": 0.91,
      "predicted_safety_score": 98.6,
      "source": "dataset",
      "top_features": [{"feature": "rating", "importance": 0.34}]
    }
    ```

    **Sample response (new driver, needs assessment)**
    ```json
    { "driver_id": "DRV20260099", "needs_assessment": true, "risk_level": null }
    ```
    """
    try:
        # predict_driver() now returns a dict in all cases — no ValueError raised
        result = predict_driver(req.driver_id)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")


class NewDriverFeatures(BaseModel):
    driver_id: str
    city: str
    shift_preference: str
    avg_hours_per_day: float
    avg_earnings_per_hour: float
    experience_months: int
    rating: float
    daily_productivity: float
    avg_combined_score: float
    avg_motion_score: float
    avg_audio_score: float
    total_flags: int

@router.post(
    "/predict-new-driver",
    summary="Predict risk from assessment-form features (legacy alias)",
    response_description="Risk prediction including score and top factors"
)
def predict_new_driver_api(req: NewDriverFeatures):
    from services.predictor import predict_new_driver_features
    features = req.dict()
    driver_id = features.pop("driver_id")
    try:
        prediction = predict_new_driver_features(driver_id, features)
        return {"data": prediction}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post(
    "/driver-assessment",
    summary="Submit driver assessment form and run ML prediction",
    response_description="Risk prediction result saved to DB — dashboard-ready"
)
def driver_assessment_api(req: NewDriverFeatures):
    """
    **Primary endpoint for new-driver assessment form submission.**

    Accepts all ML feature fields collected from the Driver Assessment Form.
    Runs the Random Forest model and saves the prediction to the database
    so future logins load instantly without showing the form again.

    **Sample request**
    ```json
    {
      "driver_id": "DRV20260003",
      "city": "Mumbai",
      "shift_preference": "Morning",
      "avg_hours_per_day": 8,
      "avg_earnings_per_hour": 200,
      "experience_months": 12,
      "rating": 4.5,
      "daily_productivity": 1500,
      "avg_combined_score": 85,
      "avg_motion_score": 85,
      "avg_audio_score": 85,
      "total_flags": 2
    }
    ```

    **Sample response**
    ```json
    {
      "success": true,
      "data": {
        "driver_id": "DRV20260003",
        "risk_level": "LOW",
        "confidence": 0.92,
        "predicted_safety_score": 98.8,
        "source": "assessment_form"
      }
    }
    ```
    """
    from services.predictor import predict_new_driver_features
    features  = req.dict()
    driver_id = features.pop("driver_id")
    try:
        prediction = predict_new_driver_features(driver_id, features)
        return {"success": True, "data": prediction}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

class AiInsightsRequest(BaseModel):
    driver_id: Optional[str] = None

@router.post(
    "/ai-insights",
    summary="AI fleet insights (rule-based)",
    response_description="List of insight objects generated on demand"
)
def ai_insights_api(req: Optional[AiInsightsRequest] = None):
    """
    Triggers generation of rule-based insights for the fleet.

    **Sample response**
    ```json
    {
      "count": 10,
      "insights": [
        {
          "type": "productivity",
          "title": "🏆 Most Productive City",
          "description": "Hyderabad drivers have the highest average daily productivity at ₹1,532.",
          "value": 1532.45
        }
      ]
    }
    ```
    """
    driver_id = req.driver_id if req else None
    items = generate_insights(driver_id)
    return {"count": len(items), "insights": items}
