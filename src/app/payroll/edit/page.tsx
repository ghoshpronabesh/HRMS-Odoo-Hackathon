'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { IndianRupee } from 'lucide-react';

function EditSalaryForm() {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const empId = searchParams.get('employee_id');

  // Form States
  const [empName, setEmpName] = useState('');
  const [base, setBase] = useState('0');
  const [hra, setHra] = useState('0');
  const [da, setDa] = useState('0');
  const [specialAllowance, setSpecialAllowance] = useState('0');
  const [lopRate, setLopRate] = useState('0');

  const [loadingDetails, setLoadingDetails] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
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

  // Load salary structures
  useEffect(() => {
    if (empId) {
      setLoadingDetails(true);
      fetch('/api/payroll', {
        headers: { 'x-impersonate-employee': empId }
      })
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setEmpName(data.employee_name || empId);
            setBase(data.base.toString());
            setHra(data.hra.toString());
            setDa(data.da.toString());
            setSpecialAllowance(data.special_allowance.toString());
            setLopRate(data.lop_rate.toString());
            setLoadingDetails(false);
          } else {
            setErrorMsg('Salary details not found.');
            setLoadingDetails(false);
          }
        })
        .catch(err => {
          console.error(err);
          setErrorMsg('Failed to load salary structure details.');
          setLoadingDetails(false);
        });
    }
  }, [empId]);

  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/payroll/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: empId,
          base: parseFloat(base),
          hra: parseFloat(hra),
          da: parseFloat(da),
          special_allowance: parseFloat(specialAllowance),
          lop_rate: parseFloat(lopRate)
        })
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (res.ok && data.success) {
        router.push('/payroll');
      } else {
        setErrorMsg(data.error || 'Failed to update salary configuration.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg('Network request failed.');
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

  if (loadingDetails) {
    return (
      <div style={{ position: 'relative', minHeight: '300px' }} className="animate-fade-in">
        <div className="top-linear-loader"></div>
      </div>
    );
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '8px' }}>
        <button 
          onClick={() => router.push('/payroll')}
          className="btn btn-secondary"
          style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ← Back to Payroll
        </button>
      </div>

      <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto', padding: '12px 0' }}>
        <h3 style={{ fontSize: '24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IndianRupee size={24} style={{ color: 'var(--accent-cyan)' }} />
          Configure Salary Structure
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
          Adjust salary components for <strong>{empName}</strong> ({empId}).
        </p>

        {errorMsg && (
          <div style={{ color: 'var(--danger)', fontSize: '13px', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: '6px', marginBottom: '20px' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSalarySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Base Basic Pay (Rs.)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="responsive-grid-1-1" style={{ gap: '16px' }}>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label className="form-label">HRA Allowance (Rs.)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={hra}
                onChange={(e) => setHra(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label className="form-label">DA Allowance (Rs.)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={da}
                onChange={(e) => setDa(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="responsive-grid-1-1" style={{ gap: '16px' }}>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label className="form-label">Special Allowance (Rs.)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={specialAllowance}
                onChange={(e) => setSpecialAllowance(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label className="form-label">LOP Rate (/day) (Rs.)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={lopRate}
                onChange={(e) => setLopRate(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => router.push('/payroll')}
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
              {isSubmitting ? 'Updating...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditPayrollPage() {
  return (
    <DashboardLayout activeTab="payroll">
      <Suspense fallback={
        <div style={{ position: 'relative', minHeight: '300px' }} className="animate-fade-in">
          <div className="top-linear-loader"></div>
        </div>
      }>
        <EditSalaryForm />
      </Suspense>
    </DashboardLayout>
  );
}
