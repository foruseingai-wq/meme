"""
Router: /chat

ARIA conversational AI with:
  - Session memory (last 10 messages)
  - Preference extraction (unavailability, contact prefs)
  - Rule-based fallback + Bedrock integration
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime, date
import pandas as pd

from data.loader import get_df

router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory stores (simulate DynamoDB)
# ---------------------------------------------------------------------------

# Session memory: donor_id → list of {role, content, timestamp}
chat_sessions: dict[str, list[dict]] = {}

# Donor preferences: donor_id → {unavailable_month, preferred_time, ...}
donor_preferences: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    donor_id: str
    message: str
    conversation_history: List[Dict] = []


# ---------------------------------------------------------------------------
# Donor context
# ---------------------------------------------------------------------------

def get_donor_context(donor_id: str) -> dict:
    """Fetch donor profile data from the dataset."""
    df = get_df()
    match = df[df["user_id"].str[:12] == donor_id[:12]]

    if match.empty:
        return {
            "blood_group": "Unknown",
            "eligibility_status": "unknown",
            "next_eligible_date": "Unknown",
            "donations_till_date": 0,
            "is_bridge_donor": False,
            "active_status": "Unknown",
        }

    row = match.iloc[0]
    ned = row.get("next_eligible_date")
    return {
        "blood_group": row["blood_group"],
        "eligibility_status": row["eligibility_status"],
        "next_eligible_date": (
            str(ned.date()) if pd.notna(ned) and hasattr(ned, "date") else "Unknown"
        ),
        "donations_till_date": int(row["donations_till_date"]),
        "is_bridge_donor": bool(row["bridge_status"]),
        "active_status": row["user_donation_active_status"],
        "role": row.get("role", "Unknown"),
        "total_calls": int(row.get("total_calls", 0)),
    }


# ---------------------------------------------------------------------------
# Preference extraction (Stage 4)
# ---------------------------------------------------------------------------

MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]

def extract_preferences(message: str, donor_id: str) -> dict:
    """
    Extract donor preferences from message text.
    Writes to donor_preferences store.
    """
    text = message.lower()
    prefs = {}

    # Unavailability detection
    unavail_signals = [
        "travel", "away", "busy", "unavailable", "not available",
        "out of town", "vacation", "holiday", "leave",
    ]
    for month in MONTHS:
        if month in text and any(s in text for s in unavail_signals):
            prefs["unavailable_month"] = month.capitalize()

    # Preferred contact time
    if any(w in text for w in ["morning", "early", "before noon"]):
        prefs["preferred_time"] = "morning"
    elif any(w in text for w in ["evening", "night", "after work", "after 6"]):
        prefs["preferred_time"] = "evening"
    elif any(w in text for w in ["afternoon", "lunch"]):
        prefs["preferred_time"] = "afternoon"

    # Preferred channel
    if "whatsapp" in text:
        prefs["preferred_channel"] = "whatsapp"
    elif any(w in text for w in ["call me", "phone", "ring"]):
        prefs["preferred_channel"] = "phone"
    elif any(w in text for w in ["sms", "text me"]):
        prefs["preferred_channel"] = "sms"

    # Location preference
    if any(w in text for w in ["near my home", "close to me", "nearby"]):
        prefs["location_preference"] = "nearby"

    # Save to store
    if prefs:
        save_donor_preferences(donor_id, prefs)

    return prefs


def save_donor_preferences(donor_id: str, prefs: dict):
    """Persist preferences (in-memory, simulates DynamoDB)."""
    if donor_id not in donor_preferences:
        donor_preferences[donor_id] = {}
    donor_preferences[donor_id].update(prefs)
    donor_preferences[donor_id]["last_updated"] = datetime.utcnow().isoformat() + "Z"


def get_donor_preferences(donor_id: str) -> dict:
    """Retrieve stored preferences for a donor."""
    return donor_preferences.get(donor_id, {})


# ---------------------------------------------------------------------------
# Session memory management
# ---------------------------------------------------------------------------

def get_session_key(donor_id: str) -> str:
    """Session key = donor_id + today's date."""
    return f"{donor_id}_{date.today().isoformat()}"


def save_to_session(donor_id: str, role: str, content: str):
    """Save a message to the session history."""
    key = get_session_key(donor_id)
    if key not in chat_sessions:
        chat_sessions[key] = []
    chat_sessions[key].append({
        "role": role,
        "content": content,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })


def get_session_history(donor_id: str, last_n: int = 10) -> list[dict]:
    """Retrieve the last N messages from this session."""
    key = get_session_key(donor_id)
    history = chat_sessions.get(key, [])
    return history[-last_n:]


# ---------------------------------------------------------------------------
# Reply logic
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are ARIA, the AI coordination assistant for Blood Warriors — a foundation that connects voluntary blood donors with Thalassemia patients across India.

