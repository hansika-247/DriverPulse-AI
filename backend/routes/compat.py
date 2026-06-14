"""
routes/compat.py
================
Legacy compatibility shims so the existing React frontend (which targets
Flask routes like /trips, /flags, /insights, /auth/*, /profile, /chat)
continues to work without modification.

These endpoints return mock/derived data that matches the shape the
frontend currently expects.
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from services.model_loader import get_store
from services.analytics   import generate_insights
import random, datetime, hashlib

router = APIRouter()


# ── Auth stubs ─────────────────────────────────────────────────────────────────
_MOCK_USERS: dict[str, dict] = {}   # email -> user record


@router.post("/auth/signup", summary="[Compat] Register a new driver account")
async def signup(request: Request):
    body = await request.json()
    email    = body.get("email",    "driver@driverpulse.ai")
    name     = body.get("name",     "Demo Driver")
    password = body.get("password", "")

    uid   = f"USR{abs(hash(email)) % 9999:04d}"
    token = hashlib.sha256(f"{email}{password}secret".encode()).hexdigest()[:32]

    user = {
        "id":    uid,
        "name":  name,
        "email": email,
        "city":  body.get("city", "Mumbai"),
        "role":  "driver",
    }
    _MOCK_USERS[email] = {**user, "token": token}

    return {"token": token, "user": user}


@router.post("/auth/login", summary="[Compat] Driver login")
async def login(request: Request):
    body     = await request.json()
    email    = body.get("email",    "demo@driverpulse.ai")
    password = body.get("password", "")

    if email in _MOCK_USERS:
        stored = _MOCK_USERS[email]
        return {"token": stored["token"], "user": {k: v for k, v in stored.items() if k != "token"}}

    # Auto-create on first login
    token = hashlib.sha256(f"{email}{password}secret".encode()).hexdigest()[:32]
    user  = {
        "id":    f"USR{abs(hash(email)) % 9999:04d}",
        "name":  email.split("@")[0].replace(".", " ").title(),
        "email": email,
        "city":  "Mumbai",
        "role":  "driver",
    }
    _MOCK_USERS[email] = {**user, "token": token}
    return {"token": token, "user": user}


@router.get("/auth/me", summary="[Compat] Get current user profile")
def get_me():
    if _MOCK_USERS:
        stored = next(iter(_MOCK_USERS.values()))
        return {k: v for k, v in stored.items() if k != "token"}
    return {
        "id": "USR0001", "name": "Demo Driver",
        "email": "demo@driverpulse.ai", "city": "Mumbai", "role": "driver",
    }


# ── Trips stub ────────────────────────────────────────────────────────────────
def _make_trip(i: int, base_date: datetime.datetime):
    rng  = random.Random(i)
    dur  = rng.randint(20, 90)        # minutes
    dist = round(rng.uniform(5, 45), 1)
    earn = round(dist * rng.uniform(12, 22), 2)
    start = base_date - datetime.timedelta(days=rng.randint(0, 6), hours=rng.randint(0, 23))
    return {
        "id":        f"TRIP{i:05d}",
        "driverId":  "DRV0001",
        "startTime": start.isoformat(),
        "endTime":   (start + datetime.timedelta(minutes=dur)).isoformat(),
        "distance":  dist,
        "duration":  dur,
        "earnings":  earn,
        "avgSpeed":  round(dist / (dur / 60), 1),
        "status":    "completed",
        "flagType":  rng.choice(["", "", "", "hard_braking", "speeding", "phone_usage"]),
    }


@router.get("/trips", summary="[Compat] Get trip list for current driver")
def get_trips():
    now   = datetime.datetime.utcnow()
    trips = [_make_trip(i, now) for i in range(1, 36)]
    return {"data": {"trips": trips}}


@router.get("/trips/{trip_id}", summary="[Compat] Get single trip")
def get_trip(trip_id: str):
    i    = int(trip_id.replace("TRIP", "") or 1)
    trip = _make_trip(i, datetime.datetime.utcnow())
    return {"data": {"trip": trip}}


# ── Flags stub ────────────────────────────────────────────────────────────────
_FLAG_TYPES = ["speeding", "hard_braking", "phone_usage", "tailgating", "sharp_cornering"]


def _make_flag(i: int):
    rng = random.Random(i + 1000)
    return {
        "id":        f"FLAG{i:05d}",
        "tripId":    f"TRIP{rng.randint(1,35):05d}",
        "driverId":  "DRV0001",
        "flagType":  rng.choice(_FLAG_TYPES),
        "severity":  rng.choice(["low", "medium", "high"]),
        "timestamp": (
            datetime.datetime.utcnow() - datetime.timedelta(
                days=rng.randint(0, 6), hours=rng.randint(0, 23)
            )
        ).isoformat(),
        "lat": round(19.076 + rng.uniform(-0.1, 0.1), 6),
        "lng": round(72.877 + rng.uniform(-0.1, 0.1), 6),
    }


@router.get("/flags", summary="[Compat] Get safety flags for current driver")
def get_flags():
    df  = get_store()["df"]
    # Use first driver's total_flags to size the list
    n_flags = min(int(df.iloc[0]["total_flags"]) + 4, 12)
    flags   = [_make_flag(i) for i in range(1, n_flags + 1)]
    return {"data": {"flags": flags}}


@router.get("/flags/{flag_id}", summary="[Compat] Get single flag")
def get_flag(flag_id: str):
    i    = int(flag_id.replace("FLAG", "") or 1)
    flag = _make_flag(i)
    return {"data": {"flag": flag}}


# ── Insights alias ────────────────────────────────────────────────────────────
@router.get("/insights-compat", include_in_schema=False)
def insights_compat(driver_id: str = None):
    """Hidden alias — kept for any old code that called /insights differently."""
    items = generate_insights(driver_id)
    # Wrap to match frontend shape expected by Dashboard.jsx
    stats = {
        "avgRiskScore": 78,
        "totalInsights": len(items),
    }
    return {"data": {"insights": items, "stats": stats}}


# ── Profile ───────────────────────────────────────────────────────────────────
@router.get("/profile", summary="[Compat] Get driver profile page data")
def get_profile():
    df  = get_store()["df"]
    row = df.iloc[0]
    return {
        "data": {
            "driver": {
                "id":                "DRV0001",
                "name":              str(row["name"]),
                "city":              str(row["city"]),
                "rating":            float(row["rating"]),
                "experience_months": int(row["experience_months"]),
                "shift_preference":  str(row["shift_preference"]),
                "risk_label":        str(row["risk_label"]),
            }
        }
    }


# ── Chat stub ─────────────────────────────────────────────────────────────────
_CHAT_HISTORY: list[dict] = []

@router.post("/chat", summary="[Compat] AI chat stub (returns preset answer)")
async def chat(request: Request):
    body     = await request.json()
    question = body.get("question", "")
    reply = (
        "Based on your driving data, your overall risk profile is MEDIUM. "
        "Consider reducing hard-braking events and maintaining consistent following distances."
    )
    msg = {"role": "assistant", "content": reply, "timestamp": datetime.datetime.utcnow().isoformat()}
    _CHAT_HISTORY.append({"role": "user",      "content": question, "timestamp": msg["timestamp"]})
    _CHAT_HISTORY.append(msg)
    return {"data": {"message": reply}}


@router.get("/chat/history", summary="[Compat] Get chat history")
def chat_history():
    return {"data": {"history": _CHAT_HISTORY[-20:]}}
