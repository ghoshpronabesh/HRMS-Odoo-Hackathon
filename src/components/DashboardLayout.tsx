'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Clock, 
  CalendarRange, 
  CreditCard, 
  User, 
  Users, 
  LogOut, 
  Sun, 
  Moon, 
  UserX,
  Menu,
  X
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
}

import CustomSelect from './ui/CustomSelect';

export default function DashboardLayout({ children, activeTab }: DashboardLayoutProps) {
  const { user, adminUser, impersonating, stopImpersonating, logout, theme, toggleTheme, impersonateEmployee } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [allEmployees, setAllEmployees] = useState<{ employee_id: string; name: string }[]>([]);
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hourStr = hours.toString().padStart(2, '0');
      setCurrentTime(`${hourStr}:${minutes}:${seconds} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch employees list if user is HR, for quick switches
  useEffect(() => {
    if (user?.role === 'hr' && !impersonating) {
      fetch('/api/employees')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAllEmployees(data.map(emp => ({ employee_id: emp.employee_id, name: emp.name })));
          }
        })
        .catch(err => console.error(err));
    }
  }, [user, impersonating]);

  if (!user) return null;

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leave', label: 'Leaves', icon: CalendarRange },
    { id: 'payroll', label: 'Payroll', icon: CreditCard },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  // Add Employee Registry if HR Admin
  if (user.role === 'hr' && !impersonating) {
    menuItems.push({ id: 'employees', label: 'Employee Registry', icon: Users });
  }

  const handleMenuClick = (id: string) => {
    if (id === 'overview') {
      router.push('/');
    } else {
      router.push(`/${id}`);
    }
    setMobileSidebarOpen(false);
  };

  return (
    <div className="app-container">
      {/* Impersonation Banner */}
      {impersonating && adminUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '40px',
          background: 'linear-gradient(90deg, #b91c1c 0%, #7f1d1d 100%)',
          color: 'white',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          letterSpacing: '0.02em'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserX size={16} />
            VIEWING SESSION AS: {user.name} ({user.employee_id}) — Authenticated Admin: {adminUser.name}
          </span>
          <button 
            onClick={stopImpersonating}
            className="btn btn-secondary" 
            style={{
              padding: '2px 10px',
              fontSize: '12px',
              height: '24px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Return to HR Admin
          </button>
        </div>
      )}

      {/* Mobile Header Toggle */}
      <div style={{
        position: 'fixed',
        top: impersonating ? '40px' : 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'var(--bg-app)',
        borderBottom: '1px solid var(--border-color)',
        display: 'none',
        alignItems: 'center',
        padding: '0 16px',
        justifyContent: 'space-between',
        zIndex: 90
      }} className="mobile-header">
        <button 
          onClick={() => setMobileSidebarOpen(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
        >
          <Menu size={24} />
        </button>
        <span style={{ fontWeight: '700', fontSize: '18px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo.ico" alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          !ce Penguin HR
        </span>
        <button 
          onClick={toggleTheme}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside style={{
        width: '260px',
        background: 'var(--bg-sidebar)',
        backdropFilter: 'var(--glass-blur)',
        borderRight: '1px solid var(--border-color)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: impersonating ? '40px' : 0,
        bottom: 0,
        zIndex: 95,
        transition: 'transform 0.3s ease'
      }} className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
        
        {/* Mobile Sidebar Close */}
        <div style={{ display: 'none', justifyContent: 'flex-end', marginBottom: '16px' }} className="mobile-close">
          <button 
            onClick={() => setMobileSidebarOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Brand Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          paddingBottom: '24px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '28px'
        }}>
          <img 
            src="/logo.ico" 
            alt="" 
            style={{
              width: '40px',
              height: '40px',
              objectFit: 'contain'
            }} 
          />
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800' }} className="title-gradient">!ce Penguin HR</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              HR Dashboard
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, position: 'relative' }}>
          
          {/* Vertical sliding background indicator */}
          {menuItems.findIndex(item => item.id === activeTab) !== -1 && (
            <div 
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '38px',
                background: 'var(--accent-glow)',
                borderLeft: '3px solid var(--accent-cyan)',
                borderRadius: 'var(--border-radius)',
                borderTopLeftRadius: '0',
                borderBottomLeftRadius: '0',
                transform: `translateY(${menuItems.findIndex(item => item.id === activeTab) * 42}px)`,
                transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                zIndex: 1,
                pointerEvents: 'none'
              }}
            />
          )}

          {menuItems.map(item => {
            const IconComp = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '0 14px',
                  height: '38px',
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  fontWeight: active ? '600' : '400',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'color 0.2s ease',
                  zIndex: 2,
                  position: 'relative'
                }}
              >
                <IconComp size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Footer Account details */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Quick Impersonation Dropdown for Admins (in Sidebar) */}
          {user.role === 'hr' && !impersonating && allEmployees.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                Impersonate Employee
              </label>
              <CustomSelect
                options={allEmployees.map(emp => ({
                  value: emp.employee_id,
                  label: `${emp.name} (${emp.employee_id})`
                }))}
                value=""
                onChange={(val) => {
                  if (val) impersonateEmployee(val);
                }}
                placeholder="Select employee..."
                style={{ width: '100%' }}
                direction="up"
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src={user.profile_pic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
              alt={user.name} 
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--border-color)'
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.designation}
              </p>
            </div>
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '4px'
              }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Section */}
      <main className="main-content" style={{ marginTop: impersonating ? '40px' : '0' }}>
        {/* Desktop Header */}
        <header style={{
          position: 'sticky',
          top: impersonating ? '40px' : '0',
          zIndex: 100,
          background: 'var(--bg-sidebar)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 40px 12px 40px',
          marginLeft: '-40px',
          marginRight: '-40px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '0'
        }} className="desktop-header">
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, lineHeight: 1.2 }}>
              {menuItems.find(item => item.id === activeTab)?.label || 'Employee Registry'}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Welcome back, {user.name} • Local Time: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Live Clock Display */}
            {currentTime && (() => {
              const [timeStr, ampmStr] = currentTime.split(' ');
              return (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  background: 'var(--bg-card)', 
                  padding: '6px 14px', 
                  borderRadius: '30px', 
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  userSelect: 'none'
                }}>
                  <Clock size={14} style={{ color: 'var(--accent-cyan)' }} />
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    letterSpacing: '0.5px'
                  }}>
                    {timeStr}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-app)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    letterSpacing: '0.5px'
                  }}>
                    {ampmStr}
                  </span>
                </div>
              );
            })()}

            <button 
              onClick={toggleTheme}
              className="btn btn-secondary"
              style={{
                width: '42px',
                height: '42px',
                padding: 0,
                borderRadius: '50%'
              }}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* Panel Content */}
        <div style={{ flex: 1 }} className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }} className="animate-fade-in">
          <div className="glass-panel animate-scale-up" style={{
            maxWidth: '420px',
            width: '100%',
            padding: '28px',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'var(--danger)'
              }}>
                <LogOut size={20} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Confirm Logout</h3>
            </div>
            
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
              Are you sure you want to end your current session? You will need to log in again to access the dashboard.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="btn"
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  background: 'linear-gradient(135deg, var(--danger) 0%, #b91c1c 100%)',
                  color: 'white',
                  fontWeight: '600',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.2)'
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
