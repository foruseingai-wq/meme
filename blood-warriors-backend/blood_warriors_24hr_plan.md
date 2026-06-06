# Blood Warriors — 24-Hour Hackathon Plan
**Target: First Checkpoint — End-to-end demo flow works locally**
**Both members: 16–18 hours continuous work**

---

## Context Snapshot

- **Member A**: Frontend (HTML/CSS/JS) — starts from the existing teammate HTML file
- **Member B**: Backend + AI/AWS — starts completely fresh
- **Shared goal by checkpoint**: Blood request → AI donor match → outreach simulation → admin dashboard — all working locally before any AWS deployment
- **Dataset**: `Dataset.csv` — 7,033 records, 31 columns, loaded and used for real data

---

## Hour-by-Hour 24-Hour Timeline

### Hour 0–1 | BOTH | Setup + Contract Agreement
> Do this together before splitting. This 1 hour saves 4 hours of miscommunication later.

**Together:**
1. Create GitHub repo: `blood-warriors-aria`
2. Create folder structure (see below)
3. Write `contracts/api_contract.json` — the 5 API shapes you both agree on
4. Member A opens the teammate HTML file and reads it top to bottom
5. Member B reads `Dataset.csv` columns and value distributions
6. Confirm: who runs on which port (`frontend: 5500`, `backend: 8000`)

**Agreed API Contract (write this into the repo right now):**

```json
{
  "endpoints": [
    {
      "method": "POST",
      "path": "/request-blood",
      "body": { "patient_id": "string", "blood_group": "string", "urgency": "high|medium|low" },
      "response": {
        "request_id": "string",
        "matched_donors": [
          { "donor_id": "string", "name": "string", "score": 0.87, "eligible": true, "distance_km": 4.2, "total_donations": 8 }
        ]
      }
    },
    {
      "method": "GET",
      "path": "/donors",
      "response": {
        "donors": [
          { "donor_id": "string", "name": "string", "blood_group": "string", "eligible": true, "active_status": "Active|Inactive", "donations": 8, "coins": 320 }
        ]
      }
    },
    {
      "method": "GET",
      "path": "/patient/{patient_id}/timeline",
      "response": {
        "patient_id": "string",
        "last_transfusion": "2025-08-02",
        "next_expected": "2025-08-23",
        "cycle_days": 21,
        "blood_group": "O Positive"
      }
    },
    {
      "method": "POST",
      "path": "/chat",
      "body": { "donor_id": "string", "message": "string", "conversation_history": [] },
      "response": { "reply": "string", "donor_context": {} }
    },
    {
      "method": "GET",
      "path": "/admin/metrics",
      "response": {
        "total_active_donors": 0,
        "active_bridges": 0,
        "inactive_donors": 0,
        "eligible_now": 0,
        "requests_today": 0
      }
    }
  ]
}
```

---

### Hours 1–4 | SPLIT | Phase 1 Build

#### Member A — Hours 1–4

**Task A1: Refactor the HTML file into a proper multi-file structure**

The existing HTML is one giant file. Split it while keeping everything working.

Create these files:
```
frontend/
├── index.html         ← shell only: imports scripts, has login panel
├── css/
│   └── style.css      ← all styles moved here from <style> tag
├── js/
│   ├── state.js       ← mock data (patients, donors, bridges, etc.)
│   ├── api.js         ← all fetch() calls in one place (mocked for now)
│   ├── communityView.js
│   ├── patientView.js
│   ├── donorView.js
│   └── app.js         ← login logic, role switching, renderDashboard()
```

Rules for the refactor:
- Keep every existing feature working — do not delete functionality
- Replace all `alert()` calls with a toast function: `showToast(message, type)` — add a small fixed-position div for this
- Replace hardcoded `#b3002f` color with CSS variable: `:root { --brand: #b3002f; }`
- The `api.js` file returns mock data for now — same shape as the contract above

