"""
Stage 5 — Failure Learning Loop

Central failure logging + pattern analysis.
Records every failed outreach with full context (time, day, segment, location).
Aggregation engine produces actionable recommendations.

In production: failures → DynamoDB failure table → weekly Glue job → S3 → Athena.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from collections import Counter, defaultdict
from typing import Optional

# ---------------------------------------------------------------------------
# Failure log store (in-memory, simulates DynamoDB)
# ---------------------------------------------------------------------------

@dataclass
class FailureEvent:
    event_id: str
    donor_id: str
    request_id: str
    failure_type: str           # NO_RESPONSE | DECLINED | MISSED_BRIDGE | INACTIVE_1YR
    blood_group: str
    location_lat: Optional[float] = None
    location_lon: Optional[float] = None
    outreach_time: str = ""     # ISO timestamp of when message was sent
    outreach_hour: int = 0      # 0-23
    outreach_day_of_week: str = ""  # Monday, Tuesday, ...
    donor_segment: str = ""     # One-Time | Regular | Bridge
    donor_donations: int = 0
    timestamp: str = ""

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.utcnow().isoformat() + "Z"
        if not self.outreach_day_of_week:
            self.outreach_day_of_week = datetime.utcnow().strftime("%A")
        if not self.outreach_hour:
            self.outreach_hour = datetime.utcnow().hour


failure_log: list[FailureEvent] = []


def log_failure(
    event_id: str,
    donor_id: str,
    request_id: str,
    failure_type: str,
    blood_group: str = "Unknown",
    location_lat: float = None,
    location_lon: float = None,
    outreach_time: str = "",
    donor_segment: str = "",
    donor_donations: int = 0,
) -> FailureEvent:
    """Record a failure event with full context."""
    event = FailureEvent(
        event_id=event_id,
        donor_id=donor_id,
        request_id=request_id,
        failure_type=failure_type,
        blood_group=blood_group,
        location_lat=location_lat,
        location_lon=location_lon,
        outreach_time=outreach_time,
        donor_segment=donor_segment,
        donor_donations=donor_donations,
    )
    failure_log.append(event)
    return event


def get_recent_failures(n: int = 10) -> list[dict]:
    """Return the last N failure events as dicts."""
    return [asdict(f) for f in failure_log[-n:]]


def analyze_failure_patterns() -> dict:
    """
    Aggregates failures by segment and produces actionable patterns.
    Simulates the weekly Glue/Athena pipeline.
    """
    if not failure_log:
        return {
            "total_failures": 0,
            "by_failure_type": {},
            "by_blood_group": {},
            "by_time_of_day": {},
            "by_day_of_week": {},
            "by_donor_segment": {},
            "recommendations": [
                "No failure data yet. System will learn from outreach outcomes."
            ],
        }

    total = len(failure_log)

    # --- By failure type ---
    by_type = Counter(f.failure_type for f in failure_log)

    # --- By blood group ---
    by_blood = Counter(f.blood_group for f in failure_log)

    # --- By time of day ---
    morning = sum(1 for f in failure_log if 6 <= f.outreach_hour < 12)
    afternoon = sum(1 for f in failure_log if 12 <= f.outreach_hour < 18)
    evening = sum(1 for f in failure_log if 18 <= f.outreach_hour < 22)
    other = total - morning - afternoon - evening
    by_time = {
        "morning_6_12": morning,
        "afternoon_12_18": afternoon,
        "evening_18_22": evening,
        "other": other,
    }

    # --- By day of week ---
    by_day = Counter(f.outreach_day_of_week for f in failure_log)

    # --- By donor segment ---
    by_segment = Counter(f.donor_segment for f in failure_log)

    # --- Generate recommendations ---
    recommendations = []

    # Time recommendation
    time_counts = {"morning": morning, "afternoon": afternoon, "evening": evening}
    if time_counts:
        best_time = min(time_counts, key=time_counts.get)
        worst_time = max(time_counts, key=time_counts.get)
        if time_counts[best_time] < time_counts[worst_time]:
            recommendations.append(
                f"{best_time.capitalize()} outreach has {time_counts[worst_time] - time_counts[best_time]} fewer "
                f"failures than {worst_time}. Consider shifting outreach to {best_time}."
            )

    # Day recommendation
    if by_day:
        worst_day = by_day.most_common(1)[0]
        if worst_day[1] > 1:
            recommendations.append(
                f"{worst_day[0]} has the highest failure count ({worst_day[1]}). "
                f"Consider reducing outreach volume on {worst_day[0]}s."
            )

    # Blood group recommendation
    if by_blood:
        worst_bg = by_blood.most_common(1)[0]
        recommendations.append(
            f"{worst_bg[0]} donors have the highest failure rate ({worst_bg[1]} events). "
            f"Consider targeted re-engagement campaigns for this group."
        )

    # Segment recommendation
    one_time_failures = by_segment.get("One-Time Donor", 0)
    regular_failures = by_segment.get("Regular Donor", 0)
    if one_time_failures > regular_failures * 2:
        recommendations.append(
            "One-Time donors fail at >2x the rate of Regular donors. "
            "The first-timer activation strategy should include follow-up within 48 hours."
        )

    if not recommendations:
        recommendations.append(
            "Insufficient data for pattern detection. Continue collecting outreach outcomes."
        )

    return {
        "total_failures": total,
        "by_failure_type": dict(by_type),
        "by_blood_group": dict(by_blood),
        "by_time_of_day": by_time,
        "by_day_of_week": dict(by_day),
        "by_donor_segment": dict(by_segment),
        "recommendations": recommendations,
    }


# ---------------------------------------------------------------------------
# Engagement scoring
# ---------------------------------------------------------------------------

def calculate_engagement_score(
    donor_id: str,
    total_outreach_count: int = 0,
) -> dict:
    """
    Compute a 0-1 engagement score for a donor based on failure history.
    """
    donor_failures = [f for f in failure_log if f.donor_id == donor_id]
    failure_count = len(donor_failures)

    if total_outreach_count == 0:
        total_outreach_count = max(failure_count, 1)

    responded_count = total_outreach_count - failure_count
    score = responded_count / max(total_outreach_count, 1)

    # Trend: compare recent half vs older half
    half = max(len(donor_failures) // 2, 1)
    recent = donor_failures[-half:]
    older = donor_failures[:half]
    trend = "declining" if len(recent) > len(older) else "stable"

    return {
        "donor_id": donor_id,
        "engagement_score": round(max(score, 0), 2),
        "total_outreach": total_outreach_count,
        "responded": responded_count,
        "failures": failure_count,
        "failure_types": dict(Counter(f.failure_type for f in donor_failures)),
        "trend": trend,
    }
