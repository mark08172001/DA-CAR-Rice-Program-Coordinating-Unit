'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Lock,
  Unlock,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  X,
  Save,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  UserCheck,
  Trash2,
  Pencil,
  Calendar,
  Coins,
  Package,
} from 'lucide-react';
import { UserAccount } from '@/utils/adminStore';

interface UsersManagementClientProps {
  initialAccounts: UserAccount[];
  currentUserEmail: string;
  currentUserRole: string;
}

const MODULE_OPTIONS = [
  { id: 'mod-general', label: 'Module 01: General Portal & Calendar', public: true },
  { id: 'mod-rice', label: 'Module 02: Rice Unit Operations & Programs', public: true },
  { id: 'mod-finance', label: 'Module 03: Financial Balances & Obligations', public: true },
  { id: 'mod-beneficiary', label: 'Module 04: Beneficiaries & Commodity Claims', public: false },
];

const getRoleDefaultPermissions = (role: string) => {
  if (role === 'super_admin' || role === 'admin') {
    return {
      can_add_activities: true,
      can_edit_budget: true,
      can_import_beneficiaries: true,
      can_manage_claims: true,
      can_delete_programs: true,
      can_edit_programs: true,
    };
  }
  if (role === 'officer') {
    return {
      can_add_activities: true,
      can_edit_budget: false,
      can_import_beneficiaries: true,
      can_manage_claims: true,
      can_delete_programs: false,
      can_edit_programs: true,
    };
  }
  return {
    can_add_activities: true,
    can_edit_budget: false,
    can_import_beneficiaries: false,
    can_manage_claims: false,
    can_delete_programs: false,
    can_edit_programs: false,
  };
};

