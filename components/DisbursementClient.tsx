'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Filter,
  Search,
  ArrowUpDown,
  FileSpreadsheet,
  ListFilter,
} from 'lucide-react';
import {
  DisbursementItem,
  FetchDisbursementResult,
  CONTINUING_RICE_PAP_CODES,
  UNPAID_PRIOR_YEARS_RICE_PAP_CODES,
  RICE_PROGRAM_PAP_CODES,
} from '@/utils/fetchContinuingDisbursements';
import { createClient } from '@/utils/supabase/client';

export type DisbursementView = 'current' | 'continuing' | 'unpaid-prior-years';

export type DisbursementStatusCategory =
  | 'all'
  | 'accounting'
  | 'dv-prep'
  | 'conduct'
  | 'delivery'
  | 'paid'
  | 'unpaid'
  | 'rts'
  | 'others';

export interface StatusGroupConfig {
  id: DisbursementStatusCategory;
  label: string;
}

export const STATUS_GROUPS: StatusGroupConfig[] = [
  { id: 'all', label: 'All Statuses' },
  { id: 'accounting', label: 'Submitted to Accounting' },
  { id: 'dv-prep', label: 'Preparing Attachment for DV' },
  { id: 'conduct', label: 'For Conduct' },
  { id: 'delivery', label: 'For Delivery / Ongoing' },
  { id: 'paid', label: 'Paid' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'rts', label: 'RTS / For Compliance' },
  { id: 'others', label: 'Others / Unspecified' },
];

export function getStatusCategory(status?: string): DisbursementStatusCategory {
  if (!status || !status.trim() || status.trim().toUpperCase() === 'UNSPECIFIED') {
    return 'others';
  }
  const s = status.trim().toUpperCase();
  if (s.includes('RTS') || s.includes('COMPLIANCE')) {
    return 'rts';
  }
  if (s.includes('ACCOUNTING')) {
    return 'accounting';
  }
  if (
    s.includes('ATTACHMENT') ||
    s.includes('ATTACH') ||
    s.includes('DV') ||
    s.includes('PREPARATION') ||
    s.includes('DOCUMENTS')
  ) {
    return 'dv-prep';
  }
  if (s.includes('CONDUCT')) {
    return 'conduct';
  }
  if (s.includes('DELIVER') || s.includes('ON-GOING') || s.includes('ONGOING')) {
    return 'delivery';
  }
  if (s === 'PAID') {
    return 'paid';
  }
  if (s === 'UNPAID') {
    return 'unpaid';
  }
  return 'others';
}

interface DisbursementClientProps {
  initialContinuingData?: FetchDisbursementResult;
  initialCurrentData?: FetchDisbursementResult;
  initialUnpaidPriorYearsData?: FetchDisbursementResult;
  initialIsAuthenticated?: boolean;
  currentUserEmail?: string;
  allotmentData?: {
    categories: Array<{
      id: string;
      name: string;
      allocation: number;
      continuingAlloc?: number;
      totalAlloc?: number;
    }>;
    totalBannerRice: {
      id: string;
      name: string;
      allocation: number;
      continuingAlloc?: number;
      totalAlloc?: number;
    };
  };
}

