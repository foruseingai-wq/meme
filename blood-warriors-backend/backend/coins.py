"""
Gamification — Coin Ledger

In-memory coin system for donor rewards.
In production, stored as a field in the DynamoDB donor profile.
"""

from datetime import datetime

# ---------------------------------------------------------------------------
# Coin rules
# ---------------------------------------------------------------------------
COIN_RULES = {
    "donation_completed": 40,
    "first_donation": 100,      # bonus for first-timers
    "bridge_donation": 60,      # bridge donations worth more
    "quick_response": 10,       # responded within 1 hour
    "streak_bonus": 20,         # consecutive donations without missing
    "referral": 30,             # referred another donor
}

# ---------------------------------------------------------------------------
# In-memory ledger (replace with DynamoDB in production)
# ---------------------------------------------------------------------------
coin_ledger: dict[str, int] = {}           # donor_id → total coins
coin_history: dict[str, list] = {}         # donor_id → list of transactions


def award_coins(donor_id: str, reason: str) -> dict:
    """Award coins to a donor for a specific action."""
    amount = COIN_RULES.get(reason, 0)
    if amount == 0:
        return {"donor_id": donor_id, "awarded": 0, "reason": reason, "total": get_balance(donor_id)}

    coin_ledger[donor_id] = coin_ledger.get(donor_id, 0) + amount

    # Record transaction
    if donor_id not in coin_history:
        coin_history[donor_id] = []
    coin_history[donor_id].append({
        "amount": amount,
        "reason": reason,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })

    return {
        "donor_id": donor_id,
        "awarded": amount,
        "reason": reason,
        "total": coin_ledger[donor_id],
    }


def get_balance(donor_id: str) -> int:
    """Get current coin balance for a donor."""
    return coin_ledger.get(donor_id, 0)


def get_coin_history(donor_id: str) -> list[dict]:
    """Get coin transaction history for a donor."""
    return coin_history.get(donor_id, [])


def get_leaderboard(top_n: int = 10) -> list[dict]:
    """Get top N donors by coin balance."""
    sorted_donors = sorted(coin_ledger.items(), key=lambda x: x[1], reverse=True)
    return [
        {"donor_id": did, "coins": coins, "rank": i + 1}
        for i, (did, coins) in enumerate(sorted_donors[:top_n])
    ]
