"""
Progress Report Router — patient sends progress analysis to doctor,
doctor reviews and sends comments back.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime
import uuid, logging
from random import choices
from string import ascii_uppercase, digits

from ..config.mongodb import get_mongodb
from ..config.database import get_db

progress_router = APIRouter(prefix="/api/progress-reports", tags=["Progress Reports"])
logger = logging.getLogger(__name__)


# ── Pydantic models ────────────────────────────────────────────
class SendProgressReportRequest(BaseModel):
    doctorId: int
    patientId: str
    patientName: str
    patientEmail: str
    patientAge: Optional[int] = 0
    patientGender: Optional[str] = "Not specified"
    prediction: str
    confidence: float
    severity: Optional[str] = ""
    healthScore: Optional[int] = None
    probability: Optional[float] = None
    comparison: Optional[Dict] = None
    summary: Optional[str] = ""
    currentXray: Optional[str] = ""
    heatmap: Optional[str] = ""
    previousXray: Optional[str] = ""
    previousHeatmap: Optional[str] = ""


class DoctorCommentRequest(BaseModel):
    progress_report_id: str
    doctor_id: str
    doctor_name: str
    doctor_license: str
    doctor_specialization: str
    doctor_qualifications: str
    doctor_signature: Optional[str] = None
    clinical_impression: str
    recommendations: str
    medications: Optional[str] = ""
    follow_up: Optional[str] = ""
    additional_notes: Optional[str] = ""
    hospital_visit_required: bool = False


# ── Endpoints ──────────────────────────────────────────────────

@progress_router.post("/send")
async def send_progress_report(
    req: SendProgressReportRequest,
    mongodb=Depends(get_mongodb),
    conn=Depends(get_db),
):
    """Patient sends a progress analysis report to a doctor."""
    try:
        cursor = conn.cursor(dictionary=True)
        # Accept any registered doctor (verified or not — the list already filters)
        cursor.execute("SELECT id, full_name, email FROM doctors WHERE id=%s", (req.doctorId,))
        doctor = cursor.fetchone()
        cursor.close()
        if not doctor:
            raise HTTPException(status_code=404, detail=f"Doctor ID {req.doctorId} not found")

        report_id = f"PROG-{uuid.uuid4().hex[:12].upper()}"
        doc = {
            "reportId": report_id,
            "reportType": "progress",
            "patient_id": req.patientId,
            "patientName": req.patientName,
            "patientEmail": req.patientEmail,
            "patientAge": req.patientAge,
            "patientGender": req.patientGender,
            "patientGender": req.patientGender,
            "doctorId": req.doctorId,
            "doctorName": doctor["full_name"],
            "doctorEmail": doctor["email"],
            "analysis": {
                "prediction": req.prediction,
                "confidence": req.confidence,
                "severity": req.severity,
                "healthScore": req.healthScore,
                "probability": req.probability,
                "comparison": req.comparison,
                "summary": req.summary,
            },
            "images": {
                "currentXray": req.currentXray,
                "heatmap": req.heatmap,
                "previousXray": req.previousXray,
                "previousHeatmap": req.previousHeatmap,
            },
            "status": "progress",
            "sentToDoctor": True,
            "sentAt": datetime.utcnow(),
            "createdAt": datetime.utcnow(),
            "doctorComments": None,
            "commentsSentToPatient": False,
        }
        col = mongodb.get_collection("patient_reports")
        await col.insert_one(doc)
        logger.info(f"Progress report {report_id} sent to Dr. {doctor['full_name']}")
        return {
            "success": True,
            "message": f"Progress report sent to Dr. {doctor['full_name']}",
            "reportId": report_id,
            "doctorName": doctor["full_name"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending progress report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@progress_router.get("/for-doctor/{doctor_id}")
async def get_doctor_progress_reports(doctor_id: int, mongodb=Depends(get_mongodb)):
    """List all progress reports sent to a doctor (images stripped)."""
    try:
        col = mongodb.get_collection("patient_reports")
        cursor = col.find({"doctorId": doctor_id, "reportType": "progress"}).sort("sentAt", -1)
        reports = await cursor.to_list(length=100)
        for r in reports:
            r["_id"] = str(r["_id"])
            if "images" in r:
                r["images"] = {k: bool(v) for k, v in r["images"].items()}
        return {"success": True, "count": len(reports), "reports": reports}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@progress_router.get("/detail/{report_id}")
async def get_progress_report_detail(report_id: str, mongodb=Depends(get_mongodb)):
    """Full progress report including images for doctor review."""
    try:
        col = mongodb.get_collection("patient_reports")
        report = await col.find_one({"reportId": report_id, "reportType": "progress"})
        if not report:
            raise HTTPException(status_code=404, detail="Progress report not found")
        report["_id"] = str(report["_id"])
        return {"success": True, "report": report}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@progress_router.post("/doctor-comment")
async def submit_doctor_comment(
    req: DoctorCommentRequest,
    mongodb=Depends(get_mongodb),
):
    """Doctor submits clinical comments → sent back to patient."""
    try:
        col = mongodb.get_collection("patient_reports")
        report = await col.find_one({"reportId": req.progress_report_id, "reportType": "progress"})
        if not report:
            raise HTTPException(status_code=404, detail="Progress report not found")

        now = datetime.utcnow()
        ver_id = "PRG-" + "".join(choices(ascii_uppercase + digits, k=8))
        comments_doc = {
            "doctor_id": req.doctor_id,
            "doctor_name": req.doctor_name,
            "doctor_license": req.doctor_license,
            "doctor_specialization": req.doctor_specialization,
            "doctor_qualifications": req.doctor_qualifications,
            "doctor_signature": req.doctor_signature,
            "clinical_impression": req.clinical_impression,
            "recommendations": req.recommendations,
            "medications": req.medications,
            "follow_up": req.follow_up,
            "additional_notes": req.additional_notes,
            "hospital_visit_required": req.hospital_visit_required,
            "submitted_at": now,
            "verification_id": ver_id,
        }
        await col.update_one(
            {"reportId": req.progress_report_id},
            {"$set": {
                "doctorComments": comments_doc,
                "status": "commented",
                "commentsSentToPatient": True,
                "commentedAt": now,
            }}
        )
        # Also store in doctor_prescriptions so patient sees it in DoctorRecommendation
        pres_col = mongodb.get_collection("doctor_prescriptions")
        await pres_col.insert_one({
            "report_id": req.progress_report_id,
            "report_type": "progress",
            "patient_id": report.get("patient_id") or report.get("patientEmail", ""),
            "patient_name": report.get("patientName", ""),
            "patient_age": report.get("patientAge", ""),
            "patient_gender": report.get("patientGender", "Not specified"),
            "doctor_id": req.doctor_id,
            "doctor_name": req.doctor_name,
            "doctor_license": req.doctor_license,
            "doctor_specialization": req.doctor_specialization,
            "doctor_qualifications": req.doctor_qualifications,
            "doctor_signature": req.doctor_signature,
            "diagnosis_confirmation": "progress_review",
            "doctor_diagnosis": req.clinical_impression,
            "clinical_impression": req.clinical_impression,
            "medications": req.medications,
            "precautions": req.recommendations,
            "additional_notes": req.additional_notes,
            "follow_up": req.follow_up,
            "hospital_visit_required": req.hospital_visit_required,
            "progress_analysis": report.get("analysis", {}),
            "previous_xray": report.get("images", {}).get("previousXray", ""),
            "current_xray": report.get("images", {}).get("currentXray", ""),
            "created_at": now,
            "sent_to_patient": True,
            "sent_at": now,
            "status": "verified",
            "verification_id": ver_id,
            "signed_by_licensed_physician": True,
        })
        return {"success": True, "message": "Comments sent to patient", "verification_id": ver_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting doctor comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@progress_router.get("/original-doctor/{patient_id}")
async def get_original_doctor(patient_id: str, mongodb=Depends(get_mongodb), conn=Depends(get_db)):
    """Return the first doctor the patient ever sent an AI diagnostic report to."""
    try:
        col = mongodb.get_collection("patient_reports")
        # Find earliest AI (non-progress) report sent to a doctor
        cursor = col.find({
            "$or": [
                {"patient_id": patient_id},
                {"patientEmail": patient_id},
                {"patient.email": patient_id},
            ],
            "sentToDoctor": True,
            "reportType": {"$ne": "progress"},
        }).sort("sentAt", 1).limit(1)
        reports = await cursor.to_list(length=1)
        if not reports:
            return {"success": False, "doctor": None}

        doctor_id = reports[0].get("doctorId")
        doctor_name = reports[0].get("doctorName", "")
        if not doctor_id:
            return {"success": False, "doctor": None}

        db_cursor = conn.cursor(dictionary=True)
        db_cursor.execute(
            """SELECT id, full_name AS fullName, pmdc_number AS pmdcNumber,
                      specialization, experience, workplace, city_name AS city,
                      profile_photo AS profilePhoto
               FROM doctors WHERE id=%s""",
            (doctor_id,)
        )
        doc = db_cursor.fetchone()
        db_cursor.close()
        if doc:
            return {"success": True, "doctor": doc}
        return {"success": True, "doctor": {"id": doctor_id, "fullName": doctor_name}}
    except Exception as e:
        logger.error(f"Error fetching original doctor: {e}")
        raise HTTPException(status_code=500, detail=str(e))
