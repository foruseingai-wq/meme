"""
Router: /outreach

Outreach initiation and status tracking.
Creates outreach events for matched donors and tracks their lifecycle.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

from outreach import (
    create_outreach_event,
    get_events_by_request,
    get_events_by_donor,
    timeout_event,
    find_awaiting_event,
)
from failure_tracker import log_failure

router = APIRouter()


class OutreachInitRequest(BaseModel):
    request_id: str
    donor_ids: List[str]
    blood_group: str
    tier: int = 1
    channel: str = "whatsapp"


@router.post("/initiate")
def initiate_outreach(req: OutreachInitRequest):
    """
    Start outreach for matched donors.
    Creates an outreach event for each donor and simulates sending messages.

    In production:
      - Creates DynamoDB records
      - Sends actual WhatsApp/SMS via SNS
      - Starts Step Functions workflow with WaitForResponse state
    """
    events = []
    for donor_id in req.donor_ids:
        event = create_outreach_event(
            donor_id=donor_id,
            request_id=req.request_id,
            blood_group=req.blood_group,
            tier=req.tier,
            channel=req.channel,
        )
        events.append(event)

    return {
        "status": "outreach_initiated",
        "request_id": req.request_id,
        "donors_contacted": len(events),
        "events": events,
    }


@router.get("/status/{request_id}")
def outreach_status(request_id: str):
    """
    Get the current status of all outreach events for a request.
    Shows which donors have responded, which are still awaiting, etc.
    """
    events = get_events_by_request(request_id)

    # Summarize statuses
    status_counts = {}
    for e in events:
        s = e["status"]
        status_counts[s] = status_counts.get(s, 0) + 1

    return {
        "request_id": request_id,
        "total_events": len(events),
        "status_summary": status_counts,
        "events": events,
    }


@router.get("/donor/{donor_id}")
def donor_outreach_history(donor_id: str):
    """Get all outreach events for a specific donor."""
    events = get_events_by_donor(donor_id)
    return {
        "donor_id": donor_id,
        "total_events": len(events),
        "events": events,
    }


@router.post("/timeout/{event_id}")
def trigger_timeout(event_id: str):
    """
    Manually trigger a timeout for an outreach event.
    Simulates the 24-hour EventBridge scheduled rule.

    In production:
      - EventBridge fires aria.scheduler → OutreachTimedOut
      - Calls SendTaskFailure on Step Functions task token
      - Workflow wakes into escalation path
    """
    try:
        event = timeout_event(event_id)

        # Log the failure
        log_failure(
            event_id=event["event_id"],
            donor_id=event["donor_id"],
            request_id=event["request_id"],
            failure_type="NO_RESPONSE",
            blood_group=event.get("blood_group", "Unknown"),
            outreach_time=event.get("sent_at", ""),
        )

        return {
            "status": "timed_out",
            "event_id": event_id,
            "event": event,
            "next_action": "Escalating to Tier 2 — personalized Bedrock message",
        }
    except ValueError as e:
        return {"status": "error", "message": str(e)}
