"""
Router: /admin

Dashboard metrics and inactive donor analysis — all from real dataset.
"""

from fastapi import APIRouter
from data.loader import get_df

router = APIRouter()


@router.get("/metrics")
def get_metrics():
    """Admin dashboard metrics — real numbers from Dataset.csv."""
    df = get_df()
    return {
        "total_active_donors": int(
            (df["user_donation_active_status"] == "Active").sum()
        ),
        "active_bridges": int(df["bridge_status"].sum()),
        "inactive_donors": int(
            (df["user_donation_active_status"] == "Inactive").sum()
        ),
        "eligible_now": int((df["eligibility_status"] == "eligible").sum()),
        "one_time_donors": int((df["donor_type"] == "One-Time Donor").sum()),
        "regular_donors": int((df["donor_type"] == "Regular Donor").sum()),
        "total_donors": len(df),
        "high_call_ratio": int(
            (df["calls_to_donations_ratio"] > 5).sum()
        ),  # needs intervention
        "blood_group_distribution": df["blood_group"]
        .value_counts()
        .to_dict(),
        "role_distribution": df["role"].value_counts().to_dict(),
        "requests_today": 3,  # simulated for demo
    }


@router.get("/inactive-analysis")
def inactive_analysis():
    """Breakdown of inactive donors — why they left, which blood groups."""
    df = get_df()
    inactive = df[df["user_donation_active_status"] == "Inactive"]
    return {
        "total": len(inactive),
        "reasons": inactive["inactive_trigger_comment"]
        .value_counts()
        .to_dict(),
        "blood_groups": inactive["blood_group"].value_counts().to_dict(),
        "roles": inactive["role"].value_counts().to_dict(),
        "avg_donations_before_inactive": round(
            inactive["donations_till_date"].mean(), 1
        )
        if not inactive.empty
        else 0,
    }


@router.get("/donor-segments")
def donor_segments():
    """Segment analysis for the admin dashboard."""
    df = get_df()

    # First-timers (0 donations, active)
    first_timers = df[
        (df["donations_till_date"] == 0)
        & (df["user_donation_active_status"] == "Active")
    ]

    # Veterans (10+ donations)
    veterans = df[df["donations_till_date"] >= 10]

    # At-risk (high call ratio, still active)
    at_risk = df[
        (df["calls_to_donations_ratio"] > 3)
        & (df["user_donation_active_status"] == "Active")
    ]

    return {
        "first_timers": {
            "count": len(first_timers),
            "blood_groups": first_timers["blood_group"].value_counts().to_dict(),
        },
        "veterans": {
            "count": len(veterans),
            "avg_donations": round(veterans["donations_till_date"].mean(), 1)
            if not veterans.empty
            else 0,
        },
        "at_risk": {
            "count": len(at_risk),
            "avg_call_ratio": round(at_risk["calls_to_donations_ratio"].mean(), 1)
            if not at_risk.empty
            else 0,
        },
    }
