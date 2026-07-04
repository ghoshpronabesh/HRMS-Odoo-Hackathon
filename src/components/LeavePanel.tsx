'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { CalendarRange, Check, X, FileText, Sparkles, MessageSquare } from 'lucide-react';
import CustomSelect from './ui/CustomSelect';
import { fetchWithCache, invalidateCache } from '@/lib/clientCache';

function LinearLoader() {
  return <div className="top-linear-loader"></div>;
}

export default function LeavePanel() {
  const { user, impersonating } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // States
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Leave Form
  const [leaveType, setLeaveType] = useState<'Paid' | 'Sick' | 'Unpaid'>('Paid');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // HR Approvals Modal
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [modalAction, setModalAction] = useState<'Approve' | 'Reject' | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWithCache('/api/leaves', {
        headers: impersonating ? { 'x-impersonate-employee': user?.employee_id || '' } : {}
      });
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [impersonating, user?.employee_id]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  // Submit Leave Request
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!startDate || !endDate || !leaveType) {
      setFormError('Please fill out all required fields.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (start < today) {
      setFormError('Start date cannot be in the past.');
      return;
    }

    if (end < start) {
      setFormError('End date cannot precede start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(impersonating ? { 'x-impersonate-employee': user?.employee_id || '' } : {})
        },
        body: JSON.stringify({
          type: leaveType,
          start_date: startDate,
          end_date: endDate,
          remarks
        })
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (res.ok && data.success) {
        invalidateCache('/api/leaves');
        setFormSuccess('Leave request filed successfully.');
        setStartDate('');
        setEndDate('');
        setRemarks('');
        fetchLeaves();
      } else {
        setFormError(data.error || 'Failed to submit request.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setFormError('Network request failed.');
    }
  };

  // Open HR Approver Dialog
  const openDecisionModal = (req: any, action: 'Approve' | 'Reject') => {
    setSelectedRequest(req);
    setModalAction(action);
    setAdminComment('');
  };

  // Submit HR Decision
  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !modalAction) return;

    setIsProcessing(true);
    try {
      const status = modalAction === 'Approve' ? 'Approved' : 'Rejected';
      const res = await fetch('/api/leaves/approve', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRequest.id,
          status,
          admin_comment: adminComment
        })
      });
      const data = await res.json();
      setIsProcessing(false);

      if (res.ok && data.success) {
        setSelectedRequest(null);
        setModalAction(null);
        fetchLeaves();
      } else {
        alert(data.error || 'Approval processing failed.');
      }
    } catch (err) {
      setIsProcessing(false);
      alert('Network request failed.');
    }
  };

  // Split leaves into Pending and Historic for HR Admin view
  const pendingRequests = leaves.filter(l => l.status === 'Pending');
  const processedRequests = leaves.filter(l => l.status !== 'Pending');

  if (loading) {
    return (
      <div style={{ position: 'relative', minHeight: '300px' }} className="animate-fade-in">
        <LinearLoader />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. APPLY LEAVE FORM (Employees & Impersonations only) */}
      {(user.role === 'employee' || impersonating) && (
        <div className="responsive-grid-2-3">
          
          {/* Apply Leave Panel */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarRange size={20} style={{ color: 'var(--accent-cyan)' }} />
                Apply for Leave
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>File a new time-off application request.</p>
            </div>

            {formError && (
              <div style={{ color: 'var(--danger)', fontSize: '13px', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: '6px' }}>
                ⚠️ {formError}
              </div>
            )}
            
            {formSuccess && (
              <div style={{ color: 'var(--success)', fontSize: '13px', background: 'var(--success-bg)', padding: '8px 12px', borderRadius: '6px' }}>
                ✓ {formSuccess}
              </div>
            )}

            <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Leave Type</label>
                <CustomSelect
                  options={[
                    { value: 'Paid', label: 'Paid Leave' },
                    { value: 'Sick', label: 'Sick Leave' },
                    { value: 'Unpaid', label: 'Unpaid Leave' }
                  ]}
                  value={leaveType}
                  onChange={(val) => setLeaveType(val as 'Paid' | 'Sick' | 'Unpaid')}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Remarks / Reason</label>
                <textarea
                  placeholder="Reason for time-off request..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="form-input"
                  rows={3}
                  style={{ resize: 'none' }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                {isSubmitting ? 'Filing Application...' : 'File Leave Request'}
              </button>
            </form>
          </div>

          {/* Leaves History log */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px' }}>Leave Status Board</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Monitor status updates on time-off requests.</p>
            </div>

            <div className="table-container" style={{ flex: 1 }}>
              {leaves.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No leave requests filed yet.
                </div>
              ) : (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Date Range</th>
                      <th>Remarks</th>
                      <th>Status</th>
                      <th>HR Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map(leave => (
                      <tr key={leave.id}>
                        <td>
                          <strong>{leave.type}</strong>
                        </td>
                        <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {new Date(leave.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })} - {new Date(leave.end_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.remarks}>
                          {leave.remarks || '-'}
                        </td>
                        <td>
                          <span className={`badge badge-${leave.status.toLowerCase()}`}>
                            {leave.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {leave.admin_comment || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. LEAVE APPROVAL QUEUE (HR Administrators only) */}
      {user.role === 'hr' && !impersonating && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Active Pending Queue */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px' }}>Pending Approvals queue</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Approve or reject pending leave requests.</p>
            </div>

            <div className="table-container">
              {pendingRequests.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No pending leave requests! Work dashboard is clear.
                </div>
              ) : (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Remarks</th>
                      <th>Filed On</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map(leave => (
                      <tr key={leave.id}>
                        <td>
                          <strong>{leave.employee_name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{leave.employee_id} • {leave.department}</div>
                        </td>
                        <td>{leave.type}</td>
                        <td style={{ fontSize: '12px' }}>
                          {new Date(leave.start_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} to {new Date(leave.end_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td>{leave.remarks || '-'}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(leave.request_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => openDecisionModal(leave, 'Approve')}
                              className="btn btn-primary"
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: 'var(--success-bg)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                color: 'var(--success)',
                                boxShadow: 'none'
                              }}
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              onClick={() => openDecisionModal(leave, 'Reject')}
                              className="btn btn-danger"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px' }}>Processed Request Logs</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Audit log of completed leave evaluations.</p>
            </div>

            <div className="table-container">
              {processedRequests.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No historical request logs found.
                </div>
              ) : (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Remarks</th>
                      <th>Status</th>
                      <th>HR Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedRequests.map(leave => (
                      <tr key={leave.id}>
                        <td>
                          <strong>{leave.employee_name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{leave.employee_id}</div>
                        </td>
                        <td>{leave.type}</td>
                        <td style={{ fontSize: '12px' }}>
                          {new Date(leave.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })} - {new Date(leave.end_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td>{leave.remarks || '-'}</td>
                        <td>
                          <span className={`badge badge-${leave.status.toLowerCase()}`}>
                            {leave.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {leave.admin_comment || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Decision Dialog Modal (Approve / Reject) */}
      {mounted && selectedRequest && modalAction && createPortal(
        <div className="dialog-backdrop" style={{ zIndex: 9999 }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '460px',
            background: 'var(--bg-app)',
            padding: '28px',
            border: '1px solid var(--border-hover)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ fontSize: '20px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={20} style={{ color: modalAction === 'Approve' ? 'var(--success)' : 'var(--danger)' }} />
              Confirm {modalAction}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Adding comments for leave request of <strong>{selectedRequest.employee_name}</strong> ({selectedRequest.type} Leave: {new Date(selectedRequest.start_date).toLocaleDateString()} - {new Date(selectedRequest.end_date).toLocaleDateString()}).
            </p>

            <form onSubmit={handleDecisionSubmit}>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Approver Comments</label>
                <textarea
                  required={modalAction === 'Reject'} // Comment is mandatory on rejection
                  placeholder={modalAction === 'Reject' ? 'Provide a reason for rejection (Required)...' : 'Add approver notes (Optional)...'}
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  className="form-input"
                  rows={4}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setSelectedRequest(null); setModalAction(null); }}
                  className="btn btn-secondary"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={modalAction === 'Approve' ? 'btn btn-primary' : 'btn btn-danger'}
                  disabled={isProcessing}
                  style={modalAction === 'Approve' ? {
                    background: 'var(--success)',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                  } : {}}
                >
                  {isProcessing ? 'Processing...' : `Submit ${modalAction}`}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
