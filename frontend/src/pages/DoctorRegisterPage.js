import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import './DoctorRegisterPage.css';

const DoctorRegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    cnicNumber: '',
    pmdcNumber: '',
    password: '',
    confirmPassword: ''
  });
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    // For generic fields
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

  // CNIC formatter: allow only digits and auto-insert dashes
  const formatCnic = (digits) => {
    const part1 = digits.slice(0,5);
    const part2 = digits.slice(5,12);
    const part3 = digits.slice(12,13);
    let out = part1;
    if (part2.length) out += '-' + part2;
    if (part3.length) out += '-' + part3;
    return out;
  };

  const handleCnicChange = (e) => {
    // only allow digits
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 13) val = val.slice(0,13);
    const formatted = formatCnic(val);
    setFormData({ ...formData, cnicNumber: formatted });
    if (errors.cnicNumber) setErrors({ ...errors, cnicNumber: '' });
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

  const validatePMDC = async (pmdcNumber, doctorName) => {
    try {
      // backend expects { pmdcNumber, fullName }
      const response = await fetch('http://localhost:5000/api/auth/validate-pmdc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pmdcNumber, fullName: doctorName })
      });
      const data = await response.json();
      
      if (!data.success) {
        // PMDC verification failed
        setServerError(data.message || 'Invalid PMDC number. Doctor not found in PMDC database.');
        return false;
      }
      
      // Check if data has isValid field for backward compatibility
      if (data.data && !data.data.isValid) {
        setServerError('Invalid PMDC number. Doctor not found in PMDC database.');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('PMDC validation error:', err);
      setServerError('Unable to verify PMDC number. Please check your internet connection and try again.');
      return false;
    }
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
    
    if (!formData.cnicNumber) {
      newErrors.cnicNumber = 'Please fill out this field.';
    } else {
      // CNIC format: #####-#######-# (e.g. 42101-1234567-1)
      const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
      if (!cnicRegex.test(formData.cnicNumber)) {
        newErrors.cnicNumber = 'CNIC must be in the format 12345-1234567-1.';
      }
    }
    if (!formData.pmdcNumber) newErrors.pmdcNumber = 'Please fill out this field.';
    
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
      setServerError('Verifying PMDC number from official website...');
      
      // Step 1: PMDC validation
      try {
        const isPMDCValid = await validatePMDC(formData.pmdcNumber, formData.fullName);
        
        if (!isPMDCValid) {
          // PMDC validation failed - stop here
          setLoading(false);
          return;
        }
        
        // Step 2: PMDC verified, now create account and send email OTP
        setServerError('✓ PMDC verified! Sending verification email...');

        console.log('Sending registration request:', {
          fullName: formData.fullName,
          email: formData.email,
          password: '***',
          cnicNumber: formData.cnicNumber,
          pmdcNumber: formData.pmdcNumber
        });

        const response = await fetch('http://localhost:5000/api/auth/doctor-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: formData.fullName,
            email: formData.email,
            password: formData.password,
            cnicNumber: formData.cnicNumber,
            pmdcNumber: formData.pmdcNumber
          })
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (data.success) {
          // Step 3: Email sent, show OTP verification modal
          setServerError('');
          setRegisteredEmail(formData.email);
          setShowOTPVerification(true);
        } else {
          const errorMsg = data.detail || data.message || 'Registration failed. Please try again.';
          console.error('Registration failed:', errorMsg);
          setServerError(errorMsg);
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
      console.log('Sending OTP verification:', { email: registeredEmail, otp: otpValue });
      
      const response = await fetch('http://localhost:5000/api/auth/doctor-verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail, otp: otpValue })
      });
      
      const data = await response.json();
      console.log('OTP verification response:', data);
      
      if (data.success) {
        localStorage.setItem('doctorData', JSON.stringify(data.doctor));
        navigate('/doctor-dashboard');
      } else {
        const newAttempts = otpAttempts + 1;
        setOtpAttempts(newAttempts);
        const errorMsg = data.detail || data.message || 'Verification failed. Please try again.';
        setOtpError(errorMsg);
        setOtp(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
        if (errorMsg.toLowerCase().includes('maximum') || errorMsg.toLowerCase().includes('register again')) {
          setTimeout(() => { setShowOTPVerification(false); setOtpAttempts(0); }, 2500);
        }
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setOtpError('Cannot connect to server. Please try again.');
      // Clear OTP boxes on error
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
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
      const response = await fetch('http://localhost:5000/api/auth/doctor-resend-otp', {
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
    <div className="doctor-register-page">
      {/* ── Left Branding Panel ── */}
      <div className="auth-brand">
        <div className="auth-brand-content">
          <div className="auth-brand-logo"><Link to="/"><Logo size="medium" /></Link></div>
          <h1>Register as a<br /><em>Verified Doctor</em></h1>
          <p>Join Pakistan&apos;s first AI-assisted radiology platform. Your PMDC credentials are verified automatically against the official database.</p>
          <div className="auth-brand-features">
            {[
              { icon: <><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></>, text: "Automatic PMDC Verification" },
              { icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>, text: "Issue Digital Prescriptions" },
              { icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>, text: "Manage Patient Cases" },
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
            <p className="auth-form-eyebrow">Doctor Portal</p>
            <h2 className="auth-form-title">Create Doctor Account</h2>
            <p className="auth-form-sub">PMDC number will be verified in real-time</p>
          </div>

          {serverError && (
            <div className={`auth-error${serverError.includes('✓')||serverError.includes('Verifying')||serverError.includes('Sending') ? ' info' : ''}`}
              style={serverError.includes('✓')||serverError.includes('Verifying')||serverError.includes('Sending') ? {background:'rgba(56,178,172,0.08)',borderColor:'rgba(56,178,172,0.25)',color:'var(--c-primary)'} : {}}>
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
                <input type="text" id="fullName" name="fullName" className={`auth-input${errors.fullName?' error':''}`} placeholder="Dr. Your Full Name" value={formData.fullName} onChange={handleChange}/>
              </div>
              {errors.fullName && <span style={{fontSize:'var(--fs-xs)',color:'var(--c-error)'}}>{errors.fullName}</span>}
            </div>

            {/* Email */}
            <div className="auth-field">
              <label htmlFor="email" className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <input type="email" id="email" name="email" className={`auth-input${errors.email?' error':''}`} placeholder="doctor@hospital.com" value={formData.email} onChange={handleChange} onBlur={handleBlur}/>
              </div>
              {errors.email && <span style={{fontSize:'var(--fs-xs)',color:'var(--c-error)'}}>{errors.email}</span>}
            </div>

            {/* CNIC + PMDC in a row */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--sp-4)'}}>
              <div className="auth-field">
                <label htmlFor="cnicNumber" className="auth-label">CNIC Number</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                  <input type="text" id="cnicNumber" name="cnicNumber" className={`auth-input${errors.cnicNumber?' error':''}`} placeholder="*****-*******-*" value={formData.cnicNumber} onChange={handleCnicChange}/>
                </div>
                {errors.cnicNumber && <span style={{fontSize:'var(--fs-xs)',color:'var(--c-error)'}}>{errors.cnicNumber}</span>}
              </div>
              <div className="auth-field">
                <label htmlFor="pmdcNumber" className="auth-label">PMDC Number</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <input type="text" id="pmdcNumber" name="pmdcNumber" className={`auth-input${errors.pmdcNumber?' error':''}`} placeholder="e.g. 38732-P" value={formData.pmdcNumber} onChange={handleChange}/>
                </div>
                {errors.pmdcNumber && <span style={{fontSize:'var(--fs-xs)',color:'var(--c-error)'}}>{errors.pmdcNumber}</span>}
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
                  <PwdCrit ok={passwordCriteria.length} label="8+ chars"/>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:16,height:16}}><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
              )}
              {loading ? 'Verifying PMDC...' : 'Register as Doctor'}
            </button>
          </form>

          <p className="auth-footer-link" style={{marginTop:'var(--sp-5)'}}>
            Already registered? <Link to="/doctor-login">Sign in</Link>
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
                  style={{width:46,height:52,textAlign:'center',fontSize:'var(--fs-2xl)',fontWeight:'var(--fw-bold)',border:`2px solid ${otpError?'var(--c-error)':'var(--c-border-strong)'}`,borderRadius:'var(--radius-md)',background:'var(--c-surface)',color:'var(--c-primary)',outline:'none'}}
                  value={digit} onChange={e=>handleOtpChange(index,e.target.value)} onKeyDown={e=>handleOtpKeyDown(index,e)} onPaste={handleOtpPaste} autoFocus={index===0}/>
              ))}
            </div>
            {otpAttempts>0&&otpAttempts<3&&(
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

export default DoctorRegisterPage;
