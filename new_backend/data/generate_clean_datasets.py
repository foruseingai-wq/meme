import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

np.random.seed(42)
random.seed(42)

BLOOD_GROUPS = ['O Positive', 'O Negative', 'A Positive', 'A Negative', 
                'B Positive', 'B Negative', 'AB Positive', 'AB Negative']
CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad']
HOSPITALS = ['City Hospital', 'General Medical Center', 'Apollo Hospital', 'Fortis Healthcare', 
             'Max Super Speciality', 'AIIMS', 'Manipal Hospital', 'Narayana Health']
STATUSES = ['Active', 'Inactive', 'Emergency', 'Bridge Member']
GENDERS = ['Male', 'Female', 'Other']

donors_data = []
for i in range(500):
    blood_group = random.choice(BLOOD_GROUPS)
    city = random.choice(CITIES)
    status = random.choices(STATUSES, weights=[70, 10, 10, 10])[0]
    
    if status == 'Bridge Member':
        is_emergency = False
        bridge_id = f"BRIDGE_{random.randint(1, 50)}"
        bridge_position = random.randint(1, 10)
    else:
        is_emergency = random.choice([True, False]) if status == 'Active' else False
        bridge_id = None
        bridge_position = None
    
    last_donation = datetime.now() - timedelta(days=random.randint(0, 365))
    next_eligible = last_donation + timedelta(days=90)
    
    reliability_score = round(random.uniform(0.5, 1.0), 2)
    if status == 'Inactive':
        reliability_score = round(random.uniform(0.0, 0.4), 2)
    
    donors_data.append({
        'donor_id': f"D{i+1:04d}",
        'name': f"Donor {i+1}",
        'blood_group': blood_group,
        'age': random.randint(18, 65),
        'gender': random.choice(GENDERS),
        'phone': f"+91{random.randint(6000000000, 9999999999)}",
        'email': f"donor{i+1}@example.com",
        'city': city,
        'pincode': f"{random.randint(100000, 999999)}",
        'address': f"{random.randint(1, 500)} {city} Street",
        'status': status,
        'is_emergency_donor': is_emergency,
        'bridge_id': bridge_id,
        'bridge_position': bridge_position,
        'last_donation_date': last_donation.strftime('%Y-%m-%d'),
        'next_eligible_date': next_eligible.strftime('%Y-%m-%d'),
        'total_donations': random.randint(0, 20),
        'reliability_score': reliability_score,
        'skip_count': random.randint(0, 3) if status != 'Active' else 0,
        'wallet_balance': round(random.uniform(0, 5000), 2),
        'created_at': (datetime.now() - timedelta(days=random.randint(0, 730))).strftime('%Y-%m-%d %H:%M:%S')
    })

donors_df = pd.DataFrame(donors_data)
donors_df.to_csv('clean_donors.csv', index=False)
print(f"Created clean_donors.csv with {len(donors_df)} records")

patients_data = []
urgency_levels = ['Critical', 'High', 'Medium', 'Stable']

