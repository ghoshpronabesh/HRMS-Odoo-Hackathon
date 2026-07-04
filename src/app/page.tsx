'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AuthPage from '@/components/AuthPage';
import DashboardLayout from '@/components/DashboardLayout';
import OverviewPanel from '@/components/OverviewPanel';

export default function Home() {
  const { isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();

  if (isInitializing) {
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

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <DashboardLayout activeTab="overview">
      <div className="animate-fade-in">
        <OverviewPanel setActiveTab={(tab) => router.push(`/${tab}`)} />
      </div>
    </DashboardLayout>
  );
}
