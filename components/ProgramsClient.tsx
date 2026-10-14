'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Wheat,
  GraduationCap,
  FlaskConical,
  Droplets,
  Layers,
  Search,
  ArrowUpDown,
  X,
  Plus,
  Users,
  Sparkles,
  CheckCircle2,
  Filter,
  Loader2,
  List,
  LayoutGrid,
  Trash2,
  Pencil,
  Lock,
  ShieldAlert,
  Database,
  RefreshCw,
  Calendar,
} from 'lucide-react';

export interface Program {
  id?: string | number;
  category?: string;
  category_name?: string;
  name: string;
  description?: string;
  status?: string;
  target_beneficiaries?: string;
  province?: string;
  municipality?: string;
  barangay?: string;
  allotment_class?: string;
  start_date?: string;
  end_date?: string;
  date_coverage?: string;
  display_order?: number;
}

interface ProgramsClientProps {
  initialPrograms: Program[];
  initialCanDelete?: boolean;
  initialCanEdit?: boolean;
}

type CategoryKey = 'ALL' | 'PSS' | 'ESETS' | 'RD' | 'INS';
type PillarKey = 'PSS' | 'ESETS' | 'RD' | 'INS';

interface CategoryConfig {
  key: CategoryKey;
  label: string;
  shortLabel: string;
  fullName: string;
  color: string;
  bgLight: string;
  borderColor: string;
  badgeBg: string;
  badgeColor: string;
  icon: typeof Wheat;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'ALL',
    label: 'All Interventions',
    shortLabel: 'All',
    fullName: 'All Rice Banner Interventions',
    color: '#102b21',
    bgLight: '#f4f7f4',
    borderColor: '#cbd5e1',
    badgeBg: '#e2e8f0',
    badgeColor: '#1e293b',
    icon: Layers,
  },
  {
    key: 'PSS',
    label: 'Production Support Services',
    shortLabel: 'PSS',
    fullName: 'Production Support Services',
    color: '#059669',
    bgLight: '#ecfdf5',
    borderColor: '#a7f3d0',
    badgeBg: '#d1fae5',
    badgeColor: '#065f46',
    icon: Wheat,
  },
  {
    key: 'ESETS',
    label: 'Extension Support & Training',
    shortLabel: 'ESETS',
    fullName: 'Extension Support, Education and Training Services',
    color: '#2563eb',
    bgLight: '#eff6ff',
    borderColor: '#bfdbfe',
    badgeBg: '#dbeafe',
    badgeColor: '#1e40af',
    icon: GraduationCap,
  },
  {
    key: 'RD',
    label: 'Research & Development',
    shortLabel: 'RD',
    fullName: 'Research and Development',
    color: '#7c3aed',
    bgLight: '#f5f3ff',
    borderColor: '#ddd6fe',
    badgeBg: '#ede9fe',
    badgeColor: '#5b21b6',
    icon: FlaskConical,
  },
  {
    key: 'INS',
    label: 'Irrigation Network Services',
    shortLabel: 'INS',
    fullName: 'Irrigation Network Services',
    color: '#0891b2',
    bgLight: '#ecfeff',
    borderColor: '#a5f3fc',
    badgeBg: '#cffafe',
    badgeColor: '#155e75',
    icon: Droplets,
  },
];

