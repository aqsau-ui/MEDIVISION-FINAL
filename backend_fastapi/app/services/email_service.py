"""Email Service using SMTP"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging
from ..config.settings import settings

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.email_from = settings.EMAIL_FROM
    
    async def send_email(
        self,
        to: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None
    ) -> dict:
        """
        Send email using SMTP
        
        Args:
            to: Recipient email address
            subject: Email subject
            html_body: HTML content of the email
            text_body: Plain text version (optional)
        
        Returns:
            Result dictionary with success flag and message
        """
        try:
            # Validate recipient
            if not to or '@' not in to:
                return {
                    "success": False,
                    "message": "Invalid recipient email address."
                }
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.email_from
            msg['To'] = to
            
            # Add text and HTML parts
            if text_body:
                msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to}")
            
            return {
                "success": True,
                "message": "Email sent successfully."
            }
        
        except Exception as e:
            logger.error(f"Email sending error: {e}")
            return {
                "success": False,
                "message": "Failed to send email. Please try again later.",
                "error": str(e)
            }
    
    async def send_verification_email(
        self,
        email: str,
        otp: str,
        user_name: Optional[str] = None
    ) -> dict:
        """Send verification email with OTP"""
        greeting = f"Dear {user_name}" if user_name else "Hello"
        
        subject = "Verify Your MEDIVISION Account"
        
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }}
    .container {{
      background-color: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }}
    .header {{
      text-align: center;
      color: #2c7a7b;
      margin-bottom: 30px;
    }}
    .otp-box {{
      background: linear-gradient(135deg, #38b2ac 0%, #2c7a7b 100%);
      color: white;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      text-align: center;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
    }}
    .info {{
      background-color: #e6fffa;
      padding: 15px;
      border-left: 4px solid #38b2ac;
      margin: 20px 0;
      border-radius: 4px;
    }}
    .footer {{
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 MEDIVISION</h1>
      <h2>Account Verification</h2>
    </div>
    
    <p>{greeting},</p>
    
    <p>Thank you for registering with MEDIVISION! To complete your registration, please use the OTP code below:</p>
    
    <div class="otp-box">
      {otp}
    </div>
    
    <div class="info">
      <strong>⏱️ This OTP will expire in 5 minutes.</strong><br>
      Please enter it in the verification screen to activate your account.
    </div>
    
    <p>If you didn't request this verification, please ignore this email or contact our support team.</p>
    
    <div class="footer">
      <p>This is an automated message, please do not reply to this email.</p>
      <p>&copy; 2026 MEDIVISION. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""
        
        return await self.send_email(email, subject, html_body)
    
    async def send_password_reset_email(
        self,
        email: str,
        otp: str,
        user_name: Optional[str] = None
    ) -> dict:
        """Send password reset email with OTP"""
        greeting = f"Dear {user_name}" if user_name else "Hello"
        
        subject = "Reset Your MEDIVISION Password"
        
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }}
    .container {{
      background-color: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }}
    .header {{
      text-align: center;
      color: #2c7a7b;
      margin-bottom: 30px;
    }}
    .otp-box {{
      background: linear-gradient(135deg, #38b2ac 0%, #2c7a7b 100%);
      color: white;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      text-align: center;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
    }}
    .warning {{
      background-color: #fff5f5;
      padding: 15px;
      border-left: 4px solid #fc8181;
      margin: 20px 0;
      border-radius: 4px;
      color: #742a2a;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 MEDIVISION</h1>
      <h2>Password Reset Request</h2>
    </div>
    
    <p>{greeting},</p>
    
    <p>We received a request to reset your password. Use the OTP code below to continue:</p>
    
    <div class="otp-box">
      {otp}
    </div>
    
    <div class="warning">
      <strong>⚠️ Security Notice:</strong><br>
      This OTP will expire in 5 minutes. If you didn't request a password reset, please secure your account immediately.
    </div>
    
    <p>After entering the OTP, you'll be able to set a new password for your account.</p>
    
    <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
      <p>This is an automated message, please do not reply.</p>
      <p>&copy; 2026 MEDIVISION. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""
        
        return await self.send_email(email, subject, html_body)
    
    async def send_welcome_email(
        self,
        email: str,
        user_name: str
    ) -> dict:
        """Send welcome email after successful registration"""
        subject = "Welcome to MEDIVISION!"
        
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }}
    .container {{
      background-color: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }}
    .header {{
      text-align: center;
      color: #2c7a7b;
      margin-bottom: 30px;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 MEDIVISION</h1>
      <h2>Welcome Aboard!</h2>
    </div>
    
    <p>Dear {user_name},</p>
    
    <p>Your account has been successfully verified! Welcome to MEDIVISION - your trusted medical diagnosis platform.</p>
    
    <p>You can now access all features including AI-powered diagnosis, doctor consultations, and health tracking.</p>
    
    <p>Thank you for choosing MEDIVISION!</p>
    
    <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
      <p>&copy; 2026 MEDIVISION. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""
        
        return await self.send_email(email, subject, html_body)

# Global email service instance
email_service = EmailService()
