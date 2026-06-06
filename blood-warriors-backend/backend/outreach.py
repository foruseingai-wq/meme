"""
Stage 2 — Outreach Event Store

In-memory store simulating DynamoDB outreach events.
Manages the full lifecycle: create → await → respond/timeout.

In production, replace the dict stores with DynamoDB calls.
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional

# ---------------------------------------------------------------------------
# In-memory stores (replace with DynamoDB in production)
# ---------------------------------------------------------------------------
outreach_events: dict[str, dict] = {}  # event_id → event record
task_tokens: dict[str, str] = {}       # event_id → task_token (simulates Step Functions)


def create_outreach_event(
    donor_id: str,
    request_id: str,
    blood_group: str,
    tier: int = 1,
    channel: str = "whatsapp",
    message: str = "",
) -> dict:
    """Create a new outreach event and return the record."""
    event_id = f"evt_{uuid.uuid4().hex[:6]}"
    task_token = f"tok_{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow()

    event = {
        "event_id": event_id,
        "donor_id": donor_id,
        "request_id": request_id,
        "blood_group": blood_group,
        "channel": channel,
        "message_sent": message or f"A patient urgently needs {blood_group} blood near you. Can you help?",
        "sent_at": now.isoformat() + "Z",
        "status": "awaiting_response",
        "response_deadline": (now + timedelta(hours=24)).isoformat() + "Z",
        "tier": tier,
        "task_token": task_token,
        "response": None,
        "response_text": None,
        "responded_at": None,
    }

    outreach_events[event_id] = event
    task_tokens[event_id] = task_token
    return event


def find_awaiting_event(donor_id: str) -> Optional[dict]:
    """Find the most recent awaiting_response event for a donor."""
    awaiting = [
        e for e in outreach_events.values()
        if e["donor_id"] == donor_id and e["status"] == "awaiting_response"
    ]
    if not awaiting:
        return None
    # Return the most recent one
    return max(awaiting, key=lambda e: e["sent_at"])


def update_event_response(
    event_id: str,
    response: str,
    response_text: str,
) -> dict:
    """Update an outreach event with the donor's response."""
    if event_id not in outreach_events:
        raise ValueError(f"Event {event_id} not found")

    event = outreach_events[event_id]
    event["status"] = "responded"
    event["response"] = response
    event["response_text"] = response_text
    event["responded_at"] = datetime.utcnow().isoformat() + "Z"
    return event


def timeout_event(event_id: str) -> dict:
    """Mark an outreach event as timed out (24hr deadline passed)."""
    if event_id not in outreach_events:
        raise ValueError(f"Event {event_id} not found")

    event = outreach_events[event_id]
    event["status"] = "timed_out"
    event["response"] = "NO_RESPONSE"
    event["responded_at"] = datetime.utcnow().isoformat() + "Z"
    return event


def get_events_by_request(request_id: str) -> list[dict]:
    """Get all outreach events for a given request."""
    return [
        e for e in outreach_events.values()
        if e["request_id"] == request_id
    ]


def get_events_by_donor(donor_id: str) -> list[dict]:
    """Get all outreach events for a given donor."""
    return [
        e for e in outreach_events.values()
        if e["donor_id"] == donor_id
    ]


def get_all_events() -> list[dict]:
    """Get all outreach events (most recent first)."""
    return sorted(
        outreach_events.values(),
        key=lambda e: e["sent_at"],
        reverse=True,
    )
