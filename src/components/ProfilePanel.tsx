'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { User, Phone, MapPin, Briefcase, FileText, Image as ImageIcon, ShieldAlert, Key } from 'lucide-react';
import CustomSelect from './ui/CustomSelect';

const getDeptOptions = (currentVal: string) => {
  const base = [
    { value: 'Engineering', label: 'Engineering' },
    { value: 'Human Resources', label: 'Human Resources' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Finance', label: 'Finance' }
  ];
  if (currentVal && !base.some(opt => opt.value === currentVal)) {
    base.push({ value: currentVal, label: currentVal });
  }
  return base;
};

const getDesgOptions = (currentVal: string) => {
  const base = [
    { value: 'Software Engineer', label: 'Software Engineer' },
    { value: 'HR Director', label: 'HR Director' },
    { value: 'HR Associate', label: 'HR Associate' },
    { value: 'Sales Director', label: 'Sales Director' },
    { value: 'Sales Representative', label: 'Sales Representative' },
    { value: 'Marketing Lead', label: 'Marketing Lead' },
    { value: 'Finance Analyst', label: 'Finance Analyst' }
  ];
  if (currentVal && !base.some(opt => opt.value === currentVal)) {
    base.push({ value: currentVal, label: currentVal });
  }
  return base;
};

export default function ProfilePanel() {
  const { user, impersonating, refreshSession } = useAuth();
  const router = useRouter();
  
  // Profile Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [role, setRole] = useState<'employee' | 'hr'>('employee');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New States for Salary and Documents
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  // Fetch full details including salary fields
  useEffect(() => {
    if (user) {
      fetch(`/api/employees/${user.employee_id}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setEmployeeDetails(data);
          }
        })
        .catch(err => console.error(err));
    }
  }, [user]);

  // Fetch documents list
  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/employees/${user.employee_id}/documents`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setDocuments(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName || !docUrl || !user) return;
    setIsAddingDoc(true);
    try {
      const res = await fetch(`/api/employees/${user.employee_id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: docName, url: docUrl })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDocName('');
        setDocUrl('');
        fetchDocuments();
      } else {
        alert(data.error || 'Failed to add document');
      }
    } catch (err) {
      alert('Error adding document');
    } finally {
      setIsAddingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!user || !window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const res = await fetch(`/api/employees/${user.employee_id}/documents?document_id=${docId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchDocuments();
      } else {
        alert(data.error || 'Failed to delete document');
      }
    } catch (err) {
      alert('Error deleting document');
    }
  };

  // Pre-fill form when user details change
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setProfilePic(user.profile_pic || '');
      setDepartment(user.department || '');
      setDesignation(user.designation || '');
      setStatus(user.status || 'active');
      setRole(user.role || 'employee');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [user]);

  if (!user) return null;

  // Determine if full fields are editable: Must be HR user and NOT impersonated, OR if impersonated (which means the active controller is HR Admin)
  const isFullEditable = user.role === 'hr' || impersonating;

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSaving(true);

    try {
      // Build body based on permissions
      let body: any = {};
      if (isFullEditable) {
        body = {
          name,
          email,
          role,
          department,
          designation,
          address,
          phone,
          profile_pic: profilePic,
          status
        };
      } else {
        body = {
          address,
          phone,
          profile_pic: profilePic
        };
      }

      const res = await fetch(`/api/employees/${user.employee_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      setIsSaving(false);

      if (res.ok && data.success) {
        setSuccessMsg('Profile information updated successfully.');
        await refreshSession(); // Reload context state
      } else {
        setErrorMsg(data.error || 'Failed to save changes.');
      }
    } catch (err) {
      setIsSaving(false);
      setErrorMsg('Connection error.');
    }
  };

  const sampleAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
  ];

  return (
    <div className="responsive-grid-1-3 animate-fade-in">
      
      {/* Left Column: Avatar & Summary Profile Card */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
        <div style={{ position: 'relative' }}>
          <img 
            src={profilePic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
            alt={name} 
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '4px solid var(--border-color)',
              boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
            }}
          />
        </div>

        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '700' }}>{name}</h3>
          <p style={{ color: 'var(--accent-cyan)', fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>
            {designation}
          </p>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{department} Department</span>
        </div>

        {/* Quick Avatar Selector */}
        <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Choose Avatar Profile</label>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {sampleAvatars.map((av, idx) => (
              <img 
                key={idx}
                src={av} 
                alt=""
                onClick={() => setProfilePic(av)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  border: profilePic === av ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                  opacity: profilePic === av ? 1 : 0.6,
                  transition: 'all 0.2s'
                }}
              />
            ))}
          </div>
        </div>

        <div style={{
          width: '100%',
          background: 'rgba(0,0,0,0.15)',
          borderRadius: 'var(--border-radius)',
          padding: '12px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          textAlign: 'left'
        }}>
          <div><strong>Employee ID:</strong> {user.employee_id}</div>
          <div><strong>Date Joined:</strong> {new Date(user.join_date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          <div><strong>Portal Access Role:</strong> {user.role === 'hr' ? 'HR Administrator' : 'Staff Employee'}</div>
          <div><strong>Status:</strong> <span style={{ color: user.status === 'active' ? 'var(--success)' : 'var(--danger)' }}>{user.status.toUpperCase()}</span></div>
        </div>

        {!impersonating && (
          <button 
            type="button"
            onClick={() => router.push('/profile/change-password')}
            className="btn btn-secondary" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px', fontSize: '13px', marginTop: '4px' }}
          >
            <Key size={14} /> Change Password
          </button>
        )}
      </div>

      {/* Right Column: Detailed Forms Console */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px' }}>Profile Information Management</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {isFullEditable 
              ? 'HR Access: You are authorized to edit all details for this employee.' 
              : 'Employee Access: You are permitted to modify only your address, phone, and profile avatar.'}
          </p>
        </div>

        {errorMsg && (
          <div style={{ color: 'var(--danger)', fontSize: '13px', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: '6px' }}>
            ⚠️ {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div style={{ color: 'var(--success)', fontSize: '13px', background: 'var(--success-bg)', padding: '8px 12px', borderRadius: '6px' }}>
            ✓ {successMsg}
          </div>
        )}

        <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Section: Personal Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>
              <User size={16} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                Personal Info
              </span>
            </div>
            
            <div className="responsive-grid-1-1" style={{ gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  disabled={!isFullEditable}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  disabled={!isFullEditable}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="responsive-grid-1-2" style={{ gap: '16px', marginTop: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Contact Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  placeholder="+1 555-0100"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="form-input"
                  placeholder="Street name, City, Country"
                />
              </div>
            </div>
          </div>

          {/* Section: Work Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>
              <Briefcase size={16} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                Job Details
              </span>
            </div>

            <div className="responsive-grid-1-1" style={{ gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Department</label>
                <CustomSelect
                  options={getDeptOptions(department)}
                  value={department}
                  onChange={(val) => setDepartment(val)}
                  disabled={!isFullEditable}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Designation / Role Title</label>
                <CustomSelect
                  options={getDesgOptions(designation)}
                  value={designation}
                  onChange={(val) => setDesignation(val)}
                  disabled={!isFullEditable}
                />
              </div>
            </div>

            {isFullEditable && (
              <div className="responsive-grid-1-1" style={{ gap: '16px', marginTop: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Portal Access Level</label>
                  <CustomSelect
                    options={[
                      { value: 'employee', label: 'Employee' },
                      { value: 'hr', label: 'HR Admin' }
                    ]}
                    value={role}
                    onChange={(val) => setRole(val as 'employee' | 'hr')}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Employment Status</label>
                  <CustomSelect
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive / Deactivated' }
                    ]}
                    value={status}
                    onChange={(val) => setStatus(val as 'active' | 'inactive')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section: Profile Avatar Direct Text link */}
          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '8px' }}>
              <ImageIcon size={16} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                Profile Picture URL
              </span>
            </div>
            <input
              type="text"
              value={profilePic}
              onChange={(e) => setProfilePic(e.target.value)}
              className="form-input"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>



          <button
            type="submit"
            disabled={isSaving}
            className="btn btn-primary"
            style={{ width: 'fit-content', padding: '12px 28px', marginTop: '10px', alignSelf: 'flex-end' }}
          >
            {isSaving ? 'Saving Changes...' : 'Save Profile Details'}
          </button>
        </form>

        {/* Section: Salary Structure View */}
        {employeeDetails && (
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Briefcase size={16} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                Salary Structure (Read-Only)
              </span>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px'
            }}>
              {[
                { label: 'Basic Salary', val: employeeDetails.base, color: 'var(--text-primary)' },
                { label: 'HRA Allowance', val: employeeDetails.hra, color: 'var(--text-primary)' },
                { label: 'DA Allowance', val: employeeDetails.da, color: 'var(--text-primary)' },
                { label: 'Special Allowance', val: employeeDetails.special_allowance, color: 'var(--text-primary)' },
                { label: 'LOP Rate (/day)', val: employeeDetails.lop_rate, color: 'var(--danger)' },
                { 
                  label: 'Gross Salary', 
                  val: (
                    parseFloat(employeeDetails.base || 0) +
                    parseFloat(employeeDetails.hra || 0) +
                    parseFloat(employeeDetails.da || 0) +
                    parseFloat(employeeDetails.special_allowance || 0)
                  ), 
                  color: 'var(--accent-cyan)',
                  bg: 'rgba(6, 182, 212, 0.05)',
                  border: 'rgba(6, 182, 212, 0.2)'
                }
              ].map((item, idx) => (
                <div key={idx} style={{
                  background: item.bg || 'var(--bg-app)',
                  border: `1px solid ${item.border || 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius)',
                  padding: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: item.color }}>Rs. {parseFloat(item.val || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Documents Repository */}
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <FileText size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
              Employee Documents Repository
            </span>
          </div>

          {/* Document list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {documents.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius)', textAlign: 'center' }}>
                No corporate documents filed for this employee record.
              </div>
            ) : (
              documents.map(doc => (
                <div key={doc.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-app)',
                  padding: '12px 16px',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={16} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: '600', color: 'var(--accent-cyan)', textDecoration: 'none' }} className="hover-underline">
                        {doc.name}
                      </a>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Filed on: {new Date(doc.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {/* Delete button only visible to HR and NOT impersonated */}
                  {user.role === 'hr' && !impersonating && (
                    <button 
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '11px', height: '26px', color: 'var(--danger)' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add document form (Only visible to HR and NOT impersonated) */}
          {user.role === 'hr' && !impersonating && (
            <form onSubmit={handleAddDocument} style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Add Corporate Document Link</div>
              <div className="responsive-grid-1-1" style={{ gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <input
                    type="text"
                    required
                    placeholder="Document Name (e.g. Offer Letter)"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="form-input"
                    style={{ height: '36px', fontSize: '13px' }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <input
                    type="url"
                    required
                    placeholder="Document URL link"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    className="form-input"
                    style={{ height: '36px', fontSize: '13px' }}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isAddingDoc}
                className="btn btn-primary"
                style={{ width: 'fit-content', padding: '6px 16px', fontSize: '12px', alignSelf: 'flex-end' }}
              >
                {isAddingDoc ? 'Filing Document...' : 'Add Document'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
