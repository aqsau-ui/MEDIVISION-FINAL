"""Doctor Authentication Routes"""
from fastapi import APIRouter, Depends, HTTPException, status
import bcrypt
import logging
import re

from ..models.schemas import (
    DoctorRegisterRequest,
    DoctorLoginRequest,
    ValidatePMDCRequest,
    VerifyOTPRequest,
    ResendOTPRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    SuccessResponse,
    LoginResponse,
    OTPResponse
)
from ..config.database import get_db
from ..utils.otp_generator import create_otp, validate_otp, check_resend_cooldown
from ..services.email_service import email_service
from ..services.pmdc_verification import verify_pmdc_number

router = APIRouter(prefix="/api/auth", tags=["Doctor Authentication"])
logger = logging.getLogger(__name__)

@router.post("/validate-pmdc", response_model=SuccessResponse)
async def validate_pmdc(request: ValidatePMDCRequest, conn=Depends(get_db)):
    """Validate PMDC number from Pakistan Medical Commission"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Check if PMDC number already registered
        cursor.execute(
            "SELECT id FROM doctors WHERE pmdc_number = %s",
            (request.pmdc_number,)
        )
        if cursor.fetchone():
            return {
                "success": False,
                "message": "This PMDC number is already registered in our system.",
                "data": {"isValid": False}
            }
        
        # Simple format validation
        norm_pmdc = str(request.pmdc_number).upper().strip()
        if not re.match(r'^\d{4,7}(-\d{2})?-[A-Z]+$', norm_pmdc, re.I):
            return {
                "success": False,
                "message": "Invalid PMDC format. Expected format: XXXXX-Y (e.g., 66728-P)",
                "data": {"isValid": False}
            }
        
        logger.info(f"PMDC validation: {request.pmdc_number} for {request.full_name}")
        verification = await verify_pmdc_number(request.pmdc_number, request.full_name)

        return {
            "success": verification["isValid"],
            "message": verification["message"],
            "data": {
                "isValid": verification["isValid"],
                "doctorName": verification.get("doctorName")
            }
        }
    
    except Exception as e:
        logger.error(f"PMDC validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PMDC validation service error. Please try again in a moment."
        )
    finally:
        cursor.close()

@router.post("/doctor-register", response_model=OTPResponse)
async def doctor_register(request: DoctorRegisterRequest, conn=Depends(get_db)):
    """Register a new doctor account"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        logger.info(f"Doctor registration request received for: {request.email}")
        
        # Verify PMDC number - with development mode bypass
        logger.info("Verifying PMDC for registration")
        
        # Simple format validation first
        norm_pmdc = str(request.pmdc_number).upper().strip()
        if not re.match(r'^\d{4,7}(-\d{2})?-[A-Z]+$', norm_pmdc, re.I):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid PMDC format. Expected format: XXXXX-Y (e.g., 66728-P)"
            )
        
        # Verify against pmdc.pk — registration is blocked if invalid
        verification = await verify_pmdc_number(request.pmdc_number, request.full_name)
        if not verification["isValid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=verification["message"]
            )
        logger.info(f"✓ PMDC verified: {verification.get('doctorName', request.full_name)}")
        
        # Check if doctor already exists
        logger.info("Checking if email or PMDC already registered...")
        cursor.execute(
            "SELECT id FROM doctors WHERE email = %s OR pmdc_number = %s",
            (request.email, request.pmdc_number)
        )
        if cursor.fetchone():
            logger.warning("Email or PMDC already registered")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or PMDC number already registered"
            )
        logger.info("✓ Email and PMDC are available")
        
        # Hash password using bcrypt directly
        logger.info("Hashing password...")
        hashed_password = bcrypt.hashpw(request.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        logger.info("✓ Password hashed")
        
        # Generate OTP
        logger.info("Generating OTP...")
        otp_data = create_otp(5)
        logger.info(f"✓ OTP generated: {otp_data['otp']}")
        
        # Delete any existing pending registration
        logger.info("Cleaning up existing pending registrations...")
        cursor.execute(
            "DELETE FROM pending_doctors WHERE email = %s OR pmdc_number = %s",
            (request.email, request.pmdc_number)
        )
        logger.info("✓ Cleaned up")
        
        # Insert into pending_doctors
        logger.info("Inserting into pending_doctors table...")
        try:
            cursor.execute(
                """INSERT INTO pending_doctors 
                   (full_name, email, password, pmdc_number, cnic_number, 
                    otp, otp_expires_at, otp_created_at, verification_attempts, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, NOW())""",
                (request.full_name, request.email, hashed_password, request.pmdc_number,
                 request.cnic_number, otp_data["otp"], otp_data["expires_at"], otp_data["created_at"])
            )
            conn.commit()
            logger.info(f"✓ Pending doctor record created for {request.email}")
        except Exception as db_error:
            logger.error(f"❌ Database error: {db_error}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during registration: {str(db_error)}"
            )
        
        # Send verification email — fail registration if email cannot be delivered
        logger.info(f"Sending verification email to {request.email}…")
        email_result = await email_service.send_verification_email(
            request.email, otp_data["otp"], request.full_name
        )
        if not email_result["success"]:
            logger.error(f"❌ Email failed: {email_result.get('message')}")
            cursor.execute("DELETE FROM pending_doctors WHERE email = %s", (request.email,))
            conn.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send verification email: {email_result['message']}. Please check your email address and try again."
            )
        logger.info(f"✓ Verification email sent to {request.email}")

        return {
            "success": True,
            "message": "Registration successful. Please check your email for the verification code.",
            "email": request.email
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Doctor registration error: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )
    finally:
        cursor.close()

@router.post("/doctor-login", response_model=LoginResponse)
async def doctor_login(request: DoctorLoginRequest, conn=Depends(get_db)):
    """Login doctor"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Find doctor
        cursor.execute(
            "SELECT id, full_name, email, password, is_verified, pmdc_number FROM doctors WHERE email = %s",
            (request.email,)
        )
        doctor = cursor.fetchone()
        
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check verification
        if not doctor["is_verified"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email before logging in. Check your inbox for the verification code."
            )
        
        # Verify password using bcrypt directly
        if not bcrypt.checkpw(request.password.encode('utf-8'), doctor["password"].encode('utf-8')):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Update last login
        cursor.execute("UPDATE doctors SET last_login = NOW() WHERE id = %s", (doctor["id"],))
        conn.commit()
        
        return {
            "success": True,
            "message": "Login successful",
            "doctor": {
                "id": doctor["id"],
                "fullName": doctor["full_name"],
                "email": doctor["email"],
                "pmdcNumber": doctor["pmdc_number"]
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Doctor login error: {e}")
        logger.error(f"Full traceback:\n{error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )
    finally:
        cursor.close()

@router.post("/doctor-verify-otp", response_model=LoginResponse)
async def doctor_verify_otp(request: VerifyOTPRequest, conn=Depends(get_db)):
    """Verify doctor OTP and activate account"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Find pending doctor
        cursor.execute(
            """SELECT id, full_name, email, password, pmdc_number, cnic_number,
                      otp, otp_expires_at, verification_attempts
               FROM pending_doctors WHERE email = %s""",
            (request.email,)
        )
        pending_doctor = cursor.fetchone()
        
        if not pending_doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registration not found. Please register again."
            )
        
        if not pending_doctor["otp"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No OTP found. Please request a new one.")

        # Max-attempts guard
        MAX_ATTEMPTS = 3
        attempts = pending_doctor.get("verification_attempts") or 0
        if attempts >= MAX_ATTEMPTS:
            cursor.execute("DELETE FROM pending_doctors WHERE email = %s", (request.email,))
            conn.commit()
            raise HTTPException(status_code=400, detail="Maximum OTP attempts exceeded. Please register again.")

        # Validate OTP
        otp_result = validate_otp(request.otp, pending_doctor["otp"], pending_doctor["otp_expires_at"])
        if not otp_result["success"]:
            attempts += 1
            cursor.execute(
                "UPDATE pending_doctors SET verification_attempts = %s WHERE id = %s",
                (attempts, pending_doctor["id"])
            )
            conn.commit()
            remaining = MAX_ATTEMPTS - attempts
            if remaining <= 0:
                cursor.execute("DELETE FROM pending_doctors WHERE email = %s", (request.email,))
                conn.commit()
                raise HTTPException(status_code=400, detail="Incorrect OTP. Maximum attempts reached. Please register again.")
            raise HTTPException(
                status_code=400,
                detail=f"Incorrect OTP. {remaining} attempt{'s' if remaining != 1 else ''} remaining."
            )

        # Move doctor to main doctors table
        cnic = pending_doctor.get("cnic_number")
        if cnic:
            cursor.execute(
                """INSERT INTO doctors
                   (full_name, email, cnic_number, pmdc_number, password, phone, hospital_affiliation, is_verified, created_at)
                   VALUES (%s, %s, %s, %s, %s, '', '', TRUE, NOW())""",
                (pending_doctor["full_name"], pending_doctor["email"], cnic,
                 pending_doctor["pmdc_number"], pending_doctor["password"])
            )
        else:
            cursor.execute(
                """INSERT INTO doctors
                   (full_name, email, pmdc_number, password, phone, hospital_affiliation, is_verified, created_at)
                   VALUES (%s, %s, %s, %s, '', '', TRUE, NOW())""",
                (pending_doctor["full_name"], pending_doctor["email"],
                 pending_doctor["pmdc_number"], pending_doctor["password"])
            )
        doctor_id = cursor.lastrowid
        cursor.execute("DELETE FROM pending_doctors WHERE id = %s", (pending_doctor["id"],))
        conn.commit()

        # Send welcome email
        await email_service.send_welcome_email(pending_doctor["email"], pending_doctor["full_name"], is_doctor=True)

        return {
            "success": True,
            "message": "Email verified successfully! Welcome to MEDIVISION.",
            "doctor": {
                "id": doctor_id,
                "fullName": pending_doctor["full_name"],
                "email": pending_doctor["email"],
                "pmdcNumber": pending_doctor["pmdc_number"]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Doctor OTP verification error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")
    finally:
        cursor.close()

@router.post("/doctor-resend-otp", response_model=SuccessResponse)
async def doctor_resend_otp(request: ResendOTPRequest, conn=Depends(get_db)):
    """Resend doctor OTP"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT id, full_name, email, otp_created_at FROM pending_doctors WHERE email = %s",
            (request.email,)
        )
        pending_doctor = cursor.fetchone()
        
        if not pending_doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registration not found. Please register again."
            )
        
        # Check cooldown
        if pending_doctor["otp_created_at"]:
            cooldown = check_resend_cooldown(pending_doctor["otp_created_at"], 30)
            if not cooldown["can_resend"]:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=cooldown["message"]
                )
        
        # Generate new OTP
        otp_data = create_otp(5)
        
        cursor.execute(
            """UPDATE pending_doctors 
               SET otp = %s, otp_expires_at = %s, otp_created_at = %s 
               WHERE id = %s""",
            (otp_data["otp"], otp_data["expires_at"], otp_data["created_at"], pending_doctor["id"])
        )
        conn.commit()
        
        email_result = await email_service.send_verification_email(
            request.email, otp_data["otp"], pending_doctor["full_name"]
        )
        
        if not email_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification email. Please try again."
            )
        
        return {
            "success": True,
            "message": "Verification code sent successfully. Please check your email."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Doctor resend OTP error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification code. Please try again."
        )
    finally:
        cursor.close()

# Password reset endpoints for doctors (similar to patients)
@router.post("/doctor-forgot-password", response_model=OTPResponse)
async def doctor_forgot_password(request: ForgotPasswordRequest, conn=Depends(get_db)):
    """Request doctor password reset OTP"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT id, full_name, email FROM doctors WHERE email = %s AND is_verified = TRUE",
            (request.email,)
        )
        doctor = cursor.fetchone()
        
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email address."
            )
        
        otp_data = create_otp(10)
        
        cursor.execute(
            """UPDATE doctors 
               SET otp = %s, otp_expires_at = %s, otp_created_at = %s 
               WHERE id = %s""",
            (otp_data["otp"], otp_data["expires_at"], otp_data["created_at"], doctor["id"])
        )
        conn.commit()
        
        email_result = await email_service.send_password_reset_email(
            request.email, otp_data["otp"], doctor["full_name"]
        )
        
        if not email_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send password reset email. Please try again."
            )
        
        return {
            "success": True,
            "message": "Password reset code sent to your email.",
            "email": request.email
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Doctor forgot password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process request. Please try again."
        )
    finally:
        cursor.close()

