"""
routes/predict.py
==================
POST /predict/{driver_id}

Runs the Random Forest risk classifier for one driver and returns
risk_level, confidence, and top contributing features.
"""

from fastapi import APIRouter, HTTPException
from services.predictor import predict_driver

router = APIRouter()


@router.post(
    "/predict/{driver_id}",
    summary="Predict risk level for a driver",
    response_description=(
        "Risk classification result with confidence score "
        "and top 5 feature importances"
    ),
)
def predict_risk(driver_id: str):
    """
    **Sample request**
    ```
    POST /predict/DRV0001
    ```

    **Sample response**
    ```json
    {
      "driver_id":   "DRV0001",
      "risk_level":  "HIGH",
      "confidence":  0.81,
      "top_features": [
        {"feature": "risk_score",        "importance": 0.3421},
        {"feature": "avg_combined_score","importance": 0.1987},
        {"feature": "total_flags",       "importance": 0.1543},
        {"feature": "daily_productivity","importance": 0.0987},
        {"feature": "rating",            "importance": 0.0765}
      ]
    }
    ```
    """
    try:
        result = predict_driver(driver_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")

    return result