for i in range(200):
    blood_group = random.choice(BLOOD_GROUPS)
    urgency = random.choices(urgency_levels, weights=[15, 25, 40, 20])[0]
    
    if urgency == 'Critical':
        days_until_needed = random.randint(0, 2)
        bridge_active = False
    elif urgency == 'High':
        days_until_needed = random.randint(3, 7)
        bridge_active = random.choice([True, False])
    elif urgency == 'Medium':
        days_until_needed = random.randint(8, 15)
        bridge_active = random.choice([True, False])
    else:
        days_until_needed = random.randint(16, 30)
        bridge_active = True
    
    request_date = datetime.now() - timedelta(days=random.randint(0, 30))
    needed_by = datetime.now() + timedelta(days=days_until_needed)
    
    if bridge_active:
        bridge_id = f"PATIENT_BRIDGE_{i+1:04d}"
        bridge_members = 10
        current_slot = random.randint(1, 10)
        backup_active = random.choice([True, False])
    else:
        bridge_id = None
        bridge_members = None
        current_slot = None
        backup_active = False
    
    status = 'Open' if days_until_needed > 0 else random.choice(['Fulfilled', 'Cancelled'])
    
    patients_data.append({
        'patient_id': f"P{i+1:04d}",
        'patient_name': f"Patient {i+1}",
        'blood_group': blood_group,
        'age': random.randint(1, 90),
        'gender': random.choice(GENDERS),
        'hospital_name': random.choice(HOSPITALS),
        'hospital_city': random.choice(CITIES),
        'hospital_address': f"{random.randint(1, 500)} Hospital Road",
        'doctor_name': f"Dr. {random.choice(['Smith', 'Kumar', 'Patel', 'Sharma', 'Reddy'])}",
        'doctor_contact': f"+91{random.randint(6000000000, 9999999999)}",
        'urgency_level': urgency,
        'units_required': random.randint(1, 4),
        'request_date': request_date.strftime('%Y-%m-%d'),
        'needed_by_date': needed_by.strftime('%Y-%m-%d'),
        'status': status,
        'bridge_active': bridge_active,
        'bridge_id': bridge_id,
        'bridge_members_count': bridge_members,
        'current_bridge_slot': current_slot,
        'backup_active': backup_active,
        'emergency_override': False,
        'dispatch_initiated': False,
        'pull_from_bank': False,
        'notes': f"Requires {urgency.lower()} attention",
        'created_at': request_date.strftime('%Y-%m-%d %H:%M:%S')
    })

patients_df = pd.DataFrame(patients_data)
patients_df.to_csv('clean_patients.csv', index=False)
print(f"Created clean_patients.csv with {len(patients_df)} records")

