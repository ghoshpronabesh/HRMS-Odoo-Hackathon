'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Calendar, ChevronLeft, ChevronRight, Search, Clock, ListFilter } from 'lucide-react';
import CustomSelect from './ui/CustomSelect';

function LinearLoader() {
  return <div className="top-linear-loader"></div>;
}

export default function AttendancePanel() {
  const { user, impersonating } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Admin search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const attRes = await fetch('/api/attendance', {
        headers: impersonating ? { 'x-impersonate-employee': user?.employee_id || '' } : {}
      });
      if (attRes.ok) {
        const data = await attRes.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [impersonating, user?.employee_id]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Year and Month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar parameters
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = new Date(year, month, 1).getDay(); // 0 for Sunday

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Pre-seed calendar date logs maps for high efficiency
  const logsMap = useMemo(() => {
    const map: { [key: string]: any } = {};
    logs.forEach(log => {
      // Extract YYYY-MM-DD from database date string in local timezone
      const d = new Date(log.date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayStr}`;
      map[dateStr] = log;
    });
    return map;
  }, [logs]);

  // Filter logs for Admin view
  const filteredLogs = useMemo(() => {
    if (user?.role !== 'hr' || impersonating) return logs;
    return logs.filter(log => {
      const matchesSearch = (log.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (log.employee_id || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [logs, user?.role, impersonating, searchQuery, statusFilter]);

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  if (loading) {
    return (
      <div style={{ position: 'relative', minHeight: '300px' }} className="animate-fade-in">
        <LinearLoader />
      </div>
    );
  }

  if (!user) return null;

  // Helper to construct dates properly for comparison
  const getPaddedDayString = (day: number) => {
    const mm = (month + 1).toString().padStart(2, '0');
    const dd = day.toString().padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. VISUAL MONTHLY CALENDAR VIEW (Visible to Employee & Impersonation view) */}
      {(user.role === 'employee' || impersonating) && (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} style={{ color: 'var(--accent-cyan)' }} />
                Visual Attendance Calendar
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Track daily statuses monthly.</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={prevMonth} className="btn btn-secondary" style={{ padding: '8px' }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontWeight: '700', minWidth: '110px', textAlign: 'center', fontSize: '14px' }}>
                {monthName} {year}
              </span>
              <button onClick={nextMonth} className="btn btn-secondary" style={{ padding: '8px' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Calendar Rendering */}
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="calendar-header-day">{day}</div>
            ))}

            {/* Empty boxes before month start */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="calendar-day empty"></div>
            ))}

            {/* Calendar Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = getPaddedDayString(day);
              const record = logsMap[dateStr];
              
              let dotColor = 'transparent';
              if (record) {
                if (record.status === 'Present') dotColor = 'var(--success)';
                else if (record.status === 'Absent') dotColor = 'var(--danger)';
                else if (record.status === 'Half Day') dotColor = 'var(--warning)';
                else if (record.status === 'Leave') dotColor = 'var(--info)';
              }

              return (
                <div key={day} className="calendar-day" title={record ? `Status: ${record.status}` : 'No Record'} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px', minHeight: '52px' }}>
                  <span className="calendar-day-num" style={{ fontWeight: '600' }}>{day}</span>
                  {record ? (
                    <div style={{
                      fontSize: '9px',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      color: record.status === 'Present' ? '#10b981' : record.status === 'Absent' ? '#ef4444' : record.status === 'Half Day' ? '#f59e0b' : '#3b82f6',
                      background: record.status === 'Present' ? 'rgba(16, 185, 129, 0.12)' : record.status === 'Absent' ? 'rgba(239, 68, 68, 0.12)' : record.status === 'Half Day' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                      border: `1px solid ${record.status === 'Present' ? 'rgba(16, 185, 129, 0.2)' : record.status === 'Absent' ? 'rgba(239, 68, 68, 0.2)' : record.status === 'Half Day' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                      marginTop: '2px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>
                      {record.status}
                    </div>
                  ) : (
                    <div style={{ height: '14px' }}></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Status Legend */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '16px',
            marginTop: '8px'
          }}>
            {[
              { label: 'Present', color: 'var(--success)' },
              { label: 'Absent', color: 'var(--danger)' },
              { label: 'Half Day', color: 'var(--warning)' },
              { label: 'Approved Leave', color: 'var(--info)' }
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }}></span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. ATTENDANCE HISTORY LOGS */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '18px' }}>
              {user.role === 'hr' && !impersonating ? 'Company-wide Attendance Registry' : 'Punch History Log'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              {user.role === 'hr' && !impersonating ? 'Browse and filter attendance records across all employees.' : 'Review your punch check-in and check-out logs.'}
            </p>
          </div>

          {/* Admin filters */}
          {user.role === 'hr' && !impersonating && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={16} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  type="text"
                  placeholder="Search Employee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
                />
              </div>

              {/* Status Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ListFilter size={16} style={{ color: 'var(--text-muted)' }} />
                <CustomSelect
                  options={[
                    { value: 'All', label: 'All Statuses' },
                    { value: 'Present', label: 'Present' },
                    { value: 'Absent', label: 'Absent' },
                    { value: 'Half Day', label: 'Half Day' },
                    { value: 'Leave', label: 'Leave' }
                  ]}
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  style={{ width: '130px' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* History Table */}
        <div className="table-container">
          {filteredLogs.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No attendance logs found matching filters.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  {user.role === 'hr' && !impersonating && <th>Employee</th>}
                  <th>Date</th>
                  <th>Punch Timings (In / Out)</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => {
                  const checkInDate = log.check_in ? new Date(log.check_in) : null;
                  const checkOutDate = log.check_out ? new Date(log.check_out) : null;
                  
                  let durationStr = '-';
                  if (checkInDate && checkOutDate) {
                    const diffMs = checkOutDate.getTime() - checkInDate.getTime();
                    const hours = diffMs / (1000 * 60 * 60);
                    durationStr = `${hours.toFixed(2)} hrs`;
                  }

                  return (
                    <tr key={log.id}>
                      {user.role === 'hr' && !impersonating && (
                        <td>
                          <strong>{log.employee_name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.employee_id} • {log.department}</div>
                        </td>
                      )}
                      <td>
                        <strong>{new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                      </td>
                      <td>
                        {checkInDate ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px', width: '24px' }}>IN:</span>
                              <strong>{checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
                            </span>
                            {checkOutDate ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px', width: '24px' }}>OUT:</span>
                                <strong>{checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
                              </span>
                            ) : (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <span style={{ fontSize: '11px', width: '24px' }}>OUT:</span>
                                <em>Active Shift</em>
                              </span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td>{durationStr}</td>
                      <td>
                        <span className={`badge badge-${log.status.toLowerCase().replace(' ', '')}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
