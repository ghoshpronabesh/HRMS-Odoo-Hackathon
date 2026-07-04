'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { CreditCard, Printer, Search, Edit3, IndianRupee, Calculator } from 'lucide-react';

function LinearLoader() {
  return <div className="top-linear-loader"></div>;
}

export default function PayrollPanel() {
  const { user, impersonating } = useAuth();
  const router = useRouter();
  const [payrollData, setPayrollData] = useState<any>(null); // Object for employee, Array for HR
  const [loading, setLoading] = useState(true);

  // Admin Search states
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payroll', {
        headers: impersonating ? { 'x-impersonate-employee': user?.employee_id || '' } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setPayrollData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [impersonating, user?.employee_id]);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);



  // Filter salaries for HR view
  const filteredSalaries = useMemo(() => {
    if (user?.role !== 'hr' || impersonating || !Array.isArray(payrollData)) return [];
    return payrollData.filter(sal => {
      const matchesSearch = (sal.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (sal.employee_id || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [payrollData, user?.role, impersonating, searchQuery]);

  // Printable Payslip Popup Generator
  const printPaySlip = () => {
    if (!payrollData || Array.isArray(payrollData)) return;

    const data = payrollData;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Payslip - ${data.employee_id}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; color: #1e3a8a; }
            .header p { margin: 5px 0 0 0; font-size: 14px; color: #666; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
            .info-item { font-size: 14px; }
            .info-item strong { display: inline-block; width: 140px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 35px; }
            th { background: #f3f4f6; text-align: left; padding: 12px; font-size: 13px; font-weight: bold; border: 1px solid #e5e7eb; }
            td { padding: 12px; font-size: 14px; border: 1px solid #e5e7eb; }
            .summary { display: flex; justify-content: flex-end; gap: 20px; font-size: 16px; font-weight: bold; padding-top: 15px; border-top: 2px dashed #e5e7eb; }
            .summary-val { color: #1e3a8a; font-size: 20px; }
            .signature { margin-top: 60px; display: flex; justify-content: space-between; font-size: 13px; }
            .sig-line { width: 200px; border-top: 1px solid #999; margin-bottom: 5px; text-align: center; padding-top: 5px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px;">
              <img src="${window.location.origin}/logo.ico" alt="Ice Penguin Logo" style="width: 36px; height: 36px; object-fit: contain;" />
              <h1 style="margin: 0; font-size: 26px; color: #1e3a8a;">!ce Penguin HR</h1>
            </div>
            <p>Enterprise Human Resource Management Systems</p>
            <p style="margin-top: 10px;"><strong>SALARY PAYSLIP FOR THE PERIOD OF ${data.period || 'CURRENT MONTH'}</strong></p>
          </div>
          
          <div class="info-grid">
            <div class="info-item"><strong>Employee ID:</strong> ${data.employee_id}</div>
            <div class="info-item"><strong>Employee Name:</strong> ${user?.name || ''}</div>
            <div class="info-item"><strong>Department:</strong> ${user?.department || 'Engineering'}</div>
            <div class="info-item"><strong>Designation:</strong> ${user?.designation || 'Software Engineer'}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Earnings Description</th>
                <th style="text-align: right;">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Salary</td>
                <td style="text-align: right;">Rs. ${data.base.toFixed(2)}</td>
              </tr>
              <tr>
                <td>HRA (House Rent Allowance)</td>
                <td style="text-align: right;">Rs. ${data.hra.toFixed(2)}</td>
              </tr>
              <tr>
                <td>DA (Dearness Allowance)</td>
                <td style="text-align: right;">Rs. ${data.da.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Special Allowance</td>
                <td style="text-align: right;">Rs. ${data.special_allowance.toFixed(2)}</td>
              </tr>
              <tr style="font-weight: bold; background: #fafafa;">
                <td>Gross Salary</td>
                <td style="text-align: right;">Rs. ${data.gross_salary.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Deductions Description</th>
                <th style="text-align: right;">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Absent Days Deductions (${data.absent_days} days @ Rs. ${data.lop_rate.toFixed(2)}/day)</td>
                <td style="text-align: right;">Rs. ${(data.absent_days * data.lop_rate).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Unpaid Leave Deductions (${data.unpaid_leave_days} days @ Rs. ${data.lop_rate.toFixed(2)}/day)</td>
                <td style="text-align: right;">Rs. ${(data.unpaid_leave_days * data.lop_rate).toFixed(2)}</td>
              </tr>
              <tr style="font-weight: bold; background: #fafafa; color: #ef4444;">
                <td>Total Deductions</td>
                <td style="text-align: right;">Rs. ${data.deductions.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="summary">
            <div>NET SALARY DISBURSED:</div>
            <div class="summary-val">Rs. ${data.net_salary.toFixed(2)}</div>
          </div>

          <div class="signature">
            <div>
              <div class="sig-line" style="margin-top: 40px;">Employee Signature</div>
            </div>
            <div>
              <div class="sig-line" style="margin-top: 40px;">HR Operations Manager</div>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div style={{ position: 'relative', minHeight: '300px' }} className="animate-fade-in">
        <LinearLoader />
      </div>
    );
  }

  if (!user) return null;

  // Employee (and Impersonated Employee) View
  if (user.role === 'employee' || impersonating) {
    if (!payrollData || Array.isArray(payrollData)) return null;
    const data = payrollData;

    return (
      <div className="responsive-grid-1-1-2 animate-fade-in">
        
        {/* Salary Breakdown Summary Card */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={20} style={{ color: 'var(--accent-cyan)' }} />
              Payroll Calculation
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Current month LOP analysis details.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0e1726 0%, #162235 100%)',
              borderRadius: 'var(--border-radius)',
              padding: '24px 20px',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(6, 182, 212, 0.08)'
            }}>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                Net Monthly Payout
              </span>
              <div style={{ 
                fontSize: '38px', 
                fontWeight: '700', 
                color: '#ffffff', 
                margin: '8px 0', 
                fontFamily: 'var(--font-display)',
                textShadow: '0 4px 12px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.1)',
                letterSpacing: '-0.02em'
              }}>
                Rs. {data.net_salary.toFixed(2)}
              </div>
              <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>Period: {data.period}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Gross Earnings:</span>
                <span style={{ fontWeight: '600' }}>Rs. {data.gross_salary.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Deductions (LOP):</span>
                <span style={{ fontWeight: '600', color: data.deductions > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                  -Rs. {data.deductions.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)' }}>
                <span>Absent Days:</span>
                <span>{data.absent_days} days (@ Rs. {data.lop_rate}/day)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)' }}>
                <span>Unpaid Leave Days:</span>
                <span>{data.unpaid_leave_days} days (@ Rs. {data.lop_rate}/day)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Pay Slip View */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} style={{ color: 'var(--accent-cyan)' }} />
                Salary Slip Detail
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Read-only salary components structure.</p>
            </div>
            
            <button onClick={printPaySlip} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '12px' }}>
              <Printer size={14} /> Print Pay Slip
            </button>
          </div>

          <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            overflow: 'hidden'
          }}>
            {/* Table components */}
            <div style={{
              padding: '14px 16px',
              background: 'rgba(6, 182, 212, 0.08)',
              borderBottom: '1px solid var(--border-color)',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--accent-cyan)',
              letterSpacing: '0.05em'
            }}>
              EARNINGS BREAKDOWN
            </div>
            {[
              { label: 'Basic Base Salary', val: data.base },
              { label: 'HRA Allowance', val: data.hra },
              { label: 'DA Allowance', val: data.da },
              { label: 'Special Allowance', val: data.special_allowance }
            ].map((row, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '14px'
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ fontWeight: '500' }}>Rs. {row.val.toFixed(2)}</span>
              </div>
            ))}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '14px 16px',
              fontSize: '14px',
              fontWeight: '700',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <span>Total Gross Salary</span>
              <span style={{ color: 'var(--accent-cyan)' }}>Rs. {data.gross_salary.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin Payroll Management View
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%', marginBottom: '4px' }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '320px' }}>
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
      </div>

      {/* Salary structures Table */}
      <div className="table-container">
        {filteredSalaries.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            No employee salary structures found.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Base Salary</th>
                <th>Allowances Detail</th>
                <th>LOP Rate (/day)</th>
                <th>Est. Net (This Month)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSalaries.map(sal => (
                <tr key={sal.employee_id}>
                  <td>
                    <strong>{sal.employee_name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{sal.employee_id} • {sal.department}</div>
                  </td>
                  <td>Rs. {sal.base.toFixed(2)}</td>
                  <td>
                    <div style={{ fontWeight: '600' }}>
                      Rs. {(sal.hra + sal.da + sal.special_allowance).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      HRA: Rs. {sal.hra} | DA: Rs. {sal.da} | Sp: Rs. {sal.special_allowance}
                    </div>
                  </td>
                  <td>Rs. {sal.lop_rate.toFixed(2)}</td>
                  <td>
                    <strong style={{ color: 'var(--accent-cyan)' }}>
                      Rs. {sal.net_salary.toFixed(2)}
                    </strong>
                  </td>
                  <td>
                    <button
                      onClick={() => router.push(`/payroll/edit?employee_id=${sal.employee_id}`)}
                      className="btn btn-secondary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Edit3 size={12} /> Edit Salary
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
