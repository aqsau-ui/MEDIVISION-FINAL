"""Patient Authentication Routes"""
from fastapi import APIRouter, Depends, HTTPException, status
from mysql.connector import Error as MySQLError
import bcrypt
import logging
import httpx

from ..models.schemas import (
    PatientRegisterRequest, PatientLoginRequest,
    VerifyOTPRequest, ResendOTPRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    SuccessResponse, LoginResponse, OTPResponse
)
from ..config.database import get_db
from ..utils.otp_generator import create_otp, validate_otp, check_resend_cooldown
from ..services.email_service import email_service
from ..config.settings import settings

router = APIRouter(prefix="/api/auth", tags=["Patient Authentication"])
logger = logging.getLogger(__name__)

MAX_OTP_ATTEMPTS = 3


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=OTPResponse)
async def register(request: PatientRegisterRequest, conn=Depends(get_db)):
    try:
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM users WHERE email = %s", (request.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered. Please login instead.")

        hashed_password = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode()
        otp_data = create_otp(5)

        cursor.execute("DELETE FROM pending_users WHERE email = %s", (request.email,))
        cursor.execute(
            """INSERT INTO pending_users
               (full_name, email, password, country, city,
                otp, otp_expires_at, otp_created_at, verification_attempts, created_at)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,0,NOW())""",
            (request.full_name, request.email, hashed_password,
             request.country, request.city,
             otp_data["otp"], otp_data["expires_at"], otp_data["created_at"])
        )
        conn.commit()

        email_result = await email_service.send_verification_email(
            request.email, otp_data["otp"], request.full_name
        )
        if not email_result["success"]:
            logger.error(f"Email send failed: {email_result['message']}")
            cursor.execute("DELETE FROM pending_users WHERE email = %s", (request.email,))
            conn.commit()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send verification email: {email_result['message']}. Please check your email address and try again."
            )

        return {
            "success": True,
            "message": "Registration successful! Please check your email for the 6-digit verification code.",
            "email": request.email
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Registration error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")
    finally:
        cursor.close()


# ── Verify OTP ────────────────────────────────────────────────────────────────

@router.post("/verify-otp", response_model=LoginResponse)
async def verify_otp(request: VerifyOTPRequest, conn=Depends(get_db)):
    try:
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """SELECT id, full_name, email, password, country, city,
                      otp, otp_expires_at, verification_attempts, cnic_number
               FROM pending_users WHERE email = %s""",
            (request.email,)
        )
        pending = cursor.fetchone()

        if not pending:
            raise HTTPException(status_code=404, detail="Registration not found. Please register again.")
        if not pending["otp"]:
            raise HTTPException(status_code=400, detail="No OTP found. Please request a new one.")

        # Max-attempts guard
        attempts = pending["verification_attempts"] or 0
        if attempts >= MAX_OTP_ATTEMPTS:
            cursor.execute("DELETE FROM pending_users WHERE email = %s", (request.email,))
            conn.commit()
            raise HTTPException(
                status_code=400,
                detail="Maximum OTP attempts exceeded. Please register again to get a new code."
            )

        # Validate OTP
        result = validate_otp(request.otp, pending["otp"], pending["otp_expires_at"])
        if not result["success"]:
            attempts += 1
            cursor.execute(
                "UPDATE pending_users SET verification_attempts = %s WHERE id = %s",
                (attempts, pending["id"])
            )
            conn.commit()
            remaining = MAX_OTP_ATTEMPTS - attempts
            if remaining <= 0:
                cursor.execute("DELETE FROM pending_users WHERE email = %s", (request.email,))
                conn.commit()
                raise HTTPException(status_code=400, detail="Incorrect OTP. Maximum attempts reached. Please register again.")
            raise HTTPException(
                status_code=400,
                detail=f"Incorrect OTP. {remaining} attempt{'s' if remaining != 1 else ''} remaining."
            )

        # Move to users table
        safe_dob = "1970-01-01"
        cnic = pending.get("cnic_number")
        if cnic:
            cursor.execute(
                """INSERT INTO users
                   (full_name, email, cnic_number, password, phone, date_of_birth, country, city, is_verified, created_at)
                   VALUES (%s,%s,%s,%s,'',  %s,    %s,      %s,    TRUE,          NOW())""",
                (pending["full_name"], pending["email"], cnic, pending["password"], safe_dob, pending["country"], pending["city"])
            )
        else:
            cursor.execute(
                """INSERT INTO users
                   (full_name, email, password, phone, date_of_birth, country, city, is_verified, created_at)
                   VALUES (%s,%s,%s,'',  %s,           %s,      %s,   TRUE,    NOW())""",
                (pending["full_name"], pending["email"], pending["password"], safe_dob, pending["country"], pending["city"])
            )
        user_id = cursor.lastrowid
        cursor.execute("DELETE FROM pending_users WHERE id = %s", (pending["id"],))
        conn.commit()

        # Send welcome email
        await email_service.send_welcome_email(pending["email"], pending["full_name"], is_doctor=False)

        return {
            "success": True,
            "message": "Email verified successfully! Welcome to MEDIVISION.",
            "user": {"id": user_id, "fullName": pending["full_name"], "email": pending["email"]}
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"OTP verification error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")
    finally:
        cursor.close()