You are speaking with a blood donor. Be warm, encouraging, and concise. Always refer to real data provided about this donor.

Donor profile:
Blood group: {blood_group}
Eligibility: {eligibility_status}
Next eligible date: {next_eligible_date}
Total donations: {donations_till_date}
Bridge donor: {is_bridge_donor}

Your goals:
1. Encourage timely donation
2. Answer questions about their profile accurately
3. Build long-term engagement with the Blood Warriors mission
4. If urgent blood need exists, communicate it with empathy

Keep responses under 3 sentences. Be human, not robotic."""


def rule_based_reply(message: str, context: dict, prefs: dict) -> str:
    """Fallback when Bedrock is not configured."""
    msg = message.lower()

    if "eligible" in msg or ("when" in msg and "donate" in msg):
        ned = context.get("next_eligible_date", "unknown")
        return (
            f"Your next eligible donation date is {ned}. "
            "We'd love to have you donate again! 🩸"
        )

    if "donation" in msg or "how many" in msg or "count" in msg:
        count = context.get("donations_till_date", 0)
        return (
            f"You have made {count} donations so far. "
            "That's incredible — every donation can save up to 3 lives! 🌟"
        )

    if "bridge" in msg or "patient" in msg:
        is_bridge = context.get("is_bridge_donor", False)
        status = "a registered bridge donor" if is_bridge else "not yet a bridge donor"
        return (
            f"You are currently {status}. "
            "Bridge donors provide life-saving recurring blood to Thalassemia patients. "
            "They are the backbone of Blood Warriors! ❤️"
        )

    if "coin" in msg or "reward" in msg or "point" in msg:
        from coins import get_balance
        balance = get_balance(context.get("donor_id", ""))
        return (
            f"Your current coin balance is {balance}. "
            "You earn coins for donations, quick responses, and streaks! 🪙"
        )

    if any(w in msg for w in ["hello", "hi", "hey", "namaste"]):
        bg = context.get("blood_group", "on file")
        return (
            f"Hello! I'm ARIA, your Blood Warriors AI assistant. 👋 "
            f"Your blood group is {bg}. How can I help you today?"
        )

    if "thank" in msg:
        return (
            "You're welcome! Thank you for being a Blood Warriors donor. "
            "Your generosity truly saves lives. 🙏"
        )

    # Check if preferences were extracted
    if prefs:
        pref_msg_parts = []
        if "unavailable_month" in prefs:
            pref_msg_parts.append(
                f"I've noted you'll be unavailable in {prefs['unavailable_month']}"
            )
        if "preferred_time" in prefs:
            pref_msg_parts.append(
                f"and you prefer {prefs['preferred_time']} contact"
            )
        if pref_msg_parts:
            return (
                "Got it! " + ", ".join(pref_msg_parts) + ". "
                "I'll make sure we respect your preferences. 📝"
            )

    return (
        "Thank you for being a Blood Warriors donor! "
        "Your contribution saves lives. Is there anything specific I can help you with? 💪"
    )


async def call_bedrock(
    message: str, history: list, context: dict
) -> str:
    """Call AWS Bedrock Claude — activate with AWS credentials."""
    import boto3
    import json

    bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
    system = SYSTEM_PROMPT.format(**context)

    messages = []
    for h in history[-10:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 200,
        "system": system,
        "messages": messages,
    })

    response = bedrock.invoke_model(
        body=body,
        modelId="anthropic.claude-3-haiku-20240307-v1:0",
        contentType="application/json",
    )

    result = json.loads(response["body"].read())
    return result["content"][0]["text"]


# ---------------------------------------------------------------------------
# Main endpoint
# ---------------------------------------------------------------------------

@router.post("/chat")
async def chat(req: ChatRequest):
    """Chat with ARIA — memory-enabled, preference-extracting."""
    context = get_donor_context(req.donor_id)

    # Extract preferences from the user's message
    prefs = extract_preferences(req.message, req.donor_id)

    # Save user message to session
    save_to_session(req.donor_id, "user", req.message)

    # Get session history for context
    history = get_session_history(req.donor_id)

    # Try Bedrock, fall back to rule-based
    try:
        reply = await call_bedrock(req.message, history, context)
    except Exception:
        reply = rule_based_reply(req.message, context, prefs)

    # Save ARIA's reply to session
    save_to_session(req.donor_id, "assistant", reply)

    return {
        "reply": reply,
        "donor_context": context,
        "preferences_extracted": prefs if prefs else None,
        "stored_preferences": get_donor_preferences(req.donor_id) or None,
    }


@router.get("/chat/preferences/{donor_id}")
def get_preferences(donor_id: str):
    """Retrieve stored preferences for a donor."""
    return {
        "donor_id": donor_id,
        "preferences": get_donor_preferences(donor_id),
    }
