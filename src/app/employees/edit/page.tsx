'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/ui/CustomSelect';
import { Edit3 } from 'lucide-react';

const getDeptOptions = (currentVal: string) => {
  const base = [
    { value: 'Engineering', label: 'Engineering' },
    { value: 'Human Resources', label: 'Human Resources' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Finance', label: 'Finance' }
  ];
  if (currentVal && !base.some(opt => opt.value === currentVal)) {
    base.push({ value: currentVal, label: currentVal });
  }
  return base;
};

const getDesgOptions = (currentVal: string) => {
  const base = [
    { value: 'Software Engineer', label: 'Software Engineer' },
    { value: 'HR Director', label: 'HR Director' },
    { value: 'HR Associate', label: 'HR Associate' },
    { value: 'Sales Director', label: 'Sales Director' },
    { value: 'Sales Representative', label: 'Sales Representative' },
    { value: 'Marketing Lead', label: 'Marketing Lead' },
    { value: 'Finance Analyst', label: 'Finance Analyst' }
  ];
  if (currentVal && !base.some(opt => opt.value === currentVal)) {
    base.push({ value: currentVal, label: currentVal });
  }
  return base;
};

function EditEmployeeForm() {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const empId = searchParams.get('id');

  // Form States
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editDesg, setEditDesg] = useState('');
  const [editRole, setEditRole] = useState<'employee' | 'hr'>('employee');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPic, setEditPic] = useState('');

  const [loadingDetails, setLoadingDetails] = useState(true);
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

  // Load employee data on mount
  useEffect(() => {
    if (empId) {
      setLoadingDetails(true);
      fetch(`/api/employees/${empId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.employee_id) {
            setEditName(data.name || '');
            setEditEmail(data.email || '');
            setEditDept(data.department || '');
            setEditDesg(data.designation || '');
            setEditRole(data.role || 'employee');
            setEditStatus(data.status || 'active');
            setEditPhone(data.phone || '');
            setEditAddress(data.address || '');
            setEditPic(data.profile_pic || '');
            setLoadingDetails(false);
          } else {
            setModalError('Employee not found.');
            setLoadingDetails(false);
          }
        })
        .catch(err => {
          console.error(err);
          setModalError('Failed to fetch employee details.');
          setLoadingDetails(false);
        });
    }
  }, [empId]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId) return;

    setIsSubmitting(true);
    setModalError('');

    try {
      const res = await fetch(`/api/employees/${empId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          password: editPassword || undefined,
          role: editRole,
          status: editStatus,
          department: editDept.trim(),
          designation: editDesg.trim(),
          phone: editPhone.trim(),
          address: editAddress.trim(),
          profile_pic: editPic.trim()
        })
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (res.ok && data.success) {
        router.push('/employees');
      } else {
        setModalError(data.error || 'Failed to update employee.');
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

        {loadingDetails ? (
          <div style={{ position: 'relative', minHeight: '300px' }}>
            <div className="top-linear-loader"></div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Retrieving employee profile details...
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto', padding: '12px 0' }}>
            <h3 style={{ fontSize: '24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit3 size={24} style={{ color: 'var(--accent-cyan)' }} />
              Modify Employee Profile
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
              Change job details, profile parameters, or reset account credentials.
            </p>

            {modalError && (
              <div style={{ color: 'var(--danger)', fontSize: '13px', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: '6px', marginBottom: '20px' }}>
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="responsive-grid-1-1" style={{ gap: '16px' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label className="form-label">Employee ID (Disabled)</label>
                  <input
                    type="text"
                    disabled
                    value={empId || ''}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="responsive-grid-1-1" style={{ gap: '16px' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label className="form-label">Reset Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Enter new password to reset..."
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="responsive-grid-1-1" style={{ gap: '16px' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label className="form-label">Department</label>
                  <CustomSelect
                    options={getDeptOptions(editDept)}
                    value={editDept}
                    onChange={(val) => setEditDept(val)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label className="form-label">Designation / Role Title</label>
                  <CustomSelect
                    options={getDesgOptions(editDesg)}
                    value={editDesg}
                    onChange={(val) => setEditDesg(val)}
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
                    value={editRole}
                    onChange={(val) => setEditRole(val as 'employee' | 'hr')}
                  />
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label className="form-label">Employment Status</label>
                  <CustomSelect
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' }
                    ]}
                    value={editStatus}
                    onChange={(val) => setEditStatus(val as 'active' | 'inactive')}
                  />
                </div>
              </div>

              <div className="responsive-grid-1-1" style={{ gap: '16px' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label className="form-label">Contact Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label className="form-label">Residential Address</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Avatar URL</label>
                <input
                  type="text"
                  value={editPic}
                  onChange={(e) => setEditPic(e.target.value)}
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
                  {isSubmitting ? 'Updating...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function EditEmployeePage() {
  return (
    <Suspense fallback={
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-app)', zIndex: 9999 }}>
        <div className="top-linear-loader"></div>
      </div>
    }>
      <EditEmployeeForm />
    </Suspense>
  );
}
