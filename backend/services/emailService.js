/**
 * Mailtrap Email Service Module (SMTP Version)
 * Handles email sending using Mailtrap SMTP with nodemailer
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@medivision.com';
const FROM_NAME = process.env.FROM_NAME || 'MEDIVISION';

// Create SMTP transporter
let transporter = null;

function createTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_SMTP_HOST || 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.MAILTRAP_SMTP_PORT) || 2525,
      auth: {
        user: process.env.MAILTRAP_SMTP_USERNAME,
        pass: process.env.MAILTRAP_SMTP_PASSWORD
      }
    });
  }
  return transporter;
}

/**
 * Send email using Mailtrap SMTP
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html_body - HTML content of the email
 * @param {string} text_body - Plain text version (optional)
 * @returns {Promise<Object>} Result object with success flag and message
 */
async function sendEmail(to, subject, html_body, text_body = null) {
  try {
    // Validate recipient email
    if (!to || !to.includes('@')) {
      return {
        success: false,
        message: 'Invalid recipient email address.'
      };
    }

    const transporter = createTransporter();

    // Prepare email options
    const mailOptions = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: to,
      subject: subject,
      html: html_body,
      text: text_body || html_body.replace(/<[^>]*>/g, '') // Strip HTML if no text provided
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log(`Email sent successfully to ${to}`);
    console.log('Message ID:', info.messageId);

    return {
      success: true,
      message: 'Email sent successfully.',
      messageId: info.messageId
    };

  } catch (error) {
    console.error('Email sending error:', error.message);
    
    return {
      success: false,
      message: 'Failed to send email. Please try again later.',
      error: error.message
    };
  }
}

/**
 * Send verification email with OTP
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's name (optional)
 * @returns {Promise<Object>} Result object with success flag and message
 */
async function sendVerificationEmail(email, otp, userName = null) {
  const greeting = userName ? `Dear ${userName}` : 'Hello';
  
  const subject = 'Verify Your MEDIVISION Account';
  
  const html_body = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .otp-box {
      background: #f8f9fa;
      border: 2px dashed #667eea;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: bold;
      color: #667eea;
      letter-spacing: 8px;
      margin: 10px 0;
    }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 12px 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #6c757d;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 MEDIVISION</h1>
      <p>Healthcare Verification</p>
    </div>
    <div class="content">
      <p>${greeting},</p>
      <p>Thank you for registering with <strong>MEDIVISION</strong>. To complete your account verification, please use the following One-Time Password (OTP):</p>
      
      <div class="otp-box">
        <p style="margin: 0; color: #6c757d; font-size: 14px;">Your Verification Code</p>
        <div class="otp-code">${otp}</div>
        <p style="margin: 0; color: #6c757d; font-size: 14px;">Valid for 5 minutes</p>
      </div>
      
      <div class="warning">
        <strong>⚠️ Security Notice:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>This OTP is valid for <strong>5 minutes</strong> only</li>
          <li>Do not share this code with anyone</li>
          <li>MEDIVISION will never ask for your OTP via phone or email</li>
        </ul>
      </div>
      
      <p>If you didn't request this verification code, please ignore this email or contact our support team if you have concerns about your account security.</p>
      
      <p style="margin-top: 30px;">Best regards,<br><strong>The MEDIVISION Team</strong></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} MEDIVISION. All rights reserved.</p>
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text_body = `
${greeting},

Thank you for registering with MEDIVISION.

Your verification code is: ${otp}

This code is valid for 5 minutes only.

If you didn't request this code, please ignore this email.

Best regards,
The MEDIVISION Team
  `;

  return await sendEmail(email, subject, html_body, text_body);
}

/**
 * Send password reset email with OTP
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's name (optional)
 * @returns {Promise<Object>} Result object with success flag and message
 */
async function sendPasswordResetEmail(email, otp, userName = null) {
  const greeting = userName ? `Dear ${userName}` : 'Hello';
  
  const subject = 'Reset Your MEDIVISION Password';
  
  const html_body = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>🔐 Password Reset Request</h2>
    <p>${greeting},</p>
    <p>We received a request to reset your MEDIVISION account password. Use the following code to proceed:</p>
    <p class="otp-code">${otp}</p>
    <p><strong>This code expires in 5 minutes.</strong></p>
    <p>If you didn't request a password reset, please ignore this email and ensure your account is secure.</p>
    <p>Best regards,<br>The MEDIVISION Team</p>
  </div>
</body>
</html>
  `;

  return await sendEmail(email, subject, html_body);
}

/**
 * Send welcome email after successful registration
 * @param {string} email - Recipient email address
 * @param {string} userName - User's name
 * @returns {Promise<Object>} Result object with success flag and message
 */
async function sendWelcomeEmail(email, userName) {
  const subject = 'Welcome to MEDIVISION!';
  
  const html_body = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to MEDIVISION! 🎉</h1>
    </div>
    <p>Dear ${userName},</p>
    <p>Congratulations! Your account has been successfully verified and activated.</p>
    <p>You can now access all MEDIVISION features including:</p>
    <ul>
      <li>✅ Medical consultations</li>
      <li>✅ Health records management</li>
      <li>✅ AI-powered diagnosis assistance</li>
      <li>✅ Doctor appointment scheduling</li>
    </ul>
    <p>Thank you for choosing MEDIVISION for your healthcare needs.</p>
    <p>Best regards,<br>The MEDIVISION Team</p>
  </div>
</body>
</html>
  `;

  return await sendEmail(email, subject, html_body);
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
};
