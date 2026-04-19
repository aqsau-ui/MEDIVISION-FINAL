from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from bson import ObjectId
from app.config.mongodb import get_mongodb
from app.config.database import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import random
import string

logger = logging.getLogger(__name__)
router = APIRouter()


def generate_verification_id():
    """Generate unique verification ID in format: MED-VER-XXXXXX"""
    timestamp = datetime.now().strftime("%y%m%d")
    random_part = ''.join(random.choices(string.digits, k=6))
    return f"MED-VER-{timestamp}{random_part}"


class DoctorPrescription(BaseModel):
    report_id: str
    patient_id: str
    patient_name: str
    doctor_id: str
    doctor_name: str
    doctor_license: str
    doctor_specialization: str
    doctor_qualifications: str
    doctor_signature: Optional[str] = None  # Base64 encoded signature image
    diagnosis_confirmation: str  # "confirm", "modify", "inconclusive"
    doctor_diagnosis: str
    medications: str
    diet_recommendations: str
    precautions: str
    additional_notes: Optional[str] = ""
    hospital_visit_required: bool = False
    follow_up: Optional[str] = ""


@router.post("/api/doctor-prescription/submit")
async def submit_doctor_prescription(
    prescription: DoctorPrescription,
    mongodb: AsyncIOMotorDatabase = Depends(get_mongodb),
    mysql_conn = Depends(get_db)
):
    """
    Submit doctor's prescription and verified medical report with digital signature
    """
    try:
        # Fetch doctor's data from MySQL
        cursor = mysql_conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                full_name,
                pmdc_number,
                hospital_affiliation
            FROM doctors 
            WHERE id = %s
        """, (prescription.doctor_id,))
        
        doctor_data = cursor.fetchone()
        cursor.close()
        
        if not doctor_data:
            raise HTTPException(status_code=404, detail="Doctor not found")
        
        # Generate unique verification ID
        verification_id = generate_verification_id()
        
        # Prepare prescription document
        current_time = datetime.utcnow()
        prescription_doc = {
            "report_id": prescription.report_id,
            "patient_id": prescription.patient_id,
            "patient_name": prescription.patient_name,
            "doctor_id": prescription.doctor_id,
            "doctor_name": prescription.doctor_name,
            "doctor_license": prescription.doctor_license,
            "doctor_specialization": prescription.doctor_specialization,
            "doctor_qualifications": prescription.doctor_qualifications,
            "diagnosis_confirmation": prescription.diagnosis_confirmation,
            "doctor_diagnosis": prescription.doctor_diagnosis,
            "medications": prescription.medications,
            "diet_recommendations": prescription.diet_recommendations,
            "precautions": prescription.precautions,
            "additional_notes": prescription.additional_notes,
            "hospital_visit_required": prescription.hospital_visit_required,
            "follow_up": prescription.follow_up,
            "created_at": current_time,
            "status": "verified",
            "sent_to_patient": False,
            # Digital Signature & Verification
            "verification_id": verification_id,
            "doctor_signature": prescription.doctor_signature if prescription.doctor_signature else None,
            "verification_timestamp": current_time.isoformat(),
            "hospital_affiliation": doctor_data.get("hospital_affiliation", ""),
            "signed_by_licensed_physician": True
        }

        # Store prescription in MongoDB
        collection = mongodb.get_collection("doctor_prescriptions")
        result = await collection.insert_one(prescription_doc)

        # Update patient report to mark as doctor-verified
        reports_collection = mongodb.get_collection("patient_reports")
        await reports_collection.update_one(
            {"reportId": prescription.report_id},
            {
                "$set": {
                    "doctor_verified": True,
                    "doctor_prescription_id": str(result.inserted_id),
                    "verified_at": current_time,
                    "verification_id": verification_id
                }
            }
        )

        logger.info(f"✅ Doctor prescription submitted for report {prescription.report_id}")
        logger.info(f"📋 Verification ID: {verification_id}")

        # Prepare prescription response (convert datetime to string for JSON serialization)
        prescription_response = {**prescription_doc}
        prescription_response["_id"] = str(result.inserted_id)
        prescription_response["created_at"] = current_time.isoformat()

        return {
            "success": True,
            "message": "Prescription submitted successfully",
            "prescription_id": str(result.inserted_id),
            "verification_id": verification_id,
            "prescription": prescription_response
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error submitting prescription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/doctor-prescription/report/{report_id}")
async def get_prescription_by_report(
    report_id: str,
    mongodb: AsyncIOMotorDatabase = Depends(get_mongodb)
):
    """
    Get doctor prescription for a specific report
    """
    try:
        collection = mongodb.get_collection("doctor_prescriptions")
        prescription = await collection.find_one({"report_id": report_id})

        if not prescription:
            return {
                "success": False,
                "message": "No prescription found for this report"
            }

        # Convert ObjectId to string
        prescription["_id"] = str(prescription["_id"])

        return {
            "success": True,
            "prescription": prescription
        }

    except Exception as e:
        logger.error(f"❌ Error fetching prescription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/doctor-prescription/patient/{patient_id}")
async def get_patient_prescriptions(
    patient_id: str,
    mongodb: AsyncIOMotorDatabase = Depends(get_mongodb)
):
    """
    Get all prescriptions for a specific patient that have been sent to them
    """
    try:
        collection = mongodb.get_collection("doctor_prescriptions")
        # Only return prescriptions that have been sent to the patient
        cursor = collection.find({
            "patient_id": patient_id,
            "sent_to_patient": True
        }).sort("created_at", -1)
        prescriptions = await cursor.to_list(length=100)

        # Convert ObjectIds to strings
        for prescription in prescriptions:
            prescription["_id"] = str(prescription["_id"])

        return {
            "success": True,
            "count": len(prescriptions),
            "prescriptions": prescriptions
        }

    except Exception as e:
        logger.error(f"❌ Error fetching patient prescriptions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/doctor-prescription/send-to-patient")
async def send_prescription_to_patient(
    request: dict,
    mongodb: AsyncIOMotorDatabase = Depends(get_mongodb)
):
    """
    Mark prescription as sent to patient and notify them
    """
    try:
        prescription_id = request.get("prescription_id")
        patient_id = request.get("patient_id")

        if not prescription_id or not patient_id:
            raise HTTPException(status_code=400, detail="prescription_id and patient_id are required")

        # Convert string ID to ObjectId
        try:
            object_id = ObjectId(prescription_id)
        except Exception as e:
            logger.error(f"❌ Invalid prescription_id format: {prescription_id}")
            raise HTTPException(status_code=400, detail="Invalid prescription_id format")

        # Update prescription to mark as sent to patient
        collection = mongodb.get_collection("doctor_prescriptions")
        result = await collection.update_one(
            {"_id": object_id},
            {
                "$set": {
                    "sent_to_patient": True,
                    "sent_at": datetime.utcnow()
                }
            }
        )

        if result.modified_count == 0:
            logger.warning(f"⚠️ Prescription {prescription_id} not found or already sent")
            raise HTTPException(status_code=404, detail="Prescription not found or already sent to patient")

        logger.info(f"✅ Prescription {prescription_id} sent to patient {patient_id}")

        return {
            "success": True,
            "message": "Prescription sent to patient successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error sending prescription to patient: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

