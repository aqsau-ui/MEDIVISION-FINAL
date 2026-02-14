import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import OTPVerification from '../components/OTPVerification';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  // Forgot Password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: email, 2: otp, 3: new password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Forgot Password Functions
  const handleForgotPasswordClick = (e) => {
    e.preventDefault();
    setShowForgotPassword(true);
    setForgotStep(1);
    setForgotEmail('');
    setForgotError('');
  };

  const handleForgotEmailSubmit = async () => {
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      const data = await response.json();

      if (data.success) {
        setForgotStep(2);
        setForgotOtp(['', '', '', '', '', '']);
      } else {
        setForgotError(data.message || 'Failed to send reset code.');
      }
    } catch (err) {
      setForgotError('Cannot connect to server. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...forgotOtp];
    newOtp[index] = value;
    setForgotOtp(newOtp);
    setForgotError('');
    
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !forgotOtp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      setForgotOtp(pastedData.split(''));
      setForgotError('');
      otpInputRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = forgotOtp.join('');
    
    if (otpValue.length !== 6) {
      setForgotError('Please enter all 6 digits');
      return;
    }
    
    setForgotLoading(true);
    setForgotError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: otpValue })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setForgotStep(3);
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setForgotError(data.message || 'Invalid OTP. Please try again.');
        setForgotOtp(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      }
    } catch (err) {
      setForgotError('Cannot connect to server. Please try again.');
      setForgotOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      setForgotError('Please enter a new password.');
      return;
    }
    
    if (newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      setForgotError('Passwords do not match.');
      return;
    }
    
    setForgotLoading(true);
    setForgotError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: forgotEmail, 
          otp: forgotOtp.join(''),
          newPassword 
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowForgotPassword(false);
        setServerError('');
        alert('Password reset successfully! You can now login with your new password.');
      } else {
        setForgotError(data.message || 'Failed to reset password.');
      }
    } catch (err) {
      setForgotError('Cannot connect to server. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    setForgotLoading(true);
    setForgotError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/resend-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResendCooldown(30);
        setForgotOtp(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      } else {
        setForgotError(data.message || 'Failed to resend code.');
      }
    } catch (err) {
      setForgotError('Cannot connect to server. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const newErrors = {};

    if (!email) {
      newErrors.email = 'Please fill out this field.';
    }
    if (!password) {
      newErrors.password = 'Please fill out this field.';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
          // Store user data in localStorage
          localStorage.setItem('patientData', JSON.stringify(data.user));
          // Navigate to patient dashboard
          navigate('/patient-dashboard');
        } else if (data.requiresVerification) {
          // Show OTP verification screen
          setUnverifiedEmail(data.email || email);
          setShowOTPVerification(true);
        } else {
          setServerError(data.message || 'Login failed. Please try again.');
        }
      } catch (err) {
        setServerError('Cannot connect to server. Please make sure the backend is running.');
        console.error('Login error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Show OTP verification screen if user is unverified
  if (showOTPVerification) {
    return (
      <OTPVerification 
        email={unverifiedEmail} 
        userType="patient"
        onBack={() => setShowOTPVerification(false)}
      />
    );
  }

  return (
    <div className="login-page">
      {/* Background Elements */}
      <div className="login-bg-elements">
        <div className="floating-circle circle-1"></div>
        <div className="floating-circle circle-2"></div>
        <div className="floating-circle circle-3"></div>
        <div className="floating-circle circle-4"></div>
      </div>

      {/* Navigation */}
      <nav className="login-navbar">
        <div className="login-nav-container">
          <Link to="/" className="login-logo">
            <Logo size="medium" />
          </Link>
        </div>
      </nav>

      {/* Login Form Container */}
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-brand">MEDIVISION</h1>
            <h2 className="login-title">Patient Login</h2>
            <p className="login-subtitle">Access your health dashboard</p>
            {serverError && <div className="error-message" style={{marginTop: '1rem', textAlign: 'center'}}>{serverError}</div>}
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPassword ? (
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    ) : (
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    )}
                    {showPassword && <line x1="1" y1="1" x2="23" y2="23" />}
                    {!showPassword && <circle cx="12" cy="12" r="3" />}
                  </svg>
                </button>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              <span>{loading ? 'Logging in...' : 'Secure Login'}</span>
              <div className="button-ripple"></div>
            </button>

            <div className="login-links">
              <button 
                type="button"
                className="forgot-link"
                onClick={handleForgotPasswordClick}
              >
                Forgot password?
              </button>
            </div>

            <div className="login-register">
              <span>Don't have an account? </span>
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <Link to="/register" className="register-link">Register here</Link>
            </div>
          </form>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="otp-overlay">
            <div className="otp-modal">
              {forgotStep === 1 && (
                <>
                  <div className="otp-modal-header">
                    <div className="otp-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </div>
                    <h2 className="otp-modal-title">Forgot Password?</h2>
                    <p className="otp-modal-subtitle">Enter your email address and we'll send you a code to reset your password</p>
                  </div>

                  <div className="form-group" style={{marginBottom: '1rem'}}>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="Enter your email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleForgotEmailSubmit()}
                    />
                  </div>

                  {forgotError && <div className="otp-error">{forgotError}</div>}

                  <button 
                    className="otp-verify-button" 
                    onClick={handleForgotEmailSubmit}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Code'}
                  </button>

                  <button 
                    className="otp-back-button"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    ← Back to Login
                  </button>
                </>
              )}

              {forgotStep === 2 && (
                <>
                  <div className="otp-modal-header">
                    <div className="otp-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <h2 className="otp-modal-title">Enter Reset Code</h2>
                    <p className="otp-modal-subtitle">
                      We've sent a 6-digit code to<br />
                      <strong>{forgotEmail}</strong>
                    </p>
                  </div>

                  <div className="otp-input-container">
                    {forgotOtp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        maxLength="1"
                        className={`otp-input ${forgotError ? 'error' : ''}`}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={handleOtpPaste}
                        autoFocus={index === 0}
                      />
                    ))}
                  </div>

                  {forgotError && <div className="otp-error">{forgotError}</div>}

                  <button 
                    className="otp-verify-button" 
                    onClick={handleVerifyOtp}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? 'Verifying...' : 'Verify Code'}
                  </button>

                  <div className="otp-resend-section">
                    <p>Didn't receive the code?</p>
                    <button
                      className="otp-resend-button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || forgotLoading}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                    </button>
                  </div>

                  <button 
                    className="otp-back-button"
                    onClick={() => setForgotStep(1)}
                  >
                    ← Back
                  </button>
                </>
              )}

              {forgotStep === 3 && (
                <>
                  <div className="otp-modal-header">
                    <div className="otp-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <h2 className="otp-modal-title">Reset Password</h2>
                    <p className="otp-modal-subtitle">Enter your new password</p>
                  </div>

                  <div className="form-group" style={{marginBottom: '1rem'}}>
                    <div className="input-wrapper">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        className="form-input"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {showNewPassword ? (
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          ) : (
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          )}
                          {showNewPassword && <line x1="1" y1="1" x2="23" y2="23" />}
                          {!showNewPassword && <circle cx="12" cy="12" r="3" />}
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="form-group" style={{marginBottom: '1rem'}}>
                    <div className="input-wrapper">
                      <input
                        type={showConfirmNewPassword ? "text" : "password"}
                        className="form-input"
                        placeholder="Confirm new password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleResetPassword()}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {showConfirmNewPassword ? (
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          ) : (
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          )}
                          {showConfirmNewPassword && <line x1="1" y1="1" x2="23" y2="23" />}
                          {!showConfirmNewPassword && <circle cx="12" cy="12" r="3" />}
                        </svg>
                      </button>
                    </div>
                  </div>

                  {forgotError && <div className="otp-error">{forgotError}</div>}

                  <button 
                    className="otp-verify-button" 
                    onClick={handleResetPassword}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? 'Resetting...' : 'Reset Password'}
                  </button>

                  <button 
                    className="otp-back-button"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    ← Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Decorative Elements */}
        <div className="login-decorations">
          <div className="decoration decoration-1">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4ecdc4" opacity="0.3" d="M42.7,-57.1C53.5,-45.8,58.8,-30.5,61.2,-15.2C63.6,0.1,63.1,15.4,57.1,27.8C51.1,40.2,39.6,49.7,26.5,55.7C13.4,61.7,-1.3,64.2,-14.5,60.9C-27.7,57.6,-39.4,48.5,-47.3,36.8C-55.2,25.1,-59.3,10.8,-58.7,-3.3C-58.1,-17.4,-52.8,-31.3,-43.3,-42C-33.8,-52.7,-20.1,-60.2,-4.9,-63.1C10.3,-66,30.9,-64.3,42.7,-57.1Z" transform="translate(100 100)" />
            </svg>
          </div>
          <div className="decoration decoration-2">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill="#44b3aa" opacity="0.2" d="M37.8,-50.9C48.9,-40.1,57.3,-27.4,60.7,-13.2C64.1,1,62.5,16.7,55.4,29.9C48.3,43.1,35.7,53.8,21.1,58.9C6.5,64,-10.1,63.5,-24.7,57.8C-39.3,52.1,-52,41.2,-58.6,27.1C-65.2,13,-65.7,-4.3,-60.7,-18.8C-55.7,-33.3,-45.2,-45,-32.4,-54.8C-19.6,-64.6,-4.5,-72.5,8.9,-73.9C22.3,-75.3,26.7,-61.7,37.8,-50.9Z" transform="translate(100 100)" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;