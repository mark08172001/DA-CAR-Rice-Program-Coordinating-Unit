'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Database,
  Users,
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldX,
  Sliders,
  Trash2,
  Code,
  X,
  Copy,
  Check,
  UserCheck,
  Layers,
  ArrowRight,
  Clock
} from 'lucide-react';
import { UserAccount } from '@/utils/adminStore';

interface ProfileRecord {
  id: string;
  email: string;
  full_name: string;
  department: string;
  role: 'super_admin' | 'admin' | 'officer' | 'staff';
  status: 'active' | 'restricted' | 'suspended' | 'pending_approval';
  allowed_modules: string[];
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  login_count: number;
}

interface ProfileDatabaseClientProps {
  initialProfiles: ProfileRecord[];
  currentUserEmail: string;
  currentUserRole: string;
}

export default function ProfileDatabaseClient({
  initialProfiles,
  currentUserEmail,
  currentUserRole,
}: ProfileDatabaseClientProps) {
  const [profiles, setProfiles] = useState<ProfileRecord[]>(initialProfiles);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedJson, setSelectedJson] = useState<any | null>(null);

  // Delete modal state
  const [profileToDelete, setProfileToDelete] = useState<ProfileRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isSuperAdminRole =
    currentUserRole === 'super_admin' ||
    currentUserEmail.includes('super.admin') ||
    currentUserEmail.includes('admin');

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const refreshData = async () => {
    setLoading(true);
    setActionFeedback(null);
    try {
      const res = await fetch('/api/admin/database?table=profiles');
      const data = await res.json();
      if (res.ok && data.records) {
        setProfiles(data.records);
        setActionFeedback({ type: 'success', message: 'Profile database refreshed successfully.' });
        setTimeout(() => setActionFeedback(null), 3000);
      }
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleApproval = async (profile: ProfileRecord) => {
    const isActivating = profile.status === 'suspended' || profile.status === 'pending_approval';
    const newStatus = isActivating ? 'active' : 'suspended';
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: profile.email,
          status: newStatus,
          notes: isActivating
            ? `Super Admin approved profile on ${new Date().toLocaleDateString()}. Access granted.`
            : `Super Admin suspended profile on ${new Date().toLocaleDateString()}.`,
        }),
      });

      if (res.ok) {
        setProfiles((prev) =>
          prev.map((p) => (p.email === profile.email ? { ...p, status: newStatus } : p))
        );
        setActionFeedback({
          type: 'success',
          message: isActivating
            ? `Profile for ${profile.full_name} (${profile.email}) APPROVED successfully. Access granted.`
            : `Profile status updated for ${profile.full_name} (${newStatus.toUpperCase()}).`,
        });
        setTimeout(() => setActionFeedback(null), 5000);
      }
    } catch (e) {
      setActionFeedback({ type: 'error', message: 'Failed to update profile status.' });
    }
  };

  const handleDeleteProfile = async () => {
    if (!profileToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: profileToDelete.email }),
      });

      const data = await res.json();
      if (res.ok) {
        setProfiles((prev) => prev.filter((p) => p.email !== profileToDelete.email));
        setProfileToDelete(null);
        setActionFeedback({
          type: 'success',
          message: `Profile for ${profileToDelete.email} permanently removed from database.`,
        });
        setTimeout(() => setActionFeedback(null), 5000);
      } else {
        setActionFeedback({ type: 'error', message: data.error || 'Failed to delete profile' });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Error deleting profile' });
    } finally {
      setDeleting(false);
    }
  };

  const exportProfilesJSON = () => {
    const blob = new Blob([JSON.stringify(profiles, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `da_car_profiles_db_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportProfilesCSV = () => {
    if (profiles.length === 0) return;
    const headers = ['id', 'full_name', 'email', 'department', 'role', 'status', 'created_at', 'last_sign_in_at', 'login_count'];
    const rows = profiles.map((p) =>
      [
        `"${p.id}"`,
        `"${p.full_name}"`,
        `"${p.email}"`,
        `"${p.department}"`,
        `"${p.role}"`,
        `"${p.status}"`,
        `"${p.created_at}"`,
        `"${p.last_sign_in_at || 'Never'}"`,
        p.login_count || 0,
      ].join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `da_car_profiles_db_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered records
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      !search.trim() ||
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.department.toLowerCase().includes(search.toLowerCase()) ||
      p.role.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || p.role.toUpperCase() === roleFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING_APPROVAL' && p.status === 'pending_approval') ||
      (statusFilter === 'ACTIVE' && p.status === 'active') ||
      (statusFilter === 'RESTRICTED' && p.status === 'restricted') ||
      (statusFilter === 'SUSPENDED' && p.status === 'suspended');

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalUsers = profiles.length;
  const pendingUsers = profiles.filter((p) => p.status === 'pending_approval').length;
  const activeUsers = profiles.filter((p) => p.status === 'active').length;
  const adminUsers = profiles.filter((p) => p.role === 'super_admin' || p.role === 'admin').length;
  const restrictedUsers = profiles.filter((p) => p.status === 'restricted' || p.status === 'suspended').length;

  return (
    <div className="profile-database-client">
      {/* 1. Database Connection Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 24,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #15803d 0%, #047857 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(21,128,61,0.25)'
          }}>
            <Database size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>PostgreSQL <code>public.profiles</code> Database</h3>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700,
                background: '#dcfce7',
                color: '#15803d',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
                ONLINE · SYNCHRONIZED
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Connected to <strong>Supabase Cloud Database</strong> · Direct table access for Super Admin
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={refreshData}
            className="button button-outline"
            style={{ fontSize: 13, padding: '7px 14px' }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Table</span>
          </button>
          <button
            type="button"
            onClick={exportProfilesJSON}
            className="button button-outline"
            style={{ fontSize: 13, padding: '7px 14px' }}
            title="Download profile database as JSON"
          >
            <Download size={14} />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={exportProfilesCSV}
            className="button button-outline"
            style={{ fontSize: 13, padding: '7px 14px' }}
            title="Download profile database as CSV spreadsheet"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {actionFeedback && (
        <div
          className={`auth-alert auth-alert-${actionFeedback.type}`}
          style={{ marginBottom: 20 }}
        >
          {actionFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* 2. Registered Users Metric Cards */}
      <div className="users-stat-grid" style={{ marginBottom: 24 }}>
        <div className="user-stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Total Registered Profiles</span>
            <div className="stat-icon-wrap" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="stat-number">{totalUsers}</div>
          <div className="stat-sub">PostgreSQL <code>profiles</code> table rows</div>
        </div>

        <div className="user-stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Active & Approved Users</span>
            <div className="stat-icon-wrap" style={{ background: '#dcfce7', color: '#15803d' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="stat-number" style={{ color: '#15803d' }}>{activeUsers}</div>
          <div className="stat-sub">Authorized system personnel</div>
        </div>

        <div className="user-stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Administrators & Officers</span>
            <div className="stat-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="stat-number" style={{ color: '#b45309' }}>{adminUsers}</div>
          <div className="stat-sub">Super Admin & Admin clearances</div>
        </div>

        <div className="user-stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Restricted / Suspended</span>
            <div className="stat-icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <ShieldX size={18} />
            </div>
          </div>
          <div className="stat-number" style={{ color: restrictedUsers > 0 ? '#dc2626' : 'var(--ink)' }}>
            {restrictedUsers}
          </div>
          <div className="stat-sub">Limited or suspended accounts</div>
        </div>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="users-filter-bar" style={{ marginBottom: 18 }}>
        <div className="search-box" style={{ maxWidth: 360 }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by name, email, role, or UUID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filters-group">
          <div className="filter-item">
            <label htmlFor="filter-role">Role:</label>
            <select
              id="filter-role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="OFFICER">Technical Officer</option>
              <option value="STAFF">Field Staff</option>
            </select>
          </div>

          <div className="filter-item">
            <label htmlFor="filter-status">Status:</label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="ACTIVE">Active (Approved)</option>
              <option value="RESTRICTED">Restricted</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <Link href="/signup" className="button button-primary" style={{ padding: '7px 14px', fontSize: 13 }}>
            + Register New User
          </Link>
        </div>
      </div>

      {/* 4. Profiles Database Table */}
      <div className="table-responsive" style={{
        background: '#ffffff',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflowX: 'auto',
      }}>
        <table className="admin-accounts-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th style={{ width: 140 }}>Database ID (UUID)</th>
              <th>Personnel & Email</th>
              <th>Operating Unit</th>
              <th>Clearance Role</th>
              <th>Approval Status</th>
              <th>Permitted Modules</th>
              <th>Registered Date</th>
              <th style={{ textAlign: 'right', width: 220 }}>Database Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProfiles.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  No registered profiles found matching your query.
                </td>
              </tr>
            ) : (
              filteredProfiles.map((p) => {
                const isSuperAdminUser = p.email === 'super.admin@car.da.gov.ph';
                const isCurrentAccount = p.email === currentUserEmail;

                return (
                  <tr key={p.id}>
                    {/* Database UUID */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <code style={{ fontSize: 11, color: '#0369a1', background: '#f0f9ff', padding: '2px 5px', borderRadius: 4 }}>
                          {p.id.length > 12 ? `${p.id.substring(0, 10)}...` : p.id}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(p.id)}
                          title="Copy full UUID to clipboard"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: copiedId === p.id ? '#16a34a' : '#94a3b8',
                            padding: 2,
                          }}
                        >
                          {copiedId === p.id ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>

                    {/* Personnel & Email */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <strong style={{ fontSize: 14, color: '#0f172a' }}>{p.full_name}</strong>
                        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>
                          {p.email}
                        </span>
                      </div>
                    </td>

                    {/* Operating Unit */}
                    <td>
                      <span style={{ fontSize: 13, color: '#334155' }}>{p.department}</span>
                    </td>

                    {/* Clearance Role */}
                    <td>
                      <span className={`role-pill role-${p.role}`}>
                        {p.role === 'super_admin' && <ShieldCheck size={11} />}
                        {p.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>

                    {/* Approval Status */}
                    <td>
                      <span className={`status-badge status-${p.status}`}>
                        {p.status === 'active' && <CheckCircle2 size={12} />}
                        {p.status === 'pending_approval' && <Clock size={12} />}
                        {p.status === 'restricted' && <AlertTriangle size={12} />}
                        {p.status === 'suspended' && <ShieldX size={12} />}
                        <span>{p.status === 'pending_approval' ? 'PENDING APPROVAL' : p.status === 'active' ? 'APPROVED' : p.status.toUpperCase()}</span>
                      </span>
                    </td>

                    {/* Permitted Modules */}
                    <td>
                      <div className="modules-badges-list">
                        {p.status === 'suspended' ? (
                          <span className="module-tag tag-none">Suspended</span>
                        ) : p.allowed_modules?.length === 5 ? (
                          <span className="module-tag tag-all">All Modules (01–05)</span>
                        ) : (
                          p.allowed_modules?.map((m) => {
                            const modNum = m.replace('mod-', '').toUpperCase();
                            return (
                              <span key={m} className="module-tag">
                                {modNum === 'GENERAL' ? 'M01' : modNum === 'RICE' ? 'M02' : modNum === 'BENEFICIARY' ? 'M03' : modNum === 'FINANCE' ? 'M04' : 'M05'}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>

                    {/* Registered Date */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12, color: '#334155', fontFamily: 'monospace' }}>
                          {p.created_at.substring(0, 10)}
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          {p.login_count || 0} logins
                        </span>
                      </div>
                    </td>

                    {/* Database Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        {/* Toggle Approval Button */}
                        <button
                          type="button"
                          onClick={() => toggleApproval(p)}
                          disabled={isSuperAdminUser || isCurrentAccount}
                          className="button button-outline action-btn"
                          title={p.status === 'pending_approval' ? 'Approve Registration' : p.status === 'suspended' ? 'Approve & Activate Profile' : 'Suspend Profile'}
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            borderColor: p.status === 'pending_approval' ? '#166534' : p.status === 'suspended' ? '#86efac' : '#cbd5e1',
                            color: p.status === 'pending_approval' ? '#ffffff' : p.status === 'suspended' ? '#15803d' : '#475569',
                            background: p.status === 'pending_approval' ? '#15803d' : p.status === 'suspended' ? '#f0fdf4' : '#ffffff',
                          }}
                        >
                          <UserCheck size={12} />
                          <span>{p.status === 'pending_approval' ? 'Approve' : p.status === 'suspended' ? 'Approve' : 'Suspend'}</span>
                        </button>

                        {/* Raw JSON View */}
                        <button
                          type="button"
                          onClick={() => setSelectedJson(p)}
                          className="button button-outline action-btn"
                          title="View PostgreSQL raw JSON row"
                          style={{ padding: '4px 8px', fontSize: 11 }}
                        >
                          <Code size={12} />
                          <span>JSON</span>
                        </button>

                        {/* Delete Profile Button */}
                        {isSuperAdminRole && (
                          <button
                            type="button"
                            onClick={() => setProfileToDelete(p)}
                            disabled={isSuperAdminUser || isCurrentAccount}
                            className="button button-outline action-btn"
                            title={isSuperAdminUser ? 'Primary Super Admin cannot be deleted' : 'Delete user profile from database'}
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              borderColor: isSuperAdminUser ? '#e2e8f0' : '#fecaca',
                              color: isSuperAdminUser ? '#94a3b8' : '#b91c1c',
                              background: isSuperAdminUser ? '#f8fafc' : 'rgba(239, 68, 68, 0.04)',
                              cursor: isSuperAdminUser ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Raw Record JSON Modal */}
      {selectedJson && (
        <div className="modal-backdrop" onClick={() => setSelectedJson(null)} role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Code size={20} style={{ color: '#16a34a' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>PostgreSQL Profile Record</h3>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Table: public.profiles · {selectedJson.email}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJson(null)}
                className="modal-close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <pre style={{
                background: '#0f172a',
                color: '#f8fafc',
                padding: 16,
                borderRadius: 8,
                fontSize: 12,
                fontFamily: 'monospace',
                maxHeight: 380,
                overflowY: 'auto',
                lineHeight: 1.5,
              }}>
                {JSON.stringify(selectedJson, null, 2)}
              </pre>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setSelectedJson(null)}
                  className="button button-primary"
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Profile Confirmation Modal */}
      {profileToDelete && (
        <div className="modal-backdrop" onClick={() => setProfileToDelete(null)} role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid #fee2e2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#991b1b' }}>Delete Profile from Database</h3>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>PostgreSQL Record Removal</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileToDelete(null)}
                className="modal-close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 14, color: '#475569' }}>
                Are you sure you want to permanently delete the profile for{' '}
                <strong style={{ color: '#0f172a' }}>{profileToDelete.full_name}</strong> ({profileToDelete.email}) from the PostgreSQL database?
              </p>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12,
                marginBottom: 16,
              }}>
                <div><strong>UUID:</strong> <code>{profileToDelete.id}</code></div>
                <div><strong>Role:</strong> {profileToDelete.role.toUpperCase()}</div>
                <div><strong>Department:</strong> {profileToDelete.department}</div>
              </div>

              <div style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12,
                color: '#9f1239',
              }}>
                ⚠️ This action permanently removes the user profile row and logs a COA deletion audit entry.
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setProfileToDelete(null)}
                  className="button button-outline"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  className="button"
                  disabled={deleting}
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {deleting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Deleting Profile...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
