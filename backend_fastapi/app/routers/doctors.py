"""Doctors Routes"""
from fastapi import APIRouter, Depends, HTTPException, status
import logging

from ..config.database import get_db

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])
logger = logging.getLogger(__name__)


def _ensure_doctor_profile_columns(conn):
    """Add profile columns to doctors table if they don't exist (idempotent)."""
    cursor = conn.cursor()
    alter_stmts = [
        "ALTER TABLE doctors ADD COLUMN profile_photo LONGTEXT NULL",
        "ALTER TABLE doctors ADD COLUMN education VARCHAR(500) NULL",
        "ALTER TABLE doctors ADD COLUMN specialization VARCHAR(500) NULL",
        "ALTER TABLE doctors ADD COLUMN country_of_specialization VARCHAR(200) NULL",
        "ALTER TABLE doctors ADD COLUMN experience VARCHAR(100) NULL",
        "ALTER TABLE doctors ADD COLUMN workplace VARCHAR(255) NULL",
        "ALTER TABLE doctors ADD COLUMN city_name VARCHAR(100) NULL",
        "ALTER TABLE doctors ADD COLUMN availability_time VARCHAR(200) NULL",
    ]
    for sql in alter_stmts:
        try:
            cursor.execute(sql)
            conn.commit()
        except Exception:
            pass  # Column already exists
    cursor.close()


@router.get("/list")
async def get_doctors_list(conn=Depends(get_db)):
    """Get list of all verified doctors with profile info."""
    try:
        _ensure_doctor_profile_columns(conn)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id,
                   full_name                  AS fullName,
                   pmdc_number                AS pmdcNumber,
                   profile_photo              AS profilePhoto,
                   education,
                   specialization,
                   country_of_specialization  AS countryOfSpecialization,
                   experience,
                   workplace,
                   city_name                  AS city,
                   availability_time          AS availabilityTime
            FROM doctors
            WHERE is_verified = 1
            ORDER BY full_name ASC
        """)
        doctors = cursor.fetchall()
        return {"success": True, "doctors": doctors}
    except Exception as e:
        logger.error(f"Error fetching doctors list: {e}")
        raise HTTPException(status_code=500, detail="Error fetching doctors list")
    finally:
        cursor.close()


@router.get("/{doctor_id}/profile")
async def get_doctor_profile(doctor_id: int, conn=Depends(get_db)):
    """Get full profile for a specific doctor."""
    try:
        _ensure_doctor_profile_columns(conn)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id,
                   full_name                  AS fullName,
                   pmdc_number                AS pmdcNumber,
                   profile_photo              AS profilePhoto,
                   education,
                   specialization,
                   country_of_specialization  AS countryOfSpecialization,
                   experience,
                   workplace,
                   city_name                  AS city,
                   availability_time          AS availabilityTime
            FROM doctors
            WHERE id = %s AND is_verified = 1
        """, (doctor_id,))
        doctor = cursor.fetchone()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
        return {"success": True, "doctor": doctor}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching doctor profile: {e}")
        raise HTTPException(status_code=500, detail="Error fetching doctor profile")
    finally:
        cursor.close()


@router.post("/{doctor_id}/profile")
async def save_doctor_profile(doctor_id: int, body: dict, conn=Depends(get_db)):
    """Save doctor profile fields including specialization and country."""
    try:
        _ensure_doctor_profile_columns(conn)
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM doctors WHERE id = %s AND is_verified = 1", (doctor_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Doctor not found")

        field_map = {
            "profilePhoto":            "profile_photo",
            "education":               "education",
            "specialization":          "specialization",
            "countryOfSpecialization": "country_of_specialization",
            "experience":              "experience",
            "workplace":               "workplace",
            "city":                    "city_name",
            "availability_time":       "availability_time",
        }
        updates = {col: body[key] for key, col in field_map.items() if key in body}

        if not updates:
            return {"success": True, "message": "Nothing to update"}

        set_clause = ", ".join(f"{col} = %s" for col in updates)
        values = list(updates.values()) + [doctor_id]
        cursor.execute(f"UPDATE doctors SET {set_clause} WHERE id = %s", values)
        conn.commit()

        return {"success": True, "message": "Profile saved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving doctor profile: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Error saving doctor profile")
    finally:
        cursor.close()
