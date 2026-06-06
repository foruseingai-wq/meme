"""
Router: /webhook

Stage 2 — Response Detection endpoints.
Three simulated channels: WhatsApp, SMS, and the demo "Simulate" button.
All converge into the same processing pipeline.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from outreach import (
    find_awaiting_event,
    update_event_response,
    get_all_events,
)
from response_classifier import classify_response
from coins import award_coins

router = APIRouter()


class SimulateReply(BaseModel):
    donor_id: str
    reply_text: str = "Yes I can donate"


class WhatsAppWebhook(BaseModel):
    """Simulates WhatsApp Business API webhook payload."""
    phone_number: str = ""
    donor_id: str = ""  # For demo, we use donor_id directly
    message_body: str = ""


class SMSWebhook(BaseModel):
    """Simulates AWS SNS inbound SMS payload."""
    phone_number: str = ""
    donor_id: str = ""
    message_body: str = ""


def process_donor_reply(donor_id: str, reply_text: str, channel: str) -> dict:
    """
    Core processing pipeline — shared by all three channels.

    1. Find the donor's open outreach event
    2. Classify the reply intent
    3. Update the outreach record
    4. Route based on classification
    5. Return result
    """
    # Step 1: Find open outreach event
    event = find_awaiting_event(donor_id)

    if event is None:
        return {
            "status": "no_open_event",
            "message": f"No awaiting outreach event found for donor {donor_id}",
            "channel": channel,
        }

    # Step 2: Classify intent
    classification = classify_response(reply_text)

    # Step 3: Update outreach record
    updated_event = update_event_response(
        event_id=event["event_id"],
        response=classification,
        response_text=reply_text,
    )

    # Step 4: Route based on classification
    action_taken = ""
    coins_awarded = None

    if classification == "CONFIRMED":
        updated_event["status"] = "confirmed"
        # Award coins
        is_first = True  # simplified; in production, check donations_till_date
        reason = "first_donation" if is_first else "donation_completed"
        coins_awarded = award_coins(donor_id, reason)
        action_taken = "Donation confirmed. Coins awarded. Coordinator notified."

    elif classification == "DECLINED":
        updated_event["status"] = "declined"
        action_taken = "Donor declined. Re-running scorer for next-best match."

    elif classification == "CONDITIONAL":
        updated_event["status"] = "conditional_review"
        action_taken = "Conditional response. Flagged for admin review."

    else:  # UNCLEAR
        updated_event["status"] = "follow_up_needed"
        action_taken = "Unclear response. Follow-up message queued."

    # Step 5: Return result
    return {
        "status": "processed",
        "channel": channel,
        "event_id": event["event_id"],
        "donor_id": donor_id,
        "reply_text": reply_text,
        "classification": classification,
        "action_taken": action_taken,
        "coins_awarded": coins_awarded,
        "outreach_event": updated_event,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/simulate")
def simulate_reply(req: SimulateReply):
    """
    🎮 Demo button: Simulate a donor replying.
    The frontend shows a "Simulate Donor Reply" button on each matched donor card.
    Clicking it calls this endpoint.
    """
    return process_donor_reply(
        donor_id=req.donor_id,
        reply_text=req.reply_text,
        channel="simulate",
    )


@router.post("/whatsapp")
def whatsapp_webhook(req: WhatsAppWebhook):
    """
    Simulates WhatsApp Business API → webhook → Lambda.
    In production: Twilio/AWS partner POSTs here when donor replies on WhatsApp.
    """
    donor_id = req.donor_id or req.phone_number
    return process_donor_reply(
        donor_id=donor_id,
        reply_text=req.message_body,
        channel="whatsapp",
    )


@router.post("/sms")
def sms_webhook(req: SMSWebhook):
    """
    Simulates AWS SNS inbound SMS → Lambda.
    In production: AWS SNS routes inbound SMS reply here.
    """
    donor_id = req.donor_id or req.phone_number
    return process_donor_reply(
        donor_id=donor_id,
        reply_text=req.message_body,
        channel="sms",
    )


@router.get("/events")
def list_all_events():
    """List all outreach events (most recent first). For admin dashboard."""
    events = get_all_events()
    return {"events": events[:20], "total": len(events)}
