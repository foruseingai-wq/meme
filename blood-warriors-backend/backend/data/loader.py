import pandas as pd
import numpy as np
import os

def load_dataset(path=None):
    """Load and clean the Blood Warriors dataset."""
    if path is None:
        # Try multiple paths
        candidates = [
            os.path.join(os.path.dirname(__file__), "Dataset.csv"),
            os.path.join(os.path.dirname(__file__), "..", "..", "Dataset.csv"),
        ]
        for p in candidates:
            if os.path.exists(p):
                path = p
                break
        if path is None:
            raise FileNotFoundError(
                "Dataset.csv not found. Place it in backend/data/ or project root."
            )

    df = pd.read_csv(path)

    # --- Clean columns ---
    df["blood_group"] = df["blood_group"].fillna("Unknown")
    df["user_donation_active_status"] = df["user_donation_active_status"].fillna(
        "Unknown"
    )
    df["donations_till_date"] = df["donations_till_date"].fillna(0).astype(int)

    # calls_to_donations_ratio: leave NaN intentionally (used in scoring)

    # bridge_status: convert string 'true'/'false' → bool
    df["bridge_status"] = (
        df["bridge_status"].astype(str).str.lower().map({"true": True, "false": False})
    )
    df["bridge_status"] = df["bridge_status"].fillna(False)

    # Parse date columns
    date_cols = [
        "last_donation_date",
        "next_eligible_date",
        "expected_next_transfusion_date",
        "last_transfusion_date",
        "registration_date",
        "last_contacted_date",
        "last_bridge_donation_date",
    ]
    for col in date_cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    # Ensure lat/lon are numeric
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")

    # total_calls as int
    df["total_calls"] = df["total_calls"].fillna(0).astype(int)

    print(f"[loader] Loaded {len(df)} records from {path}")
    return df


# --- Singleton: load once at startup ---
_df = None


def get_df():
    global _df
    if _df is None:
        _df = load_dataset()
    return _df
