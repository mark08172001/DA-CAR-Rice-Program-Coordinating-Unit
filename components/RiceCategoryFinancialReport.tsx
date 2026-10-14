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
  CheckCircle2,
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

  // Format exact subtext for allocation
  const formatExactNumber = (val: number | undefined | null) => {
    const n = Number(val) || 0;
    return n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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
            <span className="rice-report-badge">MODULE 04: FINANCIAL MANAGEMENT • DA-CAR</span>
          </div>

          <div className="top-header-right">
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
                    {f.toLowerCase().startsWith('fund') ? f : `Fund ${f}`}
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
                      <div className="bar-top-value">
                        {bar.value > 0 ? bar.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
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
      </main>
    </div>
  );
}
