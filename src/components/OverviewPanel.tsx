'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchWithCache, invalidateCache } from '@/lib/clientCache';
import { Clock, Calendar, ShieldCheck, HelpCircle, Users, ClipboardCheck, IndianRupee, ArrowRight, UserCheck } from 'lucide-react';

function CountUp({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress); // easeOutQuad
      const currentCount = Math.floor(easeProgress * (end - start) + start);
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{count}</>;
}

interface OverviewPanelProps {
  setActiveTab: (tab: string) => void;
}

export default function OverviewPanel({ setActiveTab }: OverviewPanelProps) {
  const { user, impersonateEmployee, impersonating, logout } = useAuth();
  const router = useRouter();
  
  // States
  const [attendanceToday, setAttendanceToday] = useState<any>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    unpaidLeavesMonth: 0
  });
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [todayPunches, setTodayPunches] = useState<any[]>([]);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [isPunching, setIsPunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper to format date YYYY-MM-DD in local timezone
  const getLocalDateStr = () => {
    const localDate = new Date();
    const offset = localDate.getTimezoneOffset();
    const localDateAdjusted = new Date(localDate.getTime() - (offset * 60 * 1000));
    return localDateAdjusted.toISOString().split('T')[0];
  };

  // Fetch employee specific dashboard data
  const fetchEmployeeData = useCallback(async () => {
    try {
      // 1. Get today's attendance status
      const attLogs = await fetchWithCache('/api/attendance', {
        headers: impersonating ? { 'x-impersonate-employee': user?.employee_id || '' } : {}
      });
      setAttendanceLogs(attLogs);
      const todayStr = getLocalDateStr();
      const todayRecord = attLogs.find((log: any) => {
        const d = new Date(log.date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}` === todayStr;
      });
      setAttendanceToday(todayRecord || null);

      // 2. Get my leaves for status checklist
      const leaveData = await fetchWithCache('/api/leaves', {
        headers: impersonating ? { 'x-impersonate-employee': user?.employee_id || '' } : {}
      });
      setMyLeaves(leaveData.slice(0, 5)); // Keep last 5 requests
    } catch (err) {
      console.error(err);
    }
  }, [impersonating, user?.employee_id]);

  // Fetch HR admin specific overview details
  const fetchAdminData = useCallback(async () => {
    try {
      // Get all employees list
      const employees = await fetchWithCache('/api/employees');
      setAllEmployees(employees);
      
      // Get all attendance to see who is present today
      const allAtt = await fetchWithCache('/api/attendance');
      const todayStr = getLocalDateStr();
      const activePunches = allAtt.filter((log: any) => {
        const d = new Date(log.date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}` === todayStr;
      });
      setTodayPunches(activePunches);

      const presentTodayCount = activePunches.filter((log: any) => log.status !== 'Absent').length;

      // Get leave requests
      const leaves = await fetchWithCache('/api/leaves');
      const pending = leaves.filter((l: any) => l.status === 'Pending');
      setLeaveRequests(pending.slice(0, 5));

      setStats({
        totalEmployees: employees.length,
        presentToday: presentTodayCount,
        pendingLeaves: pending.length,
        unpaidLeavesMonth: leaves.filter((l: any) => l.type === 'Unpaid' && l.status === 'Approved').length
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Synchronize dashboard elements
  useEffect(() => {
    if (!user) return;
    if (user.role === 'hr' && !impersonating) {
      fetchAdminData();
    } else {
      fetchEmployeeData();
    }
  }, [user, impersonating, fetchAdminData, fetchEmployeeData]);

  // Active Punch Timer logic
  useEffect(() => {
    if (!attendanceToday || !attendanceToday.check_in || attendanceToday.check_out) {
      setElapsedTime('00:00:00');
      return;
    }

    const interval = setInterval(() => {
      const checkInTime = new Date(attendanceToday.check_in).getTime();
      const now = new Date().getTime();
      const diff = now - checkInTime;

      if (diff < 0) {
        setElapsedTime('00:00:00');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');
      setElapsedTime(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [attendanceToday]);

  // Handle punch button trigger
  const handlePunch = async () => {
    setIsPunching(true);
    setErrorMsg(null);
    const action = attendanceToday ? 'out' : 'in';
    try {
      const res = await fetch('/api/attendance/punch', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(impersonating ? { 'x-impersonate-employee': user?.employee_id || '' } : {})
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        invalidateCache('/api/attendance');
        await fetchEmployeeData();
      } else {
        setErrorMsg(data.error || 'Failed to register punch.');
      }
    } catch (err) {
      setErrorMsg('Connection error.');
    } finally {
      setIsPunching(false);
    }
  };

  const recentActivities = useMemo(() => {
    if (!user) return [];
    const list: { id: string; type: string; title: string; desc: string; date: Date; badge?: string }[] = [];

    // 1. Process attendance logs
    attendanceLogs.forEach((log: any) => {
      const logDate = new Date(log.date);
      const formattedDate = logDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      
      if (log.check_in) {
        list.push({
          id: `att-in-${log.id}`,
          type: 'attendance_in',
          title: 'Clocked In',
          desc: `Started shift on ${formattedDate} at ${new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`,
          date: new Date(log.check_in),
          badge: log.status
        });
      }
      if (log.check_out) {
        list.push({
          id: `att-out-${log.id}`,
          type: 'attendance_out',
          title: 'Clocked Out',
          desc: `Completed shift on ${formattedDate} at ${new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`,
          date: new Date(log.check_out),
          badge: log.status
        });
      }
    });

    // 2. Process leave requests
    myLeaves.forEach((leave: any) => {
      const reqDate = leave.request_date ? new Date(leave.request_date) : new Date(leave.start_date);
      const startStr = new Date(leave.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' });
      const endStr = new Date(leave.end_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      
      list.push({
        id: `leave-${leave.id}`,
        type: 'leave',
        title: `${leave.type} Leave Request`,
        desc: `Requested: ${startStr} to ${endStr}`,
        date: reqDate,
        badge: leave.status
      });
    });

    // Sort by date desc
    return list.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  }, [attendanceLogs, myLeaves, user]);

  if (!user) return null;

  // View as Employee Dashboard (including impersonation views)
  if (user.role === 'employee' || impersonating) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Welcome Section */}
        <div className="glass-panel" style={{
          background: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(59,130,246,0.05) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '6px' }}>Hello, {user.name}!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Check your attendance punch state, apply for time-off, or review your pay slip.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setActiveTab('profile')} className="btn btn-secondary">
              View Profile
            </button>
            <button onClick={() => setActiveTab('leave')} className="btn btn-primary">
              Apply Leave
            </button>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '8px'
        }}>
          {[
            { label: 'My Profile', desc: 'Personal & Job info', icon: UserCheck, color: 'var(--accent-cyan)', action: () => setActiveTab('profile') },
            { label: 'My Attendance', desc: 'Visual Logs & Clock', icon: Clock, color: 'var(--success)', action: () => setActiveTab('attendance') },
            { label: 'Leave Portal', desc: 'File requests', icon: Calendar, color: 'var(--warning)', action: () => setActiveTab('leave') },
            { label: 'Payroll Portal', desc: 'Salary & Payslips', icon: IndianRupee, color: 'rgba(168, 85, 247, 1)', action: () => setActiveTab('payroll') }
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div 
                key={idx}
                className="glass-panel stat-card clickable-card"
                onClick={card.action}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '16px',
                  cursor: 'pointer',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  background: 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{card.label}</span>
                  <Icon size={16} style={{ color: card.color }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{card.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Dashboard Grid */}
        <div className="responsive-grid-1-1" style={{ marginBottom: '0' }}>
          {/* Punch Console Card */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Clock size={20} style={{ color: 'var(--accent-cyan)' }} />
                Shift Console
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Mark check-in/out for your working shift.</p>
            </div>

            {errorMsg && (
              <div style={{ color: 'var(--danger)', fontSize: '13px', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: '6px' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
                {attendanceToday && attendanceToday.status === 'Leave' ? 'Status Today' : 'Current Shift Duration'}
              </div>
              <div style={{
                fontSize: '42px',
                fontWeight: '700',
                fontFamily: 'monospace',
                margin: '8px 0',
                color: attendanceToday && attendanceToday.status === 'Leave'
                  ? 'var(--accent-cyan)'
                  : (attendanceToday && !attendanceToday.check_out ? 'var(--accent-cyan)' : 'var(--text-primary)')
              }}>
                {attendanceToday && attendanceToday.status === 'Leave' ? 'On Leave' : elapsedTime}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {attendanceToday 
                  ? attendanceToday.status === 'Leave'
                    ? 'Enjoy your time off!'
                    : `Checked In at ${new Date(attendanceToday.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
                  : 'You are currently Checked Out'}
              </div>
            </div>

            <button
              onClick={handlePunch}
              disabled={isPunching || (attendanceToday && (attendanceToday.check_out || attendanceToday.status === 'Leave'))}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                background: attendanceToday 
                  ? attendanceToday.status === 'Leave'
                    ? 'var(--bg-app)'
                    : 'linear-gradient(135deg, var(--danger) 0%, #b91c1c 100%)' 
                  : 'linear-gradient(135deg, var(--success) 0%, #047857 100%)',
                boxShadow: attendanceToday 
                  ? attendanceToday.status === 'Leave'
                    ? 'none'
                    : '0 4px 14px rgba(239, 68, 68, 0.2)' 
                  : '0 4px 14px rgba(16, 185, 129, 0.2)',
                border: attendanceToday && attendanceToday.status === 'Leave' ? '1px solid var(--border-color)' : 'none',
                color: attendanceToday && attendanceToday.status === 'Leave' ? 'var(--text-muted)' : 'white'
              }}
            >
              {isPunching 
                ? 'Registering...' 
                : attendanceToday 
                  ? attendanceToday.status === 'Leave'
                    ? 'Approved Leave'
                    : attendanceToday.check_out 
                      ? 'Shift Finished' 
                      : 'Check Out (End Session)' 
                  : 'Check In (Start Session)'}
            </button>
          </div>

          {/* Quick Leave Balance Details Card */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Calendar size={20} style={{ color: 'var(--accent-cyan)' }} />
                Leave Balances
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Current calendar year allocations.</p>
            </div>

            <div className="responsive-grid-1-1-1">
              {[
                { 
                  label: 'Paid Leave', 
                  value: '12 Available', 
                  color: '#10b981', 
                  bg: 'rgba(16, 185, 129, 0.06)', 
                  border: 'rgba(16, 185, 129, 0.2)' 
                },
                { 
                  label: 'Sick Leave', 
                  value: '8 Available', 
                  color: '#3b82f6', 
                  bg: 'rgba(59, 130, 246, 0.06)', 
                  border: 'rgba(59, 130, 246, 0.2)' 
                },
                { 
                  label: 'Unpaid Leave', 
                  value: 'Unlimited', 
                  color: '#6b7280', 
                  bg: 'rgba(107, 114, 128, 0.06)', 
                  border: 'rgba(107, 114, 128, 0.2)' 
                }
              ].map((item, index) => (
                <div key={index} style={{
                  background: item.bg,
                  borderRadius: 'var(--border-radius)',
                  padding: '16px',
                  textAlign: 'center',
                  border: `1px solid ${item.border}`,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>{item.label}</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Recent Time-Off Requests
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {myLeaves.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No leave requests filed yet.</div>
                ) : (
                  myLeaves.map(leave => (
                    <div key={leave.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.01)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px'
                    }}>
                      <div>
                        <strong>{leave.type} Leave</strong>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
                          ({new Date(leave.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })} - {new Date(leave.end_date).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                        </span>
                      </div>
                      <span className={`badge badge-${leave.status.toLowerCase()}`}>
                        {leave.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity / Alerts Feed */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={20} style={{ color: 'var(--accent-cyan)' }} />
              Recent Activity & Alerts
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Timeline of your recent workspace activities and status changes.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivities.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No recent activity to show. Start check-in to begin logs!
              </div>
            ) : (
              recentActivities.map((act: any) => (
                <div key={act.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-app)',
                  padding: '12px 16px',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: act.type.startsWith('attendance') ? 'var(--accent-cyan)' : 'var(--warning)'
                    }} />
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{act.title}</strong>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>{act.desc}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(act.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                    {act.badge && (
                      <span className={`badge badge-${act.badge.toLowerCase().replace(' ', '')}`}>
                        {act.badge}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // View as HR Admin Dashboard
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Admin Stats Row */}
      <div className="stats-grid">
        {[
          { label: 'Total Employees', value: stats.totalEmployees, desc: 'Registered personnel', icon: Users, color: 'var(--accent-cyan)', route: '/employees' },
          { label: 'Present Today', value: stats.presentToday, desc: 'Checked in shifts', icon: ClipboardCheck, color: 'var(--success)', route: '/attendance' },
          { label: 'Pending Approvals', value: stats.pendingLeaves, desc: 'Awaiting HR decision', icon: Calendar, color: 'var(--warning)', route: '/leave' },
          { label: 'Unpaid Leaves', value: stats.unpaidLeavesMonth, desc: 'Approved unpaid days', icon: IndianRupee, color: 'var(--danger)', route: '/leave' }
        ].map((stat, index) => {
          const IconComp = stat.icon;
          return (
            <div 
              key={index} 
              className="glass-panel stat-card clickable-card"
              onClick={() => router.push(stat.route)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{stat.label}</span>
                <IconComp size={20} style={{ color: stat.color }} />
              </div>
              <div className="stat-value" style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
                <CountUp value={stat.value} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{stat.desc}</span>
            </div>
          );
        })}
      </div>

      {/* Row 2: Today's Activity Tracker & Staff switching console */}
      <div className="responsive-grid-1-1-2">
        {/* Today's Activity Tracker (Who's In Today) */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px' }}>Today's Activity Tracker</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Real-time overview of present staff and active shifts.</p>
          </div>

          {/* Attendance rate progress bar */}
          <div style={{ background: 'var(--bg-app)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Attendance Rate</span>
              <span style={{ color: 'var(--accent-cyan)' }}>
                {stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}% ({stats.presentToday}/{stats.totalEmployees})
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{
                width: `${stats.totalEmployees > 0 ? (stats.presentToday / stats.totalEmployees) * 100 : 0}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
                borderRadius: '9999px',
                transition: 'width 0.5s ease-out'
              }}></div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {todayPunches.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No active punches recorded today yet.
              </div>
            ) : (
              todayPunches.map((punch: any) => {
                const checkInDate = punch.check_in ? new Date(punch.check_in) : null;
                const checkOutDate = punch.check_out ? new Date(punch.check_out) : null;
                return (
                  <div key={punch.employee_id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg-app)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: punch.check_out ? 'var(--warning)' : 'var(--success)'
                      }}></div>
                      <strong>{punch.employee_name || punch.employee_id}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({punch.employee_id})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      <span>In: {checkInDate ? checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</span>
                      {punch.check_out && (
                        <span>Out: {checkOutDate ? checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Quick impersonate employee list */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px' }}>Staff Switching Console</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Quickly access other employee sessions.</p>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: '260px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}>
            {allEmployees.filter(emp => emp.employee_id !== user.employee_id).map(emp => (
              <div key={emp.employee_id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-color)',
                padding: '10px 14px',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img 
                    src={emp.profile_pic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                    alt={emp.name} 
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{emp.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{emp.employee_id} • {emp.designation}</div>
                  </div>
                </div>
                
                <button
                  onClick={() => impersonateEmployee(emp.employee_id)}
                  className="btn btn-secondary"
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <UserCheck size={12} />
                  Access
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Awaiting Approvals Queue (Full Width) */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px' }}>Awaiting Approvals</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Pending leaves requesting review.</p>
          </div>
          <button onClick={() => setActiveTab('leave')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
            Manage All Leaves
          </button>
        </div>

        <div className="table-container">
          {leaveRequests.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No pending leave requests found! All clear.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Remarks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map(leave => (
                  <tr key={leave.id}>
                    <td>
                      <strong>{leave.employee_name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{leave.employee_id}</div>
                    </td>
                    <td>{leave.type}</td>
                    <td style={{ fontSize: '12px' }}>
                      {new Date(leave.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })} - {new Date(leave.end_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                    <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {leave.remarks || '-'}
                    </td>
                    <td>
                      <button 
                        onClick={() => setActiveTab('leave')}
                        className="btn btn-primary" 
                        style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        Review <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
