import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import OTPVerification from '../components/OTPVerification';
import './DoctorLoginPage.css';

const DoctorLoginPage = () => {
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
      const response = await fetch('http://localhost:5000/api/auth/doctor-forgot-password', {
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
      const response = await fetch('http://localhost:5000/api/auth/doctor-verify-reset-otp', {
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
      const response = await fetch('http://localhost:5000/api/auth/doctor-reset-password', {
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
      const response = await fetch('http://localhost:5000/api/auth/doctor-resend-reset-otp', {
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
        const response = await fetch('http://localhost:5000/api/auth/doctor-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
          // Store doctor data in localStorage (handle both 'doctor' and 'user' fields for compatibility)
          const doctorData = data.doctor || data.user;
          if (doctorData) {
            localStorage.setItem('doctorData', JSON.stringify(doctorData));
            console.log('Doctor login successful:', doctorData);
            // Navigate directly to dashboard
            navigate('/doctor-dashboard');
          } else {
            setServerError('Invalid server response. Please try again.');
            console.error('No doctor data in response:', data);
          }
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

  // Show OTP verification screen if doctor is unverified
  if (showOTPVerification) {
    return (
      <OTPVerification 
        email={unverifiedEmail} 
        userType="doctor"
        onBack={() => setShowOTPVerification(false)}
      />
    );
  }

  return (
    <div className="doctor-login-page">
      {/* ── Left Branding Panel ── */}
      <div className="auth-brand">
        <div className="auth-brand-content">
          <div className="auth-brand-logo"><Link to="/"><Logo size="medium" /></Link></div>
          <h1>The Clinical<br /><em>Dashboard for Doctors</em></h1>
          <p>Review AI-flagged X-rays, issue digital prescriptions, and manage your patients — all from one PMDC-verified portal.</p>
          <div className="auth-brand-features">
            {[
              { icon: <><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></>, text: "PMDC-Verified Identity" },
              { icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>, text: "Patient Record Management" },
              { icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>, text: "Digital Prescription Issuance" },
            ].map((f,i) => (
              <div className="auth-brand-feat" key={i}>
                <div className="auth-brand-feat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{f.icon}</svg>
                </div>
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
            <h2 className="auth-form-title">Welcome Back, Doctor</h2>
            <p className="auth-form-sub">Sign in to access your professional dashboard</p>
          </div>

          {serverError && (
            <div className="auth-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="email" className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <input type="email" id="email" className={`auth-input${errors.email?' error':''}`} placeholder="doctor@hospital.com" value={email} onChange={e=>setEmail(e.target.value)}/>
              </div>
              {errors.email && <span style={{fontSize:'var(--fs-xs)',color:'var(--c-error)'}}>{errors.email}</span>}
            </div>

            <div className="auth-field">
              <label htmlFor="password" className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input type={showPassword?'text':'password'} id="password" className={`auth-input has-toggle${errors.password?' error':''}`} placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)}/>
                <button type="button" className="auth-input-toggle" onClick={()=>setShowPassword(!showPassword)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPassword?<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>:<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>}
                    {showPassword&&<line x1="1" y1="1" x2="23" y2="23"/>}
                    {!showPassword&&<circle cx="12" cy="12" r="3"/>}
                  </svg>
                </button>
              </div>
              {errors.password && <span style={{fontSize:'var(--fs-xs)',color:'var(--c-error)'}}>{errors.password}</span>}
            </div>

            <div style={{textAlign:'right',marginTop:'-8px',marginBottom:'var(--sp-5)'}}>
              <button type="button" onClick={handleForgotPasswordClick}
                style={{background:'none',border:'none',cursor:'pointer',fontSize:'var(--fs-xs)',color:'var(--c-secondary)',fontWeight:'var(--fw-semi)',padding:0}}>
                Forgot password?
              </button>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? <span className="auth-spinner"/> : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:16,height:16}}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              )}
              {loading ? 'Signing in...' : 'Sign In Securely'}
            </button>
          </form>

          <p className="auth-footer-link" style={{marginTop:'var(--sp-6)'}}>
            Not registered yet? <Link to="/doctor-register">Register as Doctor</Link>
          </p>
        </div>
      </div>

      {/* ── Forgot Password Modal ── */}
      {showForgotPassword && (
        <div className="ds-modal-backdrop" onClick={() => setShowForgotPassword(false)}>
          <div className="ds-modal" style={{maxWidth:400}} onClick={e => e.stopPropagation()}>
            {forgotStep === 1 && (
              <>
                <div style={{textAlign:'center',marginBottom:'var(--sp-6)'}}>
                  <div style={{width:48,height:48,borderRadius:'50%',background:'rgba(56,178,172,0.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto var(--sp-4)'}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--c-secondary)" strokeWidth="2" style={{width:22,height:22}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  </div>
                  <h3 style={{fontSize:'var(--fs-xl)',fontWeight:'var(--fw-bold)',color:'var(--c-primary)',marginBottom:'var(--sp-2)'}}>Forgot Password?</h3>
                  <p style={{fontSize:'var(--fs-sm)',color:'var(--c-text-secondary)'}}>Enter your email and we will send a reset code</p>
                </div>
                <div className="auth-field">
                  <div className="auth-input-wrap">
                    <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <input type="email" className="auth-input" placeholder="your@email.com" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleForgotEmailSubmit()}/>
                  </div>
                </div>
                {forgotError && <div className="auth-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{forgotError}</div>}
                <button className="auth-submit" onClick={handleForgotEmailSubmit} disabled={forgotLoading} style={{marginBottom:'var(--sp-3)'}}>
                  {forgotLoading?<><span className="auth-spinner"/> Sending...</>:'Send Reset Code'}
                </button>
                <button onClick={()=>setShowForgotPassword(false)} style={{width:'100%',background:'none',border:'1px solid var(--c-border)',borderRadius:'var(--radius-md)',padding:'10px',cursor:'pointer',fontSize:'var(--fs-sm)',color:'var(--c-text-secondary)'}}>
                  Back to Login
                </button>
              </>
            )}
            {forgotStep === 2 && (
              <>
                <div style={{textAlign:'center',marginBottom:'var(--sp-6)'}}>
                  <div style={{width:48,height:48,borderRadius:'50%',background:'rgba(56,178,172,0.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto var(--sp-4)'}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--c-secondary)" strokeWidth="2" style={{width:22,height:22}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <h3 style={{fontSize:'var(--fs-xl)',fontWeight:'var(--fw-bold)',color:'var(--c-primary)',marginBottom:'var(--sp-2)'}}>Enter Reset Code</h3>
                  <p style={{fontSize:'var(--fs-sm)',color:'var(--c-text-secondary)'}}>6-digit code sent to <strong>{forgotEmail}</strong></p>
                </div>
                <div style={{display:'flex',gap:'var(--sp-2)',justifyContent:'center',marginBottom:'var(--sp-4)'}}>
                  {forgotOtp.map((digit,index)=>(
                    <input key={index} ref={el=>(otpInputRefs.current[index]=el)} type="text" maxLength="1"
                      style={{width:42,height:48,textAlign:'center',fontSize:'var(--fs-xl)',fontWeight:'var(--fw-bold)',border:`2px solid ${forgotError?'var(--c-error)':'var(--c-border-strong)'}`,borderRadius:'var(--radius-md)',background:'var(--c-surface)',color:'var(--c-primary)',outline:'none'}}
                      value={digit} onChange={e=>handleOtpChange(index,e.target.value)} onKeyDown={e=>handleOtpKeyDown(index,e)} onPaste={handleOtpPaste} autoFocus={index===0}/>
                  ))}
                </div>
                {forgotError && <div className="auth-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{forgotError}</div>}
                <button className="auth-submit" onClick={handleVerifyOtp} disabled={forgotLoading} style={{marginBottom:'var(--sp-3)'}}>
                  {forgotLoading?<><span className="auth-spinner"/> Verifying...</>:'Verify Code'}
                </button>
                <p style={{textAlign:'center',fontSize:'var(--fs-xs)',color:'var(--c-text-secondary)',marginBottom:'var(--sp-3)'}}>
                  Didn&apos;t receive it?{' '}
                  <button onClick={handleResendOtp} disabled={resendCooldown>0||forgotLoading} style={{background:'none',border:'none',cursor:'pointer',color:'var(--c-secondary)',fontWeight:'var(--fw-semi)',fontSize:'inherit',padding:0}}>
                    {resendCooldown>0?`Resend in ${resendCooldown}s`:'Resend'}
                  </button>
                </p>
                <button onClick={()=>setForgotStep(1)} style={{width:'100%',background:'none',border:'1px solid var(--c-border)',borderRadius:'var(--radius-md)',padding:'10px',cursor:'pointer',fontSize:'var(--fs-sm)',color:'var(--c-text-secondary)'}}>
                  Back
                </button>
              </>
            )}
            {forgotStep === 3 && (
              <>
                <div style={{textAlign:'center',marginBottom:'var(--sp-6)'}}>
                  <div style={{width:48,height:48,borderRadius:'50%',background:'rgba(56,178,172,0.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto var(--sp-4)'}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--c-secondary)" strokeWidth="2" style={{width:22,height:22}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <h3 style={{fontSize:'var(--fs-xl)',fontWeight:'var(--fw-bold)',color:'var(--c-primary)',marginBottom:'var(--sp-2)'}}>New Password</h3>
                  <p style={{fontSize:'var(--fs-sm)',color:'var(--c-text-secondary)'}}>Choose a strong new password</p>
                </div>
                <div className="auth-field">
                  <div className="auth-input-wrap">
                    <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input type={showNewPassword?'text':'password'} className="auth-input has-toggle" placeholder="New password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/>
                    <button type="button" className="auth-input-toggle" onClick={()=>setShowNewPassword(!showNewPassword)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {showNewPassword?<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>:<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>}
                        {showNewPassword&&<line x1="1" y1="1" x2="23" y2="23"/>}
                        {!showNewPassword&&<circle cx="12" cy="12" r="3"/>}
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="auth-field">
                  <div className="auth-input-wrap">
                    <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input type={showConfirmNewPassword?'text':'password'} className="auth-input has-toggle" placeholder="Confirm new password" value={confirmNewPassword} onChange={e=>setConfirmNewPassword(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleResetPassword()}/>
                    <button type="button" className="auth-input-toggle" onClick={()=>setShowConfirmNewPassword(!showConfirmNewPassword)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {showConfirmNewPassword?<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>:<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>}
                        {showConfirmNewPassword&&<line x1="1" y1="1" x2="23" y2="23"/>}
                        {!showConfirmNewPassword&&<circle cx="12" cy="12" r="3"/>}
                      </svg>
                    </button>
                  </div>
                </div>
                {forgotError && <div className="auth-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{forgotError}</div>}
                <button className="auth-submit" onClick={handleResetPassword} disabled={forgotLoading} style={{marginBottom:'var(--sp-3)'}}>
                  {forgotLoading?<><span className="auth-spinner"/> Resetting...</>:'Reset Password'}
                </button>
                <button onClick={()=>setShowForgotPassword(false)} style={{width:'100%',background:'none',border:'1px solid var(--c-border)',borderRadius:'var(--radius-md)',padding:'10px',cursor:'pointer',fontSize:'var(--fs-sm)',color:'var(--c-text-secondary)'}}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorLoginPage;
