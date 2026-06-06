"""
Stage 3 — Transfusion Cycle Forecaster

Scans bridge patient records and computes days_until_next_transfusion.
Categorizes urgency:
  CRITICAL  — ≤ 3 days
  UPCOMING  — 4-7 days
  SCHEDULED — 8-14 days
  STABLE    — > 14 days

In production, this runs as a daily EventBridge → Lambda at 6 AM.
"""

from datetime import datetime, date
import pandas as pd
from data.loader import get_df


def get_upcoming_transfusions() -> list[dict]:
    """
    Scan all bridge patients and return transfusion timeline data,
    sorted by urgency (CRITICAL first).
    """
    df = get_df()
    today = pd.Timestamp(date.today())

    # Filter: bridge patients with transfusion date data
    bridge = df[
        (df["bridge_status"] == True)
        & (df["last_transfusion_date"].notna())
        & (df["expected_next_transfusion_date"].notna())
    ].copy()

    if bridge.empty:
        return []

    # Compute days until next transfusion
    bridge["days_until_next"] = (
        bridge["expected_next_transfusion_date"] - today
    ).dt.days

    # Compute days since last transfusion
    bridge["days_since_last"] = (
        today - bridge["last_transfusion_date"]
    ).dt.days

    # Compute cycle length
    bridge["cycle_days"] = (
        bridge["expected_next_transfusion_date"] - bridge["last_transfusion_date"]
    ).dt.days

    # Categorize urgency
    def categorize(days):
        if days <= 3:
            return "CRITICAL"
        elif days <= 7:
            return "UPCOMING"
        elif days <= 14:
            return "SCHEDULED"
        else:
            return "STABLE"

    bridge["urgency_category"] = bridge["days_until_next"].apply(categorize)

    # Sort by days_until_next (most urgent first)
    bridge = bridge.sort_values("days_until_next", ascending=True)

    results = []
    for _, row in bridge.iterrows():
        last = row["last_transfusion_date"]
        nxt = row["expected_next_transfusion_date"]
        cycle = int(row["cycle_days"]) if pd.notna(row["cycle_days"]) else 21

        results.append({
            "patient_id": str(row["user_id"])[:12],
            "bridge_id": str(row["bridge_id"])[:12] if pd.notna(row.get("bridge_id")) else None,
            "blood_group": row.get("bridge_blood_group") or row["blood_group"],
            "last_transfusion": str(last.date()) if pd.notna(last) else None,
            "next_expected": str(nxt.date()) if pd.notna(nxt) else None,
            "cycle_days": cycle,
            "days_until_next": int(row["days_until_next"]) if pd.notna(row["days_until_next"]) else None,
            "days_since_last": int(row["days_since_last"]) if pd.notna(row["days_since_last"]) else None,
            "urgency_category": row["urgency_category"],
            "quantity_required": float(row["quantity_required"]) if pd.notna(row.get("quantity_required")) else 1.0,
        })

    return results


def get_forecast_summary() -> dict:
    """
    Aggregated forecast: counts by urgency category.
    """
    patients = get_upcoming_transfusions()

    summary = {
        "critical_count": 0,
        "upcoming_count": 0,
        "scheduled_count": 0,
        "stable_count": 0,
        "total_bridge_patients": len(patients),
    }

    for p in patients:
        cat = p["urgency_category"]
        if cat == "CRITICAL":
            summary["critical_count"] += 1
        elif cat == "UPCOMING":
            summary["upcoming_count"] += 1
        elif cat == "SCHEDULED":
            summary["scheduled_count"] += 1
        else:
            summary["stable_count"] += 1

    # Return top 15 most urgent patients alongside the summary
    summary["patients"] = patients[:15]
    return summary
