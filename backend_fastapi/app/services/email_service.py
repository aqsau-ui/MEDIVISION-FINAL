"""Email Service — Gmail SMTP"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging
from ..config.settings import settings

logger = logging.getLogger(__name__)

_TEAL  = "#2C7A7B"
_LIGHT = "#38B2AC"


def _base_html(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{{margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;color:#1a202c}}
    .wrap{{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}}
    .hdr{{background:linear-gradient(135deg,{_TEAL} 0%,{_LIGHT} 100%);padding:32px 40px;text-align:center}}
    .hdr h1{{margin:0;color:#fff;font-size:28px;letter-spacing:1px}}
    .hdr p{{margin:6px 0 0;color:rgba(255,255,255,.85);font-size:14px}}
    .body{{padding:36px 40px}}
    .body p{{line-height:1.7;color:#2d3748;margin:0 0 14px}}
    .otp-box{{background:linear-gradient(135deg,{_TEAL},{_LIGHT});color:#fff;font-size:36px;font-weight:700;
              letter-spacing:12px;text-align:center;padding:22px;border-radius:10px;margin:28px 0}}
    .info-box{{background:#e6fffa;border-left:4px solid {_LIGHT};padding:14px 18px;border-radius:4px;margin:20px 0}}
    .warn-box{{background:#fff5f5;border-left:4px solid #fc8181;padding:14px 18px;border-radius:4px;margin:20px 0;color:#742a2a}}
    .bullet{{margin:8px 0;padding-left:8px}}
    .bullet li{{line-height:1.8;color:#2d3748}}
    .ftr{{background:#f7fafc;padding:20px 40px;text-align:center;color:#718096;font-size:12px;border-top:1px solid #e2e8f0}}
    .ftr a{{color:{_TEAL};text-decoration:none}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <h1>🏥 MEDIVISION</h1>
      <p>AI-Powered Medical Diagnosis Platform</p>
    </div>
    <div class="body">
      <h2 style="color:{_TEAL};margin:0 0 20px">{title}</h2>
      {body_html}
    </div>
    <div class="ftr">
      <p>This is an automated message — please do not reply.</p>
      <p>&copy; 2026 MEDIVISION. All rights reserved.</p>
    </div>
  </div>
</body>
</html>"""


class EmailService:
    def __init__(self):
        self.smtp_server   = settings.SMTP_SERVER
        self.smtp_port     = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.email_from    = settings.EMAIL_FROM

        if self.smtp_password and self.smtp_password != "your-gmail-app-password-here":
            logger.info(f"✅ EmailService ready — {self.smtp_server}:{self.smtp_port} as {self.smtp_username}")
        else:
            logger.warning("⚠️ SMTP_PASSWORD not configured — emails will fail. Set it in backend_fastapi/.env")

    async def send_email(self, to: str, subject: str, html_body: str, text_body: Optional[str] = None) -> dict:
        if not to or "@" not in to:
            return {"success": False, "message": "Invalid recipient email address."}
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"]    = self.email_from
            msg["To"]      = to
            if text_body:
                msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)

            logger.info(f"✅ Email sent to {to}")
            return {"success": True, "message": "Email sent successfully."}

        except smtplib.SMTPAuthenticationError:
            logger.error("❌ SMTP Auth failed. Check Gmail App Password in .env")
            return {"success": False, "message": "Email auth failed. Check SMTP_PASSWORD in .env."}
        except Exception as e:
            logger.error(f"❌ Email error: {e}")
            return {"success": False, "message": str(e)}

    # ── OTP Verification Email ────────────────────────────────────────────────

    async def send_verification_email(self, email: str, otp: str, user_name: Optional[str] = None) -> dict:
        name = user_name or "there"
        body = f"""
<p>Dear {name},</p>
<p>Thank you for registering with <strong>MEDIVISION</strong>. Use the verification code below to activate your account:</p>
<div class="otp-box">{otp}</div>
<div class="info-box">
  <strong>⏱️ Expires in 5 minutes &nbsp;|&nbsp; Maximum 3 attempts</strong><br>
  Enter this code in the verification screen. Do not share it with anyone.
</div>
<p>If you didn't create a MEDIVISION account, you can safely ignore this email.</p>"""
        text = f"Dear {name},\n\nYour MEDIVISION verification code is: {otp}\nExpires in 5 minutes. Max 3 attempts.\n\nIf you didn't request this, ignore this email."
        return await self.send_email(email, "Verify Your MEDIVISION Account", _base_html("Account Verification", body), text)

    # ── Welcome Email ─────────────────────────────────────────────────────────

    async def send_welcome_email(self, email: str, user_name: str, is_doctor: bool = False) -> dict:
        role_features = (
            ["Review AI X-ray analysis reports", "Issue digital prescriptions", "Consult with patients via secure chat", "Monitor disease trend notifications"]
            if is_doctor else
            ["Upload X-ray images for AI-based analysis", "Get AI-powered pneumonia diagnosis", "Consult with verified PMDC-registered doctors", "Track your health progress over time"]
        )
        bullets = "".join(f"<li>• {f}</li>" for f in role_features)
        role_tag = "Doctor Account" if is_doctor else "Patient Account"
        body = f"""
<p>Dear {user_name},</p>
<p>Your account has been successfully registered with <strong>MEDIVISION</strong>.</p>
<p>You can now:</p>
<ul class="bullet">{bullets}</ul>
<div class="info-box">
  <strong>Account type:</strong> {role_tag}<br>
  <strong>Email:</strong> {email}
</div>
<p>If this was not you, please contact support immediately.</p>
<br>
<p>Regards,<br><strong>MEDIVISION Team</strong></p>"""
        text = f"Dear {user_name},\n\nYour account has been successfully registered with MEDIVISION.\nEmail: {email}\n\nRegards,\nMEDIVISION Team"
        return await self.send_email(email, "Welcome to MEDIVISION", _base_html("Welcome to MEDIVISION 🎉", body), text)

    # ── Password Reset Email ──────────────────────────────────────────────────

    async def send_password_reset_email(self, email: str, otp: str, user_name: Optional[str] = None) -> dict:
        name = user_name or "there"
        body = f"""
<p>Dear {name},</p>
<p>We received a request to reset your <strong>MEDIVISION</strong> password. Use the code below:</p>
<div class="otp-box">{otp}</div>
<div class="warn-box">
  <strong>⚠️ Security Notice:</strong> This code expires in <strong>5 minutes</strong>.<br>
  If you didn't request a password reset, please secure your account immediately.
</div>
<p>After entering the code you'll be able to set a new password.</p>"""
        text = f"Dear {name},\n\nYour MEDIVISION password reset code is: {otp}\nExpires in 5 minutes.\n\nIf you didn't request this, ignore this email."
        return await self.send_email(email, "Reset Your MEDIVISION Password", _base_html("Password Reset Request", body), text)


# Global instance
email_service = EmailService()
