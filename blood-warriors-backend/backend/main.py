"""
Blood Warriors ARIA — Backend API

FastAPI application with 7 routers covering all 5 stages:
  Stage 1: Smart Matching (/request-blood)
  Stage 2: Response Detection (/webhook/*, /outreach/*)
  Stage 3: Transfusion Forecasting (/donors/timeline, /donors/forecast)
  Stage 4: Conversational AI (/chat)
  Stage 5: Failure Learning (/escalation/*, /analytics/*)

Run: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import requests, donors, chat, admin, escalation, webhook, analytics
from routers import outreach_router

app = FastAPI(
    title="Blood Warriors ARIA API",
    description="AI-powered blood donation coordination system",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — allow frontend on any port during development
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before AWS deploy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Register routers
# ---------------------------------------------------------------------------

# Stage 1: Smart Matching
app.include_router(requests.router, tags=["Stage 1 — Matching"])

# Stage 2: Response Detection
app.include_router(webhook.router, prefix="/webhook", tags=["Stage 2 — Response Detection"])
app.include_router(outreach_router.router, prefix="/outreach", tags=["Stage 2 — Outreach"])

# Stage 3: Transfusion Forecasting + Donor listing
app.include_router(donors.router, prefix="/donors", tags=["Stage 3 — Forecasting"])

# Stage 4: Conversational AI
app.include_router(chat.router, tags=["Stage 4 — Chat"])

# Stage 5: Failure Learning
app.include_router(escalation.router, prefix="/escalation", tags=["Stage 5 — Escalation"])
app.include_router(analytics.router, prefix="/analytics", tags=["Stage 5 — Analytics"])

# Admin dashboard
app.include_router(admin.router, prefix="/admin", tags=["Admin"])


# ---------------------------------------------------------------------------
# Root + health check
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
def root():
    return {
        "service": "Blood Warriors ARIA API",
        "version": "1.0.0",
        "status": "operational",
        "stages": {
            "1_matching": "/request-blood",
            "2_response": "/webhook/simulate",
            "3_forecasting": "/donors/forecast",
            "4_chat": "/chat",
            "5_analytics": "/analytics/failure-patterns",
        },
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    from data.loader import get_df
    df = get_df()
    return {
        "status": "healthy",
        "dataset_loaded": True,
        "total_records": len(df),
    }
