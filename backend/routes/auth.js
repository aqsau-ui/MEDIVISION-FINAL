const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { createOTP, validateOTP, checkResendCooldown } = require('../utils/otpGenerator');
const { sendVerificationEmail, sendWelcomeEmail } = require('../services/emailService');

// Register endpoint
router.post('/register', [
  // Validation rules
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/).withMessage('Password must be at least 8 characters and include uppercase, lowercase, number and special character'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
  body('city').trim().notEmpty().withMessage('City is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { fullName, email, password, city } = req.body;
    const gender = req.body.gender || 'other';

    // Check if user already exists in verified users
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otpData = createOTP(5); // 5 minutes expiry

    // Delete any existing pending registration for this email
    await db.query('DELETE FROM pending_users WHERE email = ?', [email]);

    // Insert into pending_users table (not main users table yet)
    await db.query(
      `INSERT INTO pending_users (full_name, email, password, gender, city, otp, otp_expires_at, otp_created_at, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [fullName, email, hashedPassword, gender, city, otpData.otp, otpData.expiresAt, otpData.createdAt]
    );

    // Send verification email
    const emailResult = await sendVerificationEmail(email, otpData.otp, fullName);

    // Always log OTP to terminal for dev/testing purposes
    console.log(`\n📧 OTP for ${email}: *** ${otpData.otp} ***\n`);

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
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed. Please try again.' 
    });
  }
});

// Login endpoint
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const [users] = await db.query(
      'SELECT id, full_name, email, password, is_verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const user = users[0];

    // Check if user is verified
    if (!user.is_verified) {
      return res.status(403).json({ 
        success: false, 
        message: 'Please verify your email before logging in. Check your inbox for the verification code.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Return user data (exclude password)
    res.json({ 
      success: true, 
      message: 'Login successful',
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed. Please try again.' 
    });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', [
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

    // First check pending_users table
    const [pendingUsers] = await db.query(
      'SELECT id, full_name, email, password, gender, city, otp, otp_expires_at, verification_attempts FROM pending_users WHERE email = ?',
      [email]
    );

    if (pendingUsers.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Registration not found. Please register again.' 
      });
    }

    const pendingUser = pendingUsers[0];

    // Check if OTP exists
    if (!pendingUser.otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'No OTP found. Please request a new one.' 
      });
    }

    // Validate OTP
    const otpValidation = validateOTP(otp, pendingUser.otp, pendingUser.otp_expires_at);

    if (!otpValidation.success) {
      // Increment verification attempts
      await db.query(
        'UPDATE pending_users SET verification_attempts = verification_attempts + 1 WHERE id = ?',
        [pendingUser.id]
      );

      return res.status(400).json(otpValidation);
    }

    // OTP is valid - now move user from pending_users to users table
    // Some deployments don't collect CNIC for patients — only include cnic_number if present
    // Also provide a safe default for date_of_birth when it's not available to avoid NOT NULL DB errors
    const safeDob = pendingUser.date_of_birth || '1970-01-01';
    if (pendingUser.cnic_number !== undefined && pendingUser.cnic_number !== null) {
      const [result] = await db.query(
        `INSERT INTO users (full_name, email, cnic_number, password, phone, date_of_birth, gender, city, is_verified, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())`,
        [pendingUser.full_name, pendingUser.email, pendingUser.cnic_number, pendingUser.password, '', safeDob, pendingUser.gender, pendingUser.city]
      );
      // Delete from pending_users
      await db.query('DELETE FROM pending_users WHERE id = ?', [pendingUser.id]);

      // Send welcome email
      await sendWelcomeEmail(email, pendingUser.full_name);

      return res.json({ 
        success: true, 
        message: 'Email verified successfully! You can now login.',
        user: {
          id: result.insertId,
          fullName: pendingUser.full_name,
          email: pendingUser.email
        }
      });
    } else {
      const [result] = await db.query(
        `INSERT INTO users (full_name, email, password, phone, date_of_birth, gender, city, is_verified, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, NOW())`,
        [pendingUser.full_name, pendingUser.email, pendingUser.password, '', safeDob, pendingUser.gender, pendingUser.city]
      );
      // Delete from pending_users
      await db.query('DELETE FROM pending_users WHERE id = ?', [pendingUser.id]);

      // Send welcome email
      await sendWelcomeEmail(email, pendingUser.full_name);

      return res.json({ 
        success: true, 
        message: 'Email verified successfully! You can now login.',
        user: {
          id: result.insertId,
          fullName: pendingUser.full_name,
          email: pendingUser.email
        }
      });
    }

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Verification failed. Please try again.' 
    });
  }
});

// Resend OTP endpoint
router.post('/resend-otp', [
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

    // Find user in pending_users table
    const [pendingUsers] = await db.query(
      'SELECT id, full_name, email, otp_created_at FROM pending_users WHERE email = ?',
      [email]
    );

    if (pendingUsers.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Registration not found. Please register again.' 
      });
    }

    const pendingUser = pendingUsers[0];

    // Check resend cooldown
    if (pendingUser.otp_created_at) {
      const cooldown = checkResendCooldown(pendingUser.otp_created_at, 30);
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

    // Update OTP in pending_users table
    await db.query(
      'UPDATE pending_users SET otp = ?, otp_expires_at = ?, otp_created_at = ? WHERE id = ?',
      [otpData.otp, otpData.expiresAt, otpData.createdAt, pendingUser.id]
    );

    // Send verification email
    const emailResult = await sendVerificationEmail(email, otpData.otp, pendingUser.full_name);

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
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to resend verification code. Please try again.' 
    });
  }
});

// Forgot Password - Request OTP
router.post('/forgot-password', [
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

    // Check if user exists and is verified
    const [users] = await db.query(
      'SELECT id, full_name, email FROM users WHERE email = ? AND is_verified = TRUE',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this email address.' 
      });
    }

    const user = users[0];

    // Generate OTP
    const otpData = createOTP(10); // 10 minutes expiry for password reset

    // Update user with OTP
    await db.query(
      'UPDATE users SET otp = ?, otp_expires_at = ?, otp_created_at = ? WHERE id = ?',
      [otpData.otp, otpData.expiresAt, otpData.createdAt, user.id]
    );

    // Send password reset email with OTP
    const emailResult = await sendVerificationEmail(email, otpData.otp, user.full_name);

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
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process request. Please try again.' 
    });
  }
});

// Verify Password Reset OTP
router.post('/verify-reset-otp', [
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

    // Find user by email
    const [users] = await db.query(
      'SELECT id, email, otp, otp_expires_at FROM users WHERE email = ? AND is_verified = TRUE',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    const user = users[0];

    // Check if OTP exists
    if (!user.otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'No OTP found. Please request a new one.' 
      });
    }

    // Validate OTP
    const otpValidation = validateOTP(otp, user.otp, user.otp_expires_at);

    if (!otpValidation.success) {
      return res.status(400).json(otpValidation);
    }

    // OTP is valid
    res.json({ 
      success: true, 
      message: 'OTP verified successfully. You can now reset your password.',
      email: user.email
    });

  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Verification failed. Please try again.' 
    });
  }
});

// Reset Password
router.post('/reset-password', [
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

    // Find user by email
    const [users] = await db.query(
      'SELECT id, email, otp, otp_expires_at FROM users WHERE email = ? AND is_verified = TRUE',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    const user = users[0];

    // Validate OTP again
    const otpValidation = validateOTP(otp, user.otp, user.otp_expires_at);

    if (!otpValidation.success) {
      return res.status(400).json(otpValidation);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear OTP
    await db.query(
      'UPDATE users SET password = ?, otp = NULL, otp_expires_at = NULL, otp_created_at = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({ 
      success: true, 
      message: 'Password reset successfully! You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset password. Please try again.' 
    });
  }
});

// Resend Password Reset OTP
router.post('/resend-reset-otp', [
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

    // Find user by email
    const [users] = await db.query(
      'SELECT id, full_name, email, otp_created_at FROM users WHERE email = ? AND is_verified = TRUE',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    const user = users[0];

    // Check resend cooldown
    if (user.otp_created_at) {
      const cooldown = checkResendCooldown(user.otp_created_at, 30);
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
      'UPDATE users SET otp = ?, otp_expires_at = ?, otp_created_at = ? WHERE id = ?',
      [otpData.otp, otpData.expiresAt, otpData.createdAt, user.id]
    );

    // Send verification email
    const emailResult = await sendVerificationEmail(email, otpData.otp, user.full_name);

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
    console.error('Resend reset OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to resend code. Please try again.' 
    });
  }
});

module.exports = router;
