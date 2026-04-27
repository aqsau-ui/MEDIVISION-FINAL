"""Reports Routes - Handle patient reports sent to doctors"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, List
import logging
from datetime import datetime
import uuid
from bson import ObjectId

from ..config.mongodb import get_mongodb
from ..config.database import get_db

router = APIRouter(prefix="/api/reports", tags=["Reports"])
logger = logging.getLogger(__name__)

class SaveReportRequest(BaseModel):
    reportId: str
    patientId: Optional[str] = None
    patientEmail: str
    patientName: str
    patientAge: int
    patientGender: Optional[str] = "Not specified"
    smokingStatus: Optional[str] = "Unknown"
    hasCough: Optional[str] = "No"
    coughDuration: Optional[str] = ""
    coughType: Optional[str] = ""
    symptoms: Optional[str] = "None"
    medicalHistory: Optional[str] = "None"
    prediction: str
    confidence: float
    probabilities: Optional[Dict[str, float]] = {}
    severity: Optional[str] = "Moderate"
    heatmapExplanation: Optional[str] = "No explanation available"
    originalImage: Optional[str] = ""
    heatmapImage: Optional[str] = ""

class SendProgressReportRequest(BaseModel):
    """Send a progress tracking report to a doctor."""
    doctorId: int
    patientId: str
    patientName: str
    patientEmail: str
    patientAge: Optional[int] = 0
    prediction: str
    confidence: float
    severity: Optional[str] = ""
    healthScore: Optional[int] = None
    probability: Optional[float] = None
    comparison: Optional[Dict] = None
    summary: Optional[str] = ""
    currentXray: Optional[str] = ""      # base64 current X-ray
    heatmap: Optional[str] = ""          # base64 heatmap
    previousXray: Optional[str] = ""     # base64 previous X-ray
    previousHeatmap: Optional[str] = ""  # base64 previous heatmap

class DoctorProgressCommentRequest(BaseModel):
    """Doctor submits comments on a progress report."""
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

class SendReportRequest(BaseModel):
    doctorId: int
    patientId: Optional[str] = None
    patientEmail: str
    patientName: str
    patientAge: int
    patientGender: Optional[str] = "Not specified"
    smokingStatus: Optional[str] = "Unknown"
    hasCough: Optional[str] = "No"
    coughDuration: Optional[str] = "N/A"
    coughType: Optional[str] = "N/A"
    symptoms: Optional[str] = "None"
    medicalHistory: Optional[str] = "None"
    prediction: str
    confidence: float
    severity: Optional[str] = "Moderate"
    heatmapExplanation: Optional[str] = "No explanation available"
    originalImage: Optional[str] = ""
    heatmapImage: Optional[str] = ""
    reportId: str

@router.post("/save")
async def save_report(
    report: SaveReportRequest,
    mongodb=Depends(get_mongodb)
):
    """Save patient report to MongoDB (auto-save when generated)"""
    try:
        # Prepare comprehensive report data for MongoDB
        report_data = {
            "reportId": report.reportId,
            "patient_id": report.patientId or report.patientEmail,
            "patient": {
                "email": report.patientEmail,
                "name": report.patientName,
                "age": report.patientAge,
                "gender": report.patientGender,
                "smokingStatus": report.smokingStatus,
                "hasCough": report.hasCough,
                "coughDuration": report.coughDuration,
                "coughType": report.coughType
            },
            "medicalInfo": {
                "symptoms": report.symptoms,
                "medicalHistory": report.medicalHistory
            },
            "analysis": {
                "prediction": report.prediction,
                "confidence": report.confidence,
                "probabilities": report.probabilities,
                "severity": report.severity,
                "heatmapExplanation": report.heatmapExplanation
            },
            "images": {
                "original": report.originalImage,
                "heatmap": report.heatmapImage
            },
            "createdAt": datetime.utcnow(),
            "timestamp": datetime.utcnow(),
            "status": "generated",  # generated, sent, reviewed
            "sentToDoctor": False
        }
        
        # Save to MongoDB
        collection = mongodb.get_collection("patient_reports")
        result = await collection.insert_one(report_data)
        
        logger.info(f"✅ Report {report.reportId} auto-saved for patient {report.patientName}")
        logger.info(f"   Prediction: {report.prediction} ({report.confidence*100:.1f}% confidence)")
        
        return {
            "success": True,
            "message": "Report saved successfully",
            "reportId": report.reportId
        }
    
    except Exception as e:
        logger.error(f"❌ Error saving report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error saving report"
        )

@router.post("/send-to-doctor")
async def send_report_to_doctor(
    report: SendReportRequest,
    mongodb=Depends(get_mongodb),
    conn=Depends(get_db)
):
    """Send patient report to selected doctor"""
    try:
        logger.info(f"Received send-to-doctor request for report {report.reportId}")
        logger.info(f"Doctor ID: {report.doctorId}, Patient: {report.patientName}")
        
        # Log image sizes for debugging
        original_img_size = len(report.originalImage) if report.originalImage else 0
        heatmap_img_size = len(report.heatmapImage) if report.heatmapImage else 0
        logger.info(f"Original image size: {original_img_size} bytes ({original_img_size / 1024:.2f} KB)")
        logger.info(f"Heatmap image size: {heatmap_img_size} bytes ({heatmap_img_size / 1024:.2f} KB)")
        total_size = original_img_size + heatmap_img_size
        logger.info(f"Total image data: {total_size / (1024 * 1024):.2f} MB")
        
        # Check if images are too large (MongoDB has 16MB document limit)
        if total_size > 15 * 1024 * 1024:  # 15MB limit to be safe
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Images are too large. Please compress or reduce quality."
            )
        
        # Verify doctor exists
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, full_name, email FROM doctors WHERE id = %s AND is_verified = 1",
            (report.doctorId,)
        )
        doctor = cursor.fetchone()
        cursor.close()
        
        logger.info(f"Doctor lookup result: {doctor}")
        
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )
        
        # Update existing report or create new one with doctor info
        logger.info("Getting MongoDB collection")
        collection = mongodb.get_collection("patient_reports")
        logger.info(f"Collection obtained: {collection.name}")
        
        # Try to update existing report
        logger.info(f"Attempting to update existing report with ID: {report.reportId}")
        update_result = await collection.update_one(
            {"reportId": report.reportId},
            {
                "$set": {
                    "doctorId": report.doctorId,
                    "doctorName": doctor["full_name"],
                    "doctorEmail": doctor["email"],
                    "patient.name": report.patientName,
                    "patient.email": report.patientEmail,
                    "patient.age": report.patientAge,
                    "patient.gender": report.patientGender,
                    "patient.smokingStatus": report.smokingStatus,
                    "patient.hasCough": report.hasCough,
                    "patient.coughDuration": report.coughDuration,
                    "patient.coughType": report.coughType,
                    "medicalInfo.symptoms": report.symptoms,
                    "medicalInfo.medicalHistory": report.medicalHistory,
                    "analysis.prediction": report.prediction,
                    "analysis.confidence": report.confidence,
                    "analysis.severity": report.severity,
                    "analysis.heatmapExplanation": report.heatmapExplanation,
                    "images.original": report.originalImage,
                    "images.heatmap": report.heatmapImage,
                    "sentAt": datetime.utcnow(),
                    "status": "pending",
                    "sentToDoctor": True
                }
            }
        )
        
        logger.info(f"Update result - matched: {update_result.matched_count}, modified: {update_result.modified_count}")
        
        # If report doesn't exist, create it with doctor info
        if update_result.matched_count == 0:
            logger.info("Report not found in DB, creating new entry")
            report_data = {
                "reportId": report.reportId,
                "patient_id": report.patientId or report.patientEmail,
                "doctorId": report.doctorId,
                "doctorName": doctor["full_name"],
                "doctorEmail": doctor["email"],
                "patient": {
                    "email": report.patientEmail,
                    "name": report.patientName,
                    "age": report.patientAge,
                    "gender": report.patientGender,
                    "smokingStatus": report.smokingStatus,
                    "hasCough": report.hasCough,
                    "coughDuration": report.coughDuration,
                    "coughType": report.coughType
                },
                "medicalInfo": {
                    "symptoms": report.symptoms,
                    "medicalHistory": report.medicalHistory
                },
                "analysis": {
                    "prediction": report.prediction,
                    "confidence": report.confidence,
                    "severity": report.severity,
                    "heatmapExplanation": report.heatmapExplanation
                },
                "images": {
                    "original": report.originalImage,
                    "heatmap": report.heatmapImage
                },
                "createdAt": datetime.utcnow(),
                "timestamp": datetime.utcnow(),
                "sentAt": datetime.utcnow(),
                "status": "pending",
                "sentToDoctor": True,
                "doctorNotes": None
            }
            insert_result = await collection.insert_one(report_data)
            logger.info(f"Insert completed with ID: {insert_result.inserted_id}")
        
        logger.info(f"Report {report.reportId} sent to doctor {doctor['full_name']} (ID: {report.doctorId})")
        
        return {
            "success": True,
            "message": f"Report sent successfully to Dr. {doctor['full_name']}",
            "reportId": report.reportId,
            "doctorName": doctor["full_name"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending report to doctor: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error details: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending report to doctor: {str(e)}"
        )

@router.get("/doctor/{doctor_id}")
async def get_doctor_reports(
    doctor_id: int,
    mongodb=Depends(get_mongodb)
):
    """Get all reports sent to a specific doctor"""
    try:
        logger.info(f"Fetching reports for doctor ID: {doctor_id}")
        collection = mongodb.get_collection("patient_reports")
        
        # Find all reports sent to this doctor, sorted by most recent first
        cursor = collection.find(
            {"doctorId": doctor_id, "sentToDoctor": True}
        ).sort("sentAt", -1)
        
        reports = await cursor.to_list(length=100)
        logger.info(f"Found {len(reports)} reports for doctor {doctor_id}")
        
        # Convert ObjectId to string
        for report in reports:
            report["_id"] = str(report["_id"])
            logger.info(f"Report: {report['reportId']} for patient {report.get('patient', {}).get('name', 'Unknown')}")
        
        return {
            "success": True,
            "count": len(reports),
            "reports": reports
        }
    
    except Exception as e:
        logger.error(f"Error fetching doctor reports: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching reports"
        )

@router.get("/detail/{report_id}")
async def get_report_detail(
    report_id: str,
    mongodb=Depends(get_mongodb)
):
    """Get detailed view of a specific report"""
    try:
        collection = mongodb.get_collection("patient_reports")
        
        report = await collection.find_one({"reportId": report_id})
        
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        
        # Convert ObjectId to string
        report["_id"] = str(report["_id"])
        
        return {
            "success": True,
            "report": report
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching report detail: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching report"
        )

@router.get("/patient/{patient_email}/latest")
async def get_patient_latest_report(
    patient_email: str,
    doctor_id: Optional[int] = None,
    mongodb=Depends(get_mongodb)
):
    """Get the latest AI diagnostic report for a patient (optionally filtered by doctor)."""
    try:
        collection = mongodb.get_collection("patient_reports")

        query = {"patient.email": patient_email, "sentToDoctor": True}
        if doctor_id:
            query["doctorId"] = doctor_id

        cursor = collection.find(query).sort("sentAt", -1).limit(1)
        reports = await cursor.to_list(length=1)

        if not reports:
            # Fallback: any report for this patient
            cursor2 = collection.find({"patient.email": patient_email}).sort("createdAt", -1).limit(1)
            reports = await cursor2.to_list(length=1)

        if not reports:
            return {"success": False, "report": None}

        report = reports[0]
        report["_id"] = str(report["_id"])
        return {"success": True, "report": report}

    except Exception as e:
        logger.error(f"Error fetching patient latest report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching patient report",
        )


@router.get("/prescriptions/patient/{patient_email}")
async def get_patient_prescriptions(
    patient_email: str,
    doctor_id: Optional[int] = None,
    mongodb=Depends(get_mongodb)
):
    """Get prescriptions for a patient (optionally filtered by doctor)."""
    try:
        collection = mongodb.get_collection("doctor_prescriptions")

        query = {"$or": [{"patient_id": patient_email}, {"patient_email": patient_email}]}
        if doctor_id:
            query["doctor_id"] = str(doctor_id)

        cursor = collection.find(query).sort("created_at", -1).limit(5)
        prescriptions = await cursor.to_list(length=5)
        for p in prescriptions:
            p["_id"] = str(p["_id"])

        return {"success": True, "prescriptions": prescriptions}

    except Exception as e:
        logger.error(f"Error fetching patient prescriptions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching prescriptions",
        )


@router.patch("/update-status/{report_id}")
async def update_report_status(
    report_id: str,
    status: str,
    mongodb=Depends(get_mongodb)
):
    """Update report status (pending/reviewed/archived)"""
    try:
        collection = mongodb.get_collection("patient_reports")
        
        result = await collection.update_one(
            {"reportId": report_id},
            {"$set": {"status": status, "updatedAt": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        
        return {
            "success": True,
            "message": "Report status updated"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating report status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating report status"
        )


# ══════════════════════════════════════════════════════════════
#   PROGRESS REPORT FLOW
# ══════════════════════════════════════════════════════════════

@router.post("/progress/send-to-doctor")
async def send_progress_report_to_doctor(
    req: SendProgressReportRequest,
    mongodb=Depends(get_mongodb),
    conn=Depends(get_db)
):
    """Send a progress tracking analysis report to a doctor."""
    try:
        # Verify doctor (accept verified or unverified — list already filters by verified)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, full_name, email FROM doctors WHERE id=%s", (req.doctorId,))
        doctor = cursor.fetchone()
        cursor.close()
        if not doctor:
            raise HTTPException(status_code=404, detail=f"Doctor ID {req.doctorId} not found in database")

        report_id = f"PROG-{uuid.uuid4().hex[:12].upper()}"
        doc = {
            "reportId": report_id,
            "reportType": "progress",
            "patient_id": req.patientId,
            "patientName": req.patientName,
            "patientEmail": req.patientEmail,
            "patientAge": req.patientAge,
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
        collection = mongodb.get_collection("patient_reports")
        await collection.insert_one(doc)
        logger.info(f"✅ Progress report {report_id} sent to Dr. {doctor['full_name']}")
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


@router.get("/progress/doctor/{doctor_id}")
async def get_doctor_progress_reports(doctor_id: int, mongodb=Depends(get_mongodb)):
    """Get all progress reports sent to a specific doctor."""
    try:
        collection = mongodb.get_collection("patient_reports")
        cursor = collection.find({"doctorId": doctor_id, "reportType": "progress", "sentToDoctor": True}).sort("sentAt", -1)
        reports = await cursor.to_list(length=100)
        for r in reports:
            r["_id"] = str(r["_id"])
            # Strip large image data from list view
            if "images" in r:
                r["images"] = {k: bool(v) for k, v in r["images"].items()}
        return {"success": True, "count": len(reports), "reports": reports}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/progress/detail/{report_id}")
async def get_progress_report_detail(report_id: str, mongodb=Depends(get_mongodb)):
    """Get full progress report including images for doctor review."""
    try:
        collection = mongodb.get_collection("patient_reports")
        report = await collection.find_one({"reportId": report_id, "reportType": "progress"})
        if not report:
            raise HTTPException(status_code=404, detail="Progress report not found")
        report["_id"] = str(report["_id"])
        return {"success": True, "report": report}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/progress/doctor-comment")
async def submit_doctor_progress_comment(
    req: DoctorProgressCommentRequest,
    mongodb=Depends(get_mongodb)
):
    """Doctor submits clinical comments on a progress report and sends back to patient."""
    try:
        from app.config.mongodb import get_mongodb as _get_mongodb
        collection = mongodb.get_collection("patient_reports")

        # Fetch the progress report
        report = await collection.find_one({"reportId": req.progress_report_id, "reportType": "progress"})
        if not report:
            raise HTTPException(status_code=404, detail="Progress report not found")

        now = datetime.utcnow()
        from random import choices; from string import digits, ascii_uppercase
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

        await collection.update_one(
            {"reportId": req.progress_report_id},
            {"$set": {
                "doctorComments": comments_doc,
                "status": "commented",
                "commentsSentToPatient": True,
                "commentedAt": now,
            }}
        )

        # Also store in doctor_prescriptions collection so it appears in DoctorRecommendation
        prescriptions_col = mongodb.get_collection("doctor_prescriptions")
        prescription_doc = {
            "report_id": req.progress_report_id,
            "report_type": "progress",   # ← differentiator
            "patient_id": report.get("patient_id") or report.get("patientEmail", ""),
            "patient_name": report.get("patientName", ""),
            "patient_age": report.get("patientAge", ""),
            "doctor_id": req.doctor_id,
            "doctor_name": req.doctor_name,
            "doctor_license": req.doctor_license,
            "doctor_specialization": req.doctor_specialization,
            "doctor_qualifications": req.doctor_qualifications,
            "doctor_signature": req.doctor_signature,
            "diagnosis_confirmation": "progress_review",
            "doctor_diagnosis": req.clinical_impression,
            "medications": req.medications,
            "diet_recommendations": "",
            "precautions": req.recommendations,
            "additional_notes": req.additional_notes,
            "follow_up": req.follow_up,
            "hospital_visit_required": req.hospital_visit_required,
            "progress_analysis": report.get("analysis", {}),
            "created_at": now,
            "sent_to_patient": True,
            "sent_at": now,
            "status": "verified",
            "verification_id": ver_id,
            "signed_by_licensed_physician": True,
        }
        await prescriptions_col.insert_one(prescription_doc)

        logger.info(f"✅ Doctor {req.doctor_name} commented on progress report {req.progress_report_id}")
        return {
            "success": True,
            "message": "Comments submitted and sent to patient",
            "verification_id": ver_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting doctor comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patient/{patient_id}/original-doctor")
async def get_patient_original_doctor(patient_id: str, mongodb=Depends(get_mongodb), conn=Depends(get_db)):
    """Get the first doctor a patient ever sent a report to — used for progress report priority."""
    try:
        collection = mongodb.get_collection("patient_reports")
        # Find earliest AI diagnostic report sent to a doctor (exclude progress reports)
        cursor = collection.find(
            {
                "$or": [{"patient_id": patient_id}, {"patientEmail": patient_id}, {"patient.email": patient_id}],
                "sentToDoctor": True,
                "reportType": {"$ne": "progress"},   # Only original AI reports, not progress ones
            }
        ).sort("sentAt", 1).limit(1)
        reports = await cursor.to_list(length=1)
        if not reports:
            return {"success": False, "doctor": None}

        doctor_id = reports[0].get("doctorId")
        doctor_name = reports[0].get("doctorName", "")
        if not doctor_id:
            return {"success": False, "doctor": None}

        # Fetch full doctor profile from MySQL
        cursor2 = conn.cursor(dictionary=True)
        cursor2.execute(
            "SELECT id, full_name AS fullName, pmdc_number AS pmdcNumber, specialization, experience, workplace, city_name AS city, profile_photo AS profilePhoto FROM doctors WHERE id=%s",
            (doctor_id,)
        )
        doc = cursor2.fetchone()
        cursor2.close()

        if doc:
            return {"success": True, "doctor": doc}
        return {"success": True, "doctor": {"id": doctor_id, "fullName": doctor_name}}
    except Exception as e:
        logger.error(f"Error fetching original doctor: {e}")
        raise HTTPException(status_code=500, detail=str(e))
