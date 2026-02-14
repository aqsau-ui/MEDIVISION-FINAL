/**
 * OTP Generation Utility Module
 * Generates 6-digit numeric OTP with expiry and validation helpers
 */

/**
 * Generate a 6-digit numeric OTP
 * @returns {string} 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create OTP data with expiry timestamp
 * @param {number} expiryMinutes - Minutes until OTP expires (default: 5)
 * @returns {Object} Object containing OTP, expiry timestamp, and creation timestamp
 */
function createOTP(expiryMinutes = 5) {
  const otp = generateOTP();
  const createdAt = Date.now();
  const expiresAt = createdAt + (expiryMinutes * 60 * 1000);
  
  return {
    otp,
    createdAt,
    expiresAt,
    expiryMinutes
  };
}

/**
 * Validate if OTP is still valid (not expired)
 * @param {number} expiresAt - Expiry timestamp
 * @returns {boolean} True if OTP is still valid
 */
function isOTPValid(expiresAt) {
  return Date.now() < expiresAt;
}

/**
 * Check if OTP matches and is still valid
 * @param {string} inputOTP - OTP entered by user
 * @param {string} storedOTP - OTP stored in database
 * @param {number} expiresAt - Expiry timestamp
 * @returns {Object} Validation result with success flag and message
 */
function validateOTP(inputOTP, storedOTP, expiresAt) {
  // Check if OTP has expired
  if (!isOTPValid(expiresAt)) {
    return {
      success: false,
      message: 'OTP has expired. Please request a new one.'
    };
  }
  
  // Check if OTP matches
  if (inputOTP !== storedOTP) {
    return {
      success: false,
      message: 'Invalid OTP. Please check and try again.'
    };
  }
  
  return {
    success: true,
    message: 'OTP verified successfully.'
  };
}

/**
 * Check if resend cooldown period has passed
 * @param {number} lastSentAt - Timestamp when OTP was last sent
 * @param {number} cooldownSeconds - Cooldown period in seconds (default: 30)
 * @returns {Object} Object with canResend flag and remaining seconds
 */
function checkResendCooldown(lastSentAt, cooldownSeconds = 30) {
  const now = Date.now();
  const timeSinceLastSent = now - lastSentAt;
  const cooldownMs = cooldownSeconds * 1000;
  
  if (timeSinceLastSent < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastSent) / 1000);
    return {
      canResend: false,
      remainingSeconds,
      message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`
    };
  }
  
  return {
    canResend: true,
    remainingSeconds: 0,
    message: 'You can request a new OTP.'
  };
}

/**
 * Get remaining time until OTP expires
 * @param {number} expiresAt - Expiry timestamp
 * @returns {Object} Object with remaining seconds and formatted time
 */
function getRemainingTime(expiresAt) {
  const now = Date.now();
  const remainingMs = expiresAt - now;
  
  if (remainingMs <= 0) {
    return {
      remainingSeconds: 0,
      formatted: '0:00',
      isExpired: true
    };
  }
  
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  
  return {
    remainingSeconds,
    formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
    isExpired: false
  };
}

module.exports = {
  generateOTP,
  createOTP,
  isOTPValid,
  validateOTP,
  checkResendCooldown,
  getRemainingTime
};
