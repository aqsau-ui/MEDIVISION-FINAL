const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { verifyPMDCNumber } = require('../services/pmdcVerification');
const { createOTP, validateOTP, checkResendCooldown } = require('../utils/otpGenerator');
const { sendVerificationEmail, sendWelcomeEmail } = require('../services/emailService');

// PMDC Validation endpoint - Live verification enabled
router.post('/validate-pmdc', [
  body('pmdcNumber').trim().notEmpty().withMessage('PMDC number is required'),
  body('fullName').trim().notEmpty().withMessage('Full name is required for verification')
], async (req, res) => {
  try {
    const { pmdcNumber, fullName } = req.body;

    // Check if PMDC number is already registered in our database
    const [existingDoctors] = await db.query(
      'SELECT id FROM doctors WHERE pmdc_number = ?',
      [pmdcNumber]
    );

    if (existingDoctors.length > 0) {
      return res.json({ 
        success: false, 
        isValid: false,
        message: 'This PMDC number is already registered in our system.' 
      });
    }

    // PMDC validation - Live verification from PMDC website
    console.log('PMDC validation endpoint called — verifying from PMDC website');
    const verification = await verifyPMDCNumber(pmdcNumber, fullName);
    
    return res.json({
      success: verification.isValid,
      isValid: verification.isValid,
      doctorName: verification.doctorName || null,
      message: verification.message
    });

  } catch (error) {
    console.error('PMDC validation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'PMDC validation service error. Please try again in a moment.' 
    });
  }
});

