"""
services/insights_engine.py
============================
Deterministic, rule-based AI insights engine.

Takes prediction outputs + raw driver metrics and produces
personalized, human-readable recommendations — no LLM required.

Entry point: generate_driver_insights(driver_id, pred, row)

Output: list of insight dicts, each with:
  type          — category key
  title         — short heading
  description   — one or two sentence explanation
  summary       — headline sentence (used by Dashboard AI panel)
  recommendation — specific action (appended to summary in Dashboard)
  value         — optional numeric (for charting)
  severity      — "positive" | "neutral" | "warning" | "critical"
"""

from __future__ import annotations

# ─────────────────────────────────────────────────────────────────────────────
# Fleet benchmarks — derived from the dataset, used for relative comparisons.
# Recalculate from analytics.py if the dataset changes significantly.
# ─────────────────────────────────────────────────────────────────────────────
_FLEET_AVG_PRODUCTIVITY = 1_250.0   # ₹/day
_FLEET_AVG_RATING       = 4.1
_FLEET_AVG_FLAGS        = 6
_FLEET_AVG_HOURS        = 8.5


# ── Helper: experience tier label ─────────────────────────────────────────────
def _exp_label(months: float) -> str:
    if months < 6:   return "new"
    if months < 24:  return "developing"
    if months < 60:  return "experienced"
    return "veteran"


# ── Helper: ordinal suffix ────────────────────────────────────────────────────
def _pct_label(value: float, avg: float) -> str:
    pct = ((value - avg) / avg) * 100
    if   pct >  20: return "well above average"
    elif pct >   5: return "above average"
    elif pct >  -5: return "near average"
    elif pct > -20: return "below average"
    return "well below average"


