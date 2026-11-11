'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ObligationBalanceRow } from '@/utils/obligationsStore';
import EarmarkedRegistryTable from './EarmarkedRegistryTable';
import {
  Wheat,
  BarChart3,
  TrendingUp,
  Coins,
  CreditCard,
  Building,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
  ArrowUpRight,
  Sparkles,
  Award,
  RefreshCw,
  Globe,
  TableProperties,
  ArrowRight,
  X,
} from 'lucide-react';

interface Props {
  rows: ObligationBalanceRow[];
  isLiveSyncing?: boolean;
  lastSyncedAt?: string | null;
  onSyncLiveSheet?: () => void;
  gSheetUrl?: string;
  onOpenGSheetConfig?: () => void;
  initialCategory?: string;
}

export type CategoryType =
  | 'ALL RICE (GRAND TOTAL)'
  | 'INS RICE'
  | 'PSS RICE'
  | 'ESETS RICE'
  | 'RD RICE';

export function resolveCategory(catInput?: string | null): CategoryType {
  if (!catInput) return 'ALL RICE (GRAND TOTAL)';
  const s = decodeURIComponent(catInput).toUpperCase().trim();
  if (s.includes('INS')) return 'INS RICE';
  if (s.includes('PSS')) return 'PSS RICE';
  if (s.includes('ESETS')) return 'ESETS RICE';
  if (s.includes('RD') || s.includes('RESEARCH')) return 'RD RICE';
  if (s.includes('ALL') || s.includes('GRAND')) return 'ALL RICE (GRAND TOTAL)';
  return 'ALL RICE (GRAND TOTAL)';
}

