"""
Stage 1 — Smart Matching: Urgency-Aware Donor Scoring Engine

Three-factor model with exploration-vs-exploitation logic:
  - High urgency  → prioritize proven veterans
  - Medium/Low    → activate first-timers (exploration bonus)

Factors:
  1. Reliability  (calls_to_donations_ratio)  — 40% always
  2. Proximity    (haversine distance)         — 30% always
  3. Experience   (donations_till_date)        — 30% high / 10% other
  + First-timer bonus                          — +0.25 for medium/low urgency
"""

import math
import pandas as pd
import numpy as np
from data.loader import get_df

# ---------------------------------------------------------------------------
# Blood compatibility: key = donor blood group, value = patient groups it can
# donate TO.
# ---------------------------------------------------------------------------
BLOOD_COMPATIBILITY = {
    "O Negative": [
        "O Negative", "O Positive", "A Negative", "A Positive",
        "B Negative", "B Positive", "AB Negative", "AB Positive",
    ],
    "O Positive": ["O Positive", "A Positive", "B Positive", "AB Positive"],
    "A Negative": ["A Negative", "A Positive", "AB Negative", "AB Positive"],
    "A Positive": ["A Positive", "AB Positive"],
    "B Negative": ["B Negative", "B Positive", "AB Negative", "AB Positive"],
    "B Positive": ["B Positive", "AB Positive"],
    "AB Negative": ["AB Negative", "AB Positive"],
    "AB Positive": ["AB Positive"],
}


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km between two lat/lon points."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def score_donors(
    blood_group_requested: str,
    urgency: str = "medium",
    patient_lat: float = 17.39,
    patient_lon: float = 78.46,
    top_n: int = 10,
) -> list[dict]:
    """
    Score and rank donors for a blood request.

    Returns a list of dicts sorted by descending score, each tagged with
    donor_type ("First Activation" | "Veteran" | "Regular").
    """
    df = get_df()
    urgency = urgency.lower()

    # ----- Step 1: find donor blood groups that CAN donate to the patient ----
    compatible_donor_groups = [
        donor_bg
        for donor_bg, can_donate_to in BLOOD_COMPATIBILITY.items()
        if blood_group_requested in can_donate_to
    ]

    # ----- Step 2: filter eligible donor pool ----------------------------------
    pool = df[
        (df["blood_group"].isin(compatible_donor_groups))
        & (df["eligibility_status"] == "eligible")
        & (df["user_donation_active_status"] == "Active")
        & (df["role"].isin(["Bridge Donor", "Emergency Donor"]))
        & (df["latitude"].notna())
        & (df["longitude"].notna())
    ].copy()

    if pool.empty:
        return []

    # ----- Step 3: compute the three factors ----------------------------------

    # Factor 1 — Reliability (40% weight)
    max_ratio = pool["calls_to_donations_ratio"].max()
    if pd.isna(max_ratio) or max_ratio <= 0:
        max_ratio = 1.0  # avoid division by zero

    def calc_reliability(ratio):
        if pd.isna(ratio):
            return 0.5  # neutral — unknown, not bad
        return 1.0 - (ratio / max_ratio)

    pool["reliability"] = pool["calls_to_donations_ratio"].apply(calc_reliability)

    # Factor 2 — Experience (urgency-dependent weight)
    def calc_experience(donations):
        if donations == 0:
            return 0.0
        if donations >= 10:
            return 1.0  # capped
        return donations / 10.0

    pool["experience"] = pool["donations_till_date"].apply(calc_experience)

    # Factor 3 — Proximity (30% weight)
    pool["dist_km"] = pool.apply(
        lambda r: haversine(patient_lat, patient_lon, r["latitude"], r["longitude"]),
        axis=1,
    )
    max_dist = pool["dist_km"].max()
    if max_dist <= 0:
        max_dist = 1.0
    pool["proximity"] = 1.0 - (pool["dist_km"] / max_dist)

    # ----- Step 4: assemble final score ----------------------------------------
    if urgency == "high":
        pool["score"] = (
            0.40 * pool["reliability"]
            + 0.30 * pool["proximity"]
            + 0.30 * pool["experience"]
        )
    else:
        # medium / low — first-timer bonus
        pool["first_timer_bonus"] = pool["donations_till_date"].apply(
            lambda d: 0.25 if d == 0 else 0.0
        )
        pool["score"] = (
            0.40 * pool["reliability"]
            + 0.30 * pool["proximity"]
            + 0.10 * pool["experience"]
            + pool["first_timer_bonus"]
        )

    # ----- Step 5: sort and build result list ----------------------------------
    pool = pool.sort_values("score", ascending=False).head(top_n)

    results = []
    for _, row in pool.iterrows():
        donations = int(row["donations_till_date"])

        # Donor type tagging
        if donations == 0:
            donor_type = "First Activation"
        elif donations >= 10:
            donor_type = "Veteran"
        else:
            donor_type = "Regular"

        results.append(
            {
                "donor_id": str(row["user_id"])[:12],
                "name": f"Donor {str(row['user_id'])[:6].upper()}",
                "blood_group": row["blood_group"],
                "score": round(float(row["score"]), 3),
                "eligible": True,
                "distance_km": round(float(row["dist_km"]), 1),
                "total_donations": donations,
                "role": row["role"],
                "donor_type": donor_type,
                "calls_ratio": (
                    round(float(row["calls_to_donations_ratio"]), 2)
                    if pd.notna(row["calls_to_donations_ratio"])
                    else None
                ),
                "reliability_score": round(float(row["reliability"]), 3),
                "experience_score": round(float(row["experience"]), 3),
                "proximity_score": round(float(row["proximity"]), 3),
            }
        )

    return results
