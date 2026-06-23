from langchain_core.documents import Document

def chunk_context(context_data: dict) -> list[Document]:
    """
    Converts the raw context dictionary from Node into searchable LangChain Documents.
    """
    docs = []
    driver_id = context_data.get("mlDriverId", "Unknown")
    
    # 1. Profile
    profile = context_data.get("profile") or {}
    if profile:
        content = f"Driver Name: {profile.get('name', 'Unknown')}\nVehicle: {profile.get('vehicleType', 'Unknown')}\nCity: {profile.get('city', 'Unknown')}"
        docs.append(Document(page_content=content, metadata={"source": "profile", "type": "profile", "driver_id": driver_id}))

    # 2. Assessment
    assessment = context_data.get("assessment") or {}
    if assessment:
        content = f"Experience: {assessment.get('experienceMonths', 'N/A')} months\nShift: {assessment.get('shiftPreference', 'N/A')}\nAvg Hours/Day: {assessment.get('avgHoursPerDay', 'N/A')}"
        docs.append(Document(page_content=content, metadata={"source": "assessment", "type": "assessment", "driver_id": driver_id}))

    # 3. Prediction
    prediction = context_data.get("prediction") or {}
    if prediction:
        if prediction.get("needs_assessment"):
            content = "Risk Assessment: PENDING (driver has not yet completed their assessment form)"
        else:
            conf = prediction.get("confidence")
            conf_str = f"{conf*100:.1f}%" if conf is not None else "N/A"
            content = (f"Risk Level: {prediction.get('risk_level', 'Unknown')}\n"
                       f"Confidence: {conf_str}\n"
                       f"Safety Score: {prediction.get('predicted_safety_score', 'N/A')} / 100\n"
                       f"Rating: {prediction.get('rating', 'N/A')} / 5")
            
            top_features = prediction.get("top_features", [])
            if top_features:
                feats_str = ", ".join([f"{f['feature']} ({f['importance']*100:.0f}%)" for f in top_features[:3]])
                content += f"\nTop Risk Factors: {feats_str}"
                
        docs.append(Document(page_content=content, metadata={"source": "prediction", "type": "prediction", "driver_id": driver_id}))

    # 4. Insights
    insights = context_data.get("insights", [])
    for insight in insights:
        summary = insight.get('summary') or insight.get('description') or ''
        rec = insight.get('recommendation', '')
        content = f"Insight Type: {insight.get('type', 'N/A')}\nSummary: {summary}\nRecommendation: {rec}"
        docs.append(Document(page_content=content, metadata={"source": "insight", "type": "insight", "driver_id": driver_id}))

    # 5. Trips
    trips = context_data.get("trips", [])
    for trip in trips:
        flags = trip.get("flagCount", 0)
        route = trip.get("route", "N/A")
        if not route: route = "N/A"
        content = (f"Trip ID: {trip.get('id')}\n"
                   f"Distance: {trip.get('distance', 0)} km\n"
                   f"Earnings: Rs.{trip.get('earnings', 0)}\n"
                   f"Route: {route}\n"
                   f"Flags during trip: {flags}")
        if flags > 0:
            flag_types = trip.get("flagTypes", [])
            content += f"\nFlag Types: {', '.join(flag_types)}"
            
        docs.append(Document(page_content=content, metadata={"source": "trip", "type": "trip", "trip_id": trip.get('id'), "driver_id": driver_id}))

    # 6. Flags
    flag_data = context_data.get("flagData", {})
    recent_flags = flag_data.get("recentFlags", [])
    for flag in recent_flags:
        content = (f"Safety Flag: {flag.get('flagType', 'Unknown').replace('_', ' ')}\n"
                   f"Severity: {flag.get('severity', 'Unknown')}\n"
                   f"Motion Score: {flag.get('motionScore', 'N/A')}\n"
                   f"Audio Score: {flag.get('audioScore', 'N/A')}")
        fb = flag.get("incidentFeedback")
        fb_type = fb.get("feedbackType") if fb else None
        docs.append(Document(page_content=content, metadata={"source": "flag", "type": "flag", "driver_id": driver_id, "flag_id": flag.get("id"), "feedback_type": fb_type}))
        
    # 7. Feedback
    feedbacks = context_data.get("feedback", [])
    for fb in feedbacks:
        content = (f"Incident Feedback submitted.\n"
                   f"Feedback Type: {fb.get('feedbackType', 'Unknown')}\n"
                   f"For Trip ID: {fb.get('tripId', 'Unknown')}")
        docs.append(Document(page_content=content, metadata={"source": "feedback", "type": "feedback", "driver_id": driver_id}))

    return docs