bridge_cycles_data = []
for i in range(50):
    patient_id = f"P{random.randint(1, 200):04d}"
    bridge_id = f"BRIDGE_{i+1:04d}"
    
    for pos in range(1, 11):
        donor_id = f"D{random.randint(1, 500):04d}"
        is_main = (pos % 2 == 1)
        backup_for = pos + 1 if is_main and pos < 10 else None
        
        base_date = datetime.now() + timedelta(days=pos * 15)
        scheduled_date = base_date.strftime('%Y-%m-%d')
        
        if pos == 1:
            status = random.choice(['Completed', 'Pending', 'Skipped'])
        elif pos <= 3:
            status = random.choice(['Pending', 'Upcoming'])
        else:
            status = 'Scheduled'
        
        skip_count = random.randint(0, 2) if status == 'Skipped' else 0
        
        bridge_cycles_data.append({
            'cycle_id': f"CYCLE_{i+1:04d}",
            'bridge_id': bridge_id,
            'patient_id': patient_id,
            'donor_id': donor_id,
            'position': pos,
            'is_main': is_main,
            'backup_for_position': backup_for,
            'scheduled_date': scheduled_date,
            'status': status,
            'skip_count': skip_count,
            'actual_donation_date': None if status != 'Completed' else (datetime.now() - timedelta(days=random.randint(0, 5))).strftime('%Y-%m-%d'),
            'notification_sent': status != 'Scheduled',
            'reminder_sent': False if status == 'Scheduled' else True,
            'escalated': skip_count >= 2,
            'moved_to_end': skip_count >= 2,
            'created_at': (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
        })

bridge_df = pd.DataFrame(bridge_cycles_data)
bridge_df.to_csv('clean_bridge_cycles.csv', index=False)
print(f"Created clean_bridge_cycles.csv with {len(bridge_df)} records")

emergency_requests_data = []
for i in range(30):
    patient_id = f"P{random.randint(1, 200):04d}"
    blood_group = random.choice(BLOOD_GROUPS)
    
    emergency_requests_data.append({
        'emergency_id': f"EMG{i+1:04d}",
        'patient_id': patient_id,
        'blood_group': blood_group,
        'urgency_level': 'Critical',
        'units_required': random.randint(1, 3),
        'hospital_name': random.choice(HOSPITALS),
        'hospital_city': random.choice(CITIES),
        'contact_person': f"Contact {i+1}",
        'contact_phone': f"+91{random.randint(6000000000, 9999999999)}",
        'request_time': (datetime.now() - timedelta(hours=random.randint(1, 48))).strftime('%Y-%m-%d %H:%M:%S'),
        'status': random.choice(['Active', 'Resolved', 'Cancelled']),
        'donors_notified': random.randint(5, 50),
        'responses_received': random.randint(0, 10),
        'blood_bank_contacted': random.choice([True, False]),
        'whatsapp_sent': True,
        'app_notification_sent': True,
        'resolved_at': None,
        'notes': 'Emergency override activated'
    })

emergency_df = pd.DataFrame(emergency_requests_data)
emergency_df.to_csv('clean_emergency_requests.csv', index=False)
print(f"Created clean_emergency_requests.csv with {len(emergency_df)} records")

wallet_transactions_data = []
for i in range(1000):
    donor_id = f"D{random.randint(1, 500):04d}"
    transaction_type = random.choice(['Credit', 'Debit'])
    
    if transaction_type == 'Credit':
        reason = random.choice(['Donation Completed', 'Bridge Participation', 'Referral Bonus', 'Event Participation'])
        amount = round(random.uniform(100, 500), 2)
    else:
        reason = random.choice(['Withdrawal', 'Event Registration', 'Certificate Fee'])
        amount = round(random.uniform(-500, -50), 2)
    
    wallet_transactions_data.append({
        'transaction_id': f"TXN{i+1:06d}",
        'donor_id': donor_id,
        'transaction_type': transaction_type,
        'amount': amount,
        'balance_after': round(random.uniform(0, 5000), 2),
        'reason': reason,
        'status': 'Completed',
        'transaction_date': (datetime.now() - timedelta(days=random.randint(0, 180))).strftime('%Y-%m-%d %H:%M:%S'),
        'reference_id': f"REF{i+1:06d}"
    })

wallet_df = pd.DataFrame(wallet_transactions_data)
wallet_df.to_csv('clean_wallet_transactions.csv', index=False)
print(f"Created clean_wallet_transactions.csv with {len(wallet_df)} records")

events_data = []
for i in range(20):
    venue = f"{random.randint(1, 100)} Event Street"
    events_data.append({
        'event_id': f"EVT{i+1:04d}",
        'event_name': f"Blood Donation Camp {i+1}",
        'event_type': random.choice(['Camp', 'Workshop', 'Awareness Drive', 'Collection Drive']),
        'organization': random.choice(['Red Cross', 'Local NGO', 'Hospital', 'Corporate CSR']),
        'city': random.choice(CITIES),
        'venue': venue,
        'start_date': (datetime.now() + timedelta(days=random.randint(1, 60))).strftime('%Y-%m-%d'),
        'end_date': (datetime.now() + timedelta(days=random.randint(2, 65))).strftime('%Y-%m-%d'),
        'target_units': random.randint(50, 200),
        'registered_donors': random.randint(20, 150),
        'blood_groups_needed': ', '.join(random.sample(BLOOD_GROUPS, random.randint(2, 5))),
        'status': random.choice(['Upcoming', 'Ongoing', 'Completed']),
        'wallet_reward': round(random.uniform(200, 500), 2),
        'description': f"Join us for a noble cause at {venue}"
    })

events_df = pd.DataFrame(events_data)
events_df.to_csv('clean_events.csv', index=False)
print(f"Created clean_events.csv with {len(events_df)} records")

print("\n✅ All clean datasets created successfully!")
print("\nDataset Summary:")
print(f"- Donors: {len(donors_df)} records")
print(f"- Patients: {len(patients_df)} records")
print(f"- Bridge Cycles: {len(bridge_df)} records")
print(f"- Emergency Requests: {len(emergency_df)} records")
print(f"- Wallet Transactions: {len(wallet_df)} records")
print(f"- Events: {len(events_df)} records")