// Doctor Register endpoint
router.post('/doctor-register', [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('cnicNumber').trim().notEmpty().withMessage('CNIC number is required'),
  body('pmdcNumber').trim().notEmpty().withMessage('PMDC number is required')
], async (req, res) => {
  try {
    console.log('Doctor registration request received:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { fullName, email, password, cnicNumber, pmdcNumber } = req.body;

    // Additional server-side validation for CNIC format and strong password
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicRegex.test(cnicNumber)) {
      return res.status(400).json({ success: false, message: 'CNIC must be in the format 12345-1234567-1.' });
    }

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strongPassword.test(password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters and include uppercase, lowercase, number and special character.' });
    }

    // PMDC verification - verify from PMDC website before registration
    console.log('Verifying PMDC from official website for registration');
    const verification = await verifyPMDCNumber(pmdcNumber, fullName);
    
    if (!verification.isValid) {
      console.log('PMDC verification failed:', verification.message);
      return res.status(400).json({ 
        success: false, 
        message: verification.message || 'PMDC verification failed. Your PMDC number could not be verified from the Pakistan Medical Commission website. Please ensure your PMDC number and full name are correct.'
      });
    }
    
    console.log('PMDC verification successful for:', verification.doctorName || fullName);

    // Check if doctor already exists in verified doctors
    const [existingDoctors] = await db.query(
      'SELECT id FROM doctors WHERE email = ? OR pmdc_number = ?',
      [email, pmdcNumber]
    );

    if (existingDoctors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email or PMDC number already registered' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otpData = createOTP(5); // 5 minutes expiry

    // Delete any existing pending registration for this email/PMDC
    await db.query('DELETE FROM pending_doctors WHERE email = ? OR pmdc_number = ?', [email, pmdcNumber]);

    // Insert into pending_doctors table (not main doctors table yet)
    await db.query(
      `INSERT INTO pending_doctors (full_name, email, password, cnic_number, pmdc_number, otp, otp_expires_at, otp_created_at, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [fullName, email, hashedPassword, cnicNumber, pmdcNumber, otpData.otp, otpData.expiresAt, otpData.createdAt]
    );

    // Send verification email
    const emailResult = await sendVerificationEmail(email, otpData.otp, fullName);

    // Always log OTP to terminal for dev/testing
    console.log(`\n📧 Doctor OTP for ${email}: *** ${otpData.otp} ***\n`);

    if (!emailResult.success) {
      console.error('⚠️  Email delivery failed:', emailResult.message, '— Use the OTP printed above.');
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for the verification code.',
      email: email,
      requiresVerification: true
    });

  } catch (error) {
    console.error('Doctor registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed. Please try again.',
      error: error.message
    });
  }
});

// Doctor Login endpoint
router.post('/doctor-login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find doctor by email
    const [doctors] = await db.query(
      'SELECT id, full_name, email, password, pmdc_number, is_verified FROM doctors WHERE email = ?',
      [email]
    );

    if (doctors.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const doctor = doctors[0];

    // Check if doctor is verified
    if (!doctor.is_verified) {
      return res.status(403).json({ 
        success: false, 
        message: 'Please verify your email before logging in. Check your inbox for the verification code.',
        requiresVerification: true,
        email: doctor.email
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, doctor.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Update last login
    await db.query(
      'UPDATE doctors SET last_login = NOW() WHERE id = ?',
      [doctor.id]
    );

    // Return doctor data (exclude password)
    res.json({ 
      success: true, 
      message: 'Login successful',
      doctor: {
        id: doctor.id,
        fullName: doctor.full_name,
        email: doctor.email,
        pmdcNumber: doctor.pmdc_number
      }
    });

  } catch (error) {
    console.error('Doctor login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed. Please try again.' 
    });
  }
});

// Verify OTP endpoint for doctors
router.post('/doctor-verify-otp', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, otp } = req.body;

    // First check pending_doctors table
    const [pendingDoctors] = await db.query(
      'SELECT id, full_name, email, password, cnic_number, pmdc_number, otp, otp_expires_at, verification_attempts FROM pending_doctors WHERE email = ?',
      [email]
    );

    if (pendingDoctors.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Registration not found. Please register again.' 
      });
    }

    const pendingDoctor = pendingDoctors[0];

    // Check if OTP exists
    if (!pendingDoctor.otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'No OTP found. Please request a new one.' 
      });
    }

    // Validate OTP
    const otpValidation = validateOTP(otp, pendingDoctor.otp, pendingDoctor.otp_expires_at);

    if (!otpValidation.success) {
      // Increment verification attempts
      await db.query(
        'UPDATE pending_doctors SET verification_attempts = verification_attempts + 1 WHERE id = ?',
        [pendingDoctor.id]
      );

      return res.status(400).json(otpValidation);
    }

    // OTP is valid - now move doctor from pending_doctors to doctors table
    const [result] = await db.query(
      `INSERT INTO doctors (full_name, email, password, cnic_number, pmdc_number, phone, hospital_affiliation, country, degree, medical_college, has_experience, experience_institute, specializations, is_verified, created_at) 
       VALUES (?, ?, ?, ?, ?, '', '', '', '', '', FALSE, '', NULL, TRUE, NOW())`,
      [pendingDoctor.full_name, pendingDoctor.email, pendingDoctor.password, pendingDoctor.cnic_number, pendingDoctor.pmdc_number]
    );

    // Delete from pending_doctors
    await db.query('DELETE FROM pending_doctors WHERE id = ?', [pendingDoctor.id]);

    // Send welcome email
    await sendWelcomeEmail(email, pendingDoctor.full_name);

    res.json({ 
      success: true, 
      message: 'Email verified successfully! You can now login.',
      doctor: {
        id: result.insertId,
        fullName: pendingDoctor.full_name,
        email: pendingDoctor.email
      }
    });

  } catch (error) {
    console.error('Doctor OTP verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Verification failed. Please try again.' 
    });
  }
});

// Resend OTP endpoint for doctors
router.post('/doctor-resend-otp', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email } = req.body;

    // Find doctor in pending_doctors table
    const [pendingDoctors] = await db.query(
      'SELECT id, full_name, email, otp_created_at FROM pending_doctors WHERE email = ?',
      [email]
    );

    if (pendingDoctors.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Registration not found. Please register again.' 
      });
    }

    const pendingDoctor = pendingDoctors[0];

    // Check resend cooldown
    if (pendingDoctor.otp_created_at) {
      const cooldown = checkResendCooldown(pendingDoctor.otp_created_at, 30);
      if (!cooldown.canResend) {
        return res.status(429).json({ 
          success: false, 
          message: cooldown.message,
          remainingSeconds: cooldown.remainingSeconds
        });
      }
    }

    // Generate new OTP
    const otpData = createOTP(5);

    // Update OTP in pending_doctors table
    await db.query(
      'UPDATE pending_doctors SET otp = ?, otp_expires_at = ?, otp_created_at = ? WHERE id = ?',
      [otpData.otp, otpData.expiresAt, otpData.createdAt, pendingDoctor.id]
    );

    // Send verification email
    const emailResult = await sendVerificationEmail(email, otpData.otp, pendingDoctor.full_name);

    if (!emailResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification email. Please try again.' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Verification code sent successfully. Please check your email.' 
    });

  } catch (error) {
    console.error('Doctor resend OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to resend verification code. Please try again.' 
    });
  }
});

// Doctor Forgot Password - Request OTP
router.post('/doctor-forgot-password', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email } = req.body;

    // Check if doctor exists and is verified
    const [doctors] = await db.query(
      'SELECT id, full_name, email FROM doctors WHERE email = ? AND is_verified = TRUE',
      [email]
    );

    if (doctors.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this email address.' 
      });
    }

    const doctor = doctors[0];

    // Generate OTP
    const otpData = createOTP(10); // 10 minutes expiry for password reset

    // Update doctor with OTP
    await db.query(
      'UPDATE doctors SET otp = ?, otp_expires_at = ?, otp_created_at = ? WHERE id = ?',
      [otpData.otp, otpData.expiresAt, otpData.createdAt, doctor.id]
    );

    // Send password reset email with OTP
    const emailResult = await sendVerificationEmail(email, otpData.otp, doctor.full_name);

    if (!emailResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send password reset email. Please try again.' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Password reset code sent to your email.',
      email: email
    });

  } catch (error) {
    console.error('Doctor forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process request. Please try again.' 
    });
  }
});

// Doctor Verify Password Reset OTP
router.post('/doctor-verify-reset-otp', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, otp } = req.body;

    // Find doctor by email
    const [doctors] = await db.query(
      'SELECT id, email, otp, otp_expires_at FROM doctors WHERE email = ? AND is_verified = TRUE',
      [email]
    );

    if (doctors.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Doctor not found.' 
      });
    }

    const doctor = doctors[0];

    // Check if OTP exists
    if (!doctor.otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'No OTP found. Please request a new one.' 
      });
    }

    // Validate OTP
    const otpValidation = validateOTP(otp, doctor.otp, doctor.otp_expires_at);

    if (!otpValidation.success) {
      return res.status(400).json(otpValidation);
    }

    // OTP is valid
    res.json({ 
      success: true, 
      message: 'OTP verified successfully. You can now reset your password.',
      email: doctor.email
    });

  } catch (error) {
    console.error('Doctor verify reset OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Verification failed. Please try again.' 
    });
  }
});

// Doctor Reset Password
router.post('/doctor-reset-password', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, otp, newPassword } = req.body;

    // Find doctor by email
    const [doctors] = await db.query(
      'SELECT id, email, otp, otp_expires_at FROM doctors WHERE email = ? AND is_verified = TRUE',
      [email]
    );

    if (doctors.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Doctor not found.' 
      });
    }

    const doctor = doctors[0];

    // Validate OTP again
    const otpValidation = validateOTP(otp, doctor.otp, doctor.otp_expires_at);

    if (!otpValidation.success) {
      return res.status(400).json(otpValidation);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear OTP
    await db.query(
      'UPDATE doctors SET password = ?, otp = NULL, otp_expires_at = NULL, otp_created_at = NULL WHERE id = ?',
      [hashedPassword, doctor.id]
    );

    res.json({ 
      success: true, 
      message: 'Password reset successfully! You can now login with your new password.'
    });

  } catch (error) {
    console.error('Doctor reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset password. Please try again.' 
    });
  }
});

// Doctor Resend Password Reset OTP
router.post('/doctor-resend-reset-otp', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email } = req.body;

    // Find doctor by email
    const [doctors] = await db.query(
      'SELECT id, full_name, email, otp_created_at FROM doctors WHERE email = ? AND is_verified = TRUE',
      [email]
    );

    if (doctors.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Doctor not found.' 
      });
    }

    const doctor = doctors[0];

    // Check resend cooldown
    if (doctor.otp_created_at) {
      const cooldown = checkResendCooldown(doctor.otp_created_at, 30);
      if (!cooldown.canResend) {
        return res.status(429).json({ 
          success: false, 
          message: cooldown.message,
          remainingSeconds: cooldown.remainingSeconds
        });
      }
    }

    // Generate new OTP
    const otpData = createOTP(10);

    // Update OTP in database
    await db.query(
      'UPDATE doctors SET otp = ?, otp_expires_at = ?, otp_created_at = ? WHERE id = ?',
      [otpData.otp, otpData.expiresAt, otpData.createdAt, doctor.id]
    );

    // Send verification email
    const emailResult = await sendVerificationEmail(email, otpData.otp, doctor.full_name);

    if (!emailResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send password reset code. Please try again.' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Password reset code sent successfully. Please check your email.' 
    });

  } catch (error) {
    console.error('Doctor resend reset OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to resend code. Please try again.' 
    });
  }
});

module.exports = router;
