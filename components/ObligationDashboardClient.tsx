'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Wallet,
  DollarSign,
  Coins,
  ShieldCheck,
  Search,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  TrendingUp,
  PieChart,
  ExternalLink,
} from 'lucide-react';
import {
  ObligationListItem,
  ObligationListResult,
  PapBudgetSummary,
} from '@/utils/fetchObligationListSheet';
import {
  ObligationRateAllotmentGraph,
  ObligationCategoryItem,
} from '@/components/ObligationBudgetClient';
import ObligationAmountDashboardChart, {
  PapObligationDatum,
} from '@/components/ObligationAmountDashboardChart';
import { FALLBACK_RICE_OBLIGATION_CATEGORIES } from '@/utils/fetchRiceObligationsSheet';

interface Props {
  initialData: ObligationListResult;
  saaodbCategories?: ObligationCategoryItem[];
  saaodbTotalBannerRice?: ObligationCategoryItem;
}

const formatCurrency = (val: number | undefined | null) => {
  const n = Number(val) || 0;
  if (n === 0) return '₱0.00';
  return `₱${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatCompact = (val: number | undefined | null) => {
  const n = Number(val) || 0;
  if (Math.abs(n) >= 1_000_000) {
    return `₱${(n / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `₱${(n / 1_000).toFixed(2)}K`;
  }
  return formatCurrency(n);
};

// Smooth animated number hook using requestAnimationFrame & easeOutCubic
function useAnimatedNumber(target: number, duration: number = 550) {
  const [val, setVal] = useState(target);
  const valRef = useRef(target);

  useEffect(() => {
    let frameId: number;
    const startVal = valRef.current;
    const diff = target - startVal;
    if (Math.abs(diff) < 0.001) {
      valRef.current = target;
      setVal(target);
      return;
    }
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + diff * ease;
      valRef.current = current;
      setVal(current);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        valRef.current = target;
        setVal(target);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return val;
}

// Subcomponent for each animated horizontal bar row
function AnimatedBarRow({
  pap,
  current,
  continuing,
  total,
  maxBarValue,
  isFilteredOut,
}: {
  pap: string;
  current: number;
  continuing: number;
  total: number;
  maxBarValue: number;
  isFilteredOut: boolean;
}) {
  const animCurrent = useAnimatedNumber(current, 550);
  const animContinuing = useAnimatedNumber(continuing, 550);
  const animTotal = useAnimatedNumber(total, 550);

  const currentWidth = maxBarValue > 0 ? (animCurrent / maxBarValue) * 100 : 0;
  const continuingWidth = maxBarValue > 0 ? (animContinuing / maxBarValue) * 100 : 0;
  const totalMillions = (animTotal / 1_000_000).toFixed(2);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '55px 1fr 65px',
        alignItems: 'center',
        gap: 12,
        opacity: isFilteredOut ? 0.3 : 1,
        transition: 'opacity 0.4s ease',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: isFilteredOut ? '#94a3b8' : '#334155' }}>
        {pap}
      </span>

      {/* Stacked Bar Container */}
      <div
        style={{
          height: 22,
          background: '#f1f5f9',
          borderRadius: 3,
          overflow: 'hidden',
          display: 'flex',
          position: 'relative',
        }}
        title={`${pap}: Current ${formatCurrency(current)} | Continuing ${formatCurrency(continuing)} | Total ${formatCurrency(total)}`}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, currentWidth))}%`,
            height: '100%',
            background: '#166534',
          }}
        />
        <div
          style={{
            width: `${Math.max(0, Math.min(100, continuingWidth))}%`,
            height: '100%',
            background: '#ca8a04',
          }}
        />
      </div>

      <span style={{ fontSize: 12, fontWeight: 700, color: isFilteredOut ? '#94a3b8' : '#0f172a', textAlign: 'right' }}>
        {totalMillions}M
      </span>
    </div>
  );
}

export default function ObligationDashboardClient({
  initialData,
  saaodbCategories,
  saaodbTotalBannerRice,
}: Props) {
  const [data, setData] = useState<ObligationListResult>(initialData);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Automatically fetch updates in the background (every 20s and on window focus)
  useEffect(() => {
    let isMounted = true;

    const fetchLatest = async () => {
      try {
        const res = await fetch('/api/obligations/obligation-list');
        if (!res.ok) return;
        const fresh = await res.json();
        if (fresh && Array.isArray(fresh.items) && isMounted) {
          setData(fresh);
        }
      } catch {
        // Silently ignore background polling errors
      }
    };

    const interval = setInterval(fetchLatest, 20000);
    const handleFocus = () => {
      fetchLatest();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const [papFilter, setPapFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'pap' | 'currentAmt' | 'continuingAmt' | 'rowTotal'>('rowTotal');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Filtered & Searched rows
  const filteredRows = useMemo(() => {
    let list = data.items;

    if (papFilter !== 'All') {
      list = list.filter((r) => r.pap.toUpperCase() === papFilter.toUpperCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        return (
          r.currentDetails.toLowerCase().includes(q) ||
          r.continuingDetails.toLowerCase().includes(q) ||
          r.pap.toLowerCase().includes(q) ||
          r.banner.toLowerCase().includes(q) ||
          String(r.currentAmt).includes(q) ||
          String(r.continuingAmt).includes(q) ||
          String(r.rowTotal).includes(q)
        );
      });
    }

    return [...list].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === 'string') {
        const comp = valA.localeCompare(valB);
        return sortAsc ? comp : -comp;
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [data.items, papFilter, searchQuery, sortField, sortAsc]);

  // Dynamic totals for active filter
  const activeTotals = useMemo(() => {
    const totalCurrent = filteredRows.reduce((sum, r) => sum + r.currentAmt, 0);
    const totalContinuing = filteredRows.reduce((sum, r) => sum + r.continuingAmt, 0);
    const grandTotal = filteredRows.reduce((sum, r) => sum + r.rowTotal, 0);
    return {
      current: totalCurrent,
      continuing: totalContinuing,
      total: grandTotal,
      count: filteredRows.length,
    };
  }, [filteredRows]);

  const toggleSort = (field: 'pap' | 'currentAmt' | 'continuingAmt' | 'rowTotal') => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Dynamic PAP breakdown aggregated from filteredRows
  const dynamicPapList = useMemo(() => {
    const map: Record<string, { pap: string; current: number; continuing: number; total: number; count: number }> = {
      ESETS: { pap: 'ESETS', current: 0, continuing: 0, total: 0, count: 0 },
      PSS: { pap: 'PSS', current: 0, continuing: 0, total: 0, count: 0 },
      INS: { pap: 'INS', current: 0, continuing: 0, total: 0, count: 0 },
      RD: { pap: 'RD', current: 0, continuing: 0, total: 0, count: 0 },
    };

    for (const r of filteredRows) {
      const p = (r.pap || '').toUpperCase().trim();
      if (!map[p]) {
        map[p] = { pap: p, current: 0, continuing: 0, total: 0, count: 0 };
      }
      map[p].current += r.currentAmt;
      map[p].continuing += r.continuingAmt;
      map[p].total += r.rowTotal;
      map[p].count += 1;
    }

    const order = ['ESETS', 'PSS', 'INS', 'RD'];
    return order.map((k) => map[k]).filter(Boolean);
  }, [filteredRows]);

  // Max value for horizontal bar chart scaling
  const maxBarValue = useMemo(() => {
    const totals = dynamicPapList.map((p) => p.total);
    const maxVal = Math.max(...totals, 0);
    return maxVal > 0 ? maxVal * 1.15 : 14_000_000;
  }, [dynamicPapList]);

  // Dynamically compute the 4 PAP categories and Total Banner Rice from the dashboard dataset
  const { dashboardCategories, dashboardTotalBannerRice } = useMemo(() => {
    // 4 official PAP keys in standard banner order matching the benchmark: PSS, ESETS, RD, INS
    const papsConfig = [
      { id: 'pss', code: 'PSS', name: 'PSS RICE' },
      { id: 'esets', code: 'ESETS', name: 'ESETS RICE' },
      { id: 'rd', code: 'RD', name: 'RD RICE' },
      { id: 'ins', code: 'INS', name: 'INS RICE' },
    ];

    const grandAllotment = activeTotals.total > 0 ? activeTotals.total : data.totalAllocation;

    const cats: ObligationCategoryItem[] = papsConfig.map((cfg) => {
      // Aggregate from filteredRows for this PAP
      const rowsForPap = filteredRows.filter((r) => (r.pap || '').toUpperCase().trim() === cfg.code);
      const current = rowsForPap.reduce((sum, r) => sum + r.currentAmt, 0);
      const continuing = rowsForPap.reduce((sum, r) => sum + r.continuingAmt, 0);
      const total = rowsForPap.reduce((sum, r) => sum + r.rowTotal, 0);

      // Current Rate & Continuing Rate (% of that PAP's allocation)
      const rateCurrent = total > 0 ? (current / total) * 100 : 0;
      const rateContinuing = total > 0 ? (continuing / total) * 100 : 0;
      // Share of the active banner allocation
      const rateTotal = grandAllotment > 0 ? (total / grandAllotment) * 100 : 0;

      return {
        id: cfg.id,
        name: cfg.name,
        allocation: current,
        continuingAlloc: continuing,
        totalAlloc: total,
        obligated: current,
        continuingOblig: continuing,
        totalOblig: total,
        unobligated: 0,
        unobligatedCurrent: 0,
        unobligatedContinuing: 0,
        unobligatedTotal: 0,
        rate: rateCurrent,
        rateContinuing: rateContinuing,
        rateTotal: rateTotal,
      };
    });

    // Total Banner Rice aggregate
    const totalCurrent = activeTotals.current;
    const totalContinuing = activeTotals.continuing;
    const totalAlloc = activeTotals.total;

    const totalRateCurrent = totalAlloc > 0 ? (totalCurrent / totalAlloc) * 100 : 0;
    const totalRateContinuing = totalAlloc > 0 ? (totalContinuing / totalAlloc) * 100 : 0;
    const totalRateTotal = 100.0;

    const totalBanner: ObligationCategoryItem = {
      id: 'total_rice',
      name: 'TOTAL',
      allocation: totalCurrent,
      continuingAlloc: totalContinuing,
      totalAlloc: totalAlloc,
      obligated: totalCurrent,
      continuingOblig: totalContinuing,
      totalOblig: totalAlloc,
      unobligated: 0,
      unobligatedCurrent: 0,
      unobligatedContinuing: 0,
      unobligatedTotal: 0,
      rate: totalRateCurrent,
      rateContinuing: totalRateContinuing,
      rateTotal: totalRateTotal,
    };

    return {
      dashboardCategories: cats,
      dashboardTotalBannerRice: totalBanner,
    };
  }, [filteredRows, activeTotals, data.totalAllocation]);

  // Dynamic items passed to ObligationAmountDashboardChart for smooth height and value animations
  const dynamicChartItems = useMemo<PapObligationDatum[]>(() => {
    const papsConfig: Array<{ code: 'PSS' | 'ESETS' | 'RD' | 'INS'; name: string }> = [
      { code: 'PSS', name: 'PSS RICE' },
      { code: 'ESETS', name: 'ESETS RICE' },
      { code: 'RD', name: 'RD RICE' },
      { code: 'INS', name: 'INS RICE' },
    ];

    const grandBannerAllotment = data.totalAllocation;

    const list: PapObligationDatum[] = papsConfig.map((cfg) => {
      const rowsForPap = filteredRows.filter((r) => (r.pap || '').toUpperCase().trim() === cfg.code);
      const current = rowsForPap.reduce((sum, r) => sum + r.currentAmt, 0);
      const continuing = rowsForPap.reduce((sum, r) => sum + r.continuingAmt, 0);
      const total = rowsForPap.reduce((sum, r) => sum + r.rowTotal, 0);

      // Option 1: Current baseline is 100% (or 0 if no current allocation).
      // Continuing is evaluated as a percentage of Current (when Continuing == Current, it is 100.0%).
      const currentRate = current > 0 ? 100.0 : 0.0;
      const continuingRate = current > 0 ? (continuing / current) * 100 : (continuing > 0 ? 100.0 : 0.0);
      const sharePercent = grandBannerAllotment > 0 ? (total / grandBannerAllotment) * 100 : 0;

      return {
        code: cfg.code,
        name: cfg.name,
        currentRate,
        continuingRate,
        sharePercent,
        currentAmount: current,
        continuingAmount: continuing,
        totalAllotment: total,
        allotFormatted: formatCompact(total),
      };
    });

    const bannerCurrent = data.currentFunds;
    const bannerContinuing = data.continuingFunds;
    const bannerTotal = grandBannerAllotment;

    // TOTAL benchmark under Option 1: Current 100%, Continuing evaluated as % of Current
    const totalRateCurrent = bannerCurrent > 0 ? 100.0 : 0.0;
    const totalRateContinuing = bannerCurrent > 0 ? (bannerContinuing / bannerCurrent) * 100 : 0.0;

    list.push({
      code: 'TOTAL',
      name: 'TOTAL',
      currentRate: totalRateCurrent,
      continuingRate: totalRateContinuing,
      sharePercent: 100.0,
      currentAmount: data.totalAllocation,
      continuingAmount: bannerContinuing,
      totalAllotment: bannerTotal,
      allotFormatted: formatCompact(bannerTotal),
    });

    return list;
  }, [filteredRows, data.currentFunds, data.continuingFunds, data.totalAllocation]);

  const animTotalAlloc = useAnimatedNumber(activeTotals.total, 550);
  const animCurrentFunds = useAnimatedNumber(activeTotals.current, 550);
  const animContinuingFunds = useAnimatedNumber(activeTotals.continuing, 550);

  // PAP counts for the dropdown options
  const papCounts = useMemo(() => {
    const counts: Record<string, number> = {
      PSS: 0,
      ESETS: 0,
      RD: 0,
      INS: 0,
    };
    for (const item of data.items) {
      const p = (item.pap || '').toUpperCase().trim();
      counts[p] = (counts[p] || 0) + 1;
    }
    return counts;
  }, [data.items]);

  return (
    <div style={{ width: '100%', maxWidth: 1480, margin: '0 auto', padding: '16px 20px 60px' }}>
      {/* 3 KPI Scorecards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* Card 1: Total Allocation */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Wallet size={20} style={{ color: '#166534' }} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
              Total Allocation:
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
              {formatCurrency(animTotalAlloc)}
            </div>
          </div>
        </div>

        {/* Card 2: Current Funds */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <DollarSign size={20} style={{ color: '#166534' }} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
              Current Funds:
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
              {formatCurrency(animCurrentFunds)}
            </div>
          </div>
        </div>

        {/* Card 3: Continuing Funds */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Coins size={20} style={{ color: '#b45309' }} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
              Continuing Funds:
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
              {formatCurrency(animContinuingFunds)}
            </div>
          </div>
        </div>
      </div>

      {/* Amount for Obligation Dashboard Benchmark Chart */}
      <div style={{ marginBottom: 24 }}>
        <ObligationAmountDashboardChart
          items={dynamicChartItems}
          activePapFilter={papFilter}
          onSelectPap={(code) => setPapFilter((prev) => (prev === code ? 'All' : code))}
        />
      </div>

      {/* Procurement & Activity Details Table */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Table Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={18} style={{ color: '#166534' }} />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Procurement & Activity Details
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Search Bar */}
            <div style={{ position: 'relative', width: 230 }}>
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
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 28px 7px 32px',
                  fontSize: 12,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 2,
                    fontSize: 12,
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter by PAP Dropdown */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#ffffff',
                padding: '4px 8px 4px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
              }}
            >
              <label
                htmlFor="obligation-pap-filter"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Filter size={13} style={{ color: '#166534' }} />
                <span>PAP Code:</span>
              </label>
              <select
                id="obligation-pap-filter"
                value={papFilter}
                onChange={(e) => setPapFilter(e.target.value)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '5px 10px',
                  borderRadius: 4,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: 120,
                }}
              >
                <option value="All">All ({data.items.length})</option>
                <option value="PSS">PSS ({papCounts.PSS || 0})</option>
                <option value="ESETS">ESETS ({papCounts.ESETS || 0})</option>
                <option value="RD">RD ({papCounts.RD || 0})</option>
                <option value="INS">INS ({papCounts.INS || 0})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table with Vertical & Horizontal Scroll */}
        <div style={{ overflowX: 'auto', maxHeight: '480px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700, width: 80 }}>Columns</th>
                <th
                  onClick={() => toggleSort('pap')}
                  style={{ padding: '10px 14px', fontWeight: 700, cursor: 'pointer', width: 90 }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    PAP <ArrowUpDown size={12} />
                  </span>
                </th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Details (Current)</th>
                <th
                  onClick={() => toggleSort('currentAmt')}
                  style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', cursor: 'pointer', width: 125 }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                    Amount <ArrowUpDown size={12} />
                  </span>
                </th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Details (Continuing)</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center', width: 110 }}>Status</th>
                <th
                  onClick={() => toggleSort('continuingAmt')}
                  style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', cursor: 'pointer', width: 125 }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                    Amount <ArrowUpDown size={12} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
                    No procurement line items matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  let badgeBg = '#f1f5f9';
                  let badgeColor = '#475569';
                  let badgeText = 'Current';

                  if (row.statusType === 'continuing') {
                    badgeBg = '#dcfce7';
                    badgeColor = '#166534';
                    badgeText = 'Continuing';
                  } else if (row.statusType === 'both') {
                    badgeBg = '#dcfce7';
                    badgeColor = '#166534';
                    badgeText = 'Continuing';
                  } else {
                    badgeBg = '#f1f5f9';
                    badgeColor = '#64748b';
                    badgeText = 'Current';
                  }

                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#334155' }}>
                        {row.banner}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: row.pap === 'PSS' ? '#166534' : row.pap === 'ESETS' ? '#0284c7' : row.pap === 'RD' ? '#7c3aed' : '#d97706',
                          }}
                        >
                          {row.pap}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#1e293b' }}>
                        {row.currentDetails}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: row.currentAmt > 0 ? 600 : 400, color: row.currentAmt > 0 ? '#0f172a' : '#94a3b8' }}>
                        {formatCurrency(row.currentAmt)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#1e293b' }}>
                        {row.continuingDetails}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {row.continuingAmt > 0 ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 10,
                              fontSize: 10.5,
                              fontWeight: 700,
                              background: badgeBg,
                              color: badgeColor,
                            }}
                          >
                            {badgeText}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: row.continuingAmt > 0 ? 600 : 400, color: row.continuingAmt > 0 ? '#ca8a04' : '#94a3b8' }}>
                        {formatCurrency(row.continuingAmt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer Totals */}
            <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', boxShadow: '0 -2px 6px rgba(0,0,0,0.03)', fontWeight: 700 }}>
                <td colSpan={3} style={{ padding: '12px 14px', color: '#0f172a' }}>
                  Total ({filteredRows.length} Items):
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', color: '#166534' }}>
                  {formatCurrency(activeTotals.current)}
                </td>
                <td colSpan={2} style={{ padding: '12px 14px' }} />
                <td style={{ padding: '12px 14px', textAlign: 'right', color: '#ca8a04' }}>
                  {formatCurrency(activeTotals.continuing)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
