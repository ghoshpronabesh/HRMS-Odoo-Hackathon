'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/ui/CustomSelect';
import { UserPlus } from 'lucide-react';

export default function AddEmployeePage() {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const router = useRouter();

  // Form States
  const [newEmpId, setNewEmpId] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDept, setNewDept] = useState('Engineering');
  const [newDesg, setNewDesg] = useState('Software Engineer');
  const [newRole, setNewRole] = useState<'employee' | 'hr'>('employee');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPic, setNewPic] = useState('');
  
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isInitializing) {
      if (!isAuthenticated) {
        router.push('/');
      } else if (user?.role !== 'hr') {
        router.push('/');
      }
    }
  }, [isAuthenticated, isInitializing, user, router]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError('');

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: newEmpId.trim(),
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
          department: newDept.trim(),
          designation: newDesg.trim(),
          phone: newPhone.trim(),
          address: newAddress.trim(),
          profile_pic: newPic.trim()
        })
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (res.ok && data.success) {
        router.push('/employees');
      } else {
        setModalError(data.error || 'Failed to register employee.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setModalError('Network error occurred.');
    }
  };

  if (isInitializing || !isAuthenticated || user?.role !== 'hr') {
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
    <DashboardLayout activeTab="employees">
      <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '8px' }}>
          <button 
            onClick={() => router.push('/employees')}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ← Back to Directory
          </button>
        </div>

        <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto', padding: '12px 0' }}>
          <h3 style={{ fontSize: '24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={24} style={{ color: 'var(--accent-cyan)' }} />
            Register New Employee
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
            Create a new employee profile and initialize portal login credentials.
          </p>

          {modalError && (
            <div style={{ color: 'var(--danger)', fontSize: '13px', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: '6px', marginBottom: '20px' }}>
              ⚠️ {modalError}
            </div>
          )}

          <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="responsive-grid-1-1" style={{ gap: '16px' }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Employee ID (Unique)</label>
                <input
                  type="text"
                  required
                  placeholder="EMP002"
                  value={newEmpId}
                  onChange={(e) => setNewEmpId(e.target.value.toUpperCase())}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="responsive-grid-1-1" style={{ gap: '16px' }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Email Address (Unique)</label>
                <input
                  type="email"
                  required
                  placeholder="jane@icepenguin.in"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Password</label>
                <input
                  type="password"
                  required
                  placeholder="P@ssword123"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="responsive-grid-1-1" style={{ gap: '16px' }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Department</label>
                <CustomSelect
                  options={[
                    { value: 'Engineering', label: 'Engineering' },
                    { value: 'Human Resources', label: 'Human Resources' },
                    { value: 'Sales', label: 'Sales' },
                    { value: 'Marketing', label: 'Marketing' },
                    { value: 'Finance', label: 'Finance' }
                  ]}
                  value={newDept}
                  onChange={(val) => setNewDept(val)}
                />
              </div>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Designation / Role Title</label>
                <CustomSelect
                  options={[
                    { value: 'Software Engineer', label: 'Software Engineer' },
                    { value: 'HR Director', label: 'HR Director' },
                    { value: 'HR Associate', label: 'HR Associate' },
                    { value: 'Sales Director', label: 'Sales Director' },
                    { value: 'Sales Representative', label: 'Sales Representative' },
                    { value: 'Marketing Lead', label: 'Marketing Lead' },
                    { value: 'Finance Analyst', label: 'Finance Analyst' }
                  ]}
                  value={newDesg}
                  onChange={(val) => setNewDesg(val)}
                />
              </div>
            </div>

            <div className="responsive-grid-1-1" style={{ gap: '16px' }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Portal Access Level</label>
                <CustomSelect
                  options={[
                    { value: 'employee', label: 'Employee' },
                    { value: 'hr', label: 'HR Admin' }
                  ]}
                  value={newRole}
                  onChange={(val) => setNewRole(val as 'employee' | 'hr')}
                />
              </div>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Contact Number</label>
                <input
                  type="text"
                  placeholder="+1 555-0102"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Residential Address</label>
              <input
                type="text"
                placeholder="3 Blizzard Way, Antarctica"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Avatar URL</label>
              <input
                type="text"
                placeholder="https://images.unsplash.com/... (optional)"
                value={newPic}
                onChange={(e) => setNewPic(e.target.value)}
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => router.push('/employees')}
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
                {isSubmitting ? 'Registering...' : 'Register Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
