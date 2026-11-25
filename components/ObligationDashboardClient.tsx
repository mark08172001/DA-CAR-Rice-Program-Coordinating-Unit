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

interface Props {
  initialData: ObligationListResult;
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

export default function ObligationDashboardClient({ initialData }: Props) {
  const [data] = useState<ObligationListResult>(initialData);
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

  // Donut chart calculations (Circumference & Stroke-dasharray)
  const donutRadius = 54;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const currentPercent = activeTotals.total > 0 ? (activeTotals.current / activeTotals.total) * 100 : 0;
  const continuingPercent = activeTotals.total > 0 ? (activeTotals.continuing / activeTotals.total) * 100 : 0;

  // Animated values for smooth 60fps transitions
  const animCurrentPercent = useAnimatedNumber(currentPercent, 550);
  const animContinuingPercent = useAnimatedNumber(continuingPercent, 550);
  const animCurrentDash = (animCurrentPercent / 100) * donutCircumference;
  const animContinuingDash = (animContinuingPercent / 100) * donutCircumference;

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

      {/* Visual Analytics Row: Budget Allocation by PAP (Left) & Funding Source Split (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.75fr) minmax(0, 1fr)',
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Left Card: Budget Allocation */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                Budget Allocation
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11.5, fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 2, background: '#166534' }} />
                  <span style={{ color: '#475569' }}>Current</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 2, background: '#ca8a04' }} />
                  <span style={{ color: '#475569' }}>Continuing</span>
                </div>
              </div>
            </div>

            {/* Horizontal Stacked Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {dynamicPapList.map((p) => {
                const isFilteredOut = papFilter !== 'All' && p.pap.toUpperCase() !== papFilter.toUpperCase();
                return (
                  <AnimatedBarRow
                    key={p.pap}
                    pap={p.pap}
                    current={p.current}
                    continuing={p.continuing}
                    total={p.total}
                    maxBarValue={maxBarValue}
                    isFilteredOut={isFilteredOut}
                  />
                );
              })}
            </div>
          </div>

          {/* X-axis Scale Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 10.5,
              color: '#94a3b8',
              borderTop: '1px solid #f1f5f9',
              paddingTop: 10,
              marginTop: 18,
            }}
          >
            <span>₱0</span>
            <span>{formatCompact(maxBarValue * 0.33)}</span>
            <span>{formatCompact(maxBarValue * 0.66)}</span>
            <span>{formatCompact(maxBarValue)}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#166534' }} /> Current
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#ca8a04' }} /> Continuing
              </span>
            </div>
          </div>
        </div>

        {/* Right Card: Funding Source Split */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
            Funding Source Split
          </div>

          {/* SVG Donut Chart */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0' }}>
            <div style={{ position: 'relative', width: 150, height: 150 }}>
              <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Track */}
                <circle
                  cx="75"
                  cy="75"
                  r={donutRadius}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="24"
                />
                {/* Current Funds Arc */}
                <circle
                  cx="75"
                  cy="75"
                  r={donutRadius}
                  fill="none"
                  stroke="#166534"
                  strokeWidth="24"
                  strokeDasharray={`${animCurrentDash} ${donutCircumference}`}
                  strokeDashoffset="0"
                />
                {/* Continuing Funds Arc */}
                <circle
                  cx="75"
                  cy="75"
                  r={donutRadius}
                  fill="none"
                  stroke="#ca8a04"
                  strokeWidth="24"
                  strokeDasharray={`${animContinuingDash} ${donutCircumference}`}
                  strokeDashoffset={`-${animCurrentDash}`}
                />
              </svg>
              {/* Inner Label */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  {activeTotals.total > 0 ? 'Current' : 'No Data'}
                </span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#166534' }}>
                  {activeTotals.total > 0 ? `${animCurrentPercent.toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* Legend Breakdowns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#166534', marginTop: 4, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Current</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#166534' }}>
                  {animCurrentPercent.toFixed(1)}%
                </div>
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>
                  {formatCompact(animCurrentFunds)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ca8a04', marginTop: 4, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Continuing</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#ca8a04' }}>
                  {animContinuingPercent.toFixed(1)}%
                </div>
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>
                  {formatCompact(animContinuingFunds)}
                </div>
              </div>
            </div>
          </div>
        </div>
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
                <th
                  onClick={() => toggleSort('rowTotal')}
                  style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', cursor: 'pointer', width: 130 }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                    Total <ArrowUpDown size={12} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
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
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {formatCurrency(row.rowTotal)}
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
                <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0f172a', fontSize: 13 }}>
                  {formatCurrency(activeTotals.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
