import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import './RegisterPage.css';

// ── Google Sign-In button (no extra package needed) ───────────────────────────
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const GoogleSignInButton = ({ onSuccess }) => {
  const btnRef = useRef(null);
  const [gError, setGError] = useState('');

  useEffect(() => {
    const initGoogle = () => {
      if (!window.google || !GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your-google-client-id-here') return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const res = await fetch('http://localhost:5000/api/auth/google-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential: response.credential }),
            });
            const data = await res.json();
            if (data.success) {
              onSuccess(data.user);
            } else {
              setGError(data.detail || 'Google sign-in failed. Please try again.');
            }
          } catch {
            setGError('Could not connect to server. Please try again.');
          }
        },
      });
      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline', size: 'large', width: '100%', text: 'signup_with',
        });
      }
    };

    if (window.google) { initGoogle(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [onSuccess]);

  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your-google-client-id-here') {
    return (
      <div style={{ textAlign:'center', color:'#718096', fontSize:'13px', padding:'8px', background:'#f7fafc', borderRadius:'8px', border:'1px dashed #e2e8f0' }}>
        Google Sign-In not configured.<br/>
        <span style={{ fontSize:'11px' }}>Add REACT_APP_GOOGLE_CLIENT_ID to frontend/.env</span>
      </div>
    );
  }

  return (
    <div>
      <div ref={btnRef} style={{ width:'100%' }} />
      {gError && <div style={{ color:'#e53e3e', fontSize:'13px', marginTop:'6px', textAlign:'center' }}>{gError}</div>}
    </div>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: '',
    city: ''
  });
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [countryError, setCountryError] = useState('');
  const countryInputRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    upper: false,
    lower: false,
    digit: false,
    special: false
  });
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  
  // OTP verification states
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const otpInputRefs = useRef([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Fetch countries from API on component mount
  useEffect(() => {
    const fetchCountries = async () => {
      setLoadingCountries(true);
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name');
        if (!response.ok) throw new Error('Failed to fetch countries');
        const data = await response.json();
        const countryNames = data
          .map(country => country.name.common)
          .sort((a, b) => a.localeCompare(b));
        setCountries(countryNames);
        setCountryError('');
      } catch (error) {
        console.error('Error fetching countries:', error);
        setCountryError('Failed to load countries. Please refresh the page.');
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (countryInputRef.current && !countryInputRef.current.contains(event.target)) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  // Handle country input with autocomplete
  const handleCountryInput = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, country: value });
    
    if (errors.country) {
      setErrors({ ...errors, country: '' });
    }
    
    if (value.trim()) {
      const filtered = countries.filter(country => 
        country.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCountries(filtered);
      setShowCountryDropdown(true);
    } else {
      setFilteredCountries([]);
      setShowCountryDropdown(false);
    }
  };

  // Handle country selection from dropdown
  const handleCountrySelect = (country) => {
    setFormData({ ...formData, country });
    setShowCountryDropdown(false);
    setFilteredCountries([]);
    if (errors.country) {
      setErrors({ ...errors, country: '' });
    }
  };


  // Live password criteria check
  useEffect(() => {
    const pwd = formData.password || '';
    setPasswordCriteria({
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      digit: /\d/.test(pwd),
      special: /[\W_]/.test(pwd)
    });
  }, [formData.password]);
  
  const handleBlur = (e) => {
    const { name, value } = e.target;
    const newErrors = { ...errors };
    
    if (name === 'email' && value) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors.email = 'Please enter a valid email address.';
      }
    }
    
    setErrors(newErrors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const newErrors = {};

    if (!formData.fullName) newErrors.fullName = 'Please fill out this field.';
    
    if (!formData.email) {
      newErrors.email = 'Please fill out this field.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    
    
    if (!formData.country) newErrors.country = 'Please select your country.';
    if (!formData.city) newErrors.city = 'Please fill out this field.';
    if (!formData.password) newErrors.password = 'Please fill out this field.';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please fill out this field.';
    
    if (formData.password) {
      // Strong password rules: minimum 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
      const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
      if (!strongPassword.test(formData.password)) {
        newErrors.password = 'Password must be at least 8 characters and include uppercase, lowercase, number and special character.';
      }
    }
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: formData.fullName,
            email: formData.email,
            password: formData.password,
            country: formData.country,
            city: formData.city
          })
        });

        const data = await response.json();

        if (data.success) {
          setServerError('');
          setRegisteredEmail(formData.email);
          setShowOTPVerification(true);
        } else {
          setServerError(data.message || 'Registration failed. Please try again.');
        }
      } catch (err) {
        setServerError('Cannot connect to server. Please make sure the backend is running.');
        console.error('Registration error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError('');
    
    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      setOtp(pastedData.split(''));
      setOtpError('');
      otpInputRefs.current[5]?.focus();
    }
  };

  // Submit OTP verification
  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    
    if (otpValue.length !== 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }
    
    setOtpLoading(true);
    setOtpError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail, otp: otpValue })
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('patientData', JSON.stringify(data.user));
        navigate('/patient-dashboard');
      } else {
        const newAttempts = otpAttempts + 1;
        setOtpAttempts(newAttempts);
        const msg = data.detail || data.message || 'Verification failed. Please try again.';
        setOtpError(msg);
        setOtp(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
        // If max attempts exceeded, close modal after a brief delay
        if (msg.toLowerCase().includes('maximum') || msg.toLowerCase().includes('register again')) {
          setTimeout(() => { setShowOTPVerification(false); setOtpAttempts(0); }, 2500);
        }
      }
    } catch (err) {
      setOtpError('Cannot connect to server. Please try again.');
      // Clear OTP boxes on error
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
      console.error('OTP verification error:', err);
    } finally {
      setOtpLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    setOtpLoading(true);
    setOtpError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResendCooldown(30);
        setOtp(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      } else {
        setOtpError(data.message || 'Failed to resend code.');
      }
    } catch (err) {
      setOtpError('Cannot connect to server. Please try again.');
      console.error('Resend OTP error:', err);
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="register-page">
      {/* Background Elements */}
      <div className="register-bg-elements">
        <div className="floating-circle circle-1"></div>
        <div className="floating-circle circle-2"></div>
        <div className="floating-circle circle-3"></div>
        <div className="floating-circle circle-4"></div>
      </div>

      {/* Navigation */}
      <nav className="register-navbar">
        <div className="register-nav-container">
          <Link to="/" className="register-logo">
            <Logo size="medium" />
          </Link>
        </div>
      </nav>

      {/* Registration Form Container */}
      <div className="register-container">
        <div className="register-card">
            <div className="register-header">
            <h1 className="register-brand">MEDIVISION</h1>
            <h2 className="register-title">Create Account</h2>
            <p className="register-subtitle">Join our platform for AI-powered health diagnosis</p>
            {serverError && <div className="error-message" style={{marginTop: '1rem', textAlign: 'center'}}>{serverError}</div>}
          </div>

          <form className="register-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fullName" className="form-label">
                Full Name *
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  className={`form-input ${errors.fullName ? 'error' : ''}`}
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>
              {errors.fullName && <span className="error-message">{errors.fullName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address *
              </label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              </div>
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            

            <div className="form-group" ref={countryInputRef}>
              <label htmlFor="country" className="form-label">
                Country *
              </label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <input
                  type="text"
                  id="country"
                  name="country"
                  className={`form-input ${errors.country ? 'error' : ''}`}
                  placeholder={loadingCountries ? "Loading countries..." : "Type to search country"}
                  value={formData.country}
                  onChange={handleCountryInput}
                  onFocus={() => {
                    if (formData.country.trim() && filteredCountries.length > 0) {
                      setShowCountryDropdown(true);
                    }
                  }}
                  autoComplete="off"
                  disabled={loadingCountries}
                />
                {showCountryDropdown && filteredCountries.length > 0 && (
                  <div className="country-dropdown">
                    {filteredCountries.map((country, index) => (
                      <div
                        key={index}
                        className="country-option"
                        onClick={() => handleCountrySelect(country)}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {country}
                      </div>
                    ))}
                  </div>
                )}
                {showCountryDropdown && formData.country.trim() && filteredCountries.length === 0 && (
                  <div className="country-dropdown">
                    <div className="country-option" style={{ color: '#999', cursor: 'default' }}>
                      No country found
                    </div>
                  </div>
                )}
              </div>
              {errors.country && <span className="error-message">{errors.country}</span>}
              {countryError && <span className="error-message">{countryError}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="city" className="form-label">
                City *
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="city"
                  name="city"
                  className={`form-input ${errors.city ? 'error' : ''}`}
                  placeholder="Enter your city"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
              {errors.city && <span className="error-message">{errors.city}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password *
              </label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <div className="password-criteria" style={{marginTop: '0.4rem'}}>
                <small style={{fontSize: '0.85rem', color: 'rgba(0,0,0,0.6)'}}>Password must include:</small>
                <ul style={{margin: '0.2rem 0 0 1rem', padding: 0, fontSize: '0.85rem', lineHeight: 1.2}}>
                  <li style={{color: passwordCriteria.length ? '#2e7d32' : 'rgba(0,0,0,0.2)'}}>Minimum 8 characters</li>
                  <li style={{color: passwordCriteria.upper ? '#2e7d32' : 'rgba(0,0,0,0.2)'}}>An uppercase letter</li>
                  <li style={{color: passwordCriteria.lower ? '#2e7d32' : 'rgba(0,0,0,0.2)'}}>A lowercase letter</li>
                  <li style={{color: passwordCriteria.digit ? '#2e7d32' : 'rgba(0,0,0,0.2)'}}>A number</li>
                  <li style={{color: passwordCriteria.special ? '#2e7d32' : 'rgba(0,0,0,0.2)'}}>A special character</li>
                </ul>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password *
              </label>
              <div className="input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showConfirmPassword ? (
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    ) : (
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    )}
                    {showConfirmPassword && <line x1="1" y1="1" x2="23" y2="23" />}
                    {!showConfirmPassword && <circle cx="12" cy="12" r="3" />}
                  </svg>
                </button>
              </div>
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            <button type="submit" className="register-button" disabled={loading}>
              <span>{loading ? 'Registering...' : 'Create Account'}</span>
              <div className="button-ripple"></div>
            </button>

            {/* Divider */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px', margin:'16px 0' }}>
              <div style={{ flex:1, height:'1px', background:'#e2e8f0' }} />
              <span style={{ color:'#718096', fontSize:'13px', whiteSpace:'nowrap' }}>or continue with</span>
              <div style={{ flex:1, height:'1px', background:'#e2e8f0' }} />
            </div>

            {/* Google Sign-In */}
            <GoogleSignInButton onSuccess={(userData) => {
              localStorage.setItem('patientData', JSON.stringify(userData));
              navigate('/patient-dashboard');
            }} />

            <div className="register-login">
              <span>Already have an account? </span>
              <Link to="/patient-login" className="login-link">Login here</Link>
            </div>
          </form>
        </div>

        {/* OTP Verification Modal Overlay */}
        {showOTPVerification && (
          <div className="otp-overlay">
            <div className="otp-modal">
              <div className="otp-modal-header">
                <div className="otp-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h2 className="otp-modal-title">Verify Your Email</h2>
                <p className="otp-modal-subtitle">
                  We've sent a 6-digit code to<br />
                  <strong>{registeredEmail}</strong>
                </p>
              </div>

              <div className="otp-input-container">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputRefs.current[index] = el)}
                    type="text"
                    maxLength="1"
                    className={`otp-input ${otpError ? 'error' : ''}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {/* Attempt counter */}
              {otpAttempts > 0 && otpAttempts < 3 && (
                <div style={{ textAlign:'center', fontSize:'12px', color:'#e53e3e', marginBottom:'6px' }}>
                  ⚠️ {3 - otpAttempts} attempt{3 - otpAttempts !== 1 ? 's' : ''} remaining
                </div>
              )}
              {otpError && <div className="otp-error">{otpError}</div>}

              <button
                className="otp-verify-button"
                onClick={handleVerifyOtp}
                disabled={otpLoading || otpAttempts >= 3}
              >
                {otpLoading ? 'Verifying...' : 'Verify Email'}
              </button>

              <div className="otp-resend-section">
                <p>Didn't receive the code?</p>
                <button
                  className="otp-resend-button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || otpLoading}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <button 
                className="otp-back-button"
                onClick={() => {
                  setShowOTPVerification(false);
                  setOtp(['', '', '', '', '', '']);
                  setOtpError('');
                }}
              >
                ← Back to Registration
              </button>
            </div>
          </div>
        )}

        {/* Decorative Elements */}
        <div className="register-decorations">
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

export default RegisterPage;