'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchWithCache } from '@/lib/clientCache';
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

  // Sub-tabs for Daily/Weekly/Monthly views
  const [activeSubTab, setActiveSubTab] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [selectedDailyDate, setSelectedDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  // Fetch employees list if user is HR for grid view
  useEffect(() => {
    if (user?.role === 'hr' && !impersonating) {
      fetch('/api/employees')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAllEmployees(data);
        })
        .catch(err => console.error(err));
    }
  }, [user, impersonating]);

  // Calculate current week days (Monday - Sunday)
  const currentWeekDays = useMemo(() => {
    const days = [];
    const temp = new Date(currentDate);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(temp.setDate(diff));
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWithCache('/api/attendance', {
        headers: impersonating ? { 'x-impersonate-employee': user?.employee_id || '' } : {}
      });
      setLogs(Array.isArray(data) ? data : []);
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

  // Pre-seed admin map (employee_id_date -> log)
  const adminLogsMap = useMemo(() => {
    const map: { [key: string]: any } = {};
    logs.forEach(log => {
      const d = new Date(log.date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayStr}`;
      map[`${log.employee_id}_${dateStr}`] = log;
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
      
      {/* Tab Navigation Selector */}
      <div style={{
        display: 'flex',
        background: '#e2e8f0',
        padding: '4px',
        borderRadius: '10px',
        width: 'fit-content',
        alignSelf: 'flex-start'
      }}>
        {[
          { id: 'monthly', label: 'Monthly View' },
          { id: 'weekly', label: 'Weekly View' },
          { id: 'daily', label: 'Daily View' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id as any)}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: '600',
              border: 'none',
              borderRadius: '8px',
              background: activeSubTab === tab.id ? 'var(--accent-cyan)' : 'transparent',
              color: activeSubTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: activeSubTab === tab.id ? '0 2px 8px rgba(6, 182, 212, 0.2)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. MONTHLY VIEW TEMPLATE */}
      {activeSubTab === 'monthly' && (
        <>
          {/* Visual Monthly Calendar (Visible to Employee & Impersonation view) */}
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

          {/* History List */}
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
        </>
      )}

      {/* 2. WEEKLY VIEW TEMPLATE */}
      {activeSubTab === 'weekly' && (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px' }}>
              {user.role === 'hr' && !impersonating ? 'Weekly Attendance Matrix' : 'Weekly Status Board'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Showing shift statuses for the week of Mon, {currentWeekDays[0].toLocaleDateString()} to Sun, {currentWeekDays[6].toLocaleDateString()}.
            </p>
          </div>

          {user.role === 'hr' && !impersonating ? (
            /* HR Admin Weekly Matrix */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative', width: '220px', alignSelf: 'flex-end' }}>
                <Search size={16} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  type="text"
                  placeholder="Filter Employee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '36px', height: '36px', fontSize: '13px' }}
                />
              </div>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      {currentWeekDays.map(d => (
                        <th key={d.toDateString()} style={{ textAlign: 'center', minWidth: '80px' }}>
                          {d.toLocaleDateString([], { weekday: 'short' })}
                          <div style={{ fontSize: '10px', fontWeight: 'normal', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {d.getDate()}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allEmployees.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase())).map(emp => (
                      <tr key={emp.employee_id}>
                        <td>
                          <strong>{emp.name}</strong>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{emp.employee_id}</div>
                        </td>
                        {currentWeekDays.map(d => {
                          const y = d.getFullYear();
                          const m = String(d.getMonth() + 1).padStart(2, '0');
                          const dayStr = String(d.getDate()).padStart(2, '0');
                          const dateStr = `${y}-${m}-${dayStr}`;
                          const record = adminLogsMap[`${emp.employee_id}_${dateStr}`];
                          
                          return (
                            <td key={dateStr} style={{ textAlign: 'center' }}>
                              {record ? (
                                <span className={`badge badge-${record.status.toLowerCase().replace(' ', '')}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                  {record.status}
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Employee Personal Weekly List */
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Weekday</th>
                    <th>Date</th>
                    <th>Punch Hours (In - Out)</th>
                    <th>Hours Worked</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentWeekDays.map(d => {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const dayStr = String(d.getDate()).padStart(2, '0');
                    const dateStr = `${y}-${m}-${dayStr}`;
                    const record = logsMap[dateStr];
                    
                    const inTime = record?.check_in ? new Date(record.check_in) : null;
                    const outTime = record?.check_out ? new Date(record.check_out) : null;

                    let duration = '-';
                    if (inTime && outTime) {
                      const diff = outTime.getTime() - inTime.getTime();
                      duration = `${(diff / (1000 * 60 * 60)).toFixed(2)} hrs`;
                    }

                    return (
                      <tr key={dateStr} style={{ opacity: record ? 1 : 0.5 }}>
                        <td><strong>{d.toLocaleDateString([], { weekday: 'long' })}</strong></td>
                        <td>{d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td>
                          {inTime ? (
                            <span>
                              {inTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} - {outTime ? outTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Active Shift'}
                            </span>
                          ) : '-'}
                        </td>
                        <td>{duration}</td>
                        <td>
                          {record ? (
                            <span className={`badge badge-${record.status.toLowerCase().replace(' ', '')}`}>{record.status}</span>
                          ) : (
                            <span className="badge badge-absent" style={{ background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>No Log</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. DAILY VIEW TEMPLATE */}
      {activeSubTab === 'daily' && (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px' }}>
              {user.role === 'hr' && !impersonating ? 'Daily Workspace Registry' : 'Daily Shift Details'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Audit checks and work schedules for specific calendar dates.
            </p>
          </div>

          {user.role === 'hr' && !impersonating ? (
            /* HR Admin Daily Log Audits */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Audit Date:</label>
                  <input
                    type="date"
                    value={selectedDailyDate}
                    onChange={(e) => setSelectedDailyDate(e.target.value)}
                    className="form-input"
                    style={{ height: '36px', width: '160px' }}
                  />
                </div>
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
                    style={{ paddingLeft: '36px', height: '36px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allEmployees.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase())).map(emp => {
                      const record = adminLogsMap[`${emp.employee_id}_${selectedDailyDate}`];
                      const inTime = record?.check_in ? new Date(record.check_in) : null;
                      const outTime = record?.check_out ? new Date(record.check_out) : null;
                      
                      let duration = '-';
                      if (inTime && outTime) {
                        const diff = outTime.getTime() - inTime.getTime();
                        duration = `${(diff / (1000 * 60 * 60)).toFixed(2)} hrs`;
                      }

                      return (
                        <tr key={emp.employee_id}>
                          <td>
                            <strong>{emp.name}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.employee_id} • {emp.department}</div>
                          </td>
                          <td>{inTime ? inTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</td>
                          <td>{outTime ? outTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : (inTime ? 'Active' : '-')}</td>
                          <td>{duration}</td>
                          <td>
                            {record ? (
                              <span className={`badge badge-${record.status.toLowerCase().replace(' ', '')}`}>{record.status}</span>
                            ) : (
                              <span className="badge badge-absent" style={{ background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>Absent</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Employee Personal Daily Details */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px', margin: '0 auto', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Select Day:</label>
                <input
                  type="date"
                  value={selectedDailyDate}
                  onChange={(e) => setSelectedDailyDate(e.target.value)}
                  className="form-input"
                  style={{ height: '36px', width: '180px' }}
                />
              </div>

              {(() => {
                const record = logsMap[selectedDailyDate];
                const inTime = record?.check_in ? new Date(record.check_in) : null;
                const outTime = record?.check_out ? new Date(record.check_out) : null;
                
                return (
                  <div className="glass-panel" style={{
                    textAlign: 'center',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    border: '1px solid var(--border-hover)'
                  }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Shift Audit for {new Date(selectedDailyDate).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </h4>
                    
                    {record ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                          <span>Status today:</span>
                          <span className={`badge badge-${record.status.toLowerCase().replace(' ', '')}`}>{record.status}</span>
                        </div>
                        {inTime && (
                          <div style={{ display: 'flex', justifyContent: 'space-around', background: 'var(--bg-app)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '8px' }}>
                            <div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>CLOCK IN</div>
                              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--success)', marginTop: '4px' }}>
                                {inTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>CLOCK OUT</div>
                              <div style={{ fontSize: '15px', fontWeight: '700', color: outTime ? 'var(--accent-cyan)' : 'var(--text-muted)', marginTop: '4px' }}>
                                {outTime ? outTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Active'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '13px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                        No punch log registered for this date.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
