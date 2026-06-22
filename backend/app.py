"""
DriverPulse FastAPI Backend — app.py
=====================================
Entry point. Loads all shared assets once on startup, then mounts:
  /drivers       → routes/drivers.py
  /predict       → routes/predict.py
  /fleet-summary → routes/leaderboard.py
  /leaderboard   → routes/leaderboard.py
  /insights      → routes/insights.py

Legacy Flask-compat aliases are also provided so the existing frontend
(which calls /trips, /flags, /insights, /auth/*) keeps working.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from services.model_loader import load_all_assets, get_store
from routes import predict, drivers, leaderboard, insights, compat, prod_api, explain


# ── Lifespan: load assets exactly once ───────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    load_all_assets()
    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="DriverPulse API",
    description=(
        "Powers the DriverPulse fleet intelligence dashboard.\n\n"
        "Endpoints:\n"
        "- **Driver APIs** — list & profile\n"
        "- **Prediction API** — risk classification via Random Forest\n"
        "- **Fleet Summary** — aggregated KPIs\n"
        "- **Leaderboard** — top 10 performers\n"
        "- **AI Insights** — rule-based fleet observations\n"
        "- **Compat** — legacy aliases for existing frontend"
    ),
    version="4.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(drivers.router,     tags=["Drivers"])
app.include_router(predict.router,     tags=["Prediction"])
app.include_router(leaderboard.router, tags=["Fleet & Leaderboard"])
app.include_router(insights.router,    tags=["AI Insights"])
app.include_router(compat.router,      tags=["Legacy Compat"])
app.include_router(explain.router,     tags=["Explainability"])
app.include_router(prod_api.router)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", summary="Health check")
def health():
    store = get_store()
    return {
        "status": "ok",
        "model_loaded": store.get("model") is not None,
        "drivers_loaded": store.get("df") is not None,
        "total_drivers": len(store["df"]) if store.get("df") is not None else 0,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)