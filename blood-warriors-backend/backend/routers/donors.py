"""
Router: /donors

Donor timeline and transfusion forecast endpoints.
"""

from fastapi import APIRouter
import pandas as pd
from data.loader import get_df
from forecaster import get_upcoming_transfusions, get_forecast_summary

router = APIRouter()


@router.get("/timeline")
def get_patient_timelines():
    """Get bridge patient transfusion timelines (sorted by urgency)."""
    patients = get_upcoming_transfusions()
    return {"patients": patients[:15]}


@router.get("/forecast")
def get_forecast():
    """
    Aggregated transfusion forecast:
    how many patients need blood this week, next week, etc.
    """
    return get_forecast_summary()


@router.get("/list")
def list_donors(
    blood_group: str = None,
    status: str = None,
    limit: int = 50,
):
    """List donors with optional filters."""
    df = get_df()

    if blood_group:
        df = df[df["blood_group"] == blood_group]
    if status:
        df = df[df["user_donation_active_status"] == status]

    df = df.head(limit)

    import random
    FIRST_NAMES = ['Kiran', 'Arjun', 'Neha', 'Vikram', 'Priya', 'Rajesh', 'Sunita', 'Amit', 'Sanjay', 'Ramesh', 'Anjali', 'Kavitha']
    LAST_NAMES = ['Mehta', 'Nair', 'Gupta', 'Singh', 'Kapoor', 'Kumar', 'Reddy', 'Patel', 'Sharma', 'Joshi']

    donors = []
    for _, row in df.iterrows():
        user_id = str(row["user_id"])
        seed = sum(ord(c) for c in user_id)
        random.seed(seed)
        
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        
        # Calculate Reliability
        ratio = row.get("calls_to_donations_ratio", float('nan'))
        if pd.isna(ratio):
            rel_score = random.randint(70, 98)
        else:
            rel_score = int(float(ratio) * 100)
            if rel_score > 100: rel_score = 100
            if rel_score < 40: rel_score = random.randint(40, 60)

        donors.append({
            "id": user_id[:12],
            "name": name,
            "bloodGroup": row.get("blood_group", "Unknown"),
            "canDonate": str(row.get("eligibility_status", "")).lower() == "eligible",
            "activeStatus": row.get("user_donation_active_status", "Active"),
            "totalDonations": int(row.get("donations_till_date", 0)),
            "coins": int(row.get("donations_till_date", 0)) * 50 + random.randint(10, 100),
            "role": row.get("role", "none"),
            "donorType": row.get("donor_type", "Unknown"),
            "reliabilityScore": rel_score,
            "travelDistanceKm": random.randint(2, 25),
            "preferredDonationTime": random.choice(["morning", "afternoon", "evening", "weekend"]),
            "nextEligibleDate": str(row.get("next_eligible_date", ""))[:10]
        })

    return {"donors": donors, "total": len(donors)}

@router.get("/patients/list")
def list_patients():
    """Extract patients by grouping unique bridge_ids from the Dataset."""
    df = get_df()
    
    # Filter only rows that have a valid bridge_id and bridge_status is True
    bridged_df = df[df["bridge_status"] == True].dropna(subset=["bridge_id"])
    
    # Group by bridge_id to extract unique patients
    patients = []
    
    import random
    
    FIRST_NAMES = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Myra', 'Sara', 'Aanya', 'Priya', 'Neha', 'Pooja', 'Riya', 'Kavya']
    LAST_NAMES = ['Sharma', 'Verma', 'Patel', 'Nair', 'Reddy', 'Kumar', 'Singh', 'Gupta', 'Mehta', 'Kapoor']
    HOSPITALS = ['Apollo Hospital', 'Lilavati Hospital', 'Fortis Healthcare', 'Max Super Speciality', 'AIIMS', 'Medanta']

    # We use a deterministic random seed based on the string hash so the same ID gets the same name across reloads
    def get_simulated_data(bridge_id_str):
        seed = sum(ord(c) for c in str(bridge_id_str))
        random.seed(seed)
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        hosp = random.choice(HOSPITALS)
        return f"{first} {last}", hosp

    for bridge_id, group in bridged_df.groupby("bridge_id"):
        # Take the first row's patient data as the truth for this bridge_id
        row = group.iloc[0]
        name, hospital = get_simulated_data(bridge_id)
        
        # Calculate how many donors are actually assigned to this bridge
        assigned_donors = list(group["user_id"].astype(str).str[:12])
        
        patients.append({
            "id": str(bridge_id)[:12],
            "name": name,
            "bloodGroup": row.get("bridge_blood_group", "Unknown"),
            "preferredHospital": hospital,
            "nextTransfusionDate": str(row.get("expected_next_transfusion_date", "2025-08-15"))[:10],
            "emergencyMode": len(assigned_donors) < 4, # arbitrary threshold for simulation
            "bridgeCycle": assigned_donors,
            "currentBridgeCount": len(assigned_donors),
            "requiredBridgesPerMonth": 4,
            "cycleIndex": 0,
            "skipCount": {}
        })
        
    return {"patients": patients, "total": len(patients)}
