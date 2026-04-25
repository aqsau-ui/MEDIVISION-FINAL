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
        const patientData = {
          ...data.user,
          country: formData.country,
          city: formData.city,
        };
        localStorage.setItem('patientData', JSON.stringify(patientData));
        localStorage.setItem('patientLocation', JSON.stringify({
          country: formData.country,
          city: formData.city,
        }));
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

  const EyeIcon = ({ show }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {show ? <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/> : <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>}
      {show && <line x1="1" y1="1" x2="23" y2="23"/>}
      {!show && <circle cx="12" cy="12" r="3"/>}
    </svg>
  );

  const PwdCrit = ({ ok, label }) => (
    <div style={{display:'flex',alignItems:'center',gap:6,fontSize:'var(--fs-xs)'}}>
      <div style={{width:14,height:14,borderRadius:'50%',background:ok?'var(--c-success)':'var(--c-border-strong)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        {ok && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" style={{width:8,height:8}}><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
      <span style={{color:ok?'var(--c-success)':'var(--c-text-muted)'}}>{label}</span>
    </div>
  );

  return (
    <div className="register-page">
      {/* ── Left Branding Panel ── */}
      <div className="auth-brand">
        <div className="auth-brand-content">
          <div className="auth-brand-logo"><Link to="/"><Logo size="medium" /></Link></div>
          <h1>Your Health,<br /><em>Our Priority</em></h1>
          <p>Create a free account and get AI-powered chest X-ray analysis reviewed by PMDC-verified doctors within minutes.</p>
          <div className="auth-brand-features">
            {[
              { icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>, text: "Secure & Private Health Data" },
              { icon: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>, text: "Results in Under 60 Seconds" },
              { icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>, text: "Connected to Verified Doctors" },
            ].map((f,i)=>(
              <div className="auth-brand-feat" key={i}>
                <div className="auth-brand-feat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{f.icon}</svg></div>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="auth-form-panel">
        <div className="auth-form-box">
          <div className="auth-form-header">
            <p className="auth-form-eyebrow">Patient Portal</p>
            <h2 className="auth-form-title">Create Account</h2>
            <p className="auth-form-sub">Join thousands of patients using MEDIVISION</p>
          </div>

          {serverError && (
            <div className="auth-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="auth-field">
              <label htmlFor="fullName" className="auth-label">Full Name</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input type="text" id="fullName" name="fullName" className={`auth-input${errors.fullName?' error':''}`} placeholder="Your full name" value={formData.fullName} onChange={handleChange}/>
              </div>
              {errors.fullName && <span style={{fontSize:'var(--fs-xs)',color:'var(--c-error)'}}>{errors.fullName}</span>}
            </div>

            {/* Email */}
            <div className="auth-field">
              <label htmlFor="email" className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <input type="email" id="email" name="email" className={`auth-input${errors.email?' error':''}`} placeholder="you@example.com" value={formData.email} onChange={handleChange} onBlur={handleBlur}/>
              </div>
              {errors.email && <span style={{fontSize:'var(--fs-xs)',color:'var(--c-error)'}}>{errors.email}</span>}
            </div>

            {/* Country + City in a row */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--sp-4)'}}>
              <div className="auth-field" ref={countryInputRef}>
                <label htmlFor="country" className="auth-label">Country</label>
                <div className="auth-input-wrap" style={{position:'relative'}}>
                  <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  <input type="text" id="country" name="country" className={`auth-input${errors.country?' error':''}`} placeholder={loadingCountries?'Loading...':'Search country'} value={formData.country} onChange={handleCountryInput} onFocus={()=>{if(formData.country.trim()&&filteredCountries.length>0)setShowCountryDropdown(true)}} autoComplete="off" disabled={loadingCountries}/>
                  {showCountryDropdown && (
                    <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:'var(--radius-md)',boxShadow:'var(--shadow-md)',maxHeight:180,overflowY:'auto',zIndex:400}}>
                      {filteredCountries.length>0 ? filteredCountries.map((c,i)=>(
                        <div key={i} style={{padding:'8px 14px',cursor:'pointer',fontSize:'var(--fs-sm)',color:'var(--c-text)'}} onMouseDown={e=>e.preventDefault()} onClick={()=>handleCountrySelect(c)}
                          onMouseEnter={e=>e.target.style.background='var(--c-border)'} onMouseLeave={e=>e.target.style.background=''}>{c}</div>
                      )) : <div style={{padding:'8px 14px',fontSize:'var(--fs-sm)',color:'var(--c-text-muted)'}}>No match</div>}
                    </div>
                  )}
                </div>
                {errors.country && <span style={{fontSize:'var(--fs-xs)',color:'var(--c-error)'}}>{errors.country}</span>}
              </div>
              <div className="auth-field">
                <label htmlFor="city" className="auth-label">City</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <input type="text" id="city" name="city" className={`auth-input${errors.city?' error':''}`} placeholder="Your city" value={formData.city} onChange={handleChange}/>
                </div>
                {errors.city && <span style={{fontSize:'var(--fs-xs)',color:'var(--c-error)'}}>{errors.city}</span>}
              </div>
            </div>

            {/* Password */}
            <div className="auth-field">
              <label htmlFor="password" className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input type={showPassword?'text':'password'} id="password" name="password" className={`auth-input has-toggle${errors.password?' error':''}`} placeholder="Min 8 chars" value={formData.password} onChange={handleChange}/>
                <button type="button" className="auth-input-toggle" onClick={()=>setShowPassword(!showPassword)}><EyeIcon show={showPassword}/></button>
              </div>
              {errors.password && <span style={{fontSize:'var(--fs-xs)',color:'var(--c-error)'}}>{errors.password}</span>}
              {formData.password && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 12px',marginTop:'var(--sp-2)'}}>
                  <PwdCrit ok={passwordCriteria.length} label="8+ characters"/>
                  <PwdCrit ok={passwordCriteria.upper} label="Uppercase"/>
                  <PwdCrit ok={passwordCriteria.lower} label="Lowercase"/>
                  <PwdCrit ok={passwordCriteria.digit} label="Number"/>
                  <PwdCrit ok={passwordCriteria.special} label="Special char"/>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="auth-field">
              <label htmlFor="confirmPassword" className="auth-label">Confirm Password</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input type={showConfirmPassword?'text':'password'} id="confirmPassword" name="confirmPassword" className={`auth-input has-toggle${errors.confirmPassword?' error':''}`} placeholder="Repeat password" value={formData.confirmPassword} onChange={handleChange}/>
                <button type="button" className="auth-input-toggle" onClick={()=>setShowConfirmPassword(!showConfirmPassword)}><EyeIcon show={showConfirmPassword}/></button>
              </div>
              {errors.confirmPassword && <span style={{fontSize:'var(--fs-xs)',color:'var(--c-error)'}}>{errors.confirmPassword}</span>}
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? <span className="auth-spinner"/> : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:16,height:16}}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              )}
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="auth-divider"><span>or</span></div>

            <GoogleSignInButton onSuccess={(userData) => {
              localStorage.setItem('patientData', JSON.stringify(userData));
              navigate('/patient-dashboard');
            }} />
          </form>

          <p className="auth-footer-link" style={{marginTop:'var(--sp-5)'}}>
            Already have an account? <Link to="/patient-login">Sign in</Link>
          </p>
        </div>
      </div>

      {/* ── OTP Verification Modal ── */}
      {showOTPVerification && (
        <div className="ds-modal-backdrop">
          <div className="ds-modal" style={{maxWidth:420}}>
            <div style={{textAlign:'center',marginBottom:'var(--sp-6)'}}>
              <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(56,178,172,0.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto var(--sp-4)'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--c-secondary)" strokeWidth="2" style={{width:26,height:26}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <h3 style={{fontSize:'var(--fs-xl)',fontWeight:'var(--fw-bold)',color:'var(--c-primary)',marginBottom:'var(--sp-2)'}}>Verify Your Email</h3>
              <p style={{fontSize:'var(--fs-sm)',color:'var(--c-text-secondary)'}}>6-digit code sent to <strong>{registeredEmail}</strong></p>
            </div>

            <div style={{display:'flex',gap:'var(--sp-2)',justifyContent:'center',marginBottom:'var(--sp-4)'}}>
              {otp.map((digit,index)=>(
                <input key={index} ref={el=>(otpInputRefs.current[index]=el)} type="text" maxLength="1"
                  style={{width:46,height:52,textAlign:'center',fontSize:'var(--fs-2xl)',fontWeight:'var(--fw-bold)',border:`2px solid ${otpError?'var(--c-error)':'var(--c-border-strong)'}`,borderRadius:'var(--radius-md)',background:'var(--c-surface)',color:'var(--c-primary)',outline:'none',transition:'border-color 0.2s'}}
                  value={digit} onChange={e=>handleOtpChange(index,e.target.value)} onKeyDown={e=>handleOtpKeyDown(index,e)} onPaste={handleOtpPaste} autoFocus={index===0}/>
              ))}
            </div>

            {otpAttempts>0 && otpAttempts<3 && (
              <p style={{textAlign:'center',fontSize:'var(--fs-xs)',color:'var(--c-error)',marginBottom:'var(--sp-2)'}}>
                {3-otpAttempts} attempt{3-otpAttempts!==1?'s':''} remaining
              </p>
            )}
            {otpError && <div className="auth-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{otpError}</div>}

            <button className="auth-submit" onClick={handleVerifyOtp} disabled={otpLoading||otpAttempts>=3} style={{marginBottom:'var(--sp-3)'}}>
              {otpLoading?<><span className="auth-spinner"/> Verifying...</>:'Verify Email'}
            </button>

            <p style={{textAlign:'center',fontSize:'var(--fs-xs)',color:'var(--c-text-secondary)',marginBottom:'var(--sp-3)'}}>
              Didn&apos;t receive it?{' '}
              <button onClick={handleResendOtp} disabled={resendCooldown>0||otpLoading} style={{background:'none',border:'none',cursor:'pointer',color:'var(--c-secondary)',fontWeight:'var(--fw-semi)',fontSize:'inherit',padding:0}}>
                {resendCooldown>0?`Resend in ${resendCooldown}s`:'Resend Code'}
              </button>
            </p>
            <button onClick={()=>{setShowOTPVerification(false);setOtp(['','','','','','']);setOtpError('');}}
              style={{width:'100%',background:'none',border:'1px solid var(--c-border)',borderRadius:'var(--radius-md)',padding:'10px',cursor:'pointer',fontSize:'var(--fs-sm)',color:'var(--c-text-secondary)'}}>
              Back to Registration
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;