from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import pandas as pd
import os
from utils import df_to_json_safe

app = FastAPI(title="Blood Warriors API", version="2.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load datasets
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def load_csv(filename: str) -> pd.DataFrame:
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        return pd.read_csv(filepath)
    return pd.DataFrame()

donors_df = load_csv("clean_donors.csv")
patients_df = load_csv("clean_patients.csv")
bridge_df = load_csv("clean_bridge_cycles.csv")
emergency_df = load_csv("clean_emergency_requests.csv")
wallet_df = load_csv("clean_wallet_transactions.csv")
events_df = load_csv("clean_events.csv")

# Pydantic Models
class PatientCreate(BaseModel):
    patient_name: str
    blood_group: str
    age: int
    gender: str
    hospital_name: str
    hospital_city: str
    hospital_address: str
    doctor_name: str
    doctor_contact: str
    urgency_level: str = "Medium"
    units_required: int = 1
    bridge_active: bool = True
    notes: Optional[str] = None

class PatientUpdate(BaseModel):
    status: Optional[str] = None
    emergency_override: Optional[bool] = None
    dispatch_initiated: Optional[bool] = None
    pull_from_bank: Optional[bool] = None
    notes: Optional[str] = None

class BridgeSkipRequest(BaseModel):
    bridge_id: str
    donor_id: str
    reason: Optional[str] = None

class EmergencyOverrideRequest(BaseModel):
    patient_id: str
    reason: str

class DispatchRequest(BaseModel):
    patient_id: str
    urgency_override: Optional[str] = None

# Helper Functions
def normalize_blood_group(bg: str) -> str:
    """Normalize blood group formats"""
    mapping = {
        "O+": "O Positive", "O-": "O Negative",
        "A+": "A Positive", "A-": "A Negative",
        "B+": "B Positive", "B-": "B Negative",
        "AB+": "AB Positive", "AB-": "AB Negative",
    }
    return mapping.get(bg.strip(), bg.strip())

def calculate_donor_score(donor: pd.Series, patient: pd.Series, urgency: str) -> float:
    """Calculate donor matching score"""
    score = 0.0
    
    # Blood group compatibility (required)
    if donor['blood_group'] != patient['blood_group']:
        return 0.0
    
    # Reliability score (40%)
    score += donor['reliability_score'] * 40
    
    # Experience (30% for high urgency)
    if urgency in ['Critical', 'High']:
        score += min(donor['total_donations'] / 20, 1.0) * 30
    else:
        score += 15  # Base experience score
    
    # Recent activity (30%)
    last_donation = datetime.strptime(donor['last_donation_date'], '%Y-%m-%d')
    days_since = (datetime.now() - last_donation).days
    if days_since > 90:
        score += 30
    elif days_since > 60:
        score += 20
    else:
        score += 10
    
    # First-timer bonus for lower urgencies
    if urgency in ['Medium', 'Stable'] and donor['total_donations'] == 0:
        score += 10
    
    return score

def get_matching_donors(patient_id: str, limit: int = 20) -> List[Dict]:
    """Find matching donors for a patient"""
    patient = patients_df[patients_df['patient_id'] == patient_id]
    if patient.empty:
        return []
    
    patient_row = patient.iloc[0]
    urgency = patient_row['urgency_level']
    
    # Filter eligible donors
    eligible = donors_df[
        (donors_df['status'].isin(['Active', 'Emergency', 'Bridge Member'])) &
        (donors_df['next_eligible_date'] <= datetime.now().strftime('%Y-%m-%d'))
    ].copy()
    
    if eligible.empty:
        return []
    
    # Calculate scores
    eligible['score'] = eligible.apply(
        lambda row: calculate_donor_score(row, patient_row, urgency), 
        axis=1
    )
    
    # Sort by score and return top matches
    eligible = eligible.sort_values('score', ascending=False).head(limit)
    
    # Convert to JSON-safe format
    result = []
    for _, row in eligible.iterrows():
        record = {}
        for col in eligible.columns:
            val = row[col]
            if pd.isna(val):
                record[col] = None
            elif isinstance(val, (int, float, str, bool)):
                if isinstance(val, float) and (val != val):  # NaN check
                    record[col] = None
                else:
                    record[col] = val
            else:
                record[col] = str(val)
        result.append(record)
    
    return result

def get_bridge_cycle(bridge_id: str) -> Dict:
    """Get bridge cycle details"""
    cycle = bridge_df[bridge_df['bridge_id'] == bridge_id]
    if cycle.empty:
        return {}
    
    cycle_list = []
    for _, row in cycle.iterrows():
        record = {}
        for col in cycle.columns:
            val = row[col]
            if pd.isna(val):
                record[col] = None
            elif isinstance(val, (int, float, str, bool)):
                record[col] = val
            else:
                record[col] = str(val)
        cycle_list.append(record)
    
    # Find current position
    current = next((c for c in cycle_list if c['status'] in ['Pending', 'Upcoming']), None)
    
    return {
        'bridge_id': bridge_id,
        'members': cycle_list,
        'current_position': current['position'] if current else None,
        'total_members': len(cycle_list),
        'completed': len([c for c in cycle_list if c['status'] == 'Completed']),
        'skipped': len([c for c in cycle_list if c['status'] == 'Skipped'])
    }

def process_bridge_skip(bridge_id: str, donor_id: str) -> Dict:
    """Process a donor skip in bridge cycle"""
    global bridge_df
    
    # Find the donor's position
    donor_record = bridge_df[
        (bridge_df['bridge_id'] == bridge_id) & 
        (bridge_df['donor_id'] == donor_id)
    ]
    
    if donor_record.empty:
        return {'error': 'Donor not found in bridge'}
    
    # Update skip count
    idx = donor_record.index[0]
    current_skips = bridge_df.loc[idx, 'skip_count']
    new_skips = current_skips + 1
    
    bridge_df.loc[idx, 'skip_count'] = new_skips
    bridge_df.loc[idx, 'status'] = 'Skipped'
    
    # If skipped twice, move to end
    if new_skips >= 2:
        bridge_df.loc[idx, 'escalated'] = True
        bridge_df.loc[idx, 'moved_to_end'] = True
        
        # Move donor to last position (logic simplified)
        # In production, this would reassign positions
    
    # Activate backup if main donor skipped
    position = bridge_df.loc[idx, 'position']
    is_main = bridge_df.loc[idx, 'is_main']
    
    if is_main:
        # Activate backup (next position)
        backup_idx = bridge_df[
            (bridge_df['bridge_id'] == bridge_id) & 
            (bridge_df['position'] == position + 1)
        ].index
        
        if not backup_idx.empty:
            bridge_df.loc[backup_idx[0], 'status'] = 'Pending'
            bridge_df.loc[backup_idx[0], 'notification_sent'] = True
    
    return {
        'success': True,
        'new_skip_count': new_skips,
        'escalated': new_skips >= 2,
        'backup_activated': is_main
    }

# API Endpoints

@app.get("/")
def root():
    return {"message": "Blood Warriors API v2.0", "status": "running"}

# PATIENT ENDPOINTS
@app.get("/api/patients")
def get_patients(
    status: Optional[str] = None,
    urgency: Optional[str] = None,
    bridge_active: Optional[bool] = None,
    search: Optional[str] = None
):
    """Get all patients with filters"""
    df = patients_df.copy()
    
    if status:
        df = df[df['status'] == status]
    if urgency:
        df = df[df['urgency_level'] == urgency]
    if bridge_active is not None:
        df = df[df['bridge_active'] == bridge_active]
    if search:
        df = df[
            df['patient_name'].str.contains(search, case=False) |
            df['hospital_name'].str.contains(search, case=False) |
            df['blood_group'].str.contains(search, case=False)
        ]
    
    # Convert to JSON-safe format
    patients_list = []
    for _, row in df.iterrows():
        record = {}
        for col in df.columns:
            val = row[col]
            if pd.isna(val):
                record[col] = None
            elif isinstance(val, (int, float, str, bool)):
                if isinstance(val, float) and (val != val):  # NaN check
                    record[col] = None
                else:
                    record[col] = val
            else:
                record[col] = str(val)
        patients_list.append(record)
    
    return {'patients': patients_list, 'count': len(patients_list)}

@app.get("/api/patients/{patient_id}")
def get_patient(patient_id: str):
    """Get single patient details"""
    patient = patients_df[patients_df['patient_id'] == patient_id]
    if patient.empty:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    result = patient.iloc[0].to_dict()
    
    # Add bridge details if active
    if result.get('bridge_active') and result.get('bridge_id'):
        result['bridge_cycle'] = get_bridge_cycle(result['bridge_id'])
    
    # Add matching donors
    result['matching_donors'] = get_matching_donors(patient_id, limit=10)
    
    return result

@app.post("/api/patients")
def create_patient(patient: PatientCreate):
    """Create new patient"""
    global patients_df
    
    patient_id = f"P{len(patients_df) + 1:04d}"
    request_date = datetime.now()
    
    # Calculate needed_by based on urgency
    urgency_days = {
        'Critical': 2,
        'High': 7,
        'Medium': 15,
        'Stable': 30
    }
    needed_by = request_date + timedelta(days=urgency_days.get(patient.urgency_level, 15))
    
    new_patient = {
        'patient_id': patient_id,
        'patient_name': patient.patient_name,
        'blood_group': normalize_blood_group(patient.blood_group),
        'age': patient.age,
        'gender': patient.gender,
        'hospital_name': patient.hospital_name,
        'hospital_city': patient.hospital_city,
        'hospital_address': patient.hospital_address,
        'doctor_name': patient.doctor_name,
        'doctor_contact': patient.doctor_contact,
        'urgency_level': patient.urgency_level,
        'units_required': patient.units_required,
        'request_date': request_date.strftime('%Y-%m-%d'),
        'needed_by_date': needed_by.strftime('%Y-%m-%d'),
        'status': 'Open',
        'bridge_active': patient.bridge_active,
        'bridge_id': f"PATIENT_BRIDGE_{patient_id}" if patient.bridge_active else None,
        'bridge_members_count': 10 if patient.bridge_active else None,
        'current_bridge_slot': 1 if patient.bridge_active else None,
        'backup_active': False,
        'emergency_override': False,
        'dispatch_initiated': False,
        'pull_from_bank': False,
        'notes': patient.notes or "",
        'created_at': request_date.strftime('%Y-%m-%d %H:%M:%S')
    }
    
    patients_df = pd.concat([patients_df, pd.DataFrame([new_patient])], ignore_index=True)
    
    # Create bridge cycle if active
    if patient.bridge_active:
        create_bridge_cycle(f"PATIENT_BRIDGE_{patient_id}", patient.blood_group)
    
    return {'success': True, 'patient_id': patient_id, 'patient': new_patient}

@app.put("/api/patients/{patient_id}")
def update_patient(patient_id: str, update: PatientUpdate):
    """Update patient details"""
    global patients_df
    
    patient_idx = patients_df[patients_df['patient_id'] == patient_id].index
    if patient_idx.empty:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    idx = patient_idx[0]
    update_data = update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        patients_df.loc[idx, key] = value
    
    return {'success': True, 'patient': patients_df.loc[idx].to_dict()}

@app.post("/api/patients/{patient_id}/emergency-override")
def emergency_override(patient_id: str, request: EmergencyOverrideRequest):
    """Activate emergency override for patient"""
    global patients_df
    
    patient_idx = patients_df[patients_df['patient_id'] == patient_id].index
    if patient_idx.empty:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    idx = patient_idx[0]
    patients_df.loc[idx, 'emergency_override'] = True
    patients_df.loc[idx, 'urgency_level'] = 'Critical'
    patients_df.loc[idx, 'notes'] = f"{request.reason} - Emergency Override Activated"
    
    # Create emergency request
    create_emergency_request(patient_id)
    
    return {'success': True, 'message': 'Emergency override activated'}

@app.post("/api/patients/{patient_id}/dispatch")
def dispatch_now(patient_id: str, request: DispatchRequest):
    """Dispatch notifications to matching donors"""
    global patients_df
    
    patient = patients_df[patients_df['patient_id'] == patient_id]
    if patient.empty:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get matching donors
    matching_donors = get_matching_donors(patient_id, limit=20)
    
    if not matching_donors:
        return {'success': False, 'message': 'No matching donors found', 'donors_notified': 0}
    
    # Update patient
    idx = patient.index[0]
    patients_df.loc[idx, 'dispatch_initiated'] = True
    
    # In production: Send notifications via WhatsApp, SMS, App
    notified = len(matching_donors)
    
    return {
        'success': True,
        'message': f'Notified {notified} donors',
        'donors_notified': notified,
        'donors': matching_donors
    }

@app.post("/api/patients/{patient_id}/pull-from-bank")
def pull_from_bank(patient_id: str):
    """Contact blood banks for patient"""
    global patients_df
    
    patient = patients_df[patients_df['patient_id'] == patient_id]
    if patient.empty:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    idx = patient.index[0]
    patients_df.loc[idx, 'pull_from_bank'] = True
    
    # In production: Contact blood banks
    return {
        'success': True,
        'message': 'Blood banks contacted',
        'blood_groups_needed': patient.iloc[0]['blood_group']
    }

# BRIDGE ENDPOINTS
def create_bridge_cycle(bridge_id: str, blood_group: str):
    """Create a new bridge cycle with 10 positions"""
    global bridge_df
    
    # Find 10 eligible donors with matching blood group
    eligible = donors_df[
        (donors_df['blood_group'] == normalize_blood_group(blood_group)) &
        (donors_df['status'].isin(['Active', 'Bridge Member'])) &
        (donors_df['bridge_id'].isna())
    ].head(10)
    
    if len(eligible) < 10:
        # Fill remaining with any eligible donors
        remaining = 10 - len(eligible)
        other_donors = donors_df[
            (donors_df['status'].isin(['Active', 'Bridge Member'])) &
            (donors_df['bridge_id'].isna())
        ].head(remaining)
        eligible = pd.concat([eligible, other_donors])
    
    cycle_records = []
    for pos, (_, donor) in enumerate(eligible.iterrows(), 1):
        is_main = (pos % 2 == 1)
        scheduled_date = datetime.now() + timedelta(days=pos * 15)
        
        cycle_records.append({
            'cycle_id': f"CYCLE_{bridge_id}_{pos}",
            'bridge_id': bridge_id,
            'patient_id': bridge_id.replace('PATIENT_', ''),
            'donor_id': donor['donor_id'],
            'position': pos,
            'is_main': is_main,
            'backup_for_position': pos + 1 if is_main and pos < 10 else None,
            'scheduled_date': scheduled_date.strftime('%Y-%m-%d'),
            'status': 'Scheduled' if pos > 1 else 'Pending',
            'skip_count': 0,
            'actual_donation_date': None,
            'notification_sent': pos == 1,
            'reminder_sent': False,
            'escalated': False,
            'moved_to_end': False,
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    
    if cycle_records:
        bridge_df = pd.concat([bridge_df, pd.DataFrame(cycle_records)], ignore_index=True)
    
    return len(cycle_records)

@app.get("/api/bridge/{bridge_id}")
def get_bridge_details(bridge_id: str):
    """Get bridge cycle details"""
    cycle = get_bridge_cycle(bridge_id)
    if not cycle:
        raise HTTPException(status_code=404, detail="Bridge not found")
    
    return cycle

@app.post("/api/bridge/skip")
def report_skip(request: BridgeSkipRequest):
    """Report donor skip in bridge cycle"""
    result = process_bridge_skip(request.bridge_id, request.donor_id)
    
    if 'error' in result:
        raise HTTPException(status_code=400, detail=result['error'])
    
    return result

@app.get("/api/bridge/donor/{donor_id}/schedule")
def get_donor_bridge_schedule(donor_id: str):
    """Get bridge schedule for a donor"""
    donor_bridges = bridge_df[bridge_df['donor_id'] == donor_id]
    
    if donor_bridges.empty:
        return {'schedules': [], 'count': 0}
    
    schedules = df_to_json_safe(donor_bridges)
    
    # Add pre-donation buffer reminder (10 days before)
    for schedule in schedules:
        scheduled = datetime.strptime(schedule['scheduled_date'], '%Y-%m-%d')
        buffer_date = scheduled - timedelta(days=10)
        schedule['buffer_reminder_date'] = buffer_date.strftime('%Y-%m-%d')
        schedule['can_donate_early'] = buffer_date <= datetime.now() <= scheduled
    
    return {'schedules': schedules, 'count': len(schedules)}

# EMERGENCY ENDPOINTS
def create_emergency_request(patient_id: str):
    """Create emergency request"""
    global emergency_df
    
    patient = patients_df[patients_df['patient_id'] == patient_id]
    if patient.empty:
        return None
    
    patient_row = patient.iloc[0]
    
    emergency_record = {
        'emergency_id': f"EMG{len(emergency_df) + 1:04d}",
        'patient_id': patient_id,
        'blood_group': patient_row['blood_group'],
        'urgency_level': 'Critical',
        'units_required': patient_row['units_required'],
        'hospital_name': patient_row['hospital_name'],
        'hospital_city': patient_row['hospital_city'],
        'contact_person': patient_row['patient_name'],
        'contact_phone': patient_row['doctor_contact'],
        'request_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'status': 'Active',
        'donors_notified': 0,
        'responses_received': 0,
        'blood_bank_contacted': False,
        'whatsapp_sent': True,
        'app_notification_sent': True,
        'resolved_at': None,
        'notes': 'Emergency override activated'
    }
    
    emergency_df = pd.concat([emergency_df, pd.DataFrame([emergency_record])], ignore_index=True)
    
    return emergency_record

@app.get("/api/emergency")
def get_emergency_requests(status: Optional[str] = None):
    """Get emergency requests"""
    df = emergency_df.copy()
    
    if status:
        df = df[df['status'] == status]
    
    df = df.sort_values('request_time', ascending=False)
    
    return {'requests': df_to_json_safe(df), 'count': len(df)}

# DONOR ENDPOINTS
@app.get("/api/donors")
def get_donors(
    status: Optional[str] = None,
    blood_group: Optional[str] = None,
    city: Optional[str] = None,
    is_emergency: Optional[bool] = None
):
    """Get donors with filters"""
    df = donors_df.copy()
    
    if status:
        df = df[df['status'] == status]
    if blood_group:
        df = df[df['blood_group'] == normalize_blood_group(blood_group)]
    if city:
        df = df[df['city'] == city]
    if is_emergency is not None:
        df = df[df['is_emergency_donor'] == is_emergency]
    
    return {'donors': df_to_json_safe(df), 'count': len(df)}

@app.get("/api/donors/{donor_id}")
def get_donor(donor_id: str):
    """Get donor details with wallet and schedule"""
    donor = donors_df[donors_df['donor_id'] == donor_id]
    if donor.empty:
        raise HTTPException(status_code=404, detail="Donor not found")
    
    donor_data = donor.iloc[0].to_dict()
    
    # Add wallet transactions
    transactions = wallet_df[wallet_df['donor_id'] == donor_id]
    donor_data['wallet_transactions'] = df_to_json_safe(transactions)
    
    # Add bridge schedule
    donor_data['bridge_schedule'] = get_donor_bridge_schedule(donor_id)['schedules']
    
    # Check eligibility
    next_eligible = datetime.strptime(donor_data['next_eligible_date'], '%Y-%m-%d')
    donor_data['is_eligible'] = next_eligible <= datetime.now()
    donor_data['days_until_eligible'] = max(0, (next_eligible - datetime.now()).days)
    
    return donor_data

@app.get("/api/donors/{donor_id}/wallet")
def get_donor_wallet(donor_id: str):
    """Get donor wallet details"""
    donor = donors_df[donors_df['donor_id'] == donor_id]
    if donor.empty:
        raise HTTPException(status_code=404, detail="Donor not found")
    
    transactions = wallet_df[wallet_df['donor_id'] == donor_id]
    
    total_balance = donor.iloc[0]['wallet_balance']
    
    return {
        'donor_id': donor_id,
        'balance': total_balance,
        'transactions': df_to_json_safe(transactions),
        'transaction_count': len(transactions)
    }

# EVENTS ENDPOINTS
@app.get("/api/events")
def get_events(status: Optional[str] = None, city: Optional[str] = None):
    """Get events/camps"""
    df = events_df.copy()
    
    if status:
        df = df[df['status'] == status]
    if city:
        df = df[df['city'] == city]
    
    return {'events': df_to_json_safe(df), 'count': len(df)}

# ANALYTICS ENDPOINTS
@app.get("/api/analytics/dashboard")
def get_dashboard_analytics():
    """Get dashboard analytics"""
    return {
        'total_donors': len(donors_df),
        'active_donors': len(donors_df[donors_df['status'] == 'Active']),
        'emergency_donors': len(donors_df[donors_df['is_emergency_donor'] == True]),
        'bridge_members': len(donors_df[donors_df['status'] == 'Bridge Member']),
        'total_patients': len(patients_df),
        'open_patients': len(patients_df[patients_df['status'] == 'Open']),
        'critical_patients': len(patients_df[patients_df['urgency_level'] == 'Critical']),
        'active_bridges': len(patients_df[patients_df['bridge_active'] == True]),
        'emergency_requests': len(emergency_df[emergency_df['status'] == 'Active']),
        'upcoming_events': len(events_df[events_df['status'] == 'Upcoming']),
        'blood_group_distribution': donors_df['blood_group'].value_counts().to_dict()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
