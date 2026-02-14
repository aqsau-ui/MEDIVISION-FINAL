import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OTPVerification.css';

const OTPVerification = ({ email, userType = 'patient', onBack }) => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }

    setError('');
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('');
    setOtp([...newOtp, ...Array(6 - newOtp.length).fill('')]);

    // Focus the last filled input or first empty one
    const focusIndex = Math.min(pastedData.length, 5);
    document.getElementById(`otp-${focusIndex}`).focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint = userType === 'doctor' 
        ? 'http://localhost:5000/api/auth/doctor-verify-otp'
        : 'http://localhost:5000/api/auth/verify-otp';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpString })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('✅ Verification successful!');
        setTimeout(() => {
          navigate(userType === 'doctor' ? '/doctor-login' : '/patient-login');
        }, 1500);
      } else {
        setError(data.message || 'Verification failed');
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-0').focus();
      }
    } catch (err) {
      setError('Cannot connect to server. Please try again.');
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setResending(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = userType === 'doctor'
        ? 'http://localhost:5000/api/auth/doctor-resend-otp'
        : 'http://localhost:5000/api/auth/resend-otp';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('✅ New code sent! Check your email.');
        setResendCooldown(30);
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-0').focus();
      } else {
        if (data.remainingSeconds) {
          setResendCooldown(data.remainingSeconds);
        }
        setError(data.message || 'Failed to resend code');
      }
    } catch (err) {
      setError('Cannot connect to server. Please try again.');
      console.error('Resend error:', err);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="otp-verification-container">
      <div className="otp-card">
        <div className="otp-header">
          <div className="otp-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h2>Verify Your Email</h2>
          <p>We've sent a 6-digit code to</p>
          <p className="otp-email">{email}</p>
        </div>

        <form onSubmit={handleSubmit} className="otp-form">
          <div className="otp-inputs">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={`otp-input ${error ? 'error' : ''} ${success ? 'success' : ''}`}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {error && <div className="message error-message">{error}</div>}
          {success && <div className="message success-message">{success}</div>}

          <button 
            type="submit" 
            className="otp-submit-btn"
            disabled={loading || otp.join('').length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          <div className="otp-footer">
            <p>Didn't receive the code?</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="resend-btn"
            >
              {resending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="back-btn"
            >
              ← Back to Registration
            </button>
          )}
        </form>

        <div className="otp-help">
          <p>💡 Check your spam folder if you don't see the email</p>
          <p>⏱️ Code expires in 5 minutes</p>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
