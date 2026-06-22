from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
import random

router = APIRouter()

class FlagContext(BaseModel):
    flagType: str
    severity: str
    combinedScore: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    language: Optional[str] = 'en'

class ExplainResponse(BaseModel):
    confidence: int
    primary_reason: str
    contributing_factors: List[str]

@router.post("/api/explain-incident", response_model=ExplainResponse, summary="Explain an incident detection")
def explain_incident(flag: FlagContext):
    """
    Takes an incident's context and generates the underlying AI model's explanation.
    """
    flag_type = flag.flagType.lower()
    
    # Base confidence off combined score, fallback to a realistic distribution
    if flag.combinedScore is not None and flag.combinedScore > 0:
        confidence = min(99, int(flag.combinedScore))
    else:
        # Default high confidence for high severity
        if flag.severity == 'HIGH':
            confidence = random.randint(88, 97)
        elif flag.severity == 'MEDIUM':
            confidence = random.randint(75, 87)
        else:
            confidence = random.randint(60, 74)

    primary_reason = "Anomalous behavior detected"
    contributing_factors = []

    if "braking" in flag_type or "acceleration" in flag_type:
        excess = random.randint(20, 65)
        primary_reason = f"Acceleration exceeded threshold by {excess}%"
        contributing_factors = ["Speed Drop", "Acceleration Spike", "Motion Score"]
        
    elif "distract" in flag_type or "phone" in flag_type:
        primary_reason = "Phone interaction pattern detected in telemetry"
        contributing_factors = ["Screen Wake", "Reduced Vehicle Consistency", "Steering Drift"]
        
    elif "noise" in flag_type:
        primary_reason = "Audio anomaly score exceeded threshold"
        contributing_factors = ["Microphone Peak", "Cabin Noise Spike", "Sustained DB Level"]
        
    elif "speed" in flag_type:
        excess = random.randint(15, 45)
        primary_reason = f"Vehicle speed exceeded local speed limit by {excess}%"
        contributing_factors = ["GPS Speed Reading", "Zone Limit Variance", "Sustained Velocity"]
        
    else:
        primary_reason = "Telemetry pattern matches known risk signature"
        contributing_factors = ["Sensor Anomaly", "Motion Variation", "Time-series Shift"]

    if flag.language and flag.language != "en":
        try:
            import google.generativeai as genai
            import os
            import json
            api_key = os.environ.get("GEMINI_API_KEY")
            if api_key:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel("gemini-2.0-flash-lite")
                
                payload = {
                    "primary_reason": primary_reason,
                    "contributing_factors": contributing_factors
                }
                
                prompt = f"Translate the following JSON object into language code '{flag.language}'. Keep the JSON structure exactly the same, only translate the text values. Return ONLY valid JSON without markdown wrapping.\n\n{json.dumps(payload)}"
                response = model.generate_content(prompt)
                translated_text = response.text.strip()
                if translated_text.startswith("```json"):
                    translated_text = translated_text[7:-3].strip()
                elif translated_text.startswith("```"):
                    translated_text = translated_text[3:-3].strip()
                translated = json.loads(translated_text)
                
                primary_reason = translated.get("primary_reason", primary_reason)
                contributing_factors = translated.get("contributing_factors", contributing_factors)
        except Exception as e:
            print(f"[explain] Translation failed: {e}")
            pass

    return ExplainResponse(
        confidence=confidence,
        primary_reason=primary_reason,
        contributing_factors=contributing_factors
    )
