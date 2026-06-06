"""
Router: /request-blood

Accepts a blood request and returns scored/ranked donors using the
urgency-aware matching engine.
"""

from fastapi import APIRouter
from pydantic import BaseModel
import uuid

from scorer import score_donors

router = APIRouter()


class BloodRequest(BaseModel):
    patient_id: str
    blood_group: str
    urgency: str = "medium"  # high | medium | low
    patient_lat: float = 17.39
    patient_lon: float = 78.46
    top_n: int = 10


@router.post("/request-blood")
def request_blood(req: BloodRequest):
    """Submit a blood request → returns ranked donor matches."""
    matched = score_donors(
        blood_group_requested=req.blood_group,
        urgency=req.urgency,
        patient_lat=req.patient_lat,
        patient_lon=req.patient_lon,
        top_n=req.top_n,
    )
    return {
        "request_id": f"req_{uuid.uuid4().hex[:6]}",
        "blood_group": req.blood_group,
        "urgency": req.urgency,
        "matched_donors": matched,
        "total_matches": len(matched),
    }