export default function ProgramsClient({
  initialPrograms,
  initialCanDelete = true,
  initialCanEdit = true,
}: ProgramsClientProps) {
  const [programsList, setProgramsList] = useState<Program[]>(initialPrograms);
  const [canDeletePrograms, setCanDeletePrograms] = useState<boolean>(initialCanDelete);
  const [canEditPrograms, setCanEditPrograms] = useState<boolean>(initialCanEdit);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('ALL');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'display_order' | 'name' | 'category'>('display_order');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list'); // Default to list view as requested
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Synchronize dynamic permissions from /api/auth/me and window events
  useEffect(() => {
    const fetchPerms = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const json = await res.json();
          if (json?.account?.permissions) {
            setCanDeletePrograms(json.account.permissions.can_delete_programs !== false);
            setCanEditPrograms(json.account.permissions.can_edit_programs !== false);
          } else if (json?.account) {
            const role = json.account.role;
            setCanDeletePrograms(['super_admin', 'admin'].includes(role));
            setCanEditPrograms(['super_admin', 'admin', 'officer'].includes(role));
          }
        }
      } catch (e) {
        console.error('Error fetching permissions in ProgramsClient:', e);
      }
    };

    fetchPerms();

    const handlePermUpdated = () => {
      fetchPerms();
    };
    window.addEventListener('da_permissions_updated', handlePermUpdated);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'da_permissions_ts') {
        fetchPerms();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('da_permissions_updated', handlePermUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [formCategory, setFormCategory] = useState<PillarKey>('PSS');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBeneficiaries, setFormBeneficiaries] = useState('');
  const [formAllotmentClass, setFormAllotmentClass] = useState('MOOE');
  const [formStatus, setFormStatus] = useState('Active');
  const [formProvince, setFormProvince] = useState('Regional (CAR)');
  const [formStartDate, setFormStartDate] = useState('2026-01-01');
  const [formEndDate, setFormEndDate] = useState('2026-12-31');
  const [formDateCoverage, setFormDateCoverage] = useState('CY 2026 (Jan - Dec 2026)');

  // Category counts based on current state
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      ALL: programsList.length,
      PSS: 0,
      ESETS: 0,
      RD: 0,
      INS: 0,
    };
    programsList.forEach((p) => {
      const cat = (p.category || '').toUpperCase() as CategoryKey;
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      }
    });
    return counts;
  }, [programsList]);

  // Filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return programsList.filter((p) => {
      if (selectedCategory !== 'ALL') {
        const cat = (p.category || '').toUpperCase();
        if (cat !== selectedCategory) return false;
      }

      if (!q) return true;
      const haystack = [
        p.name,
        p.category,
        p.category_name,
        p.description,
        p.target_beneficiaries,
        p.allotment_class,
        p.province,
        p.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [programsList, selectedCategory, search]);

  // Sorting
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortField === 'display_order') {
        const orderA = a.display_order ?? 999;
        const orderB = b.display_order ?? 999;
        return direction === 'asc' ? orderA - orderB : orderB - orderA;
      }

      const valA = (a[sortField] || '').trim();
      const valB = (b[sortField] || '').trim();
      const comp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return direction === 'asc' ? comp : -comp;
    });
  }, [filtered, sortField, direction]);

  const activeCategoryMeta = CATEGORIES.find((c) => c.key === selectedCategory) || CATEGORIES[0];

  // Open Modal (New Program)
  const handleOpenModal = (presetCategory?: PillarKey) => {
    setEditingProgram(null);
    if (presetCategory) {
      setFormCategory(presetCategory);
    } else if (selectedCategory !== 'ALL') {
      setFormCategory(selectedCategory as PillarKey);
    } else {
      setFormCategory('PSS');
    }
    setFormName('');
    setFormDescription('');
    setFormBeneficiaries('');
    setFormAllotmentClass('MOOE');
    setFormStatus('Active');
    setFormProvince('Regional (CAR)');
    setFormStartDate('2026-01-01');
    setFormEndDate('2026-12-31');
    setFormDateCoverage('CY 2026 (Jan - Dec 2026)');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Open Modal (Edit Program)
  const handleOpenEditModal = (program: Program) => {
    if (!canEditPrograms) {
      alert('Access Denied: The administrator has removed your permission to edit interventions.');
      return;
    }
    setEditingProgram(program);
    const cat = (program.category || 'PSS').toUpperCase() as PillarKey;
    setFormCategory(['PSS', 'ESETS', 'RD', 'INS'].includes(cat) ? cat : 'PSS');
    setFormName(program.name || '');
    setFormDescription(program.description || '');
    setFormBeneficiaries(program.target_beneficiaries || '');
    setFormAllotmentClass(program.allotment_class || 'MOOE');
    setFormStatus(program.status || 'Active');
    setFormProvince(program.province || 'Regional (CAR)');
    setFormStartDate(program.start_date || '2026-01-01');
    setFormEndDate(program.end_date || '2026-12-31');
    setFormDateCoverage(program.date_coverage || 'CY 2026 (Jan - Dec 2026)');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Submit Program (Create or Update)
  const handleSubmitProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMessage('Please enter an intervention/program name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      name: formName.trim(),
      category: formCategory,
      description: formDescription.trim(),
      target_beneficiaries: formBeneficiaries.trim(),
      allotment_class: formAllotmentClass,
      status: formStatus,
      province: formProvince.trim() || 'Regional (CAR)',
      start_date: formStartDate || null,
      end_date: formEndDate || null,
      date_coverage: formDateCoverage.trim() || (formStartDate && formEndDate ? `${formStartDate} to ${formEndDate}` : 'CY 2026'),
    };

    try {
      if (editingProgram) {
        const response = await fetch('/api/rice/programs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingProgram.id, ...payload }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to update program');
        }

        const updated = result.program || { ...editingProgram, ...payload };
        setProgramsList((prev) =>
          prev.map((p) =>
            p.id === editingProgram.id || (p.name === editingProgram.name && !p.id)
              ? { ...p, ...updated }
              : p
          )
        );
        setIsModalOpen(false);
        setEditingProgram(null);
        setSuccessToast(`Successfully updated "${updated.name}"!`);
        setTimeout(() => setSuccessToast(null), 5000);
      } else {
        const response = await fetch('/api/rice/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to save new program');
        }

        const created = result.program;
        setProgramsList((prev) => [created, ...prev]);
        setIsModalOpen(false);
        setSuccessToast(`Successfully added "${created.name}" under ${created.category}!`);
        setTimeout(() => setSuccessToast(null), 5000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error occurred while saving program.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct quick status change handler
  const handleQuickStatusChange = async (program: Program, newStatus: string) => {
    if (!canEditPrograms) {
      alert('Access Denied: The administrator has removed your permission to edit interventions.');
      return;
    }
    const oldStatus = program.status || 'Active';
    if (oldStatus === newStatus) return;

    // Optimistically update local list
    setProgramsList((prev) =>
      prev.map((p) =>
        p.id === program.id || (p.name === program.name && !p.id)
          ? { ...p, status: newStatus }
          : p
      )
    );
    setSuccessToast(`Updated status of "${program.name}" to ${newStatus}.`);
    setTimeout(() => setSuccessToast(null), 4000);

    try {
      const res = await fetch('/api/rice/programs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: program.id,
          name: program.name,
          category: program.category,
          description: program.description,
          target_beneficiaries: program.target_beneficiaries,
          allotment_class: program.allotment_class,
          status: newStatus,
          province: program.province,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        // Rollback
        setProgramsList((prev) =>
          prev.map((p) =>
            p.id === program.id || (p.name === program.name && !p.id)
              ? { ...p, status: oldStatus }
              : p
          )
        );
        alert(data.error || 'Failed to update status');
      }
    } catch (err: any) {
      console.error('Quick status update error:', err);
      // Rollback
      setProgramsList((prev) =>
        prev.map((p) =>
          p.id === program.id || (p.name === program.name && !p.id)
            ? { ...p, status: oldStatus }
            : p
        )
      );
    }
  };

  // Delete Program Handler (Direct action with confirmation)
  const handleDeleteProgram = async (program: Program) => {
    if (!canDeletePrograms) {
      alert('Access Denied: The administrator has removed your permission to delete interventions.');
      return;
    }
    if (!program || !program.name) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete this intervention?\n\n"${program.name}" (${program.category || 'PSS'})`
    );
    if (!confirmed) return;

    // Optimistically remove from state immediately
    const prevList = programsList;
    setProgramsList((prev) => prev.filter((p) => p.id !== program.id && p.name !== program.name));
    setSuccessToast(`Deleted "${program.name}" from catalogue.`);
    setTimeout(() => setSuccessToast(null), 4000);

    try {
      const res = await fetch(`/api/rice/programs?id=${encodeURIComponent(String(program.id || ''))}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setProgramsList(prevList);
        alert(data?.error || 'Failed to delete intervention: Access denied by administrator.');
      }
    } catch (err: any) {
      console.error('Delete API error:', err);
      setProgramsList(prevList);
    }
  };

  const handleSyncFromDatabase = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/rice/programs?t=${Date.now()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync with database');
      }
      const fetched = data.programs || [];
      setProgramsList(fetched);
      if (fetched.length > 0) {
        setSuccessToast(`Successfully synced ${fetched.length} interventions from Supabase!`);
      } else {
        alert(
          'Notice: The "programs" database table is currently empty.\\n\\nTo populate the 34 banner interventions into Supabase:\\n1. Open "supabase/migrations/20261013_create_rice_programs.sql"\\n2. Execute it in your Supabase SQL Editor\\n3. Click "Sync Database" again.'
        );
      }
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Error syncing from database');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toast Notification */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 100,
            background: '#047857',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 2 }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Search, Pillar Filter & Actions Toolbar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Row 1: Category Filter Pills & Add Button */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginRight: 4 }}>
              PILLAR:
            </span>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              const count = categoryCounts[cat.key];
              const Icon = cat.icon;

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '6px 13px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: isSelected ? 700 : 550,
                    cursor: 'pointer',
                    border: isSelected ? `1.5px solid ${cat.color}` : '1px solid #e2e8f0',
                    background: isSelected ? cat.bgLight : '#ffffff',
                    color: isSelected ? cat.color : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={14} color={isSelected ? cat.color : '#64748b'} />
                  <span>{cat.shortLabel === 'All' ? 'All Interventions' : `${cat.shortLabel}`}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: isSelected ? cat.badgeBg : '#f1f5f9',
                      color: isSelected ? cat.badgeColor : '#64748b',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!canEditPrograms && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: 12,
                  fontWeight: 650,
                }}
                title="Super Admin has restricted this account from editing interventions"
              >
                <Lock size={12} />
                <span>Program Editing Revoked</span>
              </span>
            )}

            {!canDeletePrograms && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: 12,
                  fontWeight: 650,
                }}
                title="Super Admin has restricted this account from deleting interventions"
              >
                <Lock size={12} />
                <span>Program Deletion Revoked</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleSyncFromDatabase}
              disabled={isSyncing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 14px',
                borderRadius: 8,
                background: '#ffffff',
                color: '#102b21',
                border: '1px solid #cbd5e1',
                fontSize: 12.5,
                fontWeight: 650,
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'all 0.15s ease',
              }}
              title="Sync latest programs directly from the Supabase database"
            >
              <RefreshCw
                size={14}
                style={{
                  transition: 'transform 0.5s ease',
                  transform: isSyncing ? 'rotate(360deg)' : 'none',
                }}
              />
              <span>{isSyncing ? 'Syncing...' : 'Sync Database'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenModal()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                borderRadius: 8,
                background: '#d4a937',
                color: '#12261a',
                border: 'none',
                fontSize: 12.5,
                fontWeight: 750,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e5bc4b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#d4a937';
              }}
            >
              <Plus size={15} strokeWidth={2.6} />
              <span>+ Add New Program</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search, Sort, and View Mode Toggle */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: 540 }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by intervention name, pillar, class, or keyword..."
              style={{
                width: '100%',
                padding: '9px 36px 9px 36px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                background: '#f8fafc',
                color: '#1e293b',
                outline: 'none',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 2,
                  color: '#94a3b8',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Controls: Sort and List/Grid View Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* View Mode Switcher */}
            <div
              style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                borderRadius: 8,
                padding: 3,
                border: '1px solid #e2e8f0',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="View as clean list"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: viewMode === 'list' ? '#ffffff' : 'transparent',
                  color: viewMode === 'list' ? '#102b21' : '#64748b',
                  fontWeight: viewMode === 'list' ? 700 : 550,
                  fontSize: 12,
                  cursor: 'pointer',
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <List size={14} />
                <span>List View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="View as cards grid"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                  color: viewMode === 'grid' ? '#102b21' : '#64748b',
                  fontWeight: viewMode === 'grid' ? 700 : 550,
                  fontSize: 12,
                  cursor: 'pointer',
                  boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <LayoutGrid size={14} />
                <span>Grid View</span>
              </button>
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowUpDown size={14} color="#64748b" />
              <label htmlFor="program-sort" style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                Sort:
              </label>
              <select
                id="program-sort"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12.5,
                  background: '#ffffff',
                  color: '#1e293b',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <option value="display_order">Official Pillar Order</option>
                <option value="name">Intervention Name (A-Z)</option>
                <option value="category">Category (Pillar)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
              title={`Sorting ${direction === 'asc' ? 'Ascending' : 'Descending'}`}
              style={{
                padding: '7px 11px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              {direction === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Filter Status Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <div style={{ fontSize: 13, color: '#475569' }}>
          Showing <strong>{sorted.length}</strong> of <strong>{programsList.length}</strong> interventions
          {selectedCategory !== 'ALL' && (
            <span>
              {' '}
              in <strong>{activeCategoryMeta.label} ({selectedCategory})</strong>
            </span>
          )}
          {search && (
            <span>
              {' '}
              matching &quot;<strong>{search}</strong>&quot;
            </span>
          )}
        </div>

        {(selectedCategory !== 'ALL' || search) && (
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('ALL');
              setSearch('');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#059669',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* 4. MAIN INTERVENTIONS CONTAINER (LIST VIEW vs GRID VIEW) */}
      {sorted.length > 0 ? (
        viewMode === 'list' ? (
          /* ========================================================
             LIST / TABLE VIEW (Clean, compact, and scannable)
             ======================================================== */
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                maxHeight: '600px',
                overflowY: 'auto',
                overflowX: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 #f8fafc',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  textAlign: 'left',
                  fontSize: 13,
                }}
              >
                <thead
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                  }}
                >
                  <tr
                    style={{
                      background: '#f8fafc',
                      color: '#475569',
                      fontSize: 11,
                      fontWeight: 750,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <th style={{ position: 'sticky', top: 0, background: '#f8fafc', padding: '14px 16px', width: 60, textAlign: 'center', borderBottom: '2px solid #e2e8f0', zIndex: 20 }}>#</th>
                    <th style={{ position: 'sticky', top: 0, background: '#f8fafc', padding: '14px 16px', width: 120, borderBottom: '2px solid #e2e8f0', zIndex: 20 }}>Pillar</th>
                    <th style={{ position: 'sticky', top: 0, background: '#f8fafc', padding: '14px 20px', minWidth: 320, borderBottom: '2px solid #e2e8f0', zIndex: 20 }}>Intervention / Program Title</th>
                    <th style={{ position: 'sticky', top: 0, background: '#f8fafc', padding: '14px 16px', width: 90, textAlign: 'center', borderBottom: '2px solid #e2e8f0', zIndex: 20 }}>Class</th>
                    <th style={{ position: 'sticky', top: 0, background: '#f8fafc', padding: '14px 16px', width: 110, textAlign: 'center', borderBottom: '2px solid #e2e8f0', zIndex: 20 }}>Coverage</th>
                    <th style={{ position: 'sticky', top: 0, background: '#f8fafc', padding: '14px 14px', width: 150, textAlign: 'center', borderBottom: '2px solid #e2e8f0', zIndex: 20 }}>Date Coverage</th>
                    <th style={{ position: 'sticky', top: 0, background: '#f8fafc', padding: '14px 16px', width: 100, textAlign: 'center', borderBottom: '2px solid #e2e8f0', zIndex: 20 }}>Status</th>
                    <th style={{ position: 'sticky', top: 0, background: '#f8fafc', padding: '14px 12px', width: 96, textAlign: 'center', borderBottom: '2px solid #e2e8f0', zIndex: 20 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((program, idx) => {
                    const catKey = (program.category || 'PSS').toUpperCase() as CategoryKey;
                    const catMeta = CATEGORIES.find((c) => c.key === catKey) || CATEGORIES[1];
                    const Icon = catMeta.icon;

                    return (
                      <tr
                        key={program.id || `${program.name}-${idx}`}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.12s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {/* Order Number */}
                        <td
                          style={{
                            padding: '14px 16px',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: '#94a3b8',
                            fontSize: 12,
                          }}
                        >
                          {program.display_order ?? idx + 1}
                        </td>

                        {/* Pillar Badge */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 750,
                              letterSpacing: '0.02em',
                              background: catMeta.badgeBg,
                              color: catMeta.badgeColor,
                              border: `1px solid ${catMeta.borderColor}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Icon size={13} />
                            {catMeta.shortLabel}
                          </span>
                        </td>

                        {/* Title and Description */}
                        <td style={{ padding: '14px 20px', verticalAlign: 'top' }}>
                          <div
                            style={{
                              fontWeight: 700,
                              color: '#0f172a',
                              fontSize: 14,
                              lineHeight: 1.35,
                              marginBottom: program.description ? 4 : 0,
                            }}
                          >
                            {program.name}
                          </div>
                          {program.description && (
                            <div
                              style={{
                                color: '#64748b',
                                fontSize: 12,
                                lineHeight: 1.5,
                              }}
                            >
                              {program.description}
                            </div>
                          )}
                        </td>

                        {/* Allotment Class */}
                        <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: '#f1f5f9',
                              color: '#334155',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            {program.allotment_class || 'MOOE'}
                          </span>
                        </td>

                        {/* Coverage */}
                        <td
                          style={{
                            padding: '14px 16px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontSize: 11.5,
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {program.province || 'Regional (CAR)'}
                        </td>

                        {/* Date Coverage */}
                        <td
                          style={{
                            padding: '14px 14px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontSize: 11.5,
                            color: '#475569',
                          }}
                        >
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              background: '#f8fafc',
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid #e2e8f0',
                              fontSize: 11.5,
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Calendar size={12} color="#059669" />
                            <span>
                              {program.date_coverage ||
                                (program.start_date && program.end_date
                                  ? `${program.start_date} to ${program.end_date}`
                                  : 'CY 2026')}
                            </span>
                          </div>
                        </td>

                        {/* Status - Quick Switcher */}
                        <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                          {canEditPrograms ? (
                            <select
                              value={program.status || 'Active'}
                              onChange={(e) => handleQuickStatusChange(program, e.target.value)}
                              title="Click to change intervention status"
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '4px 8px',
                                borderRadius: 999,
                                background:
                                  ['planned', 'upcoming'].includes((program.status || 'Active').toLowerCase())
                                    ? '#fef3c7'
                                    : (program.status || 'Active').toLowerCase() === 'completed'
                                    ? '#f1f5f9'
                                    : '#ecfdf5',
                                color:
                                  ['planned', 'upcoming'].includes((program.status || 'Active').toLowerCase())
                                    ? '#92400e'
                                    : (program.status || 'Active').toLowerCase() === 'completed'
                                    ? '#475569'
                                    : '#065f46',
                                border: `1px solid ${
                                  ['planned', 'upcoming'].includes((program.status || 'Active').toLowerCase())
                                    ? '#fde68a'
                                    : (program.status || 'Active').toLowerCase() === 'completed'
                                    ? '#cbd5e1'
                                    : '#a7f3d0'
                                }`,
                                cursor: 'pointer',
                                outline: 'none',
                              }}
                            >
                              <option value="Active">● Active</option>
                              <option value="Ongoing">● Ongoing</option>
                              <option value="Upcoming">● Upcoming</option>
                              <option value="Completed">● Completed</option>
                            </select>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '3px 9px',
                                borderRadius: 999,
                                background:
                                  ['planned', 'upcoming'].includes((program.status || 'Active').toLowerCase())
                                    ? '#fef3c7'
                                    : (program.status || 'Active').toLowerCase() === 'completed'
                                    ? '#f1f5f9'
                                    : '#ecfdf5',
                                color:
                                  ['planned', 'upcoming'].includes((program.status || 'Active').toLowerCase())
                                    ? '#92400e'
                                    : (program.status || 'Active').toLowerCase() === 'completed'
                                    ? '#475569'
                                    : '#065f46',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background:
                                    (program.status || 'Active').toLowerCase() === 'planned'
                                      ? '#f59e0b'
                                      : (program.status || 'Active').toLowerCase() === 'completed'
                                      ? '#94a3b8'
                                      : '#10b981',
                                }}
                              />
                              {program.status || 'Active'}
                            </span>
                          )}
                        </td>

                        {/* Action - Edit or Delete Buttons */}
                        <td style={{ padding: '14px 12px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {canEditPrograms ? (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(program)}
                                title={`Edit "${program.name}"`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 30,
                                  height: 30,
                                  borderRadius: 6,
                                  border: '1px solid #bfdbfe',
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#dbeafe';
                                  e.currentTarget.style.color = '#1e40af';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#eff6ff';
                                  e.currentTarget.style.color = '#1d4ed8';
                                }}
                              >
                                <Pencil size={13} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                title="Edit Power Revoked: Administrator has removed your authorization to edit interventions."
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 30,
                                  height: 30,
                                  borderRadius: 6,
                                  border: '1px solid #e2e8f0',
                                  background: '#f1f5f9',
                                  color: '#94a3b8',
                                  cursor: 'not-allowed',
                                  opacity: 0.65,
                                }}
                              >
                                <Lock size={12} />
                              </button>
                            )}

                            {canDeletePrograms ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteProgram(program)}
                                title={`Delete "${program.name}"`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 30,
                                  height: 30,
                                  borderRadius: 6,
                                  border: '1px solid #fee2e2',
                                  background: '#fff5f5',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#fee2e2';
                                  e.currentTarget.style.color = '#991b1b';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#fff5f5';
                                  e.currentTarget.style.color = '#dc2626';
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                title="Delete Power Revoked: Administrator has removed your authorization to delete interventions."
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 30,
                                  height: 30,
                                  borderRadius: 6,
                                  border: '1px solid #e2e8f0',
                                  background: '#f1f5f9',
                                  color: '#94a3b8',
                                  cursor: 'not-allowed',
                                  opacity: 0.65,
                                }}
                              >
                                <Lock size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* List Footer Summary */}
            <div
              style={{
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 12,
                color: '#64748b',
              }}
            >
              <span>Total rows: <strong>{sorted.length}</strong> items</span>
              <span>DA-CAR Regional Rice Program Coordinating Unit</span>
            </div>
          </div>
        ) : (
          /* ========================================================
             GRID VIEW (Cards layout for visual cards preference)
             ======================================================== */
          <div
            style={{
              maxHeight: '620px',
              overflowY: 'auto',
              paddingRight: 6,
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 #f8fafc',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: 18,
              }}
            >
              {sorted.map((program, idx) => {
                const catKey = (program.category || 'PSS').toUpperCase() as CategoryKey;
                const catMeta = CATEGORIES.find((c) => c.key === catKey) || CATEGORIES[1];
                const Icon = catMeta.icon;

                return (
                  <article
                    key={program.id || `${program.name}-${idx}`}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: '22px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.08)';
                      e.currentTarget.style.borderColor = catMeta.borderColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.03)';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    {/* Top Accent Bar */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 3.5,
                        background: catMeta.color,
                      }}
                    />

                    <div>
                      {/* Category Pill & Status Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          marginBottom: 14,
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 750,
                            letterSpacing: '0.03em',
                            background: catMeta.badgeBg,
                            color: catMeta.badgeColor,
                          }}
                        >
                          <Icon size={13} />
                          {catMeta.shortLabel}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {program.allotment_class && (
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 4,
                                background: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {program.allotment_class}
                            </span>
                          )}

                          {canEditPrograms ? (
                            <select
                              value={program.status || 'Active'}
                              onChange={(e) => handleQuickStatusChange(program, e.target.value)}
                              title="Click to change intervention status"
                              style={{
                                fontSize: 10.5,
                                fontWeight: 650,
                                padding: '2px 7px',
                                borderRadius: 999,
                                background:
                                  ['planned', 'upcoming'].includes((program.status || 'Active').toLowerCase())
                                    ? '#fef3c7'
                                    : (program.status || 'Active').toLowerCase() === 'completed'
                                    ? '#f1f5f9'
                                    : '#ecfdf5',
                                color:
                                  ['planned', 'upcoming'].includes((program.status || 'Active').toLowerCase())
                                    ? '#92400e'
                                    : (program.status || 'Active').toLowerCase() === 'completed'
                                    ? '#475569'
                                    : '#065f46',
                                border: `1px solid ${
                                  ['planned', 'upcoming'].includes((program.status || 'Active').toLowerCase())
                                    ? '#fde68a'
                                    : (program.status || 'Active').toLowerCase() === 'completed'
                                    ? '#cbd5e1'
                                    : '#a7f3d0'
                                }`,
                                cursor: 'pointer',
                                outline: 'none',
                              }}
                            >
                              <option value="Active">Active</option>
                              <option value="Ongoing">Ongoing</option>
                              <option value="Upcoming">Upcoming</option>
                              <option value="Completed">Completed</option>
                            </select>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 650,
                                padding: '3px 8px',
                                borderRadius: 999,
                                background:
                                  ['planned', 'upcoming'].includes((program.status || 'Active').toLowerCase())
                                    ? '#fef3c7'
                                    : (program.status || 'Active').toLowerCase() === 'completed'
                                    ? '#f1f5f9'
                                    : '#ecfdf5',
                                color:
                                  ['planned', 'upcoming'].includes((program.status || 'Active').toLowerCase())
                                    ? '#92400e'
                                    : (program.status || 'Active').toLowerCase() === 'completed'
                                    ? '#475569'
                                    : '#065f46',
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background:
                                    ['planned', 'upcoming'].includes((program.status || 'Active').toLowerCase())
                                      ? '#f59e0b'
                                      : (program.status || 'Active').toLowerCase() === 'completed'
                                      ? '#94a3b8'
                                      : '#10b981',
                                }}
                              />
                              {program.status || 'Active'}
                            </span>
                          )}

                          {canEditPrograms ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(program)}
                              title={`Edit "${program.name}"`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 26,
                                height: 26,
                                borderRadius: 4,
                                border: '1px solid #bfdbfe',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#dbeafe';
                                e.currentTarget.style.color = '#1e40af';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#eff6ff';
                                e.currentTarget.style.color = '#1d4ed8';
                              }}
                            >
                              <Pencil size={12} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="Edit Power Revoked: Administrator has removed your authorization to edit interventions."
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 26,
                                height: 26,
                                borderRadius: 4,
                                border: '1px solid #e2e8f0',
                                background: '#f1f5f9',
                                color: '#94a3b8',
                                cursor: 'not-allowed',
                                opacity: 0.65,
                              }}
                            >
                              <Lock size={11} />
                            </button>
                          )}

                          {canDeletePrograms ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteProgram(program)}
                              title={`Delete "${program.name}"`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 26,
                                height: 26,
                                borderRadius: 4,
                                border: '1px solid #fee2e2',
                                background: '#fff5f5',
                                color: '#dc2626',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fee2e2';
                                e.currentTarget.style.color = '#991b1b';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#fff5f5';
                                e.currentTarget.style.color = '#dc2626';
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="Delete Power Revoked: Administrator has removed your authorization to delete interventions."
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 26,
                                height: 26,
                                borderRadius: 4,
                                border: '1px solid #e2e8f0',
                                background: '#f1f5f9',
                                color: '#94a3b8',
                                cursor: 'not-allowed',
                                opacity: 0.65,
                              }}
                            >
                              <Lock size={11} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Program Title */}
                      <h2
                        style={{
                          margin: '0 0 10px',
                          fontSize: 16.5,
                          fontWeight: 700,
                          color: '#0f172a',
                          lineHeight: 1.35,
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {program.name}
                      </h2>

                      {/* Description */}
                      {program.description && (
                        <p
                          style={{
                            margin: '0 0 16px',
                            color: '#475569',
                            fontSize: 12.5,
                            lineHeight: 1.6,
                          }}
                        >
                          {program.description}
                        </p>
                      )}
                    </div>

                    {/* Footer metadata: Beneficiaries & Region */}
                    <div
                      style={{
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: 12,
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      {program.target_beneficiaries && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11.5, color: '#64748b' }}>
                          <Users size={14} style={{ flexShrink: 0, marginTop: 1, color: '#94a3b8' }} />
                          <span style={{ lineHeight: 1.4 }}>
                            <strong style={{ color: '#475569' }}>Target:</strong> {program.target_beneficiaries}
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                        <span>Coverage: {program.province || 'Regional (CAR)'}</span>
                        {program.display_order && <span>#{program.display_order}</span>}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#059669', fontWeight: 600 }}>
                        <Calendar size={12} />
                        <span>
                          {program.date_coverage ||
                            (program.start_date && program.end_date
                              ? `${program.start_date} to ${program.end_date}`
                              : 'CY 2026')}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )
      ) : programsList.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '2px dashed #cbd5e1',
            padding: '54px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
              color: '#059669',
            }}
          >
            <Database size={28} />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 750, color: '#0f172a' }}>
            Programs Data Cleared — Ready to Sync with Database
          </h3>
          <p style={{ margin: '0 auto 20px', maxWidth: 580, fontSize: 13.5, color: '#64748b', lineHeight: 1.6 }}>
            The programs dataset has been cleared. To populate the interventions in Supabase, execute the migration script in your Supabase SQL Editor, then click <strong>Sync Database</strong> below.
          </p>
          <div style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={handleSyncFromDatabase}
              disabled={isSyncing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 22px',
                borderRadius: 8,
                background: '#059669',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(5,150,105,0.25)',
              }}
            >
              <RefreshCw
                size={15}
                style={{
                  transition: 'transform 0.5s ease',
                  transform: isSyncing ? 'rotate(360deg)' : 'none',
                }}
              />
              <span>{isSyncing ? 'Syncing...' : 'Sync Database'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenModal()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 8,
                background: '#f8fafc',
                color: '#334155',
                fontSize: 13,
                fontWeight: 650,
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              <span>+ Add Program Manually</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
              color: '#64748b',
            }}
          >
            <Filter size={24} />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
            No interventions match your criteria
          </h3>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b' }}>
            Try adjusting your search terms or selecting a different pillar category.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('ALL');
              setSearch('');
            }}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              background: '#102b21',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 650,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* 5. ADD PROGRAM MODAL DIALOG */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 620,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #102b21 0%, #17392b 100%)',
                color: '#ffffff',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  {editingProgram ? 'Edit Rice Program Intervention' : 'Add New Rice Program Intervention'}
                </h3>
                <p style={{ margin: 0, fontSize: 12.5, color: '#cbd5e1' }}>
                  {editingProgram
                    ? 'Update the intervention title, scope, status, or details.'
                    : 'Register a new initiative under one of the 4 banner pillars.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingProgram(null);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#ffffff',
                  width: 32,
                  height: 32,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitProgram} style={{ padding: '24px' }}>
              {errorMessage && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '10px 14px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    marginBottom: 18,
                  }}
                >
                  {errorMessage}
                </div>
              )}

              {/* 1. Category Selector */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                  Choose Program Pillar / Category <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {(['PSS', 'ESETS', 'RD', 'INS'] as PillarKey[]).map((catKey) => {
                    const catMeta = CATEGORIES.find((c) => c.key === catKey)!;
                    const isSelected = formCategory === catKey;
                    const Icon = catMeta.icon;

                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setFormCategory(catKey)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: isSelected ? `2px solid ${catMeta.color}` : '1px solid #cbd5e1',
                          background: isSelected ? catMeta.bgLight : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            background: isSelected ? catMeta.badgeBg : '#f1f5f9',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={16} color={catMeta.color} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 750, color: isSelected ? catMeta.color : '#1e293b' }}>
                            {catKey}
                          </div>
                          <div style={{ fontSize: 10.5, color: '#64748b', lineHeight: 1.2 }}>
                            {catMeta.shortLabel === 'PSS' ? 'Production Support' : catMeta.shortLabel === 'ESETS' ? 'Extension & Training' : catMeta.shortLabel === 'RD' ? 'Research & Dev' : 'Irrigation Services'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Program Name */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                  Intervention / Program Title <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Distribution of specialized climate-resilient inbred seeds"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
              </div>

              {/* 3. Description */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                  Description / Deliverables
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Provide scope, targets, or specific deliverables for this intervention..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    color: '#0f172a',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* 4. Target Beneficiaries */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                  Target Beneficiaries / Cooperators
                </label>
                <input
                  type="text"
                  value={formBeneficiaries}
                  onChange={(e) => setFormBeneficiaries(e.target.value)}
                  placeholder="e.g. RSBSA-registered rice farmers in cluster cooperatives"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
              </div>

              {/* 5. Row with Allotment Class, Status, Coverage */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    Allotment Class
                  </label>
                  <select
                    value={formAllotmentClass}
                    onChange={(e) => setFormAllotmentClass(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12.5,
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="MOOE">MOOE (Operating)</option>
                    <option value="CO">CO (Capital Outlay)</option>
                    <option value="PS">PS (Personnel)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12.5,
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="Active">Active</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    Coverage
                  </label>
                  <input
                    type="text"
                    value={formProvince}
                    onChange={(e) => setFormProvince(e.target.value)}
                    placeholder="Regional (CAR)"
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12.5,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* 6. Date Coverage & Implementation Timeline */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Calendar size={14} color="#059669" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                    Date Coverage & Implementation Timeline
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormStartDate(val);
                        if (!formDateCoverage || formDateCoverage.includes('to') || formDateCoverage.startsWith('202')) {
                          setFormDateCoverage(val && formEndDate ? `${val} to ${formEndDate}` : val);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '7px 8px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                        background: '#fff',
                        color: '#0f172a',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formEndDate}
                      min={formStartDate || undefined}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormEndDate(val);
                        if (!formDateCoverage || formDateCoverage.includes('to')) {
                          setFormDateCoverage(formStartDate && val ? `${formStartDate} to ${val}` : val);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '7px 8px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                        background: '#fff',
                        color: '#0f172a',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
                      Period / Label
                    </label>
                    <input
                      type="text"
                      value={formDateCoverage}
                      onChange={(e) => setFormDateCoverage(e.target.value)}
                      placeholder="e.g. CY 2026, Wet Season"
                      style={{
                        width: '100%',
                        padding: '7px 8px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                        background: '#fff',
                        color: '#0f172a',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 18 }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProgram(null);
                  }}
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 22px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#047857',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(4, 120, 87, 0.3)',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : editingProgram ? (
                    <>
                      <CheckCircle2 size={16} />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Plus size={16} strokeWidth={2.5} />
                      Save Intervention
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