**`api.js` mock structure (write exactly this):**
```javascript
const API_BASE = 'http://localhost:8000'; // flip this flag to go live
const USE_MOCK = true;

const MOCK_RESPONSES = {
  '/request-blood': { request_id: 'r1', matched_donors: [
    { donor_id: 'd1', name: 'Kiran Mehta', score: 0.91, eligible: true, distance_km: 2.1, total_donations: 8 },
    { donor_id: 'd2', name: 'Arjun Nair', score: 0.76, eligible: true, distance_km: 5.4, total_donations: 12 },
    { donor_id: 'd3', name: 'Neha Gupta', score: 0.61, eligible: true, distance_km: 8.0, total_donations: 5 }
  ]},
  '/donors': { donors: [] }, // populate from state.js
  '/admin/metrics': { total_active_donors: 4447, active_bridges: 786, inactive_donors: 682, eligible_now: 6464, requests_today: 3 },
  '/chat': { reply: 'Hello! I am ARIA, your Blood Warriors AI assistant. How can I help you today?' }
};

async function apiCall(path, method = 'GET', body = null) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 400)); // simulate latency
    return MOCK_RESPONSES[path] || {};
  }
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  return res.json();
}
```

**Task A2: Build the Donor Match Results UI**

This is the most important screen for the demo. When an admin submits a blood request, show a ranked donor list.

Component: `MatchResultsCard`
- Input: blood group, urgency level (dropdown: high/medium/low), patient name
- On submit: call `apiCall('/request-blood', 'POST', {...})`, show loading spinner
- Results: table with columns — Rank, Donor Name, Blood Group, Match Score (progress bar 0–100%), Distance, Status badge (Eligible/Not Eligible)
- Match score shown as a colored bar: >80% green, 60–80% amber, <60% red
- "Notify All" button at the bottom — triggers `apiCall('/escalate', 'POST', ...)`

**Task A3: Build the Admin Metrics Dashboard**

Four metric cards in a 2x2 grid:
- Total Active Donors (from `/admin/metrics`)
- Active Bridges
- Inactive Donors (shown in red if >500)
- Eligible Right Now

Below the cards: a simple table of the 5 most recent blood requests (hardcoded for now, real data in Phase 2).

---

#### Member B — Hours 1–4

**Task B1: Python environment + FastAPI skeleton**

```bash
mkdir blood-warriors-aria/backend
cd blood-warriors-aria/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install fastapi uvicorn pandas numpy python-dotenv boto3 anthropic
```

Create `main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import donors, requests, chat, admin

app = FastAPI(title="Blood Warriors ARIA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this before AWS deploy
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(donors.router, prefix="/donors")
app.include_router(requests.router)
app.include_router(chat.router)
app.include_router(admin.router, prefix="/admin")

# Run: uvicorn main:app --reload --port 8000
```

**Task B2: Load and clean the dataset**

Create `data/loader.py`:
```python
import pandas as pd
import numpy as np

def load_dataset(path="data/Dataset.csv"):
    df = pd.read_csv(path)
    
    # Clean: fill missing blood groups as Unknown
    df['blood_group'] = df['blood_group'].fillna('Unknown')
    
    # Clean: active status
    df['user_donation_active_status'] = df['user_donation_active_status'].fillna('Unknown')
    
    # Clean: donations_till_date
    df['donations_till_date'] = df['donations_till_date'].fillna(0)
    
    # Parse dates safely
    date_cols = ['last_donation_date', 'next_eligible_date', 'expected_next_transfusion_date', 'last_transfusion_date']
    for col in date_cols:
        df[col] = pd.to_datetime(df[col], errors='coerce')
    
    return df

# Singleton — load once at startup
_df = None
def get_df():
    global _df
    if _df is None:
        _df = load_dataset()
    return _df
```

**Task B3: The donor scoring engine**

This is the most critical backend piece. Create `scorer.py`:

