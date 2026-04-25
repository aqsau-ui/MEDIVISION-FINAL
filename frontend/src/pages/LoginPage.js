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
        console.log('Attempting login for:', email);
        const response = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('HTTP error response:', errorData);
          throw new Error(errorData.detail || errorData.message || `Server error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Login response data:', data);

        if (data.success) {
          console.log('Login successful, user data:', data.user);
          // Preserve any previously saved location details from registration.
          const savedPatientData = JSON.parse(localStorage.getItem('patientData') || '{}');
          const savedPatientLocation = JSON.parse(localStorage.getItem('patientLocation') || '{}');
          const mergedPatientData = {
            ...savedPatientData,
            ...data.user,
            country: savedPatientData.country || savedPatientLocation.country || data.user.country || '',
            city: savedPatientData.city || savedPatientLocation.city || data.user.city || '',
          };
          localStorage.setItem('patientData', JSON.stringify(mergedPatientData));
          if (mergedPatientData.country || mergedPatientData.city) {
            localStorage.setItem('patientLocation', JSON.stringify({
              country: mergedPatientData.country || '',
              city: mergedPatientData.city || '',
            }));
          }
          // Navigate to patient dashboard
          navigate('/patient-dashboard');
        } else if (data.requiresVerification) {
          // Show OTP verification screen
          setUnverifiedEmail(data.email || email);
          setShowOTPVerification(true);
        } else {
          setServerError(data.detail || data.message || 'Login failed. Please try again.');
          console.error('Login failed with message:', data.detail || data.message);
        }
      } catch (err) {
        console.error('Login error:', err);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        setServerError('Cannot connect to server. Please make sure the backend is running.');
      } finally {
        console.log('Setting loading to false');
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
      {/* ── Left Branding Panel ── */}
      <div className="auth-brand">
        <div className="auth-brand-content">
          <div className="auth-brand-logo"><Link to="/"><Logo size="medium" /></Link></div>
          <h1>Diagnose Smarter,<br /><em>Heal Faster</em></h1>
          <p>Upload your chest X-ray, receive an AI-powered analysis, and connect with a PMDC-verified doctor — all in one place.</p>
          <div className="auth-brand-features">
            {[
              { icon: <><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></>, text: "AI Pneumonia & TB Detection" },
              { icon: <><path d="M20 6L9 17l-5-5"/><circle cx="12" cy="8" r="4"/><path d="M8 21v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/></>, text: "PMDC-Verified Doctor Reviews" },
              { icon: <><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></>, text: "Progress Tracking Over Time" },
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
            <p className="auth-form-eyebrow">Patient Portal</p>
            <h2 className="auth-form-title">Welcome Back</h2>
            <p className="auth-form-sub">Sign in to access your health dashboard</p>
          </div>

          {serverError && (
            <div className="auth-error" style={{marginBottom:'1.2rem'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="auth-field">
              <label htmlFor="email" className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <input
                  type="email"
                  id="email"
                  className={`auth-input${errors.email ? ' error' : ''}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {errors.email && <span style={{fontSize:'var(--fs-xs)',color:'var(--c-error)'}}>{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="auth-field">
              <label htmlFor="password" className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className={`auth-input has-toggle${errors.password ? ' error' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="auth-input-toggle" onClick={() => setShowPassword(!showPassword)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPassword ? <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/> : <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>}
                    {showPassword && <line x1="1" y1="1" x2="23" y2="23"/>}
                    {!showPassword && <circle cx="12" cy="12" r="3"/>}
                  </svg>
                </button>
              </div>
              {errors.password && <span style={{fontSize:'var(--fs-xs)',color:'var(--c-error)'}}>{errors.password}</span>}
            </div>

            {/* Forgot password inline link */}
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
            Don&apos;t have an account? <Link to="/register">Create one</Link>
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
                    <input type="email" className="auth-input" placeholder="your@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} onKeyPress={e => e.key==='Enter' && handleForgotEmailSubmit()}/>
                  </div>
                </div>
                {forgotError && <div className="auth-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{forgotError}</div>}
                <button className="auth-submit" onClick={handleForgotEmailSubmit} disabled={forgotLoading} style={{marginBottom:'var(--sp-3)'}}>
                  {forgotLoading ? <><span className="auth-spinner"/> Sending...</> : 'Send Reset Code'}
                </button>
                <button onClick={() => setShowForgotPassword(false)} style={{width:'100%',background:'none',border:'1px solid var(--c-border)',borderRadius:'var(--radius-md)',padding:'10px',cursor:'pointer',fontSize:'var(--fs-sm)',color:'var(--c-text-secondary)'}}>
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
                  {forgotOtp.map((digit, index) => (
                    <input key={index} ref={el => (otpInputRefs.current[index]=el)} type="text" maxLength="1"
                      style={{width:42,height:48,textAlign:'center',fontSize:'var(--fs-xl)',fontWeight:'var(--fw-bold)',border:`2px solid ${forgotError?'var(--c-error)':'var(--c-border-strong)'}`,borderRadius:'var(--radius-md)',background:'var(--c-surface)',color:'var(--c-primary)',outline:'none'}}
                      value={digit} onChange={e=>handleOtpChange(index,e.target.value)} onKeyDown={e=>handleOtpKeyDown(index,e)} onPaste={handleOtpPaste} autoFocus={index===0}/>
                  ))}
                </div>
                {forgotError && <div className="auth-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{forgotError}</div>}
                <button className="auth-submit" onClick={handleVerifyOtp} disabled={forgotLoading} style={{marginBottom:'var(--sp-3)'}}>
                  {forgotLoading ? <><span className="auth-spinner"/> Verifying...</> : 'Verify Code'}
                </button>
                <p style={{textAlign:'center',fontSize:'var(--fs-xs)',color:'var(--c-text-secondary)',marginBottom:'var(--sp-3)'}}>
                  Didn&apos;t receive it?{' '}
                  <button onClick={handleResendOtp} disabled={resendCooldown>0||forgotLoading}
                    style={{background:'none',border:'none',cursor:'pointer',color:'var(--c-secondary)',fontWeight:'var(--fw-semi)',fontSize:'inherit',padding:0}}>
                    {resendCooldown>0 ? `Resend in ${resendCooldown}s` : 'Resend'}
                  </button>
                </p>
                <button onClick={() => setForgotStep(1)} style={{width:'100%',background:'none',border:'1px solid var(--c-border)',borderRadius:'var(--radius-md)',padding:'10px',cursor:'pointer',fontSize:'var(--fs-sm)',color:'var(--c-text-secondary)'}}>
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
                  {forgotLoading ? <><span className="auth-spinner"/> Resetting...</> : 'Reset Password'}
                </button>
                <button onClick={() => setShowForgotPassword(false)} style={{width:'100%',background:'none',border:'1px solid var(--c-border)',borderRadius:'var(--radius-md)',padding:'10px',cursor:'pointer',fontSize:'var(--fs-sm)',color:'var(--c-text-secondary)'}}>
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

export default LoginPage;