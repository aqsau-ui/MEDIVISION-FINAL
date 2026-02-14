"""Patient Authentication Routes"""
from fastapi import APIRouter, Depends, HTTPException, status
from mysql.connector import Error as MySQLError
import bcrypt
import logging

from ..models.schemas import (
    PatientRegisterRequest,
    PatientLoginRequest,
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

router = APIRouter(prefix="/api/auth", tags=["Patient Authentication"])
logger = logging.getLogger(__name__)

@router.post("/register", response_model=OTPResponse)
async def register(request: PatientRegisterRequest, conn=Depends(get_db)):
    """Register a new patient account"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (request.email,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password using bcrypt directly
        hashed_password = bcrypt.hashpw(request.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Generate OTP
        otp_data = create_otp(5)
        
        # Delete any existing pending registration
        cursor.execute("DELETE FROM pending_users WHERE email = %s", (request.email,))
        
        # Insert into pending_users
        cursor.execute(
            """INSERT INTO pending_users 
               (full_name, email, password, gender, city, otp, otp_expires_at, otp_created_at, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())""",
            (request.full_name, request.email, hashed_password, request.gender,
             request.city, otp_data["otp"], otp_data["expires_at"], otp_data["created_at"])
        )
        conn.commit()
        
        # Send verification email
        email_result = await email_service.send_verification_email(
            request.email, otp_data["otp"], request.full_name
        )
        
        if not email_result["success"]:
            logger.error(f"Failed to send verification email: {email_result['message']}")
        
        return {
            "success": True,
            "message": "Registration successful. Please check your email for the verification code.",
            "email": request.email
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again."
        )
    finally:
        cursor.close()

@router.post("/login", response_model=LoginResponse)
async def login(request: PatientLoginRequest, conn=Depends(get_db)):
    """Login patient"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Find user
        cursor.execute(
            "SELECT id, full_name, email, password, is_verified FROM users WHERE email = %s",
            (request.email,)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check verification
        if not user["is_verified"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email before logging in. Check your inbox for the verification code."
            )
        
        # Verify password using bcrypt directly
        if not bcrypt.checkpw(request.password.encode('utf-8'), user["password"].encode('utf-8')):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Update last login
        cursor.execute("UPDATE users SET last_login = NOW() WHERE id = %s", (user["id"],))
        conn.commit()
        
        return {
            "success": True,
            "message": "Login successful",
            "user": {
                "id": user["id"],
                "fullName": user["full_name"],
                "email": user["email"]
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again."
        )
    finally:
        cursor.close()

@router.post("/verify-otp", response_model=LoginResponse)
async def verify_otp(request: VerifyOTPRequest, conn=Depends(get_db)):
    """Verify OTP and activate account"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Find pending user
        cursor.execute(
            """SELECT id, full_name, email, password, gender, city, 
                      otp, otp_expires_at, verification_attempts, cnic_number
               FROM pending_users WHERE email = %s""",
            (request.email,)
        )
        pending_user = cursor.fetchone()
        
        if not pending_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registration not found. Please register again."
            )
        
        if not pending_user["otp"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP found. Please request a new one."
            )
        
        # Validate OTP
        otp_validation = validate_otp(
            request.otp,
            pending_user["otp"],
            pending_user["otp_expires_at"]
        )
        
        if not otp_validation["success"]:
            # Increment verification attempts
            cursor.execute(
                "UPDATE pending_users SET verification_attempts = verification_attempts + 1 WHERE id = %s",
                (pending_user["id"],)
            )
            conn.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=otp_validation["message"]
            )
        
        # Move user to main users table
        safe_dob = pending_user.get("date_of_birth") or "1970-01-01"
        cnic = pending_user.get("cnic_number")
        
        if cnic:
            cursor.execute(
                """INSERT INTO users 
                   (full_name, email, cnic_number, password, phone, date_of_birth, 
                    gender, city, is_verified, created_at)
                   VALUES (%s, %s, %s, %s, '', %s, %s, %s, TRUE, NOW())""",
                (pending_user["full_name"], pending_user["email"], cnic,
                 pending_user["password"], safe_dob, pending_user["gender"],
                 pending_user["city"])
            )
        else:
            cursor.execute(
                """INSERT INTO users 
                   (full_name, email, password, phone, date_of_birth, 
                    gender, city, is_verified, created_at)
                   VALUES (%s, %s, %s, '', %s, %s, %s, TRUE, NOW())""",
                (pending_user["full_name"], pending_user["email"],
                 pending_user["password"], safe_dob, pending_user["gender"],
                 pending_user["city"])
            )
        
        user_id = cursor.lastrowid
        
        # Delete from pending_users
        cursor.execute("DELETE FROM pending_users WHERE id = %s", (pending_user["id"],))
        conn.commit()
        
        # Send welcome email
        await email_service.send_welcome_email(request.email, pending_user["full_name"])
        
        return {
            "success": True,
            "message": "Email verified successfully! You can now login.",
            "user": {
                "id": user_id,
                "fullName": pending_user["full_name"],
                "email": pending_user["email"]
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP verification error: {e}")
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Verification failed. Please try again."
        )
    finally:
        cursor.close()

@router.post("/resend-otp", response_model=SuccessResponse)
async def resend_otp(request: ResendOTPRequest, conn=Depends(get_db)):
    """Resend OTP to user email"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Find pending user
        cursor.execute(
            "SELECT id, full_name, email, otp_created_at FROM pending_users WHERE email = %s",
            (request.email,)
        )
        pending_user = cursor.fetchone()
        
        if not pending_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registration not found. Please register again."
            )
        
        # Check cooldown
        if pending_user["otp_created_at"]:
            cooldown = check_resend_cooldown(pending_user["otp_created_at"], 30)
            if not cooldown["can_resend"]:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=cooldown["message"]
                )
        
        # Generate new OTP
        otp_data = create_otp(5)
        
        # Update OTP
        cursor.execute(
            """UPDATE pending_users 
               SET otp = %s, otp_expires_at = %s, otp_created_at = %s 
               WHERE id = %s""",
            (otp_data["otp"], otp_data["expires_at"], otp_data["created_at"], pending_user["id"])
        )
        conn.commit()
        
        # Send verification email
        email_result = await email_service.send_verification_email(
            request.email, otp_data["otp"], pending_user["full_name"]
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
        logger.error(f"Resend OTP error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification code. Please try again."
        )
    finally:
        cursor.close()

@router.post("/forgot-password", response_model=OTPResponse)
async def forgot_password(request: ForgotPasswordRequest, conn=Depends(get_db)):
    """Request password reset OTP"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Find verified user
        cursor.execute(
            "SELECT id, full_name, email FROM users WHERE email = %s AND is_verified = TRUE",
            (request.email,)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email address."
            )
        
        # Generate OTP
        otp_data = create_otp(10)  # 10 minutes for password reset
        
        # Update user with OTP
        cursor.execute(
            """UPDATE users 
               SET otp = %s, otp_expires_at = %s, otp_created_at = %s 
               WHERE id = %s""",
            (otp_data["otp"], otp_data["expires_at"], otp_data["created_at"], user["id"])
        )
        conn.commit()
        
        # Send password reset email
        email_result = await email_service.send_password_reset_email(
            request.email, otp_data["otp"], user["full_name"]
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
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process request. Please try again."
        )
    finally:
        cursor.close()

@router.post("/verify-reset-otp", response_model=SuccessResponse)
async def verify_reset_otp(request: VerifyOTPRequest, conn=Depends(get_db)):
    """Verify password reset OTP"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Find user
        cursor.execute(
            "SELECT id, email, otp, otp_expires_at FROM users WHERE email = %s AND is_verified = TRUE",
            (request.email,)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )
        
        if not user["otp"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP found. Please request a new one."
            )
        
        # Validate OTP
        otp_validation = validate_otp(request.otp, user["otp"], user["otp_expires_at"])
        
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
        logger.error(f"Verify reset OTP error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Verification failed. Please try again."
        )
    finally:
        cursor.close()

@router.post("/reset-password", response_model=SuccessResponse)
async def reset_password(request: ResetPasswordRequest, conn=Depends(get_db)):
    """Reset password with OTP"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Find user
        cursor.execute(
            "SELECT id, email, otp, otp_expires_at FROM users WHERE email = %s AND is_verified = TRUE",
            (request.email,)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )
        
        if not user["otp"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP found. Please request a new one."
            )
        
        # Validate OTP
        otp_validation = validate_otp(request.otp, user["otp"], user["otp_expires_at"])
        
        if not otp_validation["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=otp_validation["message"]
            )
        
        # Hash new password using bcrypt directly
        hashed_password = bcrypt.hashpw(request.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Update password and clear OTP
        cursor.execute(
            """UPDATE users 
               SET password = %s, otp = NULL, otp_expires_at = NULL, otp_created_at = NULL 
               WHERE id = %s""",
            (hashed_password, user["id"])
        )
        conn.commit()
        
        return {
            "success": True,
            "message": "Password reset successful. You can now login with your new password."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed. Please try again."
        )
    finally:
        cursor.close()

@router.post("/resend-reset-otp", response_model=SuccessResponse)
async def resend_reset_otp(request: ResendOTPRequest, conn=Depends(get_db)):
    """Resend password reset OTP"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Find user
        cursor.execute(
            "SELECT id, full_name, email, otp_created_at FROM users WHERE email = %s AND is_verified = TRUE",
            (request.email,)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )
        
        # Check cooldown
        if user["otp_created_at"]:
            cooldown = check_resend_cooldown(user["otp_created_at"], 30)
            if not cooldown["can_resend"]:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=cooldown["message"]
                )
        
        # Generate new OTP
        otp_data = create_otp(10)
        
        # Update OTP
        cursor.execute(
            """UPDATE users 
               SET otp = %s, otp_expires_at = %s, otp_created_at = %s 
               WHERE id = %s""",
            (otp_data["otp"], otp_data["expires_at"], otp_data["created_at"], user["id"])
        )
        conn.commit()
        
        # Send password reset email
        email_result = await email_service.send_password_reset_email(
            request.email, otp_data["otp"], user["full_name"]
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
        logger.error(f"Resend reset OTP error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend reset code. Please try again."
        )
    finally:
        cursor.close()