# ── Resend OTP ────────────────────────────────────────────────────────────────

@router.post("/resend-otp", response_model=SuccessResponse)
async def resend_otp(request: ResendOTPRequest, conn=Depends(get_db)):
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, full_name, email, otp_created_at FROM pending_users WHERE email = %s",
            (request.email,)
        )
        pending = cursor.fetchone()
        if not pending:
            raise HTTPException(status_code=404, detail="Registration not found. Please register again.")

        if pending["otp_created_at"]:
            cooldown = check_resend_cooldown(pending["otp_created_at"], 30)
            if not cooldown["can_resend"]:
                raise HTTPException(status_code=429, detail=cooldown["message"])

        otp_data = create_otp(5)
        cursor.execute(
            """UPDATE pending_users
               SET otp=%s, otp_expires_at=%s, otp_created_at=%s, verification_attempts=0
               WHERE id=%s""",
            (otp_data["otp"], otp_data["expires_at"], otp_data["created_at"], pending["id"])
        )
        conn.commit()

        email_result = await email_service.send_verification_email(request.email, otp_data["otp"], pending["full_name"])
        if not email_result["success"]:
            raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again.")

        return {"success": True, "message": "New verification code sent to your email."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend OTP error: {e}")
        raise HTTPException(status_code=500, detail="Failed to resend code. Please try again.")
    finally:
        cursor.close()


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
async def login(request: PatientLoginRequest, conn=Depends(get_db)):
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, full_name, email, password, is_verified FROM users WHERE email = %s",
            (request.email,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        if not user["is_verified"]:
            raise HTTPException(status_code=403, detail="Please verify your email before logging in.")
        if not bcrypt.checkpw(request.password.encode(), user["password"].encode()):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        cursor.execute("UPDATE users SET last_login=NOW() WHERE id=%s", (user["id"],))
        conn.commit()
        return {
            "success": True,
            "message": "Login successful",
            "user": {"id": user["id"], "fullName": user["full_name"], "email": user["email"]}
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")
    finally:
        cursor.close()


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.post("/google-login")
async def google_login(body: dict, conn=Depends(get_db)):
    """Verify Google ID token, create/find user, return session data."""
    token = body.get("credential") or body.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Google token required.")

    # Verify token with Google
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}")
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token.")
        info = resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google token verify error: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify Google token.")

    # Check audience matches our client ID
    client_id = settings.GOOGLE_CLIENT_ID
    if client_id and client_id != "your-google-client-id-here":
        if info.get("aud") != client_id:
            raise HTTPException(status_code=401, detail="Token audience mismatch.")

    email     = info.get("email")
    full_name = info.get("name") or info.get("email", "").split("@")[0]
    if not email:
        raise HTTPException(status_code=400, detail="Could not get email from Google account.")

    try:
        cursor = conn.cursor(dictionary=True)

        # Find or create user
        cursor.execute("SELECT id, full_name, email FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()

        if not user:
            cursor.execute(
                """INSERT INTO users
                   (full_name, email, password, phone, date_of_birth, country, city, is_verified, created_at)
                   VALUES (%s,%s,'google_oauth','','1970-01-01','','',TRUE,NOW())""",
                (full_name, email)
            )
            conn.commit()
            user_id = cursor.lastrowid
            # Send welcome email for new Google users
            await email_service.send_welcome_email(email, full_name, is_doctor=False)
        else:
            user_id = user["id"]
            full_name = user["full_name"]

        cursor.execute("UPDATE users SET last_login=NOW() WHERE id=%s", (user_id,))
        conn.commit()

        return {
            "success": True,
            "message": "Google login successful",
            "user": {"id": user_id, "fullName": full_name, "email": email}
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Google login DB error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")
    finally:
        cursor.close()


# ── Forgot Password ───────────────────────────────────────────────────────────

@router.post("/forgot-password", response_model=OTPResponse)
async def forgot_password(request: ForgotPasswordRequest, conn=Depends(get_db)):
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, full_name, email FROM users WHERE email=%s AND is_verified=TRUE",
            (request.email,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="No account found with this email address.")

        otp_data = create_otp(5)  # 5 minutes
        cursor.execute(
            "UPDATE users SET otp=%s, otp_expires_at=%s, otp_created_at=%s, otp_attempts=0 WHERE id=%s",
            (otp_data["otp"], otp_data["expires_at"], otp_data["created_at"], user["id"])
        )
        conn.commit()

        email_result = await email_service.send_password_reset_email(request.email, otp_data["otp"], user["full_name"])
        if not email_result["success"]:
            raise HTTPException(status_code=500, detail="Failed to send reset email. Please try again.")

        return {"success": True, "message": "Password reset code sent to your email.", "email": request.email}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process request. Please try again.")
    finally:
        cursor.close()


# ── Verify Reset OTP ──────────────────────────────────────────────────────────

@router.post("/verify-reset-otp", response_model=SuccessResponse)
async def verify_reset_otp(request: VerifyOTPRequest, conn=Depends(get_db)):
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, email, otp, otp_expires_at, otp_attempts FROM users WHERE email=%s AND is_verified=TRUE",
            (request.email,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        if not user["otp"]:
            raise HTTPException(status_code=400, detail="No OTP found. Please request a new one.")

        attempts = user.get("otp_attempts") or 0
        if attempts >= MAX_OTP_ATTEMPTS:
            cursor.execute("UPDATE users SET otp=NULL,otp_expires_at=NULL WHERE id=%s", (user["id"],))
            conn.commit()
            raise HTTPException(status_code=400, detail="Maximum attempts exceeded. Please request a new code.")

        result = validate_otp(request.otp, user["otp"], user["otp_expires_at"])
        if not result["success"]:
            attempts += 1
            cursor.execute("UPDATE users SET otp_attempts=%s WHERE id=%s", (attempts, user["id"]))
            conn.commit()
            remaining = MAX_OTP_ATTEMPTS - attempts
            if remaining <= 0:
                cursor.execute("UPDATE users SET otp=NULL,otp_expires_at=NULL WHERE id=%s", (user["id"],))
                conn.commit()
                raise HTTPException(status_code=400, detail="Incorrect OTP. Maximum attempts reached.")
            raise HTTPException(status_code=400, detail=f"Incorrect OTP. {remaining} attempt{'s' if remaining!=1 else ''} remaining.")

        return {"success": True, "message": "OTP verified. You can now reset your password."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify reset OTP error: {e}")
        raise HTTPException(status_code=500, detail="Verification failed. Please try again.")
    finally:
        cursor.close()


# ── Reset Password ────────────────────────────────────────────────────────────

@router.post("/reset-password", response_model=SuccessResponse)
async def reset_password(request: ResetPasswordRequest, conn=Depends(get_db)):
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, otp, otp_expires_at FROM users WHERE email=%s AND is_verified=TRUE",
            (request.email,)
        )
        user = cursor.fetchone()
        if not user or not user["otp"]:
            raise HTTPException(status_code=400, detail="Invalid request. Please start the reset process again.")

        result = validate_otp(request.otp, user["otp"], user["otp_expires_at"])
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])

        hashed = bcrypt.hashpw(request.new_password.encode(), bcrypt.gensalt()).decode()
        cursor.execute(
            "UPDATE users SET password=%s, otp=NULL, otp_expires_at=NULL, otp_created_at=NULL, otp_attempts=0 WHERE id=%s",
            (hashed, user["id"])
        )
        conn.commit()
        return {"success": True, "message": "Password reset successful. You can now login."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Reset password error: {e}")
        raise HTTPException(status_code=500, detail="Password reset failed.")
    finally:
        cursor.close()


# ── Resend Reset OTP ──────────────────────────────────────────────────────────

@router.post("/resend-reset-otp", response_model=SuccessResponse)
async def resend_reset_otp(request: ResendOTPRequest, conn=Depends(get_db)):
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, full_name, email, otp_created_at FROM users WHERE email=%s AND is_verified=TRUE",
            (request.email,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        if user["otp_created_at"]:
            cooldown = check_resend_cooldown(user["otp_created_at"], 30)
            if not cooldown["can_resend"]:
                raise HTTPException(status_code=429, detail=cooldown["message"])

        otp_data = create_otp(5)
        cursor.execute(
            "UPDATE users SET otp=%s, otp_expires_at=%s, otp_created_at=%s, otp_attempts=0 WHERE id=%s",
            (otp_data["otp"], otp_data["expires_at"], otp_data["created_at"], user["id"])
        )
        conn.commit()

        email_result = await email_service.send_password_reset_email(request.email, otp_data["otp"], user["full_name"])
        if not email_result["success"]:
            raise HTTPException(status_code=500, detail="Failed to send reset email.")

        return {"success": True, "message": "New reset code sent to your email."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend reset OTP error: {e}")
        raise HTTPException(status_code=500, detail="Failed to resend code.")
    finally:
        cursor.close()