@router.post("/doctor-verify-reset-otp", response_model=SuccessResponse)
async def doctor_verify_reset_otp(request: VerifyOTPRequest, conn=Depends(get_db)):
    """Verify doctor password reset OTP"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT id, email, otp, otp_expires_at FROM doctors WHERE email = %s AND is_verified = TRUE",
            (request.email,)
        )
        doctor = cursor.fetchone()
        
        if not doctor or not doctor["otp"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP found. Please request a new one."
            )
        
        otp_validation = validate_otp(request.otp, doctor["otp"], doctor["otp_expires_at"])
        
        if not otp_validation["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=otp_validation["message"]
            )
        
        return {
            "success": True,
            "message": "OTP verified. You can now reset your password."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Doctor verify reset OTP error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Verification failed. Please try again."
        )
    finally:
        cursor.close()

@router.post("/doctor-reset-password", response_model=SuccessResponse)
async def doctor_reset_password(request: ResetPasswordRequest, conn=Depends(get_db)):
    """Reset doctor password with OTP"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT id, email, otp, otp_expires_at FROM doctors WHERE email = %s AND is_verified = TRUE",
            (request.email,)
        )
        doctor = cursor.fetchone()
        
        if not doctor or not doctor["otp"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP found. Please request a new one."
            )
        
        otp_validation = validate_otp(request.otp, doctor["otp"], doctor["otp_expires_at"])
        
        if not otp_validation["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=otp_validation["message"]
            )
        
        hashed_password = bcrypt.hashpw(request.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cursor.execute(
            """UPDATE doctors 
               SET password = %s, otp = NULL, otp_expires_at = NULL, otp_created_at = NULL 
               WHERE id = %s""",
            (hashed_password, doctor["id"])
        )
        conn.commit()
        
        return {
            "success": True,
            "message": "Password reset successful. You can now login with your new password."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Doctor reset password error: {e}")
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed. Please try again."
        )
    finally:
        cursor.close()

@router.post("/doctor-resend-reset-otp", response_model=SuccessResponse)
async def doctor_resend_reset_otp(request: ResendOTPRequest, conn=Depends(get_db)):
    """Resend doctor password reset OTP"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT id, full_name, email, otp_created_at FROM doctors WHERE email = %s AND is_verified = TRUE",
            (request.email,)
        )
        doctor = cursor.fetchone()
        
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )
        
        if doctor["otp_created_at"]:
            cooldown = check_resend_cooldown(doctor["otp_created_at"], 30)
            if not cooldown["can_resend"]:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=cooldown["message"]
                )
        
        otp_data = create_otp(10)
        
        cursor.execute(
            """UPDATE doctors 
               SET otp = %s, otp_expires_at = %s, otp_created_at = %s 
               WHERE id = %s""",
            (otp_data["otp"], otp_data["expires_at"], otp_data["created_at"], doctor["id"])
        )
        conn.commit()
        
        email_result = await email_service.send_password_reset_email(
            request.email, otp_data["otp"], doctor["full_name"]
        )
        
        if not email_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send password reset email. Please try again."
            )
        
        return {
            "success": True,
            "message": "Password reset code sent successfully. Please check your email."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Doctor resend reset OTP error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend reset code. Please try again."
        )
    finally:
        cursor.close()