export default function RiceCategoryFinancialReport({
  rows,
  isLiveSyncing = false,
  lastSyncedAt,
  onSyncLiveSheet,
  gSheetUrl,
  onOpenGSheetConfig,
  initialCategory,
}: Props) {
  // Default to initialCategory if specified (e.g. INS RICE), else Grand Total view
  const [activeCategory, setActiveCategory] = useState<CategoryType>(() => resolveCategory(initialCategory));
  const [selectedRc, setSelectedRc] = useState<string>('');
  const [selectedFund, setSelectedFund] = useState<string>(''); // Default: All Funds Summed (Grand Total: ₱731.74M)
  const [grandTotalTableView, setGrandTotalTableView] = useState<'categories' | 'lineItems'>('categories');
  const [catChangeKey, setCatChangeKey] = useState(0);

  // Executive MFO Overview Modal: only opens once upon initially opening the website in the browser session
  const [showMfoOverview, setShowMfoOverview] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    try {
      const alreadyShownInSession = sessionStorage.getItem('da_mfo_overview_shown');
      const permanentlyDisabled = localStorage.getItem('da_mfo_overview_auto_disabled') === 'true';

      // Only show automatically once upon opening the website in this session
      if (!alreadyShownInSession && !permanentlyDisabled) {
        setShowMfoOverview(true);
        sessionStorage.setItem('da_mfo_overview_shown', 'true');
      }
    } catch {
      // In case storage is restricted
    }
  }, []);

  const handleCloseOverview = () => {
    setShowMfoOverview(false);
    try {
      sessionStorage.setItem('da_mfo_overview_shown', 'true');
      if (dontShowAgain) {
        localStorage.setItem('da_mfo_overview_auto_disabled', 'true');
      }
    } catch {}
  };

  // Sync category if initialCategory changes or URL search changes
  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(resolveCategory(initialCategory));
    } else if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category');
      if (cat) {
        setActiveCategory(resolveCategory(cat));
      }
    }
  }, [initialCategory]);

  useEffect(() => {
    const handleUrlChange = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('category');
        if (cat) {
          setActiveCategory(resolveCategory(cat));
        }
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const handleCategoryChange = (cat: CategoryType) => {
    setActiveCategory(cat);
    setSelectedRc('');
    setCatChangeKey((k) => k + 1);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (cat === 'ALL RICE (GRAND TOTAL)') {
        url.searchParams.delete('category');
      } else {
        url.searchParams.set('category', cat);
      }
      window.history.replaceState(null, '', url.toString());
    }
  };

  // Format money standard
  const formatMoney = (val: number | undefined | null) => {
    const n = Number(val) || 0;
    if (n === 0) return '-';
    return n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format short currency like ₱731.74M or ₱646.98K
  const formatShortMoney = (val: number | undefined | null) => {
    const n = Number(val) || 0;
    if (Math.abs(n) >= 1_000_000) {
      return `₱${(n / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(n) >= 1_000) {
      return `₱${(n / 1_000).toFixed(2)}K`;
    }
    return `₱${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format compact numbers specifically for vertical bar tops to prevent collision (e.g. 713.90M, 634.02M)
  const formatBarTop = (val: number | undefined | null) => {
    const n = Number(val) || 0;
    if (n === 0) return '0.00';
    if (Math.abs(n) >= 1_000_000_000) {
      return `${(n / 1_000_000_000).toFixed(2)}B`;
    }
    if (Math.abs(n) >= 1_000_000) {
      return `${(n / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(n) >= 1_000) {
      return `${(n / 1_000).toFixed(1)}K`;
    }
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Format exact subtext for allocation
  const formatExactNumber = (val: number | undefined | null) => {
    const n = Number(val) || 0;
    return n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format fund source labels: 1101101 -> Current, 1102101 -> Continuing, 01105422C -> Unprogrammed
  const formatFundLabel = (fundCode: string) => {
    const cleaned = (fundCode || '').toString().trim().replace(/^fund\s*/i, '');
    if (cleaned === '1101101' || cleaned === '01101101') {
      return 'Current';
    }
    if (cleaned === '1102101' || cleaned === '01102101') {
      return 'Continuing';
    }
    if (cleaned.toUpperCase() === '01105422C' || cleaned.toUpperCase() === '1105422C') {
      return 'Unprogrammed';
    }
    return fundCode.toLowerCase().startsWith('fund') ? fundCode : `Fund ${fundCode}`;
  };

  // Distinct funds available strictly for Rice line items (excluding STO FPMA-RICE)
  const availableFunds = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const p = (r.pap || '').toLowerCase().trim();
      const f = (r.fund || '').trim();
      const desc = (r.description || '').trim();
      const obj = (r.obj_code || '').trim();
      const isTotal =
        f.toLowerCase().includes('total') ||
        p.includes('total') ||
        (r.rc || '').toLowerCase().includes('total') ||
        (r.class || '').toLowerCase().includes('total') ||
        (r.source || '').toLowerCase().includes('total') ||
        desc.toLowerCase().includes('total');

      const isFpma = p.includes('fpma') || p.includes('sto');

      if (f && !isTotal && p.includes('rice') && !isFpma && (desc || obj)) {
        set.add(f);
      }
    });
    return Array.from(set).sort();
  }, [rows]);

  // Keep selectedFund valid if set to a fund that no longer exists in availableFunds
  useEffect(() => {
    if (selectedFund && availableFunds.length > 0 && !availableFunds.includes(selectedFund)) {
      setSelectedFund('');
    }
  }, [availableFunds, selectedFund]);

  // Filter rows for the active category directly from the SAAODB Spreadsheet Registry
  // STRICT RULE: Only Rice line items under INS, PSS, ESETS, and RD Rice ONLY (STO FPMA-RICE excluded)
  const categoryRawRows = useMemo(() => {
    return rows.filter((r) => {
      const f = (r.fund || '').toLowerCase().trim();
      const p = (r.pap || '').toLowerCase().trim();
      const rc = (r.rc || '').toLowerCase().trim();
      const cls = (r.class || '').toLowerCase().trim();
      const src = (r.source || '').toLowerCase().trim();
      const desc = (r.description || '').toLowerCase().trim();
      const obj = (r.obj_code || '').toLowerCase().trim();

      // 1. Strictly exclude grand totals, category totals, and subtotal rows
      if (
        f.includes('total') ||
        p.includes('total') ||
        rc.includes('total') ||
        cls.includes('total') ||
        src.includes('total') ||
        desc.includes('total')
      ) {
        return false;
      }

      // 2. Real line items in SAAODB MUST have a Description or Object Code
      if (!desc && !obj) {
        return false;
      }

      // 3. Fund filter: If selectedFund is active, row MUST strictly match selectedFund
      if (selectedFund) {
        const rowFund = (r.fund || '').trim();
        if (!rowFund || rowFund !== selectedFund) {
          return false;
        }
      }

      // 4. Do not include STO FPMA-RICE anymore on reports
      if (p.includes('fpma') || p.includes('sto')) {
        return false;
      }

      // 5. Must strictly be under Rice
      if (!p.includes('rice')) {
        return false;
      }

      if (activeCategory === 'ALL RICE (GRAND TOTAL)') {
        return true;
      }
      if (activeCategory === 'INS RICE') {
        return p.includes('ins');
      }
      if (activeCategory === 'PSS RICE') {
        return p.includes('pss');
      }
      if (activeCategory === 'ESETS RICE') {
        return p.includes('esets');
      }
      if (activeCategory === 'RD RICE') {
        return p.includes('rd') || p.includes('research');
      }
      return false;
    });
  }, [rows, activeCategory, selectedFund]);

  // Responsibility Centers available under this category
  const availableRcs = useMemo(() => {
    const set = new Set<string>();
    categoryRawRows.forEach((r) => {
      if (r.rc && r.rc.trim()) set.add(r.rc.trim());
    });
    return Array.from(set).sort();
  }, [categoryRawRows]);

  // Filter rows further by selected Responsibility Center
  const filteredRows = useMemo(() => {
    if (!selectedRc) return categoryRawRows;
    return categoryRawRows.filter((r) => r.rc === selectedRc);
  }, [categoryRawRows, selectedRc]);

  // 4 Major Rice Category Breakdown calculation (INS, PSS, ESETS, RD RICE)
  const categoryBreakdown = useMemo(() => {
    const cats: { id: CategoryType; label: string; pCheck: (p: string) => boolean }[] = [
      { id: 'INS RICE', label: 'INS RICE', pCheck: (p) => p.includes('ins') },
      { id: 'PSS RICE', label: 'PSS RICE', pCheck: (p) => p.includes('pss') },
      { id: 'ESETS RICE', label: 'ESETS RICE', pCheck: (p) => p.includes('esets') },
      { id: 'RD RICE', label: 'RD RICE', pCheck: (p) => p.includes('rd') || p.includes('research') },
    ];

    return cats.map((c) => {
      const items = filteredRows.filter((r) => c.pCheck((r.pap || '').toLowerCase()));
      const allocation = items.reduce((s, r) => s + (Number(r.adjusted_allotment) || 0), 0);
      const obligation = items.reduce((s, r) => s + (Number(r.total_obligation) || 0), 0);
      const unobligated = items.reduce(
        (s, r) =>
          s +
          (r.unobligated_allotment !== undefined && r.unobligated_allotment !== null
            ? Number(r.unobligated_allotment)
            : (Number(r.adjusted_allotment) || 0) - (Number(r.total_obligation) || 0)),
        0
      );
      const earmark = items.reduce((s, r) => s + (Number(r.earmark) || 0), 0);
      const unallocated = items.reduce(
        (s, r) =>
          s +
          (r.unallocated_allotment !== undefined && r.unallocated_allotment !== null
            ? Number(r.unallocated_allotment)
            : (Number(r.adjusted_allotment) || 0) - (Number(r.total_obligation) || 0) - (Number(r.earmark) || 0)),
        0
      );
      const disbursement = items.reduce((s, r) => s + (Number(r.disbursement) || 0), 0);
      const unpaid = items.reduce(
        (s, r) =>
          s +
          (r.unpaid !== undefined && r.unpaid !== null
            ? Number(r.unpaid)
            : Math.max(0, (Number(r.total_obligation) || 0) - (Number(r.disbursement) || 0))),
        0
      );

      return {
        id: c.id,
        title: c.label,
        count: items.length,
        allocation,
        obligation,
        unobligated,
        earmark,
        unallocated,
        disbursement,
        unpaid,
      };
    });
  }, [filteredRows]);

  // Comprehensive MFO Financial Overview calculation (PSS, INS, ESETS, RD, and Grand Total)
  const mfoOverviewData = useMemo(() => {
    const riceRows = rows.filter((r) => {
      const f = (r.fund || '').toLowerCase().trim();
      const p = (r.pap || '').toLowerCase().trim();
      const rc = (r.rc || '').toLowerCase().trim();
      const cls = (r.class || '').toLowerCase().trim();
      const src = (r.source || '').toLowerCase().trim();
      const desc = (r.description || '').toLowerCase().trim();
      const obj = (r.obj_code || '').toLowerCase().trim();

      if (
        f.includes('total') ||
        p.includes('total') ||
        rc.includes('total') ||
        cls.includes('total') ||
        src.includes('total') ||
        desc.includes('total')
      ) {
        return false;
      }
      if (!desc && !obj) return false;
      if (selectedFund && (r.fund || '').trim() !== selectedFund) return false;
      if (p.includes('fpma') || p.includes('sto')) return false;
      return p.includes('rice');
    });

    const programCategories = [
      {
        id: 'PSS RICE' as CategoryType,
        shortCode: 'PSS',
        label: 'Production Support Services',
        badgeBg: '#ecfdf5',
        badgeColor: '#059669',
        badgeBorder: '#a7f3d0',
        pCheck: (p: string) => p.includes('pss'),
      },
      {
        id: 'INS RICE' as CategoryType,
        shortCode: 'INS',
        label: 'Irrigation Network Services',
        badgeBg: '#f0f9ff',
        badgeColor: '#0284c7',
        badgeBorder: '#bae6fd',
        pCheck: (p: string) => p.includes('ins'),
      },
      {
        id: 'ESETS RICE' as CategoryType,
        shortCode: 'ESETS',
        label: 'Extension Support, Education & Training',
        badgeBg: '#fffbeb',
        badgeColor: '#d97706',
        badgeBorder: '#fde68a',
        pCheck: (p: string) => p.includes('esets'),
      },
      {
        id: 'RD RICE' as CategoryType,
        shortCode: 'RD',
        label: 'Research & Development',
        badgeBg: '#f5f3ff',
        badgeColor: '#7c3aed',
        badgeBorder: '#ddd6fe',
        pCheck: (p: string) => p.includes('rd') || p.includes('research'),
      },
    ];

    const items = programCategories.map((m) => {
      const subset = riceRows.filter((r) => m.pCheck((r.pap || '').toLowerCase()));
      const allocation = subset.reduce((s, r) => s + (Number(r.adjusted_allotment) || 0), 0);
      const obligation = subset.reduce((s, r) => s + (Number(r.total_obligation) || 0), 0);
      const disbursement = subset.reduce((s, r) => s + (Number(r.disbursement) || 0), 0);
      const unobligated = subset.reduce(
        (s, r) =>
          s +
          (r.unobligated_allotment !== undefined && r.unobligated_allotment !== null
            ? Number(r.unobligated_allotment)
            : (Number(r.adjusted_allotment) || 0) - (Number(r.total_obligation) || 0)),
        0
      );
      const unpaid = subset.reduce(
        (s, r) =>
          s +
          (r.unpaid !== undefined && r.unpaid !== null
            ? Number(r.unpaid)
            : Math.max(0, (Number(r.total_obligation) || 0) - (Number(r.disbursement) || 0))),
        0
      );
      const obligationRate = allocation > 0 ? (obligation / allocation) * 100 : 0;
      const disbursementRate = obligation > 0 ? (disbursement / obligation) * 100 : 0;

      return {
        ...m,
        count: subset.length,
        allocation,
        obligation,
        disbursement,
        unobligated,
        unpaid,
        obligationRate,
        disbursementRate,
      };
    });

    const isCurrentFund = (f: string) => {
      const cleaned = (f || '').toString().trim().replace(/^fund\s*/i, '');
      return cleaned === '1101101' || cleaned === '01101101' || cleaned.toLowerCase().includes('current');
    };
    const isContinuingFund = (f: string) => {
      const cleaned = (f || '').toString().trim().replace(/^fund\s*/i, '');
      return cleaned === '1102101' || cleaned === '01102101' || cleaned.toLowerCase().includes('continuing');
    };

    const grandAllocation = items.reduce((s, i) => s + i.allocation, 0);
    const grandCurrentAllocation = riceRows
      .filter((r) => isCurrentFund(r.fund) && programCategories.some((m) => m.pCheck((r.pap || '').toLowerCase())))
      .reduce((s, r) => s + (Number(r.adjusted_allotment) || 0), 0);
    const grandContinuingAllocation = riceRows
      .filter((r) => isContinuingFund(r.fund) && programCategories.some((m) => m.pCheck((r.pap || '').toLowerCase())))
      .reduce((s, r) => s + (Number(r.adjusted_allotment) || 0), 0);
    const grandObligation = items.reduce((s, i) => s + i.obligation, 0);
    const grandDisbursement = items.reduce((s, i) => s + i.disbursement, 0);
    const grandUnobligated = items.reduce((s, i) => s + i.unobligated, 0);
    const grandUnpaid = items.reduce((s, i) => s + i.unpaid, 0);
    const grandObligationRate = grandAllocation > 0 ? (grandObligation / grandAllocation) * 100 : 0;
    const grandDisbursementRate = grandObligation > 0 ? (grandDisbursement / grandObligation) * 100 : 0;

    return {
      items,
      grandTotal: {
        allocation: grandAllocation,
        currentAllocation: grandCurrentAllocation,
        continuingAllocation: grandContinuingAllocation,
        obligation: grandObligation,
        disbursement: grandDisbursement,
        unobligated: grandUnobligated,
        unpaid: grandUnpaid,
        obligationRate: grandObligationRate,
        disbursementRate: grandDisbursementRate,
      },
    };
  }, [rows, selectedFund]);

  // Financial aggregates: Allocation, Total Obligation, Unobligated, Earmark, Unallocated, Disbursement, Unpaid
  // Directly sums line items, matching the obligations spreadsheet Grand Total exactly
  const stats = useMemo(() => {
    const allocation = filteredRows.reduce((s, r) => s + (Number(r.adjusted_allotment) || 0), 0);
    const obligation = filteredRows.reduce((s, r) => s + (Number(r.total_obligation) || 0), 0);
    const unobligated = filteredRows.reduce((s, r) => {
      if (r.unobligated_allotment !== undefined && r.unobligated_allotment !== null) {
        return s + Number(r.unobligated_allotment);
      }
      return s + ((Number(r.adjusted_allotment) || 0) - (Number(r.total_obligation) || 0));
    }, 0);
    const earmark = filteredRows.reduce((s, r) => s + (Number(r.earmark) || 0), 0);
    const unallocated = filteredRows.reduce((s, r) => {
      if (r.unallocated_allotment !== undefined && r.unallocated_allotment !== null) {
        return s + Number(r.unallocated_allotment);
      }
      const unob = (Number(r.adjusted_allotment) || 0) - (Number(r.total_obligation) || 0);
      return s + (unob - (Number(r.earmark) || 0));
    }, 0);
    const disbursement = filteredRows.reduce((s, r) => s + (Number(r.disbursement) || 0), 0);
    const unpaid = filteredRows.reduce((s, r) => {
      if (r.unpaid !== undefined && r.unpaid !== null) {
        return s + Number(r.unpaid);
      }
      return s + Math.max(0, (Number(r.total_obligation) || 0) - (Number(r.disbursement) || 0));
    }, 0);

    const obligationRate = allocation > 0 ? (obligation / allocation) * 100 : 0;
    const unobligatedRate = allocation > 0 ? (unobligated / allocation) * 100 : 0;
    const earmarkRate = unobligated > 0 ? (earmark / unobligated) * 100 : 0;
    const unallocatedRate = unobligated > 0 ? (unallocated / unobligated) * 100 : 0;
    const disbursementRate = obligation > 0 ? (disbursement / obligation) * 100 : 0;
    const unpaidRate = obligation > 0 ? (unpaid / obligation) * 100 : 0;

    return {
      allocation,
      obligation,
      unobligated,
      earmark,
      unallocated,
      disbursement,
      unpaid,
      obligationRate,
      unobligatedRate,
      earmarkRate,
      unallocatedRate,
      disbursementRate,
      unpaidRate,
    };
  }, [filteredRows]);

  // Clean RC display helper
  const cleanRcName = (fullRc: string) => {
    if (!fullRc) return 'General';
    const parts = fullRc.split(/\s+/);
    if (parts.length > 1 && parts[0].includes('-')) {
      return parts.slice(1).join(' ');
    }
    return fullRc;
  };

  // Bar chart metrics array
  const barChartData = [
    { label: 'ALLOCATION', value: stats.allocation, color: '#fde68a', border: '#f59e0b' },
    { label: 'OBLIGATION', value: stats.obligation, color: '#bbf7d0', border: '#22c55e' },
    { label: 'UNOBLIGATED', value: stats.unobligated, color: '#fed7aa', border: '#f97316' },
    { label: 'EARMARK', value: stats.earmark, color: '#cbd5e1', border: '#64748b' },
    { label: 'UNALLOCATED', value: stats.unallocated, color: '#fecaca', border: '#ef4444' },
    { label: 'DISBURSEMENT', value: stats.disbursement, color: '#bae6fd', border: '#0ea5e9' },
    { label: 'UNPAID', value: stats.unpaid, color: '#e9d5ff', border: '#a855f7' },
  ];

  // Dynamic maximum value for Bar Chart ceiling
  const rawMax = Math.max(...barChartData.map((d) => Math.max(0, d.value)), 0);
  const chartCeiling =
    rawMax > 500_000_000
      ? 800_000_000
      : rawMax > 200_000_000
        ? 600_000_000
        : rawMax > 100_000_000
          ? 150_000_000
          : rawMax > 50_000_000
            ? 100_000_000
            : rawMax > 15_000_000
              ? 30_000_000
              : rawMax > 10_000_000
                ? 15_000_000
                : rawMax > 5_000_000
                  ? 10_000_000
                  : rawMax > 1_000_000
                    ? 5_000_000
                    : rawMax > 0
                      ? Math.ceil(rawMax * 1.25)
                      : 5_000_000;

  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((ratio) => Math.round(chartCeiling * ratio));

  return (
    <div className="rice-fin-dashboard-wrapper">
      {/* MAIN CONTENT AREA */}
      <main className="rice-fin-main">
        {/* TOP TITLE BAR */}
        <header className="rice-fin-top-header">
          <div className="top-header-left">
            <h1 className="rice-report-title">
              {activeCategory === 'ALL RICE (GRAND TOTAL)'
                ? 'RICE FINANCIAL REPORT 2026 • GRAND TOTAL'
                : 'RICE FINANCIAL REPORT 2026'}
            </h1>
            <span className="rice-report-badge">DA-CAR RICE PROGRAM</span>
          </div>

          <div className="top-header-right">
            {/* Financial Overview Summary Button */}
            <button
              type="button"
              onClick={() => setShowMfoOverview(true)}
              className="mfo-overview-header-btn"
              title="Open Financial Overview (Allotment, Obligation, Disbursement)"
            >
              <BarChart3 size={13} style={{ color: '#166534' }} />
              <span>Financial Overview</span>
            </button>

            {/* Live Google Spreadsheet Real-Time Indicator & Action */}
            <div className="report-header-sync-pill">
              <span className={`sync-status-dot ${isLiveSyncing ? 'syncing' : 'active'}`} />
              <Globe size={13} style={{ color: '#15803d' }} />
              <span className="sync-status-text">
                {isLiveSyncing ? 'Fetching...' : 'Live'}
              </span>
              {onSyncLiveSheet && (
                <button
                  type="button"
                  onClick={onSyncLiveSheet}
                  disabled={isLiveSyncing}
                  className="category-sync-now-btn"
                  title="Pull latest live figures directly from Google Sheets"
                >
                  <RefreshCw size={12} className={isLiveSyncing ? 'spin' : ''} />
                  {isLiveSyncing ? 'Syncing...' : ''}
                </button>
              )}
            </div>

            <div className="fund-selector-wrapper">
              <label className="fund-selector-label">Fund Source:</label>
              <select
                value={selectedFund}
                onChange={(e) => setSelectedFund(e.target.value)}
                className="fund-selector-select"
              >
                <option value="">All Funds Summed</option>
                {availableFunds.map((f) => (
                  <option key={f} value={f}>
                    {formatFundLabel(f)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* HORIZONTAL CATEGORY NAVIGATION TABS (Grand Total + 4 Core Rice Categories) */}
        <nav className="rice-category-horizontal-nav" aria-label="Rice Categories">
          {[
            { id: 'ALL RICE (GRAND TOTAL)', label: 'ALL RICE' },
            { id: 'INS RICE', label: 'INS RICE' },
            { id: 'PSS RICE', label: 'PSS RICE' },
            { id: 'ESETS RICE', label: 'ESETS RICE' },
            { id: 'RD RICE', label: 'RD RICE' },
          ].map((item) => {
            const isActive = activeCategory === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleCategoryChange(item.id as CategoryType)}
                className={`rice-cat-nav-btn ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* TOP METRICS & BAR CHART ROW */}
        <div className="report-charts-kpi-row">
          {/* LEFT: VERTICAL BAR CHART */}
          <div className="bar-chart-card">
            <div className="bar-chart-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="bar-chart-title">
                {activeCategory === 'ALL RICE (GRAND TOTAL)'
                  ? 'GRAND TOTAL • RICE BANNER PROGRAM'
                  : activeCategory}
              </h2>
              {activeCategory === 'ALL RICE (GRAND TOTAL)' && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 4 }}>
                  INS + PSS + ESETS + RD
                </span>
              )}
            </div>

            <div className="chart-canvas-container">
              {/* Y-Axis scale lines */}
              <div className="y-axis-labels">
                {yTicks.slice().reverse().map((tickVal, idx) => (
                  <div key={`ytick-${idx}-${tickVal}`} className="y-axis-tick">
                    <span className="tick-text">
                      {tickVal === 0
                        ? '0'
                        : tickVal >= 1_000_000
                          ? `${(tickVal / 1_000_000).toFixed(tickVal % 1_000_000 === 0 ? 0 : 1)}M`
                          : `${Math.round(tickVal / 1000)}K`}
                    </span>
                    <div className="y-grid-line" />
                  </div>
                ))}
              </div>

              {/* 7 Vertical Bars */}
              <div className="bars-columns-wrap">
                {barChartData.map((bar, idx) => {
                  const heightPercent = chartCeiling > 0 ? Math.min(100, Math.max(0, (bar.value / chartCeiling) * 100)) : 0;
                  return (
                    <div key={idx} className="bar-col-item">
                      {/* Value label on top of bar */}
                      <div
                        className="bar-top-value"
                        title={`${bar.label}: ₱${bar.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      >
                        <span className="bar-top-full">
                          {bar.value > 0 ? bar.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                        </span>
                        <span className="bar-top-compact">
                          {formatBarTop(bar.value)}
                        </span>
                      </div>

                      {/* Bar pillar */}
                      <div className="bar-pillar-track">
                        <div
                          className="bar-pillar-fill"
                          style={{
                            height: `${Math.max(2, heightPercent)}%`,
                            backgroundColor: bar.color,
                            borderColor: bar.border,
                          }}
                          title={`${bar.label}: ₱${bar.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                        />
                      </div>

                      {/* Angled label below */}
                      <div className="bar-bottom-label">
                        <span>{bar.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: 7 KPI STAT CARDS */}
          <div className="kpi-cards-column">
            {/* 1. ALLOCATION (Full width card) */}
            <div className="kpi-stat-card full-width allocation-card">
              <div className="card-dot-title">
                <span className="dot dot-allocation" /> ALLOCATION
              </div>
              <div className="card-main-metric">{formatShortMoney(stats.allocation)}</div>
              <div className="card-subtext">{formatExactNumber(stats.allocation)}</div>
            </div>

            {/* 2 & 3. TOTAL OBLIGATION & UNOBLIGATED */}
            <div className="kpi-cards-grid-pair">
              <div className="kpi-stat-card">
                <div className="card-dot-title">
                  <span className="dot dot-obligation" /> OBLIGATION
                </div>
                <div className="card-main-metric">{formatShortMoney(stats.obligation)}</div>
                <div className="card-subtext">{stats.obligationRate.toFixed(2)}% of ALLOCATION</div>
              </div>

              <div className="kpi-stat-card">
                <div className="card-dot-title">
                  <span className="dot dot-unobligated" /> UNOBLIGATED
                </div>
                <div className="card-main-metric">{formatShortMoney(stats.unobligated)}</div>
                <div className="card-subtext">{stats.unobligatedRate.toFixed(2)}% of ALLOCATION</div>
              </div>
            </div>

            {/* 4 & 5. EARMARK & UNALLOCATED */}
            <div className="kpi-cards-grid-pair">
              <div className="kpi-stat-card">
                <div className="card-dot-title">
                  <span className="dot dot-earmark" /> EARMARK
                </div>
                <div className="card-main-metric">{formatShortMoney(stats.earmark)}</div>
                <div className="card-subtext">{stats.earmarkRate.toFixed(2)}% of UNOBLIGATED</div>
              </div>

              <div className="kpi-stat-card">
                <div className="card-dot-title">
                  <span className="dot dot-unallocated" /> UNALLOCATED
                </div>
                <div className="card-main-metric">{formatShortMoney(stats.unallocated)}</div>
                <div className="card-subtext">{stats.unallocatedRate.toFixed(2)}% of UNOBLIGATED</div>
              </div>
            </div>

            {/* 6 & 7. DISBURSEMENT & UNPAID */}
            <div className="kpi-cards-grid-pair">
              <div className="kpi-stat-card">
                <div className="card-dot-title">
                  <span className="dot dot-disbursement" /> DISBURSEMENT
                </div>
                <div className="card-main-metric">{formatShortMoney(stats.disbursement)}</div>
                <div className="card-subtext">{stats.disbursementRate.toFixed(2)}% of OBLIGATION</div>
              </div>

              {/* UNPAID CARD: HIGHLIGHTED WITH GREEN BORDER & TINT AS SHOWN IN SCREENSHOT */}
              <div className="kpi-stat-card unpaid-highlight-card">
                <div className="card-dot-title">
                  <span className="dot dot-unpaid" /> UNPAID
                </div>
                <div className="card-main-metric">{formatShortMoney(stats.unpaid)}</div>
                <div className="card-subtext">{stats.unpaidRate.toFixed(2)}% of OBLIGATION</div>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE FILTER & VIEW SWITCHER BAR */}
        <div className="report-filter-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label className="rc-filter-label" htmlFor="rc-select-filter">
              Filter by Responsibility Center:
            </label>
            <select
              id="rc-select-filter"
              value={selectedRc}
              onChange={(e) => setSelectedRc(e.target.value)}
              className="rc-filter-select"
            >
              <option value="">All Responsibility Centers ({availableRcs.length})</option>
              {availableRcs.map((rc) => (
                <option key={rc} value={rc}>
                  {cleanRcName(rc)}
                </option>
              ))}
            </select>

            {selectedRc && (
              <button
                onClick={() => setSelectedRc('')}
                className="clear-rc-btn"
                title="Clear Responsibility Center filter"
              >
                Clear RC Filter
              </button>
            )}
          </div>

          {/* Under Grand Total: Table View Switcher (5-Category Summary vs Detailed Line Items) */}
          {activeCategory === 'ALL RICE (GRAND TOTAL)' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0f291e' }}>View:</span>
              <button
                type="button"
                onClick={() => setGrandTotalTableView('categories')}
                className={`view-mode-tab-btn ${grandTotalTableView === 'categories' ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                4-Category Summary
              </button>
              <button
                type="button"
                onClick={() => setGrandTotalTableView('lineItems')}
                className={`view-mode-tab-btn ${grandTotalTableView === 'lineItems' ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                All Line Items ({filteredRows.length})
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM TABLE: GREEN STYLED BREAKDOWN TABLE */}
        <div className="report-table-wrapper">
          <table className="report-data-table">
            <thead>
              <tr>
                <th className="col-title">
                  {activeCategory === 'ALL RICE (GRAND TOTAL)' && grandTotalTableView === 'categories'
                    ? 'RICE PROGRAM CATEGORY'
                    : 'TITLE / PARTICULARS'}
                </th>
                <th className="col-num">ALLOCATION</th>
                <th className="col-num">OBLIGATION</th>
                <th className="col-num">UNOBLIGATED</th>
                <th className="col-num">EARMARK</th>
                <th className="col-num">UNALLOCATED</th>
                <th className="col-num">DISBURSEMENT</th>
                <th className="col-num">UNPAID</th>
              </tr>
            </thead>
            <tbody>
              {/* Option A: Under Grand Total with Category Summary View */}
              {activeCategory === 'ALL RICE (GRAND TOTAL)' && grandTotalTableView === 'categories' ? (
                categoryBreakdown.map((cat) => (
                  <tr
                    key={cat.id}
                    className="data-row clickable-category-row"
                    onClick={() => handleCategoryChange(cat.id)}
                    style={{ cursor: 'pointer' }}
                    title={`Click to view detailed line items under ${cat.title}`}
                  >
                    <td className="col-title">
                      <span className="title-text" style={{ fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {cat.title}
                        <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>
                          ({cat.count} line items) &rarr;
                        </span>
                      </span>
                    </td>
                    <td className="col-num">{formatMoney(cat.allocation)}</td>
                    <td className="col-num">{formatMoney(cat.obligation)}</td>
                    <td className="col-num">{formatMoney(cat.unobligated)}</td>
                    <td className="col-num">{formatMoney(cat.earmark)}</td>
                    <td className="col-num">{formatMoney(cat.unallocated)}</td>
                    <td className="col-num">{formatMoney(cat.disbursement)}</td>
                    <td className="col-num">{formatMoney(cat.unpaid)}</td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    No financial records found for this selection.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, i) => (
                  <tr key={row.id || i} className="data-row">
                    <td className="col-title" title={row.description || row.pap}>
                      <span className="title-text">{row.description || row.obj_code || 'General Activity'}</span>
                      {row.rc && <span className="title-rc-sub">{cleanRcName(row.rc)}</span>}
                    </td>
                    <td className="col-num">{formatMoney(row.adjusted_allotment)}</td>
                    <td className="col-num">{formatMoney(row.total_obligation)}</td>
                    <td className="col-num">{formatMoney(row.unobligated_allotment)}</td>
                    <td className="col-num">{formatMoney(row.earmark)}</td>
                    <td className="col-num">{formatMoney(row.unallocated_allotment)}</td>
                    <td className="col-num">{formatMoney(row.disbursement)}</td>
                    <td className="col-num">{formatMoney(row.unpaid)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td className="col-title">
                  {activeCategory === 'ALL RICE (GRAND TOTAL)'
                    ? 'Grand Total: Rice Banner Program'
                    : `Total: ${activeCategory}`}
                </td>
                <td className="col-num">
                  {stats.allocation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="col-num">
                  {stats.obligation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="col-num">
                  {stats.unobligated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="col-num">
                  {stats.earmark.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="col-num">
                  {stats.unallocated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="col-num">
                  {stats.disbursement.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="col-num">
                  {stats.unpaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* EARMARKED 2026 REGISTRY TABLE (BELOW RESPONSIBILITY CENTER TABLE) */}
        <EarmarkedRegistryTable
          budgetRows={rows}
          activeCategory={activeCategory}
          selectedRc={selectedRc}
          onClearRcFilter={() => setSelectedRc('')}
          categoryChangeKey={catChangeKey}
        />

        {/* EXECUTIVE BUDGET FINANCIAL OVERVIEW MODAL (AUTOMATICALLY SHOWN UPON OPENING THE WEBSITE) */}
        {showMfoOverview && (
          <div
            className="modal-backdrop mfo-overview-modal-backdrop"
            onClick={handleCloseOverview}
            role="dialog"
            aria-modal="true"
            aria-labelledby="overview-title"
          >
            <div
              className="executive-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="executive-modal-header">
                <div className="executive-header-left">
                  <div className="executive-icon-badge">
                    <BarChart3 size={22} />
                  </div>
                  <div>
                    <div className="executive-title-row">
                      <h3 id="overview-title" className="executive-title">
                        DA-CAR Rice Program • Financial Overview
                      </h3>
                      <span className="executive-year-badge">2026 BUDGET</span>
                    </div>
                    <p className="executive-subtitle">
                      Official summary of Allotment, Obligation, and Disbursement across Rice Banner Programs
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseOverview}
                  className="modal-close"
                  aria-label="Close overview modal"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="executive-modal-body">
                {/* 4 Executive KPI Cards */}
                <div className="executive-kpi-grid">
                  {/* 1. Total Allotment */}
                  <div className="executive-kpi-card kpi-allotment">
                    <div className="kpi-head-row">
                      <div className="kpi-label-group">
                        <Coins size={15} style={{ color: '#d97706' }} />
                        <span>Total Allotment</span>
                      </div>
                      <span className="kpi-pill-badge amber">100% Budget</span>
                    </div>
                    <div className="kpi-amount-display">
                      {formatShortMoney(mfoOverviewData.grandTotal.allocation)}
                    </div>
                    <div
                      className="kpi-footnote"
                      style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}
                      title={`Current: ₱${formatExactNumber(mfoOverviewData.grandTotal.currentAllocation)} | Continuing: ₱${formatExactNumber(mfoOverviewData.grandTotal.continuingAllocation)}`}
                    >
                      <span>Current: <strong>{formatShortMoney(mfoOverviewData.grandTotal.currentAllocation)}</strong></span>
                      <span>Continuing: <strong>{formatShortMoney(mfoOverviewData.grandTotal.continuingAllocation)}</strong></span>
                    </div>
                  </div>

                  {/* 2. Total Obligation */}
                  <div className="executive-kpi-card kpi-obligation">
                    <div className="kpi-head-row">
                      <div className="kpi-label-group">
                        <TrendingUp size={15} style={{ color: '#16a34a' }} />
                        <span>Total Obligation</span>
                      </div>
                      <span className={`kpi-pill-badge ${mfoOverviewData.grandTotal.obligationRate >= 80 ? 'green' : 'amber'}`}>
                        {mfoOverviewData.grandTotal.obligationRate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="kpi-amount-display" style={{ color: '#15803d' }}>
                      {formatShortMoney(mfoOverviewData.grandTotal.obligation)}
                    </div>
                    <div className="kpi-meter-track">
                      <div
                        className="kpi-meter-fill green"
                        style={{ width: `${Math.min(100, mfoOverviewData.grandTotal.obligationRate)}%` }}
                      />
                    </div>
                    <div className="kpi-footnote">
                      Target: <strong>80.0%</strong> • {mfoOverviewData.grandTotal.obligationRate >= 80 ? 'Target Met ✓' : 'Under Target'}
                    </div>
                  </div>

                  {/* 3. Total Disbursement */}
                  <div className="executive-kpi-card kpi-disbursement">
                    <div className="kpi-head-row">
                      <div className="kpi-label-group">
                        <CreditCard size={15} style={{ color: '#0284c7' }} />
                        <span>Total Disbursement</span>
                      </div>
                      <span className="kpi-pill-badge blue">
                        {mfoOverviewData.grandTotal.disbursementRate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="kpi-amount-display" style={{ color: '#0369a1' }}>
                      {formatShortMoney(mfoOverviewData.grandTotal.disbursement)}
                    </div>
                    <div className="kpi-meter-track">
                      <div
                        className="kpi-meter-fill blue"
                        style={{ width: `${Math.min(100, mfoOverviewData.grandTotal.disbursementRate)}%` }}
                      />
                    </div>
                    <div className="kpi-footnote">
                      Of obligated funds disbursed & paid
                    </div>
                  </div>

                  {/* 4. Remaining Balances */}
                  <div className="executive-kpi-card kpi-balance">
                    <div className="kpi-head-row">
                      <div className="kpi-label-group">
                        <Layers size={15} style={{ color: '#7c3aed' }} />
                        <span>Remaining Balances</span>
                      </div>
                    </div>
                    <div className="kpi-amount-display">
                      {formatShortMoney(mfoOverviewData.grandTotal.unobligated)}
                    </div>
                    <div className="kpi-footnote" style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                      <span>Unoblig: <strong>{formatShortMoney(mfoOverviewData.grandTotal.unobligated)}</strong></span>
                      <span>Unpaid: <strong>{formatShortMoney(mfoOverviewData.grandTotal.unpaid)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Programs Comparison Table */}
                <div className="executive-table-wrapper-box">
                  <div className="executive-table-top-toolbar">
                    <div>
                      <span className="executive-toolbar-title">
                        Rice Program Performance
                      </span>
                      <span className="executive-toolbar-desc">
                        (Click any row to filter detailed records)
                      </span>
                    </div>
                    <div className="executive-target-legend">
                      <span className="legend-tag">
                        <span className="legend-circle green" />
                        &ge;80% Target
                      </span>
                      <span className="legend-tag">
                        <span className="legend-circle amber" />
                        &lt;80% Under Target
                      </span>
                    </div>
                  </div>

                  <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className="executive-data-table">
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', minWidth: 240 }}>Program Category</th>
                          <th style={{ textAlign: 'right' }}>Budget (Allotment)</th>
                          <th style={{ textAlign: 'right' }}>Obligation</th>
                          <th style={{ textAlign: 'center', minWidth: 100 }}>Oblig. Rate</th>
                          <th style={{ textAlign: 'right' }}>Disbursement</th>
                          <th style={{ textAlign: 'center', minWidth: 100 }}>Disb. Rate</th>
                          <th style={{ textAlign: 'right' }}>Unobligated</th>
                          <th style={{ textAlign: 'center', width: 90 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mfoOverviewData.items.map((m: any) => {
                          const isMet = m.obligationRate >= 80;
                          return (
                            <tr
                              key={m.id}
                              className="executive-row-item"
                              onClick={() => {
                                handleCategoryChange(m.id as CategoryType);
                                setShowMfoOverview(false);
                              }}
                              title={`Click to open ${m.label} details`}
                            >
                              <td style={{ padding: '12px 16px' }}>
                                <div className="program-col-content">
                                  <span
                                    className="program-badge-chip"
                                    style={{
                                      backgroundColor: m.badgeBg,
                                      color: m.badgeColor,
                                      borderColor: m.badgeBorder,
                                    }}
                                  >
                                    {m.shortCode}
                                  </span>
                                  <div>
                                    <strong className="program-full-title">{m.label}</strong>
                                    <span className="program-items-sub">{m.count} active line items</span>
                                  </div>
                                </div>
                              </td>
                              <td className="table-num" style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                                {formatMoney(m.allocation)}
                              </td>
                              <td className="table-num" style={{ textAlign: 'right', fontWeight: 600, color: '#166534' }}>
                                {formatMoney(m.obligation)}
                              </td>
                              <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                                <span className={`status-rate-pill ${isMet ? 'met' : 'under'}`}>
                                  {m.obligationRate.toFixed(2)}%
                                </span>
                              </td>
                              <td className="table-num" style={{ textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>
                                {formatMoney(m.disbursement)}
                              </td>
                              <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                                <span className="status-rate-pill disb">
                                  {m.disbursementRate.toFixed(2)}%
                                </span>
                              </td>
                              <td className="table-num" style={{ textAlign: 'right', color: '#64748b' }}>
                                {formatMoney(m.unobligated)}
                              </td>
                              <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                                <button
                                  type="button"
                                  className="row-action-open-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCategoryChange(m.id as CategoryType);
                                    setShowMfoOverview(false);
                                  }}
                                >
                                  <span>Open</span>
                                  <ArrowRight size={11} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="executive-tfoot-row">
                          <td style={{ padding: '14px 16px' }}>
                            <div className="program-col-content">
                              <span className="total-badge-chip">
                                TOTAL
                              </span>
                              <strong className="program-full-title" style={{ color: '#064e3b', fontWeight: 800 }}>
                                TOTAL BANNER RICE PROGRAM
                              </strong>
                            </div>
                          </td>
                          <td className="table-num" style={{ textAlign: 'right', color: '#064e3b', fontWeight: 800 }}>
                            {formatMoney(mfoOverviewData.grandTotal.allocation)}
                          </td>
                          <td className="table-num" style={{ textAlign: 'right', color: '#166534', fontWeight: 800 }}>
                            {formatMoney(mfoOverviewData.grandTotal.obligation)}
                          </td>
                          <td style={{ textAlign: 'center', padding: '14px 10px' }}>
                            <span
                              className="status-rate-pill met"
                              style={{
                                background: mfoOverviewData.grandTotal.obligationRate >= 80 ? '#15803d' : '#b45309',
                                color: '#ffffff',
                                borderColor: 'transparent',
                                fontWeight: 800,
                              }}
                            >
                              {mfoOverviewData.grandTotal.obligationRate.toFixed(2)}%
                            </span>
                          </td>
                          <td className="table-num" style={{ textAlign: 'right', color: '#0284c7', fontWeight: 800 }}>
                            {formatMoney(mfoOverviewData.grandTotal.disbursement)}
                          </td>
                          <td style={{ textAlign: 'center', padding: '14px 10px' }}>
                            <span
                              className="status-rate-pill disb"
                              style={{
                                background: '#0284c7',
                                color: '#ffffff',
                                borderColor: 'transparent',
                                fontWeight: 800,
                              }}
                            >
                              {mfoOverviewData.grandTotal.disbursementRate.toFixed(2)}%
                            </span>
                          </td>
                          <td className="table-num" style={{ textAlign: 'right', color: '#064e3b', fontWeight: 700 }}>
                            {formatMoney(mfoOverviewData.grandTotal.unobligated)}
                          </td>
                          <td style={{ textAlign: 'center', padding: '14px 14px' }}>
                            <button
                              type="button"
                              className="total-view-all-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCategoryChange('ALL RICE (GRAND TOTAL)');
                                setShowMfoOverview(false);
                              }}
                            >
                              <span>View All</span>
                            </button>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="executive-modal-footer">
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Don't show automatically on page open</span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleCategoryChange('ALL RICE (GRAND TOTAL)');
                      handleCloseOverview();
                    }}
                    className="button button-outline"
                    style={{ fontSize: 12.5, padding: '7px 14px' }}
                  >
                    Explore Detailed Reports
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseOverview}
                    className="button button-primary"
                    style={{ fontSize: 12.5, padding: '7px 18px', background: '#15803d', borderColor: '#166534', color: '#ffffff' }}
                  >
                    Close Overview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
