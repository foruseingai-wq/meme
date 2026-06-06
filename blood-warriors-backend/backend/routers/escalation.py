"""
Router: /escalation

Escalation events + failure log integration.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
import uuid

from data.loader import get_df
from failure_tracker import log_failure, get_recent_failures, calculate_engagement_score
from coins import award_coins

router = APIRouter()

# In-memory escalation log (supplement to failure_tracker)
escalation_log: list[dict] = []


class EscalationEvent(BaseModel):
    donor_id: str
    event_type: str  # "no_response" | "not_donated_1yr" | "missed_bridge" | "declined"
    request_id: str = "unknown"


@router.post("/escalate")
def log_escalation(event: EscalationEvent):
    """Log an escalation event and determine tier + action."""
    df = get_df()

    # Look up donor in dataset
    match = df[df["user_id"].str[:12] == event.donor_id[:12]]

    tier = 1
    action = "SMS + WhatsApp sent"
    donor_segment = "Unknown"
    blood_group = "Unknown"
    donations = 0

    if not match.empty:
        row = match.iloc[0]
        blood_group = row["blood_group"]
        donor_segment = row.get("donor_type", "Unknown")
        donations = int(row["donations_till_date"])
        ratio = row.get("calls_to_donations_ratio", 0)

        if event.event_type == "not_donated_1yr" or (
            not pd.isna(ratio) and ratio > 5
        ):
            tier = 3
            action = "Marked Inactive — admin alerted"
        elif event.event_type in ("no_response", "declined"):
            tier = 2
            action = "Personalized AI message sent via Bedrock"
        elif event.event_type == "missed_bridge":
            tier = 3
            action = "Bridge coordinator alerted — patient at risk"

    # Map event_type to failure_type
    failure_type_map = {
        "no_response": "NO_RESPONSE",
        "not_donated_1yr": "INACTIVE_1YR",
        "missed_bridge": "MISSED_BRIDGE",
        "declined": "DECLINED",
    }

    # Log to failure tracker
    failure_event = log_failure(
        event_id=f"esc_{uuid.uuid4().hex[:6]}",
        donor_id=event.donor_id,
        request_id=event.request_id,
        failure_type=failure_type_map.get(event.event_type, "NO_RESPONSE"),
        blood_group=blood_group,
        donor_segment=donor_segment,
        donor_donations=donations,
    )

    log_entry = {
        "donor_id": event.donor_id,
        "event_type": event.event_type,
        "tier": tier,
        "action": action,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "request_id": event.request_id,
        "blood_group": blood_group,
        "donor_segment": donor_segment,
    }

    escalation_log.append(log_entry)

    return {
        "status": "logged",
        "tier": tier,
        "action": action,
        "log": log_entry,
    }


@router.get("/failure-log")
def get_failure_log():
    """Last 10 escalation events."""
    return {"events": escalation_log[-10:]}


@router.get("/engagement/{donor_id}")
def get_engagement(donor_id: str):
    """Get engagement score for a specific donor."""
    return calculate_engagement_score(donor_id)


# Need pandas for isna check
import pandas as pd
