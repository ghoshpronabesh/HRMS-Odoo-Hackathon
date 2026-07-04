'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

export default function ChangePasswordPage() {
  const { isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();

  // Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility States
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isInitializing, router]);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          router.push('/profile');
        }, 1500);
      } else {
        setErrorMsg(data.error || 'Failed to change password.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg('Network error occurred.');
    }
  };

  if (isInitializing || !isAuthenticated) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-app)',
        zIndex: 9999,
        pointerEvents: 'none'
      }}>
        <div className="top-linear-loader"></div>
      </div>
    );
  }

  return (
    <DashboardLayout activeTab="profile">
      <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '8px' }}>
          <button 
            onClick={() => router.push('/profile')}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ← Back to Profile
          </button>
        </div>

        <div style={{ maxWidth: '500px', width: '100%', margin: '0 auto', padding: '12px 0' }}>
          <h3 style={{ fontSize: '24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={24} style={{ color: 'var(--accent-cyan)' }} />
            Change Password
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
            Ensure your account remains secure by updating your credential parameters.
          </p>

          {errorMsg && (
            <div style={{ color: 'var(--danger)', fontSize: '13px', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: '6px', marginBottom: '20px' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ color: 'var(--success)', fontSize: '13px', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 12px', borderRadius: '6px', marginBottom: '20px' }}>
              ✓ {successMsg}
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Current Password Field */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Current Password</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  placeholder="Enter current password..."
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingRight: '40px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  placeholder="Min. 8 chars, uppercase, lowercase, number, special..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingRight: '40px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Confirm New Password</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  placeholder="Re-type your new password..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingRight: '40px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => router.push('/profile')}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