```python
import pandas as pd
import numpy as np
from datetime import datetime
from data.loader import get_df

BLOOD_COMPATIBILITY = {
    'O Negative':  ['O Negative', 'O Positive', 'A Negative', 'A Positive', 'B Negative', 'B Positive', 'AB Negative', 'AB Positive'],
    'O Positive':  ['O Positive', 'A Positive', 'B Positive', 'AB Positive'],
    'A Negative':  ['A Negative', 'A Positive', 'AB Negative', 'AB Positive'],
    'A Positive':  ['A Positive', 'AB Positive'],
    'B Negative':  ['B Negative', 'B Positive', 'AB Negative', 'AB Positive'],
    'B Positive':  ['B Positive', 'AB Positive'],
    'AB Negative': ['AB Negative', 'AB Positive'],
    'AB Positive': ['AB Positive'],
}

def score_donors(blood_group_requested: str, patient_lat: float = 17.39, patient_lon: float = 78.46, top_n: int = 10):
    df = get_df()
    
    # Step 1: compatible blood groups that can donate to requested
    compatible = [k for k, v in BLOOD_COMPATIBILITY.items() if blood_group_requested in v]
    
    # Step 2: filter eligible donors
    pool = df[
        (df['blood_group'].isin(compatible)) &
        (df['eligibility_status'] == 'eligible') &
        (df['user_donation_active_status'] == 'Active') &
        (df['role'].isin(['Bridge Donor', 'Emergency Donor']))
    ].copy()
    
    if pool.empty:
        return []
    
    # Step 3: score each donor (0.0 to 1.0)
    pool['score'] = 0.0
    
    # Factor 1: calls-to-donations ratio (lower = more reliable) — 40% weight
    max_ratio = pool['calls_to_donations_ratio'].max()
    if max_ratio > 0:
        pool['score'] += 0.4 * (1 - pool['calls_to_donations_ratio'].fillna(1) / max_ratio)
    
    # Factor 2: total donations (more = more experienced) — 30% weight
    max_don = pool['donations_till_date'].max()
    if max_don > 0:
        pool['score'] += 0.3 * (pool['donations_till_date'] / max_don)
    
    # Factor 3: distance from patient (closer = higher score) — 30% weight
    pool['dist_km'] = np.sqrt(
        ((pool['latitude'] - patient_lat) * 111) ** 2 +
        ((pool['longitude'] - patient_lon) * 111) ** 2
    )
    max_dist = pool['dist_km'].max()
    if max_dist > 0:
        pool['score'] += 0.3 * (1 - pool['dist_km'] / max_dist)
    
    # Step 4: sort and return top N
    pool = pool.sort_values('score', ascending=False).head(top_n)
    
    results = []
    for _, row in pool.iterrows():
        results.append({
            "donor_id": str(row['user_id'])[:12],  # truncate hash for display
            "name": f"Donor {str(row['user_id'])[:6]}",  # anonymized — real names not in dataset
            "blood_group": row['blood_group'],
            "score": round(float(row['score']), 2),
            "eligible": row['eligibility_status'] == 'eligible',
            "distance_km": round(float(row['dist_km']), 1),
            "total_donations": int(row['donations_till_date']),
            "role": row['role'],
            "calls_ratio": round(float(row['calls_to_donations_ratio']) if pd.notna(row['calls_to_donations_ratio']) else 0, 2)
        })
    
    return results
```

**Task B4: Wire the `/request-blood` endpoint**

Create `routers/requests.py`:
```python
from fastapi import APIRouter
from pydantic import BaseModel
from scorer import score_donors
import uuid

router = APIRouter()

class BloodRequest(BaseModel):
    patient_id: str
    blood_group: str
    urgency: str = "medium"
    patient_lat: float = 17.39
    patient_lon: float = 78.46

@router.post("/request-blood")
def request_blood(req: BloodRequest):
    matched = score_donors(req.blood_group, req.patient_lat, req.patient_lon)
    return {
        "request_id": str(uuid.uuid4())[:8],
        "blood_group": req.blood_group,
        "urgency": req.urgency,
        "matched_donors": matched
    }
```

**Task B5: Admin metrics endpoint**

