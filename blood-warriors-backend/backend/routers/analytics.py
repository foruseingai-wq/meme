"""
Router: /analytics

Stage 5 — Failure pattern analysis and engagement endpoints.
"""

from fastapi import APIRouter
from failure_tracker import analyze_failure_patterns, calculate_engagement_score
from coins import get_leaderboard, get_coin_history, get_balance

router = APIRouter()


@router.get("/failure-patterns")
def get_failure_patterns():
    """
    Aggregated failure patterns with recommendations.
    Answers questions like:
      - "Do B Positive donors in Secunderabad respond better to morning or evening messages?"
      - "Which day of the week has the worst response rate?"

    In production: this queries Athena over S3 data from the weekly Glue job.
    """
    return analyze_failure_patterns()


@router.get("/donor-engagement/{donor_id}")
def get_donor_engagement(donor_id: str):
    """Per-donor engagement score and failure history."""
    return calculate_engagement_score(donor_id)


@router.get("/leaderboard")
def leaderboard(top_n: int = 10):
    """Top donors by coins earned."""
    return {"leaderboard": get_leaderboard(top_n)}


@router.get("/coins/{donor_id}")
def donor_coins(donor_id: str):
    """Coin balance and transaction history for a donor."""
    return {
        "donor_id": donor_id,
        "balance": get_balance(donor_id),
        "history": get_coin_history(donor_id),
    }