export default function UsersManagementClient({
  initialAccounts,
  currentUserEmail,
  currentUserRole,
}: UsersManagementClientProps) {
  const [accounts, setAccounts] = useState<UserAccount[]>(initialAccounts);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Edit Access Modal State
  const [selectedAccount, setSelectedAccount] = useState<UserAccount | null>(null);
  const [editRole, setEditRole] = useState<'super_admin' | 'admin' | 'officer' | 'staff'>('staff');
  const [editStatus, setEditStatus] = useState<'active' | 'restricted' | 'suspended' | 'pending_approval'>('active');
  const [editModules, setEditModules] = useState<string[]>([]);
  const [editPermissions, setEditPermissions] = useState<{
    can_add_activities: boolean;
    can_edit_budget: boolean;
    can_import_beneficiaries: boolean;
    can_manage_claims: boolean;
    can_delete_programs: boolean;
    can_edit_programs: boolean;
  }>({
    can_add_activities: true,
    can_edit_budget: false,
    can_import_beneficiaries: false,
    can_manage_claims: false,
    can_delete_programs: false,
    can_edit_programs: false,
  });
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleQuickApprove = async (acc: UserAccount) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: acc.email,
          status: 'active',
          notes: 'Account reviewed and approved by Super Admin.',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAccounts((prev) =>
          prev.map((a) => (a.email === acc.email ? data.account : a))
        );
        setFeedback({
          type: 'success',
          message: `Account for ${acc.full_name} (${acc.email}) approved successfully. User can now access authorized portal modules.`,
        });
        setTimeout(() => setFeedback(null), 6000);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to approve account' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error approving account' });
    }
  };

  // Delete User Modal State
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openDeleteModal = (acc: UserAccount) => {
    setUserToDelete(acc);
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    setUserToDelete(null);
    setDeleteError(null);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: userToDelete.email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'Failed to delete user account');
        setDeleting(false);
        return;
      }

      // Remove from local state
      setAccounts((prev) => prev.filter((acc) => acc.email !== userToDelete.email));
      setDeleting(false);
      closeDeleteModal();
      setFeedback({
        type: 'success',
        message: `Personnel account (${userToDelete.email}) has been permanently deleted and logged in the COA audit registry.`,
      });
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting account');
      setDeleting(false);
    }
  };

  const openEditModal = (acc: UserAccount) => {
    setSelectedAccount(acc);
    setEditRole(acc.role);
    setEditStatus(acc.status);
    setEditModules([...acc.allowed_modules]);
    setEditPermissions({
      can_add_activities: acc.permissions?.can_add_activities !== false,
      can_edit_budget: acc.permissions?.can_edit_budget ?? ['super_admin', 'admin'].includes(acc.role),
      can_import_beneficiaries: acc.permissions?.can_import_beneficiaries ?? ['super_admin', 'admin', 'officer'].includes(acc.role),
      can_manage_claims: acc.permissions?.can_manage_claims ?? ['super_admin', 'admin', 'officer'].includes(acc.role),
      can_delete_programs: acc.permissions?.can_delete_programs ?? ['super_admin', 'admin'].includes(acc.role),
      can_edit_programs: acc.permissions?.can_edit_programs ?? ['super_admin', 'admin', 'officer'].includes(acc.role),
    });
    setEditNotes(acc.notes || '');
    setFeedback(null);
  };

  const closeEditModal = () => {
    setSelectedAccount(null);
    setFeedback(null);
  };

  const handleModuleToggle = (modId: string) => {
    if (modId === 'mod-general') return; // Module 1 is always included
    setEditModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleSaveAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: selectedAccount.email,
          role: editRole,
          status: editStatus,
          allowed_modules: editModules,
          permissions: editPermissions,
          notes: editNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to update user access' });
        setSaving(false);
        return;
      }

      // Update local state
      setAccounts((prev) =>
        prev.map((acc) => (acc.email === selectedAccount.email ? data.account : acc))
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('da_permissions_updated'));
        try {
          localStorage.setItem('da_permissions_ts', String(Date.now()));
        } catch {}
      }
      setFeedback({ type: 'success', message: 'Staff access limits updated and logged in COA security register.' });
      setTimeout(() => {
        closeEditModal();
      }, 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error occurred' });
    } finally {
      setSaving(false);
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.full_name.toLowerCase().includes(search.toLowerCase()) ||
      acc.email.toLowerCase().includes(search.toLowerCase()) ||
      acc.department.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || acc.role.toUpperCase() === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || acc.status.toUpperCase() === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalAccounts = accounts.length;
  const pendingAccounts = accounts.filter((a) => a.status === 'pending_approval').length;
  const activeStaff = accounts.filter((a) => a.status === 'active').length;
  const restrictedAccounts = accounts.filter((a) => a.status === 'restricted' || a.status === 'suspended').length;
  const superAdminCount = accounts.filter((a) => a.role === 'super_admin').length;

  return (
    <div className="admin-users-manager">
      {/* Pending Registrations Warning Banner */}
      {pendingAccounts > 0 && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 8,
          padding: '12px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={18} style={{ color: '#d97706', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#92400e' }}>
              <strong>{pendingAccounts} New Account Registration{pendingAccounts > 1 ? 's' : ''} Pending Super Admin Approval:</strong>{' '}
              Unapproved personnel cannot sign in to the website until you approve their access below.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'PENDING_APPROVAL' ? 'ALL' : 'PENDING_APPROVAL')}
            className="button button-outline"
            style={{ borderColor: '#d97706', color: '#b45309', padding: '4px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
          >
            {statusFilter === 'PENDING_APPROVAL' ? 'Show All Accounts' : 'Review Pending'}
          </button>
        </div>
      )}

      {/* Executive Summary Metrics */}
      <div className="users-stats-grid">
        <div className="user-stat-card">
          <div className="stat-icon-circle green">
            <Users size={20} />
          </div>
          <div>
            <span className="stat-label">Registered Accounts</span>
            <strong className="stat-number">{totalAccounts}</strong>
          </div>
        </div>

        <div className="user-stat-card" style={{ borderColor: pendingAccounts > 0 ? '#fed7aa' : undefined, background: pendingAccounts > 0 ? '#fffdfa' : undefined }}>
          <div className="stat-icon-circle amber" style={{ background: '#fed7aa', color: '#c2410c' }}>
            <Clock size={20} />
          </div>
          <div>
            <span className="stat-label">Pending Approval</span>
            <strong className="stat-number" style={{ color: pendingAccounts > 0 ? '#c2410c' : undefined }}>{pendingAccounts}</strong>
          </div>
        </div>

        <div className="user-stat-card">
          <div className="stat-icon-circle gold">
            <UserCheck size={20} />
          </div>
          <div>
            <span className="stat-label">Active Authorized Staff</span>
            <strong className="stat-number">{activeStaff}</strong>
          </div>
        </div>

        <div className="user-stat-card">
          <div className="stat-icon-circle purple">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="stat-label">Super Administrators</span>
            <strong className="stat-number">{superAdminCount}</strong>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="users-filter-bar">
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search accounts by name, official email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filters-group">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
            aria-label="Filter by role"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Administrator</option>
            <option value="OFFICER">Technical Officer</option>
            <option value="STAFF">Field Staff</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
            aria-label="Filter by status"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="ACTIVE">Active (Approved)</option>
            <option value="RESTRICTED">Restricted</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="table-responsive-wrapper surface surface-pad" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="portal-data-table" aria-label="Registered personnel accounts">
          <thead>
            <tr>
              <th>Personnel / User</th>
              <th>Department & Role</th>
              <th>Status</th>
              <th>Permitted Modules</th>
              <th>Last Sign-In</th>
              <th style={{ textAlign: 'right' }}>Access Control</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--muted)' }}>
                  No accounts found matching your filter criteria.
                </td>
              </tr>
            ) : (
              filteredAccounts.map((acc) => {
                const isSuperAdmin = acc.role === 'super_admin';
                const isSuspended = acc.status === 'suspended';
                const isRestricted = acc.status === 'restricted';

                return (
                  <tr key={acc.id} className={isSuspended ? 'row-suspended' : isRestricted ? 'row-restricted' : ''}>
                    {/* User Identity */}
                    <td>
                      <div className="table-user-cell">
                        <span className={`table-avatar ${isSuperAdmin ? 'avatar-super' : ''}`}>
                          {acc.full_name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <strong>{acc.full_name}</strong>
                          <span className="table-user-email">{acc.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Department & Role */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 13, color: 'var(--ink)' }}>{acc.department}</span>
                        <span className={`role-pill role-${acc.role}`}>
                          {isSuperAdmin && <ShieldCheck size={11} />}
                          {acc.role.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`status-badge status-${acc.status}`}>
                        {acc.status === 'active' && <CheckCircle2 size={12} />}
                        {acc.status === 'pending_approval' && <Clock size={12} />}
                        {acc.status === 'restricted' && <AlertTriangle size={12} />}
                        {acc.status === 'suspended' && <ShieldX size={12} />}
                        <span>{acc.status === 'pending_approval' ? 'PENDING APPROVAL' : acc.status.toUpperCase()}</span>
                      </span>
                    </td>

                    {/* Permitted Modules */}
                    <td>
                      <div className="modules-badges-list">
                        {isSuspended ? (
                          <span className="module-tag tag-none">No Access (Suspended)</span>
                        ) : acc.allowed_modules.length === 5 ? (
                          <span className="module-tag tag-all">All Modules (01–05)</span>
                        ) : (
                          acc.allowed_modules.map((m) => {
                            const modNum = m.replace('mod-', '').toUpperCase();
                            return (
                              <span key={m} className="module-tag">
                                {modNum === 'GENERAL' ? 'M01' : modNum === 'RICE' ? 'M02' : modNum === 'BENEFICIARY' ? 'M03' : modNum === 'FINANCE' ? 'M04' : 'M05'}
                              </span>
                            );
                          })
                        )}
                        {acc.permissions?.can_add_activities === false && !isSuspended && (
                          <span
                            className="module-tag"
                            style={{
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                            title="Super Admin has removed this account's power to add activities in the calendar"
                          >
                            <Lock size={10} /> Calendar Add Revoked
                          </span>
                        )}
                        {acc.permissions?.can_delete_programs === false && !isSuspended && (
                          <span
                            className="module-tag"
                            style={{
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                            title="Admin has removed this account's power to delete programs in /rice/programs"
                          >
                            <Lock size={10} /> Program Delete Revoked
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Last Sign-In */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12, color: 'var(--ink)', fontFamily: 'monospace' }}>
                          {acc.last_sign_in_at || 'Never'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {acc.login_count} {acc.login_count === 1 ? 'login' : 'logins'}
                        </span>
                      </div>
                    </td>

                    {/* Access Action */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        {acc.status === 'pending_approval' && (
                          <button
                            type="button"
                            onClick={() => handleQuickApprove(acc)}
                            className="button button-primary action-btn"
                            title="Approve this registration immediately"
                            style={{ background: '#15803d', borderColor: '#166534', color: '#ffffff', gap: 4 }}
                          >
                            <CheckCircle2 size={13} />
                            <span>Approve</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(acc)}
                          className="button button-outline action-btn"
                          title="Configure and limit access for this account"
                        >
                          <Sliders size={13} />
                          <span>Limit Access</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(acc)}
                          disabled={isSuperAdmin || acc.email === currentUserEmail}
                          className="button button-outline action-btn action-btn-danger"
                          title={isSuperAdmin ? "Primary Super Admin account cannot be deleted" : "Delete registered user account"}
                          style={{
                            borderColor: isSuperAdmin ? '#e2e8f0' : '#fecaca',
                            color: isSuperAdmin ? '#94a3b8' : '#b91c1c',
                            background: isSuperAdmin ? '#f8fafc' : 'rgba(239, 68, 68, 0.04)',
                            cursor: isSuperAdmin ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Access Configuration Drawer / Modal */}
      {selectedAccount && (
        <div className="modal-backdrop" onClick={closeEditModal} role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">Super Admin Authority</span>
                <h3 className="modal-title">Limit & Configure Staff Access</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={closeEditModal}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAccess} className="modal-body">
              {/* Target User Card */}
              <div className="target-account-card">
                <span className="table-avatar avatar-large">
                  {selectedAccount.full_name.charAt(0).toUpperCase()}
                </span>
                <div className="target-account-info">
                  <div className="target-account-name">{selectedAccount.full_name}</div>
                  <div className="target-account-email">{selectedAccount.email}</div>
                  <small className="target-account-dept">
                    {selectedAccount.department}
                  </small>
                </div>
              </div>

              {feedback && (
                <div className={`auth-alert ${feedback.type === 'error' ? 'auth-alert-error' : 'auth-alert-success'}`}>
                  {feedback.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* 1. Account Status Limiter */}
              <div className="form-group" style={{ marginTop: 14 }}>
                <label>Account Access Status</label>
                <div className="status-radio-grid">
                  <label className={`status-radio-option ${editStatus === 'active' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={editStatus === 'active'}
                      onChange={() => setEditStatus('active')}
                    />
                    <div>
                      <strong>Active</strong>
                      <span>Authorized to use assigned modules</span>
                    </div>
                  </label>

                  <label className={`status-radio-option ${editStatus === 'restricted' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="status"
                      value="restricted"
                      checked={editStatus === 'restricted'}
                      onChange={() => setEditStatus('restricted')}
                    />
                    <div>
                      <strong>Restricted Access</strong>
                      <span>Super Admin limits specific modules</span>
                    </div>
                  </label>

                  <label className={`status-radio-option ${editStatus === 'pending_approval' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="status"
                      value="pending_approval"
                      checked={editStatus === 'pending_approval'}
                      onChange={() => setEditStatus('pending_approval')}
                    />
                    <div>
                      <strong>Pending Approval</strong>
                      <span>Awaiting review; sign in prohibited</span>
                    </div>
                  </label>

                  <label className={`status-radio-option ${editStatus === 'suspended' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="status"
                      value="suspended"
                      checked={editStatus === 'suspended'}
                      onChange={() => setEditStatus('suspended')}
                    />
                    <div>
                      <strong>Suspended</strong>
                      <span>Completely blocked from internal modules</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. Role Selector */}
              <div className="form-group" style={{ marginTop: 16 }}>
                <label htmlFor="edit-role">Assigned Authorization Role</label>
                <select
                  id="edit-role"
                  value={editRole}
                  onChange={(e) => {
                    const nextRole = e.target.value as any;
                    setEditRole(nextRole);
                    setEditPermissions(getRoleDefaultPermissions(nextRole));
                  }}
                  className="form-control"
                >
                  <option value="staff">Staff (Standard Field Personnel)</option>
                  <option value="officer">Technical Officer (Program Certifications)</option>
                  <option value="admin">Administrator (Audit & Financial Tools)</option>
                  <option value="super_admin">Super Administrator (Full System Authority)</option>
                </select>
              </div>

              {/* 3. Granular Module Permissions Checkboxes */}
              {editStatus !== 'suspended' && (
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label>Restricted Module Access Control</label>
                  <p style={{ margin: '2px 0 10px', fontSize: 12, color: 'var(--muted)' }}>
                    Modules 01, 02, and 03 are open for public viewing. Use this checkbox to grant or revoke access to restricted Module 04:
                  </p>
                  <div className="module-toggles-list">
                    {MODULE_OPTIONS.filter((m) => !m.public).map((m) => {
                      const isAllowed = editModules.includes(m.id);

                      return (
                        <label
                          key={m.id}
                          className={`module-toggle-item ${isAllowed ? 'allowed' : 'denied'}`}
                        >
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            onChange={() => handleModuleToggle(m.id)}
                          />
                          <div style={{ flex: 1 }}>
                            <strong>{m.label}</strong>
                            <span style={{ fontSize: 11, color: isAllowed ? 'var(--green-700)' : '#dc2626' }}>
                              {isAllowed
                                ? '✓ Access Granted'
                                : '✗ Access Denied by Super Admin'}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Granular Feature Actions & Action Powers */}
              {editStatus !== 'suspended' && (
                <div className="form-group" style={{ marginTop: 18 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sliders size={14} style={{ color: '#166534' }} />
                    <span>Feature Powers & Granular Action Limits</span>
                  </label>
                  <p style={{ margin: '2px 0 10px', fontSize: 12, color: 'var(--muted)' }}>
                    Exercise Super Admin power to restrict specific capabilities within permitted modules (e.g. remove power of staff to add new activities in Calendar).
                  </p>

                  <div className="module-toggles-list">
                    {/* Power 1: Add Regional Activities in Calendar */}
                    <label
                      className={`module-toggle-item ${editPermissions.can_add_activities ? 'allowed' : 'denied'}`}
                    >
                      <input
                        type="checkbox"
                        checked={editPermissions.can_add_activities}
                        onChange={(e) =>
                          setEditPermissions((prev) => ({
                            ...prev,
                            can_add_activities: e.target.checked,
                          }))
                        }
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={14} style={{ color: editPermissions.can_add_activities ? '#166534' : '#dc2626' }} />
                          <strong>Add & Modify Calendar of Activities (Module 01)</strong>
                        </div>
                        <span style={{ fontSize: 11, color: editPermissions.can_add_activities ? 'var(--green-700)' : '#dc2626' }}>
                          {editPermissions.can_add_activities
                            ? '✓ Power Granted (Can add new activities, alter dates, or delete records)'
                            : '✗ Power Revoked (Account cannot add or alter activities in calendar)'}
                        </span>
                      </div>
                    </label>

                    {/* Power 2: Modify Financial Ledger & Balances */}
                    <label
                      className={`module-toggle-item ${editPermissions.can_edit_budget ? 'allowed' : 'denied'}`}
                    >
                      <input
                        type="checkbox"
                        checked={editPermissions.can_edit_budget}
                        onChange={(e) =>
                          setEditPermissions((prev) => ({
                            ...prev,
                            can_edit_budget: e.target.checked,
                          }))
                        }
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Coins size={14} style={{ color: editPermissions.can_edit_budget ? '#166534' : '#dc2626' }} />
                          <strong>Edit Financial Obligations & Ledger (Module 03)</strong>
                        </div>
                        <span style={{ fontSize: 11, color: editPermissions.can_edit_budget ? 'var(--green-700)' : '#dc2626' }}>
                          {editPermissions.can_edit_budget
                            ? '✓ Power Granted (Can adjust obligation balances and disbursements)'
                            : '✗ Power Revoked (Read-only view for financial balances)'}
                        </span>
                      </div>
                    </label>

                    {/* Power 3: Import RSBSA Beneficiaries Directory */}
                    <label
                      className={`module-toggle-item ${editPermissions.can_import_beneficiaries ? 'allowed' : 'denied'}`}
                    >
                      <input
                        type="checkbox"
                        checked={editPermissions.can_import_beneficiaries}
                        onChange={(e) =>
                          setEditPermissions((prev) => ({
                            ...prev,
                            can_import_beneficiaries: e.target.checked,
                          }))
                        }
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Users size={14} style={{ color: editPermissions.can_import_beneficiaries ? '#166534' : '#dc2626' }} />
                          <strong>Import & Alter RSBSA Beneficiaries Registry (Module 04)</strong>
                        </div>
                        <span style={{ fontSize: 11, color: editPermissions.can_import_beneficiaries ? 'var(--green-700)' : '#dc2626' }}>
                          {editPermissions.can_import_beneficiaries
                            ? '✓ Power Granted (Can upload spreadsheet records & alter farmers)'
                            : '✗ Power Revoked (Cannot import or modify beneficiary farmers)'}
                        </span>
                      </div>
                    </label>

                    {/* Power 4: Process & Verify Commodity Claims */}
                    <label
                      className={`module-toggle-item ${editPermissions.can_manage_claims ? 'allowed' : 'denied'}`}
                    >
                      <input
                        type="checkbox"
                        checked={editPermissions.can_manage_claims}
                        onChange={(e) =>
                          setEditPermissions((prev) => ({
                            ...prev,
                            can_manage_claims: e.target.checked,
                          }))
                        }
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Package size={14} style={{ color: editPermissions.can_manage_claims ? '#166534' : '#dc2626' }} />
                          <strong>Verify & Release Commodity Voucher Claims (Module 04)</strong>
                        </div>
                        <span style={{ fontSize: 11, color: editPermissions.can_manage_claims ? 'var(--green-700)' : '#dc2626' }}>
                          {editPermissions.can_manage_claims
                            ? '✓ Power Granted (Can certify vouchers and process commodity claims)'
                            : '✗ Power Revoked (Cannot process or certify claims)'}
                        </span>
                      </div>
                    </label>

                    {/* Power 5: Delete Rice Banner Programs & Interventions */}
                    <label
                      className={`module-toggle-item ${editPermissions.can_delete_programs ? 'allowed' : 'denied'}`}
                    >
                      <input
                        type="checkbox"
                        checked={editPermissions.can_delete_programs}
                        onChange={(e) =>
                          setEditPermissions((prev) => ({
                            ...prev,
                            can_delete_programs: e.target.checked,
                          }))
                        }
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Trash2 size={14} style={{ color: editPermissions.can_delete_programs ? '#166534' : '#dc2626' }} />
                          <strong>Delete Rice Programs & Interventions (Module 02 - /rice/programs)</strong>
                        </div>
                        <span style={{ fontSize: 11, color: editPermissions.can_delete_programs ? 'var(--green-700)' : '#dc2626' }}>
                          {editPermissions.can_delete_programs
                            ? '✓ Power Granted (Account can remove banner interventions under /rice/programs)'
                            : '✗ Power Revoked (Delete button is hidden & blocked under /rice/programs)'}
                        </span>
                      </div>
                    </label>

                    {/* Power 6: Edit Rice Banner Programs & Interventions */}
                    <label
                      className={`module-toggle-item ${editPermissions.can_edit_programs ? 'allowed' : 'denied'}`}
                    >
                      <input
                        type="checkbox"
                        checked={editPermissions.can_edit_programs}
                        onChange={(e) =>
                          setEditPermissions((prev) => ({
                            ...prev,
                            can_edit_programs: e.target.checked,
                          }))
                        }
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Pencil size={14} style={{ color: editPermissions.can_edit_programs ? '#166534' : '#dc2626' }} />
                          <strong>Edit Rice Programs & Interventions (Module 02 - /rice/programs)</strong>
                        </div>
                        <span style={{ fontSize: 11, color: editPermissions.can_edit_programs ? 'var(--green-700)' : '#dc2626' }}>
                          {editPermissions.can_edit_programs
                            ? '✓ Power Granted (Account can update banner interventions under /rice/programs)'
                            : '✗ Power Revoked (Edit action button is restricted under /rice/programs)'}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* 5. Administrative Notes */}
              <div className="form-group" style={{ marginTop: 14 }}>
                <label htmlFor="edit-notes">Administrative Reason / Notes</label>
                <textarea
                  id="edit-notes"
                  rows={2}
                  className="form-control"
                  placeholder="e.g. Restricted from financial ledger pending audit training..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="button button-outline"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving Limits...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Apply Access Limits</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="modal-backdrop" onClick={closeDeleteModal} role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
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
                  <h3 style={{ margin: 0, fontSize: 16, color: '#991b1b' }}>Delete Personnel Account</h3>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>COA & Security Removal Confirmation</span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="modal-close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {deleteError && (
                <div className="auth-alert auth-alert-error" style={{ marginBottom: 16 }}>
                  <AlertTriangle size={16} />
                  <span>{deleteError}</span>
                </div>
              )}

              <p style={{ margin: '0 0 14px', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete the account for{' '}
                <strong style={{ color: '#0f172a' }}>{userToDelete.full_name}</strong>?
              </p>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: 13,
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Email:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{userToDelete.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Department:</span>
                  <span>{userToDelete.department}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Role Clearance:</span>
                  <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{userToDelete.role}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Registered Date:</span>
                  <span style={{ fontFamily: 'monospace' }}>{userToDelete.created_at.substring(0, 10)}</span>
                </div>
              </div>

              <div style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12,
                color: '#9f1239',
                lineHeight: 1.4,
              }}>
                ⚠️ <strong>Warning:</strong> Deleting this account will immediately revoke all access permissions, invalidate active sessions, and record a permanent deletion entry in the COA audit registry.
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="button button-outline"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
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
                      <span>Deleting Account...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Confirm Delete Account</span>
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
