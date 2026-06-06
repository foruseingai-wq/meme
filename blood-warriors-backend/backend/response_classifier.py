"""
Stage 2 — Response Classifier

Classifies donor reply text as:
  CONFIRMED   — donor agrees to donate
  DECLINED    — donor cannot donate
  CONDITIONAL — donor agrees but with conditions (date, location, etc.)
  UNCLEAR     — message doesn't clearly indicate intent

Two modes:
  1. Rule-based (default) — keyword matching, instant
  2. Bedrock   (when AWS configured) — Claude classification, <200ms
"""


def classify_response(reply_text: str) -> str:
    """
    Classify a donor's reply text into one of four categories.
    Uses rule-based classification (Bedrock integration in production).

    Returns: 'CONFIRMED' | 'DECLINED' | 'CONDITIONAL' | 'UNCLEAR'
    """
    text = reply_text.lower().strip()

    # Empty / very short replies
    if len(text) < 2:
        return "UNCLEAR"

    # --- Check for CONDITIONAL first (has qualifiers) ---
    conditional_signals = [
        "but", "only if", "only on", "maybe", "depends",
        "not sure", "possibly", "if i can", "let me check",
        "saturday", "sunday", "tomorrow", "next week",
        "after work", "evening only", "morning only",
    ]
    has_positive = any(w in text for w in ["yes", "sure", "okay", "ok", "can", "will"])
    has_conditional = any(w in text for w in conditional_signals)
    if has_positive and has_conditional:
        return "CONDITIONAL"

    # --- CONFIRMED —  clear positive intent ---
    confirmed_signals = [
        "yes", "sure", "okay", "ok", "i can", "will donate",
        "coming", "count me in", "ready", "absolutely",
        "of course", "happy to", "i'm in", "i'll be there",
        "on my way", "definitely", "i can donate",
    ]
    if any(w in text for w in confirmed_signals):
        return "CONFIRMED"

    # --- DECLINED — clear negative intent ---
    declined_signals = [
        "no", "cannot", "can't", "cant", "not available",
        "busy", "sorry", "unable", "won't", "wont",
        "not possible", "decline", "pass", "skip",
        "sick", "unwell", "travelling", "traveling",
        "out of town", "not in city",
    ]
    if any(w in text for w in declined_signals):
        return "DECLINED"

    # --- CONDITIONAL without positive (just has qualifier) ---
    if has_conditional:
        return "CONDITIONAL"

    return "UNCLEAR"


async def classify_with_bedrock(reply_text: str) -> str:
    """
    Production classifier using AWS Bedrock.
    Falls back to rule-based if Bedrock is unavailable.
    """
    try:
        import boto3
        import json

        bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

        prompt = f"""Classify the following donor reply as one of:
CONFIRMED — donor agrees to donate
DECLINED — donor cannot donate
CONDITIONAL — donor agrees but with a condition (date, location, etc.)
UNCLEAR — message does not clearly indicate intent

Reply: "{reply_text}"

Respond with ONLY one word: CONFIRMED, DECLINED, CONDITIONAL, or UNCLEAR."""

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 10,
            "messages": [{"role": "user", "content": prompt}],
        })

        response = bedrock.invoke_model(
            body=body,
            modelId="anthropic.claude-3-haiku-20240307-v1:0",
            contentType="application/json",
        )

        result = json.loads(response["body"].read())
        classification = result["content"][0]["text"].strip().upper()

        if classification in ("CONFIRMED", "DECLINED", "CONDITIONAL", "UNCLEAR"):
            return classification
        return "UNCLEAR"

    except Exception:
        # Fall back to rule-based
        return classify_response(reply_text)
