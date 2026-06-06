import pandas as pd
import numpy as np
import uuid
import random
from datetime import datetime, timedelta

def random_date(start_days_ago, end_days_ahead):
    start = datetime.now() - timedelta(days=start_days_ago)
    end = datetime.now() + timedelta(days=end_days_ahead)
    return start + (end - start) * random.random()

blood_groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
statuses = ['Active', 'Inactive', 'Cooldown']

data = []
for i in range(100):
    user_id = str(uuid.uuid4())
    bg = random.choice(blood_groups)
    status = random.choice(statuses)
    role = random.choice(['main', 'backup', 'none'])
    donor_type = random.choice(['Bridge Donor', 'Emergency Donor', 'One-Time Donor'])
    
    last_donation = random_date(365, 0)
    next_eligible = last_donation + timedelta(days=90)
    
    data.append({
        'user_id': user_id,
        'blood_group': bg,
        'user_donation_active_status': status,
        'donations_till_date': random.randint(0, 15),
        'bridge_status': 'true' if role != 'none' else 'false',
        'last_donation_date': last_donation.strftime('%Y-%m-%d'),
        'next_eligible_date': next_eligible.strftime('%Y-%m-%d'),
        'expected_next_transfusion_date': random_date(0, 30).strftime('%Y-%m-%d'),
        'last_transfusion_date': random_date(60, 0).strftime('%Y-%m-%d'),
        'registration_date': random_date(1000, 300).strftime('%Y-%m-%d'),
        'last_contacted_date': random_date(30, 0).strftime('%Y-%m-%d'),
        'last_bridge_donation_date': random_date(100, 0).strftime('%Y-%m-%d'),
        'latitude': 17.3850 + random.uniform(-0.1, 0.1),
        'longitude': 78.4867 + random.uniform(-0.1, 0.1),
        'total_calls': random.randint(0, 10),
        'eligibility_status': 'eligible' if next_eligible < datetime.now() else 'cooldown',
        'role': role,
        'donor_type': donor_type
    })

df = pd.DataFrame(data)
df.to_csv('c:/Users/sai-y/Downloads/New folder/blood-warriors-backend/backend/data/Dataset.csv', index=False)
print("Created Dataset.csv successfully.")
