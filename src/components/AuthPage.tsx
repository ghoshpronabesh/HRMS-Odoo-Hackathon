'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, User, Hash, Check, X, ShieldAlert, Key, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import CustomSelect from './ui/CustomSelect';

export default function AuthPage() {
  const { login, error, setErrorMsg } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  // Login form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Register form states
  const [signUpStep, setSignUpStep] = useState(1);
  const [regEmpId, setRegEmpId] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<'employee' | 'hr'>('employee');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  
  // OTP Verification states
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [devOtp, setDevOtp] = useState(''); // Shown in UI for easy testing
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const displayError = localError || error;

  // Password validation checks
  const [passChecks, setPassChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  useEffect(() => {
    setErrorMsg(null);
    setLocalError(null);
    setSuccessMessage(null);
    setSignUpStep(1);
  }, [activeTab, setErrorMsg]);

  // Evaluate password on change
  useEffect(() => {
    setPassChecks({
      length: regPassword.length >= 8,
      uppercase: /[A-Z]/.test(regPassword),
      lowercase: /[a-z]/.test(regPassword),
      number: /\d/.test(regPassword),
      special: /[@$!%*?&]/.test(regPassword)
    });
  }, [regPassword]);

  const isPasswordValid = Object.values(passChecks).every(Boolean);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setIsSubmitting(true);
    setLocalError(null);
    setErrorMsg(null);
    const result = await login(loginEmail, loginPassword);
    setIsSubmitting(false);
    if (result.success) {
      setSuccessMessage('Logged in successfully! Redirecting...');
    } else {
      setLocalError(result.error || 'Invalid email or password');
    }
  };

  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!regEmpId || !regName || !regEmail) {
      setLocalError('Please fill in your ID, Name, and Email to continue.');
      return;
    }
    // Simple email regex check
    if (!/\S+@\S+\.\S+/.test(regEmail)) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    setLocalError(null);
    setSignUpStep(2);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmpId || !regName || !regEmail || !regPassword || !regConfirmPassword || !regRole) {
      setLocalError('All fields are required.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (!isPasswordValid) {
      setLocalError('Please satisfy all password criteria.');
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: regEmpId,
          name: regName,
          email: regEmail,
          password: regPassword,
          role: regRole
        })
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (res.ok && data.otp_required) {
        setOtpRequired(true);
        setVerificationToken(data.verification_token);
        setDevOtp(data.dev_otp);
      } else {
        setLocalError(data.error || 'Registration failed.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setLocalError('Server connection error. Please try again.');
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return;

    setIsSubmitting(true);
    setLocalError(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verification_code: otpCode,
          verification_token: verificationToken
        })
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (res.ok && data.success) {
        setSuccessMessage('Account verified and created successfully! Please sign in.');
        setOtpRequired(false);
        setActiveTab('signin');
        // Reset registration form
        setRegEmpId('');
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setRegConfirmPassword('');
        setRegRole('employee');
        setOtpCode('');
      } else {
        setLocalError(data.error || 'Verification failed.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setLocalError('Verification request failed.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'row',
      background: 'var(--bg-app)'
    }}>
      {/* LEFT COLUMN: Ice Penguin Branding Info (Hidden on Mobile) */}
      <div 
        style={{
          width: '56%',
          backgroundColor: '#0b0f19',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden'
        }}
        className="auth-left-panel"
      >
        {/* Top Header Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.ico" alt="Ice Penguin Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          <span style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'var(--font-display)', letterSpacing: '0.02em', color: '#ffffff' }}>Ice Penguin</span>
        </div>

        {/* Center Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px', margin: 'auto 0' }}>
          <span style={{ color: '#06b6d4', fontSize: '14px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            !ce Penguin HRMS
          </span>
          <h1 style={{ fontSize: '38px', fontWeight: '800', lineHeight: '1.2', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
            A cool & simplified workspace experience.
          </h1>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
            {[
              'Manage daily shifts & real-time clock-ins',
              'Access automated payroll & instant payslips',
              'Submit leaves & track approvals seamlessly'
            ].map((item, index) => (
              <div 
                key={index} 
                className="staggered-item"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  fontSize: '14px', 
                  color: '#9ca3af',
                  animationDelay: `${index * 150}ms`
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'rgba(6, 182, 212, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#06b6d4',
                  flexShrink: 0
                }}>
                  <Check size={12} strokeWidth={3} />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Copyright */}
        <div style={{ fontSize: '13px', color: '#4b5563' }}>
          © {new Date().getFullYear()} !ce Penguin HR
        </div>
      </div>

      {/* RIGHT COLUMN: Signup / Signin Card Block */}
      <div className="auth-right-panel">
        <div style={{
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {/* Mobile-Only Header Logo */}
          <div className="auth-mobile-logo" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <img src="/logo.ico" alt="Ice Penguin Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
            <h2 style={{ fontSize: '24px', fontWeight: '800' }}>!ce Penguin HR</h2>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <span style={{ color: 'var(--accent-cyan)', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {activeTab === 'signin' ? 'Welcome back' : 'Get started'}
            </span>
            <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px', color: 'var(--text-primary)' }}>
              {activeTab === 'signin' 
                ? 'Access your HR Portal' 
                : otpRequired 
                  ? 'Verify Identity' 
                  : `Create Account`}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
              {otpRequired 
                ? 'Please input the code generated for verification.' 
                : activeTab === 'signin'
                  ? 'Sign in with your workspace credentials to view shifts, leaves, and payroll.'
                  : 'Register your employee profile to get started with shift logging and payslip lookups.'}
            </p>
          </div>

          {/* Switcher Tabs Container */}
          {!otpRequired && (
            <div style={{
              display: 'flex',
              background: '#e2e8f0',
              padding: '4px',
              borderRadius: '10px',
              marginBottom: '28px',
              position: 'relative'
            }}>
              {/* Sliding active pill indicator */}
              <div style={{
                position: 'absolute',
                top: '4px',
                bottom: '4px',
                left: activeTab === 'signin' ? '4px' : 'calc(50% + 2px)',
                width: 'calc(50% - 6px)',
                background: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
                transition: 'left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                zIndex: 1
              }} />

              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setLocalError(null);
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '8px',
                  color: activeTab === 'signin' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'signin' ? '600' : '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  zIndex: 2,
                  position: 'relative',
                  transition: 'color 0.25s ease'
                }}
              >
                Password Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setSignUpStep(1);
                  setLocalError(null);
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '8px',
                  color: activeTab === 'signup' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'signup' ? '600' : '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  zIndex: 2,
                  position: 'relative',
                  transition: 'color 0.25s ease'
                }}
              >
                Create Account
              </button>
            </div>
          )}



          {successMessage && (
            <div style={{
              background: 'var(--success-bg)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 'var(--border-radius)',
              padding: '12px 16px',
              color: 'var(--success)',
              fontSize: '14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Check size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* MOCK DEV OTP BANNER */}
          {otpRequired && devOtp && (
            <div style={{
              background: 'var(--info-bg)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--border-radius)',
              padding: '12px 16px',
              color: 'var(--info)',
              fontSize: '13px',
              marginBottom: '20px'
            }}>
              💡 <strong>[Development Mode]</strong> A verification OTP has been generated: <strong>{devOtp}</strong>
            </div>
          )}

          {/* MAIN FORMS */}
          {otpRequired ? (
            /* OTP INPUT VIEW */
            <form onSubmit={handleOtpVerify} className="auth-form-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="otp-input">Verification Code</label>
                <div style={{ position: 'relative' }}>
                  <Key size={18} style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    id="otp-input"
                    type="text"
                    required
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '42px' }}
                  />
                </div>
              </div>
              {displayError && (
                <div className="auth-form-container" style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--border-radius)',
                  padding: '10px 14px',
                  color: 'var(--danger)',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '4px',
                  marginBottom: '4px'
                }}>
                  <ShieldAlert size={14} />
                  <span>{displayError}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-auth-primary"
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isSubmitting ? (
                  <>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite'
                    }} />
                    Verifying...
                  </>
                ) : (
                  'Verify & Setup'
                )}
              </button>
            </form>
          ) : activeTab === 'signin' ? (
            /* SIGN IN VIEW */
            <form onSubmit={handleLoginSubmit} className="auth-form-container" key={activeTab} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="email-input">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    id="email-input"
                    type="email"
                    required
                    placeholder="name@icepenguin.in"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '42px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="password-input">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    id="password-input"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '42px', paddingRight: '42px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                  >
                    {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {displayError && (
                <div className="auth-form-container" style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--border-radius)',
                  padding: '10px 14px',
                  color: 'var(--danger)',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '4px',
                  marginBottom: '4px'
                }}>
                  <ShieldAlert size={14} />
                  <span>{displayError}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-auth-primary"
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isSubmitting ? (
                  <>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite'
                    }} />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          ) : (
            /* MULTI-STEP SIGN UP VIEW */
            <form onSubmit={handleRegisterSubmit} className="auth-form-container" key={`${signUpStep}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {signUpStep === 1 ? (
                /* STEP 1: Basic details (ID, Name, Email, Role) */
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="reg-emp-id">Employee ID</label>
                    <div style={{ position: 'relative' }}>
                      <Hash size={18} style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                      }} />
                      <input
                        id="reg-emp-id"
                        type="text"
                        required
                        placeholder="EMP002"
                        value={regEmpId}
                        onChange={(e) => setRegEmpId(e.target.value.toUpperCase())}
                        className="form-input"
                        style={{ paddingLeft: '42px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="reg-name">Full Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                      }} />
                      <input
                        id="reg-name"
                        type="text"
                        required
                        placeholder="Pingu Jr."
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '42px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="reg-email">Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                      }} />
                      <input
                        id="reg-email"
                        type="email"
                        required
                        placeholder="pingu2@icepenguin.in"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '42px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="reg-role">Access Role</label>
                    <CustomSelect
                      options={[
                        { value: 'employee', label: 'Employee' },
                        { value: 'hr', label: 'HR Admin' }
                      ]}
                      value={regRole}
                      onChange={(val) => setRegRole(val as 'employee' | 'hr')}
                    />
                  </div>

                  {displayError && (
                    <div className="auth-form-container" style={{
                      background: 'var(--danger-bg)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 'var(--border-radius)',
                      padding: '10px 14px',
                      color: 'var(--danger)',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '4px',
                      marginBottom: '4px'
                    }}>
                      <ShieldAlert size={14} />
                      <span>{displayError}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="btn btn-auth-primary"
                    style={{ width: '100%', padding: '12px', marginTop: '12px' }}
                  >
                    Next Step
                  </button>
                </div>
              ) : (
                /* STEP 2: Passwords (New pass, Confirm pass) */
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="reg-password">New Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                      }} />
                      <input
                        id="reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '42px', paddingRight: '42px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        style={{
                          position: 'absolute',
                          right: '14px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 0
                        }}
                      >
                        {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Password criteria checklist */}
                    {regPassword && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        background: 'rgba(0,0, 0, 0.03)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          color: 'var(--text-muted)',
                          letterSpacing: '0.05em',
                          marginBottom: '4px'
                        }}>Password Requirements:</div>
                        {[
                          { check: passChecks.length, label: 'At least 8 characters' },
                          { check: passChecks.uppercase, label: 'One uppercase letter (A-Z)' },
                          { check: passChecks.lowercase, label: 'One lowercase letter (a-z)' },
                          { check: passChecks.number, label: 'One number (0-9)' },
                          { check: passChecks.special, label: 'One special character (@$!%*?&)' }
                        ].map((item, index) => (
                          <div key={index} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            color: item.check ? 'var(--success)' : 'var(--text-muted)'
                          }}>
                            {item.check ? <Check size={14} style={{ color: 'var(--success)' }} /> : <X size={14} style={{ color: 'var(--text-muted)' }} />}
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="reg-confirm-password">Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                      }} />
                      <input
                        id="reg-confirm-password"
                        type={showRegConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '42px', paddingRight: '42px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '14px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 0
                        }}
                      >
                        {showRegConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {displayError && (
                    <div className="auth-form-container" style={{
                      background: 'var(--danger-bg)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 'var(--border-radius)',
                      padding: '10px 14px',
                      color: 'var(--danger)',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '4px',
                      marginBottom: '4px'
                    }}>
                      <ShieldAlert size={14} />
                      <span>{displayError}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setSignUpStep(1)}
                      className="btn btn-secondary"
                      style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting || !isPasswordValid || regPassword !== regConfirmPassword}
                      className="btn btn-auth-primary"
                      style={{ 
                        flex: 1, 
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <div style={{
                            width: '18px',
                            height: '18px',
                            border: '2px solid rgba(255, 255, 255, 0.3)',
                            borderTopColor: '#ffffff',
                            borderRadius: '50%',
                            animation: 'spin 0.6s linear infinite'
                          }} />
                          Creating...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