Create `routers/admin.py`:
```python
from fastapi import APIRouter
from data.loader import get_df

router = APIRouter()

@router.get("/metrics")
def get_metrics():
    df = get_df()
    return {
        "total_active_donors": int((df['user_donation_active_status'] == 'Active').sum()),
        "active_bridges": int(df['bridge_status'].sum()),
        "inactive_donors": int((df['user_donation_active_status'] == 'Inactive').sum()),
        "eligible_now": int((df['eligibility_status'] == 'eligible').sum()),
        "one_time_donors": int((df['donor_type'] == 'One-Time Donor').sum()),
        "regular_donors": int((df['donor_type'] == 'Regular Donor').sum()),
        "high_call_ratio": int((df['calls_to_donations_ratio'] > 5).sum()),  # needs intervention
        "requests_today": 3  # simulated
    }

@router.get("/inactive-analysis")
def inactive_analysis():
    df = get_df()
    inactive = df[df['user_donation_active_status'] == 'Inactive']
    return {
        "total": len(inactive),
        "reasons": inactive['inactive_trigger_comment'].value_counts().to_dict(),
        "blood_groups": inactive['blood_group'].value_counts().to_dict()
    }
```

---

### Hour 4 | SYNC CHECKPOINT A
> Stop. Both members run their piece. Verify these exact things:

- [ ] Member A opens `frontend/index.html` in browser — login works, all 3 role views render
- [ ] Member B runs `uvicorn main:app --reload` — server starts on port 8000
- [ ] Member B hits `http://localhost:8000/request-blood` with Postman or curl — gets back scored donor list
- [ ] Member B hits `http://localhost:8000/admin/metrics` — gets real numbers from the dataset
- [ ] Member A changes `USE_MOCK = false` in `api.js` — donor match UI shows real results from Member B's API

**If either fails:** Do not proceed. Fix it first. This checkpoint is non-negotiable.

---

### Hours 4–8 | SPLIT | Phase 2 Core Features

#### Member A — Hours 4–8

**Task A4: Transfusion Timeline Component**

This is your most visually impressive screen. Build it as a horizontal timeline.

Layout per patient row:
```
[Patient Name] [Blood Group]
|----[LAST TRANSFUSION]----[TODAY]--------[NEXT EXPECTED]----|
     Aug 2                  Jun 6              Aug 23
          ← 35 days ago →        ← 47 days ahead →
```

Implementation:
- Use a `<div>` with `position: relative` as the track
- Three markers: past date (gray dot), today (red dot, pulsing CSS animation), future date (blue dot)
- Width of the track represents the full cycle; marker positions are percentage-based
- If `next_expected` is within 7 days: show red urgent badge "Transfusion Due Soon"
- Pull data from `apiCall('/patient/{id}/timeline')`
- Show 5 patients from the dataset — hardcode the patient IDs from your Dataset.csv bridge records

**Task A5: Chatbot Panel (Donor View)**

Standard chat bubble UI:
```
+----------------------------------+
| ARIA — AI Assistant        [●online] |
+----------------------------------+
| [ARIA bubble] Hello Kiran!       |
|                                  |
|          [User bubble] Hi ARIA   |
+----------------------------------+
| [Type a message...      ] [Send] |
+----------------------------------+
```

- ARIA bubbles: left-aligned, light purple background
- User bubbles: right-aligned, brand red background, white text
- Loading indicator: three animated dots while waiting for response
- Call `apiCall('/chat', 'POST', { donor_id, message, conversation_history })`
- Store `conversation_history` in a JS array per session — pass the full array on every call (this gives the AI memory within a session)
- Suggested prompts as chips below the input: "When am I next eligible?", "Who is my bridge patient?", "How many coins do I have?"

**Task A6: Failure Learning Indicator (Admin View)**

Add a new section to the admin view: "System Learning Log"

- A list of the last 5 "failure events" (hardcoded for now, real in Phase 3)
- Each entry: donor ID truncated, event type (No Response / Not Donated 1 Year), action taken (Reclassified → Inactive / Outreach Tier Upgraded), timestamp
- A small animated badge "AI Learning Active" with a pulsing green dot

```javascript
const MOCK_FAILURE_LOG = [
  { donor: 'D-5e56ef', event: 'No response after 3 calls', action: 'Upgraded to Tier 3', time: '2 hrs ago' },
  { donor: 'D-32a39c', event: 'Not donated in 1 year', action: 'Marked Inactive', time: '5 hrs ago' },
  { donor: 'D-ab1c2a', event: 'Missed scheduled bridge donation', action: 'Admin alerted', time: '8 hrs ago' },
];
```

---

#### Member B — Hours 4–8

**Task B6: Patient timeline endpoint**

Create `routers/donors.py` — add timeline logic:
```python
from fastapi import APIRouter
from data.loader import get_df
import pandas as pd

router = APIRouter()

@router.get("/timeline")
def get_patient_timelines():
    df = get_df()
    # Get bridge records that have transfusion data
    bridge_patients = df[
        (df['bridge_status'] == True) &
        (df['last_transfusion_date'].notna()) &
        (df['expected_next_transfusion_date'].notna())
    ].head(8)
    
    results = []
    for _, row in bridge_patients.iterrows():
        last = pd.to_datetime(row['last_transfusion_date'])
        nxt = pd.to_datetime(row['expected_next_transfusion_date'])
        cycle = (nxt - last).days if pd.notna(last) and pd.notna(nxt) else 21
        results.append({
            "patient_id": str(row['user_id'])[:12],
            "blood_group": row['bridge_blood_group'] or row['blood_group'],
            "last_transfusion": str(last.date()) if pd.notna(last) else None,
            "next_expected": str(nxt.date()) if pd.notna(nxt) else None,
            "cycle_days": int(cycle),
            "quantity_required": float(row['quantity_required']) if pd.notna(row['quantity_required']) else 1.0,
            "urgency": "high" if cycle < 7 else "medium"
        })
    
    return { "patients": results }
```

**Task B7: Bedrock chatbot endpoint (local first, Bedrock second)**

Create `routers/chat.py`:

```python
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict
from data.loader import get_df
import os

router = APIRouter()

class ChatRequest(BaseModel):
    donor_id: str
    message: str
    conversation_history: List[Dict] = []

def get_donor_context(donor_id: str) -> dict:
    df = get_df()
    # Match on first 12 chars of user_id
    match = df[df['user_id'].str[:12] == donor_id[:12]]
    if match.empty:
        return {}
    row = match.iloc[0]
    return {
        "blood_group": row['blood_group'],
        "eligibility_status": row['eligibility_status'],
        "next_eligible_date": str(row['next_eligible_date'].date()) if hasattr(row['next_eligible_date'], 'date') else "Unknown",
        "donations_till_date": int(row['donations_till_date']),
        "is_bridge_donor": bool(row['bridge_status']),
        "active_status": row['user_donation_active_status'],
    }

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

@router.post("/chat")
async def chat(req: ChatRequest):
    context = get_donor_context(req.donor_id)
    
    # Try Bedrock first, fall back to rule-based
    try:
        reply = await call_bedrock(req.message, req.conversation_history, context)
    except Exception:
        reply = rule_based_reply(req.message, context)
    
    return { "reply": reply, "donor_context": context }

def rule_based_reply(message: str, context: dict) -> str:
    """Fallback when Bedrock is not yet configured"""
    msg = message.lower()
    if "eligible" in msg or "donate" in msg or "when" in msg:
        return f"Your next eligible donation date is {context.get('next_eligible_date', 'unknown')}. We'd love to have you donate again!"
    if "donation" in msg or "how many" in msg or "count" in msg:
        return f"You have made {context.get('donations_till_date', 0)} donations so far. That's incredible — you're saving lives!"
    if "bridge" in msg or "patient" in msg:
        status = "a registered bridge donor" if context.get('is_bridge_donor') else "not yet a bridge donor"
        return f"You are currently {status}. Bridge donors provide life-saving recurring blood to Thalassemia patients."
    if "hello" in msg or "hi" in msg or "hey" in msg:
        return f"Hello! I'm ARIA, your Blood Warriors AI assistant. Your blood group is {context.get('blood_group', 'on file')}. How can I help you today?"
    return "Thank you for being a Blood Warriors donor! Your contribution saves lives. Is there anything specific I can help you with?"

async def call_bedrock(message: str, history: list, context: dict) -> str:
    """Call AWS Bedrock — activate this in Phase 3"""
    import boto3, json
    
    bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
    system = SYSTEM_PROMPT.format(**context)
    
    messages = history + [{"role": "user", "content": message}]
    
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 200,
        "system": system,
        "messages": messages
    })
    
    response = bedrock.invoke_model(
        body=body,
        modelId="anthropic.claude-3-haiku-20240307-v1:0",
        contentType="application/json"
    )
    
    result = json.loads(response['body'].read())
    return result['content'][0]['text']
```

> Note: The `call_bedrock` function will fail locally without AWS credentials — that's expected. The `rule_based_reply` fallback runs instead. This is intentional. You test the full UI flow locally with rule-based, then activate Bedrock in Phase 3 by adding AWS credentials.

**Task B8: Escalation + failure tracking (local simulation)**

Create `routers/escalation.py`:
```python
from fastapi import APIRouter
from pydantic import BaseModel
from data.loader import get_df
from datetime import datetime

router = APIRouter()

# In-memory failure log (replace with DynamoDB in Phase 3)
failure_log = []

class EscalationEvent(BaseModel):
    donor_id: str
    event_type: str  # "no_response" | "not_donated_1yr" | "missed_bridge"
    request_id: str

@router.post("/escalate")
def log_escalation(event: EscalationEvent):
    df = get_df()
    
    # Determine tier based on event type and donor history
    match = df[df['user_id'].str[:12] == event.donor_id[:12]]
    
    tier = 1
    action = "SMS + WhatsApp sent"
    
    if not match.empty:
        row = match.iloc[0]
        if event.event_type == "not_donated_1yr" or row['calls_to_donations_ratio'] > 5:
            tier = 3
            action = "Marked Inactive, admin alerted"
        elif event.event_type == "no_response":
            tier = 2
            action = "Personalized AI message sent"
    
    log_entry = {
        "donor_id": event.donor_id,
        "event_type": event.event_type,
        "tier": tier,
        "action": action,
        "timestamp": datetime.now().isoformat(),
        "request_id": event.request_id
    }
    
    failure_log.append(log_entry)
    
    return { "status": "logged", "tier": tier, "action": action, "log": log_entry }

@router.get("/failure-log")
def get_failure_log():
    return { "events": failure_log[-10:] }  # last 10 events
```

---

### Hour 8 | SYNC CHECKPOINT B
> Full integration test. This is the most important sync before the checkpoint.

Run this exact demo flow together:

1. Open `frontend/index.html` → login as Community Admin
2. Submit a blood request: Patient "Rohan", blood group "A Positive", urgency "High"
3. See ranked donor list appear with real scores from `Dataset.csv`
4. Switch `USE_MOCK = false` in `api.js` — verify same flow hits Member B's API
5. Login as Donor → open chatbot → type "When am I next eligible?" → get rule-based reply
6. Login as Community Admin → check metrics cards show real dataset numbers
7. Hit `GET /admin/inactive-analysis` in browser — see breakdown of 682 inactive donors

**What each number should look like when real:**
- Total active donors: 4,447
- Active bridges: 786
- Inactive donors: 682
- Eligible right now: 6,464

If these numbers appear in the UI — you have a real, data-powered demo.

---

### Hours 8–12 | SPLIT | Phase 2 Polish + Phase 3 AWS Start

#### Member A — Hours 8–12

**Task A7: Real API integration**

Flip `USE_MOCK = false`. Fix anything that breaks. The most likely breakage points:
- CORS errors: Member B must have CORS enabled (already in the plan)
- Response shape mismatches: compare with `contracts/api_contract.json`
- Loading states: make sure every API call shows a spinner while waiting

**Task A8: Transfusion Timeline with real data**

Connect the timeline component to `GET /donors/timeline`. Real patients from the dataset now appear. Highlight any patient whose `next_expected` date is within 7 days.

**Task A9: Demo flow polish**

For the presentation, the demo must feel smooth. Add these:
- After blood request submitted: auto-scroll to the matched donors list
- Add a "Simulate No Response" button on each matched donor card — this calls `POST /escalate` and adds an entry to the failure log
- Failure log section in admin view now calls `GET /escalation/failure-log` — real data from Member B

**Task A10: Mobile responsiveness check**

The judges may view this on a laptop or projected screen. Make sure at `min-width: 768px` the 3-column layout doesn't break. The existing CSS already has a media query — verify it works.

---

#### Member B — Hours 8–12

**Task B9: AWS setup (do this in parallel while A polishes UI)**

In order:
1. Log in to AWS Console
2. Create a DynamoDB table: `aria-donors` — partition key: `user_id` (String)
3. Create a DynamoDB table: `aria-bridges` — partition key: `bridge_id` (String)
4. Write `scripts/import_to_dynamo.py` — imports Dataset.csv rows into `aria-donors`
5. Verify: spot-check 5 records in DynamoDB console

```python
# scripts/import_to_dynamo.py
import boto3
import pandas as pd
from decimal import Decimal
import json

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('aria-donors')

df = pd.read_csv('data/Dataset.csv')
df = df.head(500)  # import first 500 for testing — do full import after verify

def clean_for_dynamo(val):
    if pd.isna(val):
        return None
    if isinstance(val, float):
        return Decimal(str(round(val, 4)))
    return str(val)

with table.batch_writer() as batch:
    for _, row in df.iterrows():
        item = {k: clean_for_dynamo(v) for k, v in row.items() if clean_for_dynamo(v) is not None}
        item['user_id'] = str(row['user_id'])  # ensure string PK
        batch.put_item(Item=item)

print("Import complete")
```

**Task B10: First Lambda — donor matching**

Create `aws/matching_lambda/handler.py`:
```python
import json
import sys
sys.path.insert(0, '/opt/python')  # Lambda layer path

from scorer import score_donors

def lambda_handler(event, context):
    body = json.loads(event.get('body', '{}'))
    
    blood_group = body.get('blood_group', 'O Positive')
    patient_lat = body.get('patient_lat', 17.39)
    patient_lon = body.get('patient_lon', 78.46)
    
    matched = score_donors(blood_group, patient_lat, patient_lon)
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'matched_donors': matched})
    }
```

> Package this as a ZIP with the scorer.py and data/ directory. Upload to Lambda. Set runtime: Python 3.11. Add memory: 512MB (dataset loading needs it). Test with a sample event before connecting to API Gateway.

**Task B11: API Gateway setup**

1. Create REST API in API Gateway
2. Create resources: `/request-blood`, `/admin/metrics`, `/chat`, `/donors/timeline`
3. Each resource: POST or GET method → Lambda integration → Enable CORS
4. Deploy to stage named `dev`
5. Give Member A the base URL: `https://xxxxxxx.execute-api.us-east-1.amazonaws.com/dev`
6. Member A replaces `API_BASE` in `api.js` — full AWS integration done

---

### Hour 12 | SYNC CHECKPOINT C — FIRST CHECKPOINT (TARGET)

This is the first checkpoint the problem statement refers to. Everything below must be true:

**Functionality checklist:**
- [ ] Login with 3 role views works
- [ ] Admin submits blood request → real scored donors from Dataset.csv appear
- [ ] Donor match score uses actual `calls_to_donations_ratio`, `donations_till_date`, geo-distance
- [ ] Chatbot responds (rule-based fallback OR real Bedrock — either is fine at this checkpoint)
- [ ] Admin metrics show real numbers: 4447 active, 786 bridges, 682 inactive, 6464 eligible
- [ ] Transfusion timeline shows real bridge patients from dataset
- [ ] Failure log records escalation events (in-memory is fine)
- [ ] API calls either hit local FastAPI OR AWS Lambda (either is fine — flag which one)

