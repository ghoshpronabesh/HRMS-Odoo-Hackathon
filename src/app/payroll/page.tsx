'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import PayrollPanel from '@/components/PayrollPanel';

export default function PayrollPage() {
  const { isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isInitializing, router]);

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
    <DashboardLayout activeTab="payroll">
      <div className="animate-fade-in">
        <PayrollPanel />
      </div>
    </DashboardLayout>
  );
}