# ─────────────────────────────────────────────────────────────────────────────
# 1. RISK EXPLANATION
# ─────────────────────────────────────────────────────────────────────────────
def _risk_explanation(risk: str, ml_risk: str, rule_risk: str, confidence: float, top_features: list) -> dict:
    pct = round(confidence * 100, 1)
    top = top_features[0]["feature"].replace("_", " ").title() if top_features else "driving behaviour"

    if ml_risk == rule_risk:
        summary = f"Your driving profile is classified as {risk} risk with {pct}% model confidence."
        desc = (
            f"Both the Random Forest model and the rule-based engine agree on a {risk} risk classification. "
            f"The model's most influential factor was {top}."
        )
    else:
        summary = f"Your profile has a final hybrid risk of {risk} (ML Risk: {ml_risk}, Rule Risk: {rule_risk})."
        desc = (
            f"The ML model predicted {ml_risk} risk (with {pct}% confidence), but due to "
            f"your rule-based risk level being {rule_risk} (from sensor flags or violations), "
            f"your final hybrid risk was elevated to {risk}."
        )

    if risk == "LOW":
        rec = "Continue your current driving habits to maintain this rating."
        sev = "positive"
    elif risk == "MEDIUM":
        rec = f"Focus on improving your {top} and reducing rule violations to shift into the LOW risk tier."
        sev = "warning"
    else:  # HIGH
        rec = f"Immediate attention is recommended. Prioritise reducing {top} events and strict rule compliance."
        sev = "critical"

    return {
        "type":           "risk_explanation",
        "title":          "Hybrid Risk Assessment",
        "description":    desc,
        "summary":        summary,
        "recommendation": rec,
        "value":          confidence,
        "severity":       sev,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. SAFETY RECOMMENDATION
# ─────────────────────────────────────────────────────────────────────────────
def _safety_recommendation(
    risk: str,
    total_flags: int,
    avg_motion_score: float,
    avg_audio_score: float,
    avg_combined_score: float,
) -> dict:
    flags_vs_fleet = total_flags - _FLEET_AVG_FLAGS

    # Pick the weakest sensor dimension
    scores = {
        "motion (acceleration / braking)":  avg_motion_score,
        "audio (phone / distraction)":      avg_audio_score,
        "combined behaviour":               avg_combined_score,
    }
    weakest_dim  = min(scores, key=scores.get)
    weakest_val  = scores[weakest_dim]

    if total_flags == 0:
        desc = "You have zero safety flags — an outstanding record."
        rec  = "Maintain this standard. Every flag-free trip improves your fleet ranking."
        sev  = "positive"
    elif flags_vs_fleet <= 0:
        desc = (
            f"You have {total_flags} safety flags, which is at or below the fleet average of "
            f"{_FLEET_AVG_FLAGS}. Your {weakest_dim} score ({weakest_val:.2f}) has room to improve."
        )
        rec  = f"Target your {weakest_dim} score — even a 5% improvement reduces flag frequency."
        sev  = "neutral"
    elif flags_vs_fleet <= 4:
        desc = (
            f"You have {total_flags} flags — {flags_vs_fleet} above fleet average. "
            f"Your weakest dimension is {weakest_dim} ({weakest_val:.2f})."
        )
        rec  = f"Reducing hard-braking and sharp cornering can eliminate 2–3 flags per week."
        sev  = "warning"
    else:
        desc = (
            f"You have {total_flags} flags — significantly above the fleet average of {_FLEET_AVG_FLAGS}. "
            f"Your {weakest_dim} score ({weakest_val:.2f}) is the primary concern."
        )
        rec  = (
            f"Enrol in a defensive driving refresh. Reducing your flag count to "
            f"{_FLEET_AVG_FLAGS} or below would move your risk tier by at least one level."
        )
        sev  = "critical"

    return {
        "type":           "safety",
        "title":          "Safety Flag Analysis",
        "description":    desc,
        "summary":        f"{total_flags} safety flags recorded ({'' if flags_vs_fleet <= 0 else '+'}{flags_vs_fleet} vs fleet avg).",
        "recommendation": rec,
        "value":          total_flags,
        "severity":       sev,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. PRODUCTIVITY RECOMMENDATION
# ─────────────────────────────────────────────────────────────────────────────
def _productivity_recommendation(
    daily_productivity: float,
    rating: float,
    shift_preference: str,
    avg_hours_per_day: float,
) -> dict:
    prod_label  = _pct_label(daily_productivity, _FLEET_AVG_PRODUCTIVITY)
    rate_label  = _pct_label(rating, _FLEET_AVG_RATING)
    revenue_gap = round(_FLEET_AVG_PRODUCTIVITY - daily_productivity, 0)

    shift_tips = {
        "Morning": "Morning shifts have high demand. Positioning near transport hubs at 7–9 AM maximises early ride density.",
        "Evening": "Evening surges (5–8 PM) are your key window. Airport runs and event drop-offs yield premium fares.",
        "Night":   "Night shifts have lower volume but higher per-trip fares. Focus on bar districts and late-night demand zones.",
    }
    shift_tip = shift_tips.get(shift_preference, "Align your availability with local demand peaks for maximum earnings.")

    if daily_productivity >= _FLEET_AVG_PRODUCTIVITY * 1.2:
        desc = (
            f"Your daily productivity of ₹{daily_productivity:,.0f} is {prod_label} "
            f"and your rating of {rating} is {rate_label}. You are among the top earners in the fleet."
        )
        rec  = f"{shift_tip} Consider mentoring newer drivers to build platform recognition."
        sev  = "positive"
    elif daily_productivity >= _FLEET_AVG_PRODUCTIVITY * 0.9:
        desc = (
            f"Daily productivity of ₹{daily_productivity:,.0f} is {prod_label} (fleet avg ₹{_FLEET_AVG_PRODUCTIVITY:,.0f}). "
            f"Rating: {rating} ({rate_label})."
        )
        rec  = f"{shift_tip} A ₹{abs(revenue_gap):,.0f}/day improvement puts you in the top quartile."
        sev  = "neutral"
    else:
        desc = (
            f"Daily productivity of ₹{daily_productivity:,.0f} is {prod_label}. "
            f"Closing the gap to fleet average requires ₹{abs(revenue_gap):,.0f}/day more."
        )
        rec  = f"{shift_tip} Review your trip acceptance rate — declining fewer requests boosts daily totals."
        sev  = "warning"

    return {
        "type":           "productivity",
        "title":          "Earnings & Productivity",
        "description":    desc,
        "summary":        f"Daily productivity: ₹{daily_productivity:,.0f} ({prod_label}). Rating: {rating}.",
        "recommendation": rec,
        "value":          daily_productivity,
        "severity":       sev,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. BEHAVIOURAL OBSERVATION
# ─────────────────────────────────────────────────────────────────────────────
def _behavioural_observation(
    avg_motion_score: float,
    avg_audio_score: float,
    avg_combined_score: float,
    shift_preference: str,
) -> dict:
    # Scores are 0.0–1.0 in the dataset
    motion_pct  = round(avg_motion_score * 100, 1)
    audio_pct   = round(avg_audio_score  * 100, 1)
    combined_pct = round(avg_combined_score * 100, 1)

    # Identify dominant weakness
    if avg_motion_score < 0.65 and avg_audio_score < 0.65:
        obs = (
            f"Both motion ({motion_pct}%) and audio ({audio_pct}%) scores are below the 65% threshold. "
            f"This pattern typically indicates aggressive driving combined with phone usage."
        )
        rec = "Enable Do-Not-Disturb while driving and practice smooth acceleration/deceleration."
        sev = "critical"
    elif avg_motion_score < 0.65:
        obs = (
            f"Motion score {motion_pct}% indicates frequent harsh braking or sharp cornering. "
            f"Audio score {audio_pct}% is acceptable. Combined behaviour score: {combined_pct}%."
        )
        rec = "Increase following distance by 2–3 car lengths to reduce hard-braking frequency."
        sev = "warning"
    elif avg_audio_score < 0.65:
        obs = (
            f"Audio score {audio_pct}% suggests phone usage or cabin noise events. "
            f"Motion score {motion_pct}% is within safe range."
        )
        rec = "Mount your phone on a holder and use voice commands to keep audio score above 80%."
        sev = "warning"
    elif avg_combined_score >= 0.85:
        obs = (
            f"Excellent sensor scores — motion {motion_pct}%, audio {audio_pct}%, "
            f"combined {combined_pct}%. Your in-vehicle behaviour is exemplary."
        )
        rec = "Share your driving style with newer drivers — you demonstrate best-practice behaviour."
        sev = "positive"
    else:
        obs = (
            f"Sensor scores are acceptable — motion {motion_pct}%, audio {audio_pct}%, "
            f"combined {combined_pct}%. Marginal improvements are possible."
        )
        rec = "Smooth out acceleration patterns during peak-hour traffic to push scores above 80%."
        sev = "neutral"

    if shift_preference == "Night":
        obs += " Night shift increases fatigue risk — ensure regular 15-minute rest breaks."

    return {
        "type":           "behaviour",
        "title":          "Behavioural Sensor Analysis",
        "description":    obs,
        "summary":        f"Motion: {motion_pct}% | Audio: {audio_pct}% | Combined: {combined_pct}%.",
        "recommendation": rec,
        "value":          avg_combined_score,
        "severity":       sev,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. IMPROVEMENT OPPORTUNITIES (feature-importance-driven)
# ─────────────────────────────────────────────────────────────────────────────
def _improvement_opportunities(
    top_features: list,
    risk: str,
    experience_months: float,
) -> dict:
    exp_tier  = _exp_label(experience_months)
    exp_months = int(experience_months)

    # Map feature names to plain-English improvement actions
    _FEATURE_ACTIONS: dict[str, str] = {
        "rating":                  "Improve your passenger rating by greeting riders, offering phone chargers, and keeping the cabin clean.",
        "daily_productivity":      "Increase daily productivity by accepting more rides during peak hours and reducing idle time.",
        "total_flags":             "Reduce safety flags by anticipating stops earlier and avoiding sharp lane changes.",
        "avg_combined_score":      "Boost your combined behaviour score through consistent smooth driving on every trip.",
        "avg_motion_score":        "Improve your motion score by braking 30% earlier at intersections.",
        "avg_audio_score":         "Raise your audio score by silencing notifications and using hands-free calling only.",
        "experience_months":       "Continue building experience — each month of consistent safe driving improves your model score.",
        "avg_hours_per_day":       "Optimise your active hours — 7–9 hour shifts consistently outperform both shorter and longer ones.",
        "avg_earnings_per_hour":   "Increase hourly earnings by targeting high-demand zones and avoiding low-fare routes.",
        "daily_productivity":      "Focus on surge pricing windows to maximise earnings per trip.",
        "city":                    "Study demand heat maps for your city to position yourself in high-earning zones.",
        "shift_preference":        "Experiment with different shift windows to identify your personal peak-earning period.",
        "experience_level":        "As your experience grows, the model automatically rewards consistency.",
    }

    actions = []
    for feat in top_features[:3]:
        fname = feat["feature"]
        imp   = feat["importance"]
        action = _FEATURE_ACTIONS.get(fname, f"Work on improving your {fname.replace('_', ' ')} metric.")
        actions.append(f"[{imp*100:.0f}% model weight] {action}")

    if not actions:
        actions = ["Focus on reducing safety flags and improving your passenger rating."]

    exp_context = (
        f"As a {exp_tier} driver ({exp_months} months), "
        + {
            "new":        "consistency and safety are more important than speed. Build good habits now.",
            "developing": "you're building your profile. Each safe trip strengthens your risk score.",
            "experienced":"your history carries significant model weight. Protect your track record.",
            "veteran":    "your long record gives you a stable baseline. Focus on marginal gains.",
        }.get(exp_tier, "each improvement compounds over time.")
    )

    desc = exp_context + "\n\nTop improvement actions by model impact:\n" + "\n".join(f"• {a}" for a in actions)

    return {
        "type":           "improvement",
        "title":          "Improvement Opportunities",
        "description":    desc,
        "summary":        f"Top improvement lever: {top_features[0]['feature'].replace('_',' ').title() if top_features else 'safety flags'}.",
        "recommendation": actions[0] if actions else "Reduce flag events and maintain rating above 4.5.",
        "value":          len(actions),
        "severity":       "neutral",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6. TREND OUTLOOK
# ─────────────────────────────────────────────────────────────────────────────
def _trend_outlook(
    risk: str,
    confidence: float,
    rating: float,
    total_flags: int,
) -> dict:
    # Simple rule-based trajectory prediction
    positive_signals = 0
    if risk == "LOW":       positive_signals += 2
    elif risk == "MEDIUM":  positive_signals += 1
    if confidence > 0.85:   positive_signals += 1
    if rating >= 4.5:        positive_signals += 1
    if rating >= 4.8:        positive_signals += 1
    if total_flags <= 3:     positive_signals += 1
    if total_flags == 0:     positive_signals += 1

    if positive_signals >= 5:
        outlook = "Strong upward trajectory."
        desc    = (
            "Your current metrics indicate a consistently improving profile. "
            "Maintaining this momentum positions you for top-tier fleet recognition."
        )
        rec     = "You are on track for Elite Driver status. Sustain your current behaviour."
        sev     = "positive"
    elif positive_signals >= 3:
        outlook = "Stable with improvement potential."
        desc    = (
            "Your profile is stable. Targeted improvements to 1–2 key metrics "
            "could meaningfully shift your risk tier within 30 days."
        )
        rec     = "Set a 30-day goal: reduce flags by 2 and push rating above 4.5."
        sev     = "neutral"
    else:
        outlook = "Improvement required to stabilise trajectory."
        desc    = (
            "Multiple risk indicators are elevated simultaneously. "
            "Addressing the top-ranked feature (from the model's importance list) "
            "has the highest probability of improving your overall score."
        )
        rec     = "Focus on one metric at a time — start with the highest-importance feature."
        sev     = "warning"

    return {
        "type":           "trend_outlook",
        "title":          "30-Day Outlook",
        "description":    desc,
        "summary":        outlook,
        "recommendation": rec,
        "value":          positive_signals,
        "severity":       sev,
    }


# ─────────────────────────────────────────────────────────────────────────────
# PRIMARY ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def generate_driver_insights(
    driver_id: str,
    risk_level: str,
    confidence: float,
    top_features: list,
    ml_risk: str            = None,
    rule_risk: str          = None,
    total_flags: int        = 0,
    rating: float           = 4.0,
    daily_productivity: float = 1000.0,
    experience_months: float  = 12.0,
    avg_motion_score: float   = 0.75,
    avg_audio_score: float    = 0.75,
    avg_combined_score: float = 0.75,
    shift_preference: str     = "Morning",
    avg_hours_per_day: float  = 8.0,
    language: str             = "en",
) -> list[dict]:
    """
    Generate 6 personalised, deterministic insights for a driver.

    All inputs are derived from the ML prediction result + CSV row —
    no randomness, no LLM. Same inputs always produce the same insights.
    """
    if ml_risk is None:
        ml_risk = risk_level
    if rule_risk is None:
        rule_risk = risk_level

    if not risk_level:
        # Driver has needs_assessment — cannot generate personalised insights
        return [{
            "type":           "pending",
            "title":          "Complete Your Assessment",
            "description":    "Complete the one-time driver assessment to unlock your personalised insights.",
            "summary":        "Personalised insights are unlocked after completing your risk assessment.",
            "recommendation": "Submit the assessment form to activate AI-powered recommendations.",
            "value":          0,
            "severity":       "neutral",
        }]

    insights = [
        _risk_explanation(risk_level, ml_risk, rule_risk, confidence, top_features),
        _safety_recommendation(risk_level, total_flags, avg_motion_score, avg_audio_score, avg_combined_score),
        _productivity_recommendation(daily_productivity, rating, shift_preference, avg_hours_per_day),
        _behavioural_observation(avg_motion_score, avg_audio_score, avg_combined_score, shift_preference),
        _improvement_opportunities(top_features, risk_level, experience_months),
        _trend_outlook(risk_level, confidence, rating, total_flags),
    ]

    if language != "en":
        try:
            import google.generativeai as genai
            import os
            import json
            api_key = os.environ.get("GEMINI_API_KEY")
            if api_key:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel("gemini-2.0-flash-lite")
                prompt = f"Translate the following JSON array of driver insights into language code '{language}'. Keep the JSON structure exactly the same, only translate the text values of 'title', 'description', 'summary', and 'recommendation'. Return ONLY valid JSON without markdown wrapping.\n\n{json.dumps(insights)}"
                response = model.generate_content(prompt)
                translated_text = response.text.strip()
                if translated_text.startswith("```json"):
                    translated_text = translated_text[7:-3].strip()
                elif translated_text.startswith("```"):
                    translated_text = translated_text[3:-3].strip()
                translated = json.loads(translated_text)
                return translated
        except Exception as e:
            print(f"[insights_engine] Translation failed: {e}")
            pass

    return insights