**Demo script (practice this exact flow before checkpoint):**
1. Admin view → blood request → A Positive → High urgency → Submit
2. Ranked donor list appears in <1 second with scores
3. Click "Simulate No Response" on donor 3 → failure log updates
4. Switch to Donor view → chatbot → "When am I next eligible?" → reply appears
5. Switch to Admin view → metrics cards → all real numbers
6. Show transfusion timeline → upcoming cycle highlighted

---

## Folder Structure (set this up in Hour 0)

```
blood-warriors-aria/
├── README.md
├── contracts/
│   └── api_contract.json          ← shared API shapes (both agree on this)
├── frontend/
│   ├── index.html                 ← shell: login panel + dashboard wrapper
│   ├── css/
│   │   └── style.css              ← all styles
│   └── js/
│       ├── state.js               ← mock data
│       ├── api.js                 ← all fetch calls (USE_MOCK toggle)
│       ├── communityView.js       ← admin dashboard render
│       ├── patientView.js         ← patient portal render
│       ├── donorView.js           ← donor hub + chatbot render
│       └── app.js                 ← login, routing, renderDashboard()
├── backend/
│   ├── main.py                    ← FastAPI app
│   ├── scorer.py                  ← donor matching engine
│   ├── requirements.txt
│   ├── data/
│   │   └── Dataset.csv            ← your dataset goes here
│   ├── routers/
│   │   ├── donors.py
│   │   ├── requests.py
│   │   ├── chat.py
│   │   ├── admin.py
│   │   └── escalation.py
│   └── scripts/
│       └── import_to_dynamo.py
└── aws/
    ├── matching_lambda/
    │   └── handler.py
    ├── chatbot_lambda/
    │   └── handler.py
    └── failure_learning_lambda/
        └── handler.py
```

---

## Critical Rules for Both Members

1. **Never break the main branch.** Each member works on their own branch (`member-a`, `member-b`). Merge only at sync checkpoints.
2. **`contracts/api_contract.json` is sacred.** If you need to change a response shape, both members discuss it first.
3. **`USE_MOCK` in `api.js` is the integration switch.** Member A keeps it `true` during development. Flip to `false` only at sync checkpoints.
4. **Log everything to console during development.** `console.log` on frontend, `print()` on backend. Remove before final demo.
5. **If stuck for more than 30 minutes, move on and stub it.** Mark it with a `// TODO` comment. The demo flow is more important than any single feature.
6. **Dataset.csv path:** Backend always reads from `backend/data/Dataset.csv`. Do not move this file.
7. **Ports:** Frontend on 5500 (Live Server) or 3000. Backend always on 8000. Never change these during development.

---

## What NOT to Build Before the Checkpoint

These are Phase 3 items — do not start these until the checkpoint is passed:

- AWS Step Functions workflow
- Amazon Lex voice bot
- SageMaker model training
- Kinesis streams
- Full DynamoDB migration (local scorer is fine for checkpoint)
- Cognito authentication
- CloudWatch dashboards
- CI/CD pipeline

---

## Emergency Fallbacks

If something breaks badly and time is running out:

| What breaks | Fallback |
|---|---|
| Backend API not ready | Keep `USE_MOCK = true` — demo still works with mock data |
| Bedrock not configured | `rule_based_reply()` already handles this — chatbot still works |
| DynamoDB import fails | Scorer reads from local CSV — same result |
| API Gateway not set up | Point `API_BASE` at local `localhost:8000` — demo over screen share |
| Matching scores look wrong | Show the dataset analysis instead — 7033 records, 132 locations, real numbers |

The demo must always run. Every feature has a fallback. Build the fallback first, then enhance.