export default function DisbursementClient({
  initialContinuingData,
  initialCurrentData,
  initialUnpaidPriorYearsData,
  initialIsAuthenticated = false,
  currentUserEmail,
  allotmentData,
}: DisbursementClientProps) {
  const [selectedView, setSelectedView] = useState<DisbursementView>('current');
  const [papFilter, setPapFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<DisbursementStatusCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'payee' | 'status' | 'endUser' | 'totalObligation' | 'grossAmount' | 'unpaidObligation' | 'rate'>('totalObligation');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Authentication & Privacy Decryption state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(initialIsAuthenticated));
  const [decryptedPayees, setDecryptedPayees] = useState<Record<string, string>>({});
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);

  const activePapCodes = useMemo(() => {
    if (selectedView === 'unpaid-prior-years') {
      return UNPAID_PRIOR_YEARS_RICE_PAP_CODES;
    }
    if (selectedView === 'continuing') {
      return CONTINUING_RICE_PAP_CODES;
    }
    return RICE_PROGRAM_PAP_CODES;
  }, [selectedView]);

  // Select active records & totals based on the dropdown
  const activeData = useMemo(() => {
    if (selectedView === 'current') {
      return (
        initialCurrentData || {
          records: [],
          totals: { totalObligation: 0, grossAmount: 0, unpaidObligation: 0, count: 0 },
          fetchedAt: '',
        }
      );
    }
    if (selectedView === 'continuing') {
      return (
        initialContinuingData || {
          records: [],
          totals: { totalObligation: 0, grossAmount: 0, unpaidObligation: 0, count: 0 },
          fetchedAt: '',
        }
      );
    }
    if (selectedView === 'unpaid-prior-years') {
      return (
        initialUnpaidPriorYearsData || {
          records: [],
          totals: { totalObligation: 0, grossAmount: 0, unpaidObligation: 0, count: 0 },
          fetchedAt: '',
        }
      );
    }
    return {
      records: [],
      totals: { totalObligation: 0, grossAmount: 0, unpaidObligation: 0, count: 0 },
      fetchedAt: '',
    };
  }, [selectedView, initialCurrentData, initialContinuingData, initialUnpaidPriorYearsData]);

  const records = activeData.records;
  const totals = activeData.totals;

  const getDisplayPayee = useCallback(
    (item: DisbursementItem): string => {
      if (decryptedPayees[item.id]) {
        return decryptedPayees[item.id];
      }
      return item.payee;
    },
    [decryptedPayees]
  );

  // Function to decrypt encrypted records once authenticated
  const triggerDecryption = useCallback(async () => {
    const encryptedMap: Record<string, string> = {};
    records.forEach((r) => {
      if (r.encryptedPayee && !decryptedPayees[r.id]) {
        encryptedMap[r.id] = r.encryptedPayee;
      }
    });

    if (Object.keys(encryptedMap).length === 0) return;

    setIsDecrypting(true);
    try {
      const res = await fetch('/api/disbursements/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: encryptedMap }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.decrypted) {
          setDecryptedPayees((prev) => ({ ...prev, ...data.decrypted }));
          setIsAuthenticated(true);
        }
      }
    } catch (err) {
      console.error('Error decrypting personnel names:', err);
    } finally {
      setIsDecrypting(false);
    }
  }, [records, decryptedPayees]);

  // Auth verification and session change listener
  useEffect(() => {
    const supabase = createClient();

    const verifySession = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
          return;
        }

        const match = document.cookie.match(/(?:^|;\s*)da_admin_session=([^;]+)/);
        if (match) {
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Error verifying auth for disbursement privacy:', err);
      }
    };

    verifySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
      } else {
        const match = document.cookie.match(/(?:^|;\s*)da_admin_session=([^;]+)/);
        if (!match) {
          setIsAuthenticated(false);
          setDecryptedPayees({});
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Trigger decryption whenever authenticated and view changes or records mount
  useEffect(() => {
    if (isAuthenticated) {
      triggerDecryption();
    }
  }, [isAuthenticated, selectedView, records, triggerDecryption]);

  // Dynamic cross-filtering: Status counts depend on selected PAP Code
  const recordsForStatus = useMemo(() => {
    if (papFilter === 'all') return records;
    return records.filter((r) => r.ppaCode === papFilter);
  }, [records, papFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: recordsForStatus.length };
    for (const r of recordsForStatus) {
      const cat = getStatusCategory(r.status);
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [recordsForStatus]);

  // Dynamic cross-filtering: PAP Code counts depend on selected Status
  const recordsForPap = useMemo(() => {
    if (statusFilter === 'all') return records;
    return records.filter((r) => getStatusCategory(r.status) === statusFilter);
  }, [records, statusFilter]);

  const papCounts = useMemo(() => {
    const counts: Record<string, number> = { all: recordsForPap.length };
    for (const r of recordsForPap) {
      if (r.ppaCode) {
        counts[r.ppaCode] = (counts[r.ppaCode] || 0) + 1;
      }
    }
    return counts;
  }, [recordsForPap]);

  const handleViewChange = (newView: DisbursementView) => {
    setSelectedView(newView);
    setPapFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  };

  const handlePapChange = (newPap: string) => {
    setPapFilter(newPap);
    if (newPap !== 'all' && statusFilter !== 'all') {
      const match = records.some(
        (r) => r.ppaCode === newPap && getStatusCategory(r.status) === statusFilter
      );
      if (!match) {
        setStatusFilter('all');
      }
    }
  };

  const handleStatusChange = (newStatus: DisbursementStatusCategory | 'all') => {
    setStatusFilter(newStatus);
    if (newStatus !== 'all' && papFilter !== 'all') {
      const match = records.some(
        (r) => r.ppaCode === papFilter && getStatusCategory(r.status) === newStatus
      );
      if (!match) {
        setPapFilter('all');
      }
    }
  };

  const filteredRecords = useMemo(() => {
    let list = records;
    if (papFilter !== 'all') {
      list = list.filter((r) => r.ppaCode === papFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter((r) => getStatusCategory(r.status) === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const payeeText = getDisplayPayee(r).toLowerCase();
        return (
          payeeText.includes(q) ||
          (r.particulars && r.particulars.toLowerCase().includes(q)) ||
          (r.orsNumber && r.orsNumber.toLowerCase().includes(q)) ||
          (r.ppaCode && r.ppaCode.toLowerCase().includes(q)) ||
          (r.status && r.status.toLowerCase().includes(q)) ||
          (r.endUser && r.endUser.toLowerCase().includes(q))
        );
      });
    }

    return [...list].sort((a, b) => {
      if (sortField === 'rate') {
        const rateA = a.totalObligation > 0 ? a.grossAmount / a.totalObligation : 0;
        const rateB = b.totalObligation > 0 ? b.grossAmount / b.totalObligation : 0;
        return sortDirection === 'asc' ? rateA - rateB : rateB - rateA;
      }

      if (sortField === 'payee') {
        const valA = getDisplayPayee(a);
        const valB = getDisplayPayee(b);
        const comp = valA.localeCompare(valB);
        return sortDirection === 'asc' ? comp : -comp;
      }

      if (sortField === 'status') {
        const valA = a.status || '';
        const valB = b.status || '';
        const comp = valA.localeCompare(valB);
        return sortDirection === 'asc' ? comp : -comp;
      }

      if (sortField === 'endUser') {
        const valA = a.endUser || '';
        const valB = b.endUser || '';
        const comp = valA.localeCompare(valB);
        return sortDirection === 'asc' ? comp : -comp;
      }

      const valA = a[sortField];
      const valB = b[sortField];
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [records, papFilter, statusFilter, searchQuery, sortField, sortDirection, getDisplayPayee]);

  const displayTotals = useMemo(() => {
    if (papFilter === 'all' && statusFilter === 'all' && !searchQuery.trim()) {
      return totals;
    }
    return {
      totalObligation: filteredRecords.reduce((sum, r) => sum + r.totalObligation, 0),
      grossAmount: filteredRecords.reduce((sum, r) => sum + r.grossAmount, 0),
      unpaidObligation: filteredRecords.reduce((sum, r) => sum + r.unpaidObligation, 0),
      count: filteredRecords.length,
    };
  }, [papFilter, statusFilter, searchQuery, totals, filteredRecords]);

  const toggleSort = (field: 'payee' | 'status' | 'endUser' | 'totalObligation' | 'grossAmount' | 'unpaidObligation' | 'rate') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatCurrency = (val: number) => {
    if (val === 0) return '-';
    return `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCompactCurrency = (val: number) => {
    if (!val || val === 0) return '₱0.00';
    if (val >= 1_000_000_000) return `₱${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `₱${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `₱${(val / 1_000).toFixed(2)}K`;
    return `₱${val.toFixed(2)}`;
  };

  const activeAllotment = useMemo(() => {
    if (!allotmentData) return 0;
    const { categories = [], totalBannerRice } = allotmentData;

    if (papFilter !== 'all') {
      const pUpper = papFilter.toUpperCase();
      const matched = categories.find(
        (c) =>
          pUpper.includes(c.id.toUpperCase()) ||
          pUpper.includes(c.name.toUpperCase()) ||
          (c.id === 'pss' && pUpper.includes('PSS')) ||
          (c.id === 'esets' && pUpper.includes('ESETS')) ||
          (c.id === 'rd' && pUpper.includes('RD')) ||
          (c.id === 'ins' && pUpper.includes('INS'))
      );
      if (matched) {
        if (selectedView === 'continuing') return matched.continuingAlloc || 0;
        if (selectedView === 'unpaid-prior-years') return matched.totalAlloc || 0;
        return matched.allocation || 0;
      }
    }

    if (totalBannerRice) {
      if (selectedView === 'continuing') return totalBannerRice.continuingAlloc || 0;
      if (selectedView === 'unpaid-prior-years') return totalBannerRice.totalAlloc || 0;
      return totalBannerRice.allocation || 0;
    }

    return 0;
  }, [allotmentData, papFilter, selectedView]);

  const viewTitle =
    selectedView === 'current'
      ? 'Current Disbursements'
      : selectedView === 'continuing'
        ? 'Continuing Disbursements'
        : 'Unpaid Prior Years Disbursements';

  return (
    <div className="disbursement-page-wrapper" style={{ width: '100%', maxWidth: 1480, margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* Top Header Card with View Dropdown */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#f0fdf4',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CreditCard size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                Disbursement
              </h1>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              Registry of Allotments, Obligations and Disbursements
            </p>
          </div>
        </div>

        {/* Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Fund Category */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <label htmlFor="disbursement-category" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              <Filter size={14} style={{ color: '#166534' }} />
              <span>Fund Category:</span>
            </label>
            <select
              id="disbursement-category"
              value={selectedView}
              onChange={(e) => handleViewChange(e.target.value as DisbursementView)}
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                outline: 'none',
                minWidth: 180,
              }}
            >
              <option value="current">Current ({initialCurrentData?.records?.length || 0})</option>
              <option value="continuing">Continuing ({initialContinuingData?.records?.length || 0})</option>
              <option value="unpaid-prior-years">Unpaid Prior Years ({initialUnpaidPriorYearsData?.records?.length || 0})</option>
            </select>
          </div>

          {/* PAP Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <label htmlFor="disbursement-pap-filter" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              <span>PAP Code:</span>
            </label>
            <select
              id="disbursement-pap-filter"
              value={papFilter}
              onChange={(e) => handlePapChange(e.target.value)}
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                outline: 'none',
                minWidth: 220,
              }}
            >
              <option value="all">All ({papCounts.all || 0})</option>
              {activePapCodes.map((code) => {
                const count = papCounts[code] || 0;
                const nameOnly = code.replace(/^\d+\s*/, '');
                return (
                  <option key={code} value={code}>
                    {nameOnly} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <label htmlFor="disbursement-status-filter" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              <ListFilter size={14} style={{ color: '#166534' }} />
              <span>Status:</span>
            </label>
            <select
              id="disbursement-status-filter"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value as DisbursementStatusCategory | 'all')}
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                outline: 'none',
                minWidth: 200,
              }}
            >
              {STATUS_GROUPS.map((group) => {
                const count = statusCounts[group.id] || 0;
                return (
                  <option key={group.id} value={group.id}>
                    {group.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Main Ledger View (Captures Payee, TOTAL OBLIGATION, PAID, UNPAID OBLIGATION) */}
      <div id={`disbursement-${selectedView}-view`}>
        {/* Summary KPI stat cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginBottom: 20,
          }}
        >
          {/* Card 1: Total Obligation */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              borderTop: '3px solid #166534',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Obligation ({selectedView === 'current' ? 'Current' : selectedView === 'continuing' ? 'Continuing' : 'Unpaid Prior Years'})
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
              {formatCurrency(displayTotals.totalObligation)}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              {statusFilter !== 'all' ? (
                <span style={{ color: '#166534', fontWeight: 600 }}>
                  Filtered: {STATUS_GROUPS.find((g) => g.id === statusFilter)?.label} ({filteredRecords.length} records)
                </span>
              ) : filteredRecords.length === records.length ? (
                `${records.length} Payee records captured`
              ) : (
                `${filteredRecords.length} of ${records.length} Payees filtered`
              )}
            </div>
          </div>

          {/* Card 2: Paid */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              borderTop: '3px solid #2563eb',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Paid
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
              {formatCurrency(displayTotals.grossAmount)}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Regional disbursement vouchers
            </div>
          </div>

          {/* Card 3: Unpaid Obligation */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              borderTop: '3px solid #d97706',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Unpaid Obligation
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#b45309', marginTop: 4 }}>
              {formatCurrency(displayTotals.unpaidObligation)}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Outstanding balance payable
            </div>
          </div>

          {/* Card 4: Disbursement Rate (%) */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              borderTop: '3px solid #059669',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Disbursement Rate (%)
              </div>
              {activeAllotment > 0 && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: '#0369a1',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    padding: '1px 6px',
                    borderRadius: 4,
                  }}
                  title={`Total Allotment: ${formatCurrency(activeAllotment)}`}
                >
                  Allot: {formatCompactCurrency(activeAllotment)}
                </span>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginTop: 8,
                alignItems: 'baseline',
              }}
            >
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#059669' }}>
                  {displayTotals.totalObligation > 0
                    ? `${((displayTotals.grossAmount / displayTotals.totalObligation) * 100).toFixed(2)}%`
                    : '0.00%'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                  Paid vs. Total Obligation
                </div>
              </div>

              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0284c7' }}>
                  {activeAllotment > 0
                    ? `${((displayTotals.grossAmount / activeAllotment) * 100).toFixed(2)}%`
                    : '0.00%'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                  Paid vs. Allotment
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Container Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Table Header Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              padding: '14px 20px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileSpreadsheet size={16} style={{ color: '#166534' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                {viewTitle}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  background: '#e2e8f0',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: 10,
                }}
              >
                {filteredRecords.length} of {records.length}
              </span>
            </div>

            {/* Search Bar */}
            <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type="text"
                placeholder="Search by Payee, Particulars..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 12px 6px 32px',
                  fontSize: 12,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            </div>
          </div>

          {/* Data Table with Scroll & Sticky Header/Footer */}
          <div style={{ maxHeight: '650px', overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', position: 'relative' }}>
            <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <th style={{ padding: '8px 10px', width: '38px', color: '#475569', fontWeight: 700, fontSize: 11, background: '#f1f5f9', whiteSpace: 'nowrap' }}>#</th>
                  <th
                    onClick={() => toggleSort('payee')}
                    style={{ padding: '8px 10px', color: '#1e293b', fontWeight: 700, fontSize: 11, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9', whiteSpace: 'nowrap' }}
                    title="Sort by Payee"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>Payee</span>
                      <ArrowUpDown size={11} style={{ color: '#94a3b8' }} />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('endUser')}
                    style={{ padding: '8px 10px', color: '#1e293b', fontWeight: 700, fontSize: 11, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9', whiteSpace: 'nowrap' }}
                    title="Sort by End User"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>End user</span>
                      <ArrowUpDown size={11} style={{ color: '#94a3b8' }} />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('status')}
                    style={{ padding: '8px 10px', color: '#1e293b', fontWeight: 700, fontSize: 11, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9', whiteSpace: 'nowrap' }}
                    title="Sort by Status"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>Status</span>
                      <ArrowUpDown size={11} style={{ color: '#94a3b8' }} />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('totalObligation')}
                    style={{ padding: '8px 10px', textAlign: 'right', color: '#1e293b', fontWeight: 700, fontSize: 11, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9', whiteSpace: 'nowrap' }}
                    title="Sort by Total Obligation"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                      <span>TOTAL OBLIGATION</span>
                      <ArrowUpDown size={11} style={{ color: '#94a3b8' }} />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('grossAmount')}
                    style={{ padding: '8px 10px', textAlign: 'right', color: '#1e293b', fontWeight: 700, fontSize: 11, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9', whiteSpace: 'nowrap' }}
                    title="Sort by Paid"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                      <span>PAID</span>
                      <ArrowUpDown size={11} style={{ color: '#94a3b8' }} />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('unpaidObligation')}
                    style={{ padding: '8px 10px', textAlign: 'right', color: '#1e293b', fontWeight: 700, fontSize: 11, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9', whiteSpace: 'nowrap' }}
                    title="Sort by Unpaid Obligation"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                      <span>UNPAID OBLIGATION</span>
                      <ArrowUpDown size={11} style={{ color: '#94a3b8' }} />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('rate')}
                    style={{ padding: '8px 10px', textAlign: 'right', color: '#1e293b', fontWeight: 700, fontSize: 11, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9', whiteSpace: 'nowrap' }}
                    title="Sort by % Disbursed"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                      <span>% DISBURSED</span>
                      <ArrowUpDown size={11} style={{ color: '#94a3b8' }} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
                      {records.length === 0
                        ? `No ${selectedView} disbursement records found for this category.`
                        : 'No matching payee records found for your search query.'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((item, idx) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '8px 10px', color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px', color: '#0f172a', fontWeight: 600, fontSize: 12 }}>
                        <span>{getDisplayPayee(item)}</span>
                        {item.particulars && (
                          <div style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b', marginTop: 1, maxWidth: 450, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.particulars}>
                            {item.particulars}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#334155', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {item.endUser ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              fontSize: 10.5,
                              fontWeight: 600,
                              color: '#334155',
                            }}
                          >
                            {item.endUser}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {item.status ? (
                          <span
                            onClick={() => {
                              const cat = getStatusCategory(item.status);
                              handleStatusChange(statusFilter === cat ? 'all' : cat);
                            }}
                            style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              borderRadius: 4,
                              fontSize: 10.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              background:
                                item.status.toUpperCase() === 'PAID'
                                  ? '#dcfce7'
                                  : item.status.toUpperCase().includes('CANCEL')
                                    ? '#fee2e2'
                                    : item.status.toUpperCase().includes('ACCOUNTING')
                                      ? '#eff6ff'
                                      : '#fef3c7',
                              color:
                                item.status.toUpperCase() === 'PAID'
                                  ? '#15803d'
                                  : item.status.toUpperCase().includes('CANCEL')
                                    ? '#b91c1c'
                                    : item.status.toUpperCase().includes('ACCOUNTING')
                                      ? '#1d4ed8'
                                      : '#b45309',
                              border:
                                statusFilter === getStatusCategory(item.status)
                                  ? '1.5px solid currentColor'
                                  : '1px solid rgba(0,0,0,0.06)',
                              maxWidth: 220,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              verticalAlign: 'middle',
                            }}
                            title={`${item.status} (Click to filter)`}
                          >
                            {item.status}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {item.totalObligationFormatted}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: item.grossAmount > 0 ? '#15803d' : '#94a3b8', fontVariantNumeric: 'tabular-nums', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {item.grossAmountFormatted}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: item.unpaidObligation > 0 ? '#b45309' : '#94a3b8', fontVariantNumeric: 'tabular-nums', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {item.unpaidObligationFormatted}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const rate = item.totalObligation > 0 ? (item.grossAmount / item.totalObligation) * 100 : 0;
                          return (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '1px 6px',
                                borderRadius: 5,
                                fontSize: 11,
                                fontWeight: 700,
                                background: rate >= 100 ? '#dcfce7' : rate > 0 ? '#eff6ff' : '#f1f5f9',
                                color: rate >= 100 ? '#15803d' : rate > 0 ? '#1d4ed8' : '#64748b',
                              }}
                            >
                              {rate.toFixed(2)}%
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Table Footer with Summary Column Totals */}
              {filteredRecords.length > 0 && (
                <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 9 }}>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', boxShadow: '0 -1px 3px rgba(0,0,0,0.06)', fontWeight: 700 }}>
                    <td colSpan={4} style={{ padding: '10px 10px', color: '#0f172a', background: '#f8fafc', fontSize: 11.5, whiteSpace: 'nowrap' }}>
                      SUMMARY TOTAL ({filteredRecords.length} items)
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#0f172a', fontVariantNumeric: 'tabular-nums', background: '#f8fafc', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatCurrency(filteredRecords.reduce((sum, r) => sum + r.totalObligation, 0))}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#15803d', fontVariantNumeric: 'tabular-nums', background: '#f8fafc', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatCurrency(filteredRecords.reduce((sum, r) => sum + r.grossAmount, 0))}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#b45309', fontVariantNumeric: 'tabular-nums', background: '#f8fafc', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatCurrency(filteredRecords.reduce((sum, r) => sum + r.unpaidObligation, 0))}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#059669', fontVariantNumeric: 'tabular-nums', background: '#f8fafc', fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {(() => {
                        const sumTot = filteredRecords.reduce((sum, r) => sum + r.totalObligation, 0);
                        const sumPaid = filteredRecords.reduce((sum, r) => sum + r.grossAmount, 0);
                        return sumTot > 0 ? `${((sumPaid / sumTot) * 100).toFixed(2)}%` : '0.00%';
                      })()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
