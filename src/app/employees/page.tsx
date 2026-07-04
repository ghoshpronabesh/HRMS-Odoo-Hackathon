'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import EmployeePanel from '@/components/EmployeePanel';

export default function EmployeesPage() {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitializing) {
      if (!isAuthenticated) {
        router.push('/');
      } else if (user?.role !== 'hr') {
        router.push('/');
      }
    }
  }, [isAuthenticated, isInitializing, user, router]);

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
      <div className="animate-fade-in">
        <EmployeePanel />
      </div>
    </DashboardLayout>
  );
}
