'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { fetchWithCache, invalidateCache } from '@/lib/clientCache';
import { Users, Search, UserPlus, Edit3, Power, UserCheck } from 'lucide-react';

function LinearLoader() {
  return <div className="top-linear-loader"></div>;
}

export default function EmployeePanel() {
  const { user, impersonateEmployee } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await fetchWithCache('/api/employees');
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (emp.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (emp.designation || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [employees, searchQuery]);

  // Toggle Activation Status
  const handleToggleStatus = async (emp: any) => {
    const nextStatus = emp.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/employees/${emp.employee_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: emp.name,
          email: emp.email,
          role: emp.role,
          department: emp.department,
          designation: emp.designation,
          address: emp.address,
          phone: emp.phone,
          profile_pic: emp.profile_pic,
          status: nextStatus
        })
      });
      if (res.ok) {
        invalidateCache('/api/employees');
        fetchEmployees();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '300px' }} className="animate-fade-in">
        <LinearLoader />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '4px' }}>
        {/* Search bar */}
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
            placeholder="Search directory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
          />
        </div>

        <button onClick={() => router.push('/employees/add')} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
          <UserPlus size={16} /> Add Employee
        </button>
      </div>

      {/* Directory Table */}
      <div className="table-container">
        {filteredEmployees.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            No employee records match the search parameters.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Job Title / Department</th>
                <th>Access Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp.employee_id} style={{ opacity: emp.status === 'inactive' ? 0.6 : 1 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img 
                        src={emp.profile_pic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                        alt={emp.name} 
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                      />
                      <div>
                        <div style={{ fontWeight: '600' }}>{emp.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{emp.employee_id}</td>
                  <td>
                    <div style={{ fontWeight: '500' }}>{emp.designation || 'Staff'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{emp.department || 'General'}</div>
                  </td>
                  <td>{emp.role === 'hr' ? 'HR Admin' : 'Employee'}</td>
                  <td>
                    <span className={`badge badge-${emp.status === 'active' ? 'present' : 'absent'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => router.push(`/employees/edit?id=${emp.employee_id}`)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px', height: '28px' }}
                        title="Edit Details"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                      
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        className="btn btn-secondary"
                        style={{ 
                          padding: '4px 8px', 
                          fontSize: '11px', 
                          height: '28px',
                          color: emp.status === 'active' ? 'var(--danger)' : 'var(--success)'
                        }}
                        title={emp.status === 'active' ? 'Deactivate Employee' : 'Activate Employee'}
                      >
                        <Power size={12} />
                      </button>

                      {emp.status === 'active' && emp.employee_id !== user.employee_id && (
                        <button
                          onClick={() => impersonateEmployee(emp.employee_id)}
                          className="btn btn-secondary"
                          style={{ 
                            padding: '4px 8px', 
                            fontSize: '11px', 
                            height: '28px',
                            background: 'rgba(6, 182, 212, 0.08)',
                            color: 'var(--accent-cyan)',
                            border: '1px solid rgba(6, 182, 212, 0.2)'
                          }}
                          title={`Impersonate ${emp.name}`}
                        >
                          <UserCheck size={12} /> Access
                        </button>
                      )}
                    </div>
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
