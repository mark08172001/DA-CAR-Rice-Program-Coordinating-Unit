'use client';

import React, { useState, useMemo } from 'react';
import {
  DrySeasonSheetData,
  CategoryData,
  ProvinceTotalRow,
  ProvinceInterventionData,
} from '@/utils/fetchDrySeasonSheet';
import {
  Wheat,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  MapPin,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
} from 'lucide-react';

interface Props {
  initialData: DrySeasonSheetData;
}

type CommodityTabKey = 'hybrid-seeds' | 'fert-hybrid' | 'fert-inbred' | 'biofert-asa';

function ProvinceTitleCell({
  province,
  rate,
  onClick,
}: {
  province: string;
  rate: number;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 5,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{province}</span>
        <ChevronRight size={13} style={{ color: '#cbd5e1', strokeWidth: 2.5 }} />
      </div>

      {rate >= 50 ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 10.5,
            fontWeight: 600,
            color: '#059669',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            padding: '2px 7px',
            borderRadius: 999,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#059669' }} />
          Top Performer
        </span>
      ) : rate > 0 ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 10.5,
            fontWeight: 600,
            color: '#2563eb',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            padding: '2px 7px',
            borderRadius: 999,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563eb' }} />
          Active
        </span>
      ) : (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 10.5,
            fontWeight: 500,
            color: '#94a3b8',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '2px 7px',
            borderRadius: 999,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#cbd5e1' }} />
          No Activity yet
        </span>
      )}
    </div>
  );
}

function CommodityCell({
  accomp,
  target,
  onClick,
}: {
  accomp: number;
  target: number;
  onClick?: () => void;
}) {
  const balance = target - accomp;
  const rate = target > 0 ? (accomp / target) * 100 : 0;
  const isSurplus = balance < 0;
  const hasAccomp = accomp > 0;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        padding: '2px 0',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Top: Accomp + Rate Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span
          style={{
            fontSize: hasAccomp ? 14 : 13,
            fontWeight: hasAccomp ? 700 : 500,
            color: hasAccomp ? '#0f172a' : '#cbd5e1',
          }}
        >
          {accomp.toLocaleString()} ha
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: hasAccomp ? 700 : 500,
            color: rate >= 50 ? '#059669' : rate > 0 ? '#2563eb' : '#cbd5e1',
            background: rate >= 50 ? '#ecfdf5' : rate > 0 ? '#eff6ff' : 'transparent',
            padding: rate > 0 ? '2px 7px' : '0',
            borderRadius: 4,
          }}
        >
          {rate.toFixed(1)}%
        </span>
      </div>

      {/* Middle: Progress Bar */}
      <div style={{ width: '100%', height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden', margin: '4px 0' }}>
        <div
          style={{
            width: `${Math.min(100, rate)}%`,
            height: '100%',
            background: rate >= 50 ? '#059669' : rate > 0 ? '#2563eb' : 'transparent',
            borderRadius: 2,
          }}
        />
      </div>

      {/* Bottom: Subtext or Surplus Badge */}
      <div>
        {isSurplus ? (
          <span
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#059669',
              fontSize: 10.5,
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: 4,
              display: 'inline-block',
            }}
          >
            Surplus +{Math.abs(balance).toLocaleString()} ha
          </span>
        ) : (
          <span
            style={{
              fontSize: 11,
              color: hasAccomp ? '#64748b' : '#cbd5e1',
            }}
          >
            of {target.toLocaleString()} • {balance.toLocaleString()} left
          </span>
        )}
      </div>
    </div>
  );
}

function OverallAccomplishedCell({
  rate,
  totalAccomp,
  totalTarget,
  isGrandTotal = false,
}: {
  rate: number;
  totalAccomp: number;
  totalTarget: number;
  isGrandTotal?: boolean;
}) {
  const isHigh = rate >= 50;
  const isZero = rate === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '2px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span
          style={{
            fontSize: isGrandTotal ? 16 : 14.5,
            fontWeight: 800,
            color: isHigh || isGrandTotal ? '#059669' : isZero ? '#cbd5e1' : '#2563eb',
          }}
        >
          {rate.toFixed(2)}%
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: isGrandTotal ? 800 : 600,
            color: isHigh || isGrandTotal ? '#059669' : isZero ? '#cbd5e1' : '#64748b',
          }}
        >
          {totalAccomp.toLocaleString()} ha
        </span>
      </div>

      <div style={{ width: '100%', height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden', margin: '4px 0' }}>
        <div
          style={{
            width: `${Math.min(100, rate)}%`,
            height: '100%',
            background: isHigh || isGrandTotal ? '#059669' : '#2563eb',
            borderRadius: 2,
          }}
        />
      </div>

      <div style={{ fontSize: 11, color: isGrandTotal ? '#15803d' : '#94a3b8' }}>
        {isGrandTotal ? 'Total Target: ' : 'Target: '}
        {totalTarget.toLocaleString()} ha
      </div>
    </div>
  );
}

export default function DrySeasonClient({ initialData }: Props) {
  const [data, setData] = useState<DrySeasonSheetData>(initialData);
  const [activeTab, setActiveTab] = useState<'total' | 'hybrid-seeds' | 'fert-hybrid' | 'fert-inbred' | 'biofert-asa'>('total');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedProvinces, setExpandedProvinces] = useState<Record<string, boolean>>({});
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    province: string;
    categoryTab: CommodityTabKey;
  }>({
    isOpen: false,
    province: 'ABRA',
    categoryTab: 'hybrid-seeds',
  });

  const openDrawer = (
    province: string,
    categoryTab: CommodityTabKey = 'hybrid-seeds'
  ) => {
    setIsDrawerClosing(false);
    setDrawerState({
      isOpen: true,
      province,
      categoryTab,
    });
  };

  const closeDrawer = () => {
    if (isDrawerClosing) return;
    setIsDrawerClosing(true);
    setTimeout(() => {
      setDrawerState((prev) => ({ ...prev, isOpen: false }));
      setIsDrawerClosing(false);
    }, 220);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleExpand = (key: string) => {
    setExpandedProvinces((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Continuous background auto-sync (polls every 30s + syncs on tab focus)
  React.useEffect(() => {
    let isMounted = true;

    const fetchLatest = async () => {
      try {
        const res = await fetch('/api/rice/ds-distribution', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json.data) {
            setData(json.data);
          }
        }
      } catch (err) {
        // Silent failure in background
      }
    };

    const intervalId = setInterval(fetchLatest, 30000);
    const handleFocus = () => {
      fetchLatest();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/rice/ds-distribution', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setData(json.data);
        }
      }
    } catch (e) {
      console.error('Failed to refresh Dry Season data:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered Province Totals
  const filteredProvinceTotals = useMemo(() => {
    if (!searchTerm.trim()) return data.provinceTotals;
    const term = searchTerm.toLowerCase().trim();
    return data.provinceTotals.filter((p) => p.province.toLowerCase().includes(term));
  }, [data.provinceTotals, searchTerm]);

  // Active Category Data (when viewing a specific intervention)
  const activeCategory = useMemo<CategoryData | undefined>(() => {
    if (activeTab === 'total') return undefined;
    return data.categories.find((c) => c.id === activeTab);
  }, [data.categories, activeTab]);

  const filteredCategoryProvinces = useMemo<ProvinceInterventionData[]>(() => {
    if (!activeCategory) return [];
    if (!searchTerm.trim()) return activeCategory.provinces;
    const term = searchTerm.toLowerCase().trim();
    return activeCategory.provinces.filter((p) => {
      const matchProv = p.province.toLowerCase().includes(term);
      const matchInterv = p.interventions.some((i) => i.name.toLowerCase().includes(term));
      return matchProv || matchInterv;
    });
  }, [activeCategory, searchTerm]);

  // Drawer data calculations
  const drawerCategory = useMemo(() => {
    return data.categories.find((c) => c.id === drawerState.categoryTab) || data.categories[0];
  }, [data.categories, drawerState.categoryTab]);

  const drawerProvinceData = useMemo(() => {
    if (!drawerCategory) return undefined;
    return drawerCategory.provinces.find((p) => p.province === drawerState.province);
  }, [drawerCategory, drawerState.province]);

  const drawerTarget = drawerProvinceData?.target || 0;
  const drawerAccomp = drawerProvinceData?.accomp || 0;
  const drawerBalance = drawerTarget - drawerAccomp;
  const drawerRate = drawerTarget > 0 ? (drawerAccomp / drawerTarget) * 100 : 0;
  const drawerRegTarget = drawerCategory?.target || 0;
  const drawerRegAccomp = drawerCategory?.accomp || 0;
  const drawerTargetShare = drawerRegTarget > 0 ? (drawerTarget / drawerRegTarget) * 100 : 0;
  const drawerAccompShare = drawerRegAccomp > 0 ? (drawerAccomp / drawerRegAccomp) * 100 : 0;

  const drawerKicker = useMemo(() => {
    if (drawerState.categoryTab === 'hybrid-seeds') return 'SEEDS INTERVENTION BREAKDOWN';
    if (drawerState.categoryTab.includes('fert')) return 'FERTILIZER INTERVENTION BREAKDOWN';
    return 'BIOFERT INTERVENTION BREAKDOWN';
  }, [drawerState.categoryTab]);

  const formatHa = (val: number) => {
    return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ha';
  };

  const getRateBadgeClass = (rate: number) => {
    if (rate >= 80) return 'rate-high';
    if (rate >= 30) return 'rate-mid';
    if (rate > 0) return 'rate-low';
    return 'rate-zero';
  };

  return (
    <div className="dry-season-dashboard">
      {/* 1. TOP STATS SUMMARY CARDS */}
      <div className="summary-grid" style={{ marginBottom: 24 }}>
        {/* Card 1: Regional Total Target vs Accomplishment */}
        <article className="summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Regional Target Area
            </span>
            <MapPin size={17} style={{ color: '#166534' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
            {data.grandTotal.totalTarget.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>ha</span>
          </div>
          <span style={{ fontSize: 11.5, color: '#64748b', marginTop: 4, display: 'block' }}>
            Combined across 6 CAR Provinces & 4 Interventions
          </span>
        </article>

        {/* Card 2: Regional Total Accomplishment */}
        <article className="summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Accomplished Area
            </span>
            <CheckCircle2 size={17} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#15803d' }}>
            {data.grandTotal.totalAccomp.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>ha</span>
          </div>
          <span style={{ fontSize: 11.5, color: '#166534', fontWeight: 600, marginTop: 4, display: 'block' }}>
            {data.grandTotal.rate.toFixed(2)}% of Regional Target
          </span>
        </article>

        {/* Card 3: Remaining Balance */}
        <article className="summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Remaining Balance
            </span>
            <Layers size={17} style={{ color: '#0284c7' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0369a1' }}>
            {data.grandTotal.totalBalance.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>ha</span>
          </div>
          <span style={{ fontSize: 11.5, color: '#0284c7', fontWeight: 600, marginTop: 4, display: 'block' }}>
            Remaining operational balance to accomplish
          </span>
        </article>

        {/* Card 4: Accomplishment Rate */}
        <article className="summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              % Accomplished
            </span>
            <TrendingUp size={17} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#166534' }}>
            {data.grandTotal.rate.toFixed(2)}%
          </div>
          <span style={{ fontSize: 11.5, color: '#64748b', marginTop: 4, display: 'block' }}>
            Seeds: {((data.grandTotal.accompSeeds / data.grandTotal.targetSeeds) * 100).toFixed(1)}% · Fert: {(((data.grandTotal.accompFertH + data.grandTotal.accompFertI) / (data.grandTotal.targetFertH + data.grandTotal.targetFertI)) * 100).toFixed(1)}% · Biofert: {(data.grandTotal.targetBiofert > 0 ? ((data.grandTotal.accompBiofert / data.grandTotal.targetBiofert) * 100).toFixed(1) : 0)}%
          </span>
        </article>
      </div>

      {/* 2. NAVIGATION BAR & TOOLBAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 16px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        {/* Module Category Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('total')}
            style={{
              border: 'none',
              background: activeTab === 'total' ? '#166534' : 'transparent',
              color: activeTab === 'total' ? '#ffffff' : '#475569',
              fontWeight: activeTab === 'total' ? 700 : 500,
              fontSize: 12.5,
              padding: '7px 14px',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <BarChart3 size={15} />
            <span>Total by Province</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hybrid-seeds')}
            style={{
              border: 'none',
              background: activeTab === 'hybrid-seeds' ? '#166534' : 'transparent',
              color: activeTab === 'hybrid-seeds' ? '#ffffff' : '#475569',
              fontWeight: activeTab === 'hybrid-seeds' ? 700 : 500,
              fontSize: 12.5,
              padding: '7px 14px',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <Wheat size={15} />
            <span>Hybrid Seeds</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fert-hybrid')}
            style={{
              border: 'none',
              background: activeTab === 'fert-hybrid' ? '#166534' : 'transparent',
              color: activeTab === 'fert-hybrid' ? '#ffffff' : '#475569',
              fontWeight: activeTab === 'fert-hybrid' ? 700 : 500,
              fontSize: 12.5,
              padding: '7px 14px',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <Package size={15} />
            <span>FERTILIZER (HYBRID)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fert-inbred')}
            style={{
              border: 'none',
              background: activeTab === 'fert-inbred' ? '#166534' : 'transparent',
              color: activeTab === 'fert-inbred' ? '#ffffff' : '#475569',
              fontWeight: activeTab === 'fert-inbred' ? 700 : 500,
              fontSize: 12.5,
              padding: '7px 14px',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <Layers size={15} />
            <span>FERTILIZERS (INBRED)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('biofert-asa')}
            style={{
              border: 'none',
              background: activeTab === 'biofert-asa' ? '#166534' : 'transparent',
              color: activeTab === 'biofert-asa' ? '#ffffff' : '#475569',
              fontWeight: activeTab === 'biofert-asa' ? 700 : 500,
              fontSize: 12.5,
              padding: '7px 14px',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <Package size={15} />
            <span>BIOFERT ASA</span>
          </button>
        </div>

        {/* Right Search Input & Google Sheet Reference */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search province..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: 12.5,
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. TAB CONTENT */}
      {/* ------------------------------------------------------------------ */}
      {/* TAB 1: TOTAL BY PROVINCE TABLE                                     */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'total' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Total by Province — Target vs Accomplishment
              </h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                Cumulative operational targets and equivalent accomplishment area across Hybrid Seeds, Fertilizer (Hybrid), and Fertilizers (Inbred).
              </p>
            </div>
            <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: 4, fontWeight: 600 }}>
              6 Provinces
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="ds-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontWeight: 700, color: '#475569', fontSize: 11.5, letterSpacing: '0.04em', width: '15%' }}>
                    PROVINCE
                  </th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontWeight: 700, color: '#0f172a', width: '17%' }}>
                    HYBRID SEEDS<br />
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8' }}>Accomp • % • Target & Balance</span>
                  </th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontWeight: 700, color: '#0f172a', width: '17%' }}>
                    FERT (HYBRID)<br />
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8' }}>Accomp • % • Target & Balance</span>
                  </th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontWeight: 700, color: '#0f172a', width: '17%' }}>
                    FERT (INBRED)<br />
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8' }}>Accomp • % • Target & Balance</span>
                  </th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontWeight: 700, color: '#0f172a', width: '17%' }}>
                    BIOFERT ASA<br />
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8' }}>Accomp • % • Target & Balance</span>
                  </th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontWeight: 700, color: '#0f172a', width: '17%' }}>
                    % ACCOMPLISHED<br />
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8' }}>Weighted Overall</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProvinceTotals.map((row) => {
                  return (
                    <tr
                      key={row.province}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      className="hover:bg-slate-50"
                    >
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <ProvinceTitleCell
                          province={row.province}
                          rate={row.rate}
                          onClick={() => openDrawer(row.province, 'hybrid-seeds')}
                        />
                      </td>
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <CommodityCell
                          target={row.targetSeeds}
                          accomp={row.accompSeeds}
                          onClick={() => openDrawer(row.province, 'hybrid-seeds')}
                        />
                      </td>
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <CommodityCell
                          target={row.targetFertH}
                          accomp={row.accompFertH}
                          onClick={() => openDrawer(row.province, 'fert-hybrid')}
                        />
                      </td>
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <CommodityCell
                          target={row.targetFertI}
                          accomp={row.accompFertI}
                          onClick={() => openDrawer(row.province, 'fert-inbred')}
                        />
                      </td>
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <CommodityCell
                          target={row.targetBiofert}
                          accomp={row.accompBiofert}
                          onClick={() => openDrawer(row.province, 'biofert-asa')}
                        />
                      </td>
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <OverallAccomplishedCell
                          rate={row.rate}
                          totalAccomp={row.totalAccomp}
                          totalTarget={row.totalTarget}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                  <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                      REGIONAL GRAND TOTAL
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      All 6 CAR Provinces
                    </div>
                  </td>
                  <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                    <CommodityCell
                      target={data.grandTotal.targetSeeds}
                      accomp={data.grandTotal.accompSeeds}
                    />
                  </td>
                  <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                    <CommodityCell
                      target={data.grandTotal.targetFertH}
                      accomp={data.grandTotal.accompFertH}
                    />
                  </td>
                  <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                    <CommodityCell
                      target={data.grandTotal.targetFertI}
                      accomp={data.grandTotal.accompFertI}
                    />
                  </td>
                  <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                    <CommodityCell
                      target={data.grandTotal.targetBiofert}
                      accomp={data.grandTotal.accompBiofert}
                    />
                  </td>
                  <td style={{ padding: '16px 18px', verticalAlign: 'middle', background: '#f0fdf4' }}>
                    <OverallAccomplishedCell
                      rate={data.grandTotal.rate}
                      totalAccomp={data.grandTotal.totalAccomp}
                      totalTarget={data.grandTotal.totalTarget}
                      isGrandTotal
                    />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 2, 3, 4: DETAILED INTERVENTION BREAKDOWN                       */}
      {/* ------------------------------------------------------------------ */}
      {activeTab !== 'total' && activeCategory && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {activeCategory.name} — Target vs Accomplishment
              </h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                Detailed provincial operational targets and accomplishments with individual variety and input sub-items.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Target: <strong style={{ color: '#0f172a' }}>{activeCategory.target.toLocaleString()} ha</strong> · Accomp: <strong style={{ color: '#16a34a' }}>{activeCategory.accomp.toLocaleString()} ha</strong> ({activeCategory.rate.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="ds-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 700, color: '#334155' }}>PROVINCE / INTERVENTION</th>
                  <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 700, color: '#166534' }}>TARGET (Ha)</th>
                  <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 700, color: '#15803d' }}>ACCOMPLISHMENT (Ha)</th>
                  <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 700, color: '#0369a1' }}>BALANCE (Ha)</th>
                  <th style={{ textAlign: 'center', padding: '10px 16px', fontWeight: 700, color: '#334155', width: 150 }}>% ACCOMPLISHED</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategoryProvinces.map((prov) => {
                  const isExpanded = Boolean(expandedProvinces[prov.province]);
                  const hasSub = prov.interventions.length > 0;
                  const balance = prov.target - prov.accomp;

                  return (
                    <React.Fragment key={prov.province}>
                      <tr
                        onClick={() => hasSub && toggleExpand(prov.province)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          cursor: hasSub ? 'pointer' : 'default',
                          background: isExpanded ? '#f8fafc' : '#ffffff',
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {hasSub && (
                              <span style={{ color: '#64748b' }}>
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                            )}
                            <span>{prov.province}</span>
                            {hasSub && (
                              <span style={{ fontSize: 10, background: '#e2e8f0', color: '#475569', padding: '1px 5px', borderRadius: 4 }}>
                                {prov.interventions.length} items
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#166534' }}>
                          {prov.target.toLocaleString()} ha
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#15803d' }}>
                          {prov.accomp.toLocaleString()} ha
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: balance < 0 ? '#b91c1c' : '#0369a1' }}>
                          {balance < 0 ? `-${Math.abs(balance).toLocaleString()}` : balance.toLocaleString()} ha
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                            <div style={{ flex: 1, height: 7, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', maxWidth: 60 }}>
                              <div
                                style={{
                                  width: `${Math.min(100, prov.rate)}%`,
                                  height: '100%',
                                  background: prov.rate >= 50 ? '#16a34a' : prov.rate > 0 ? '#3b82f6' : '#cbd5e1',
                                  borderRadius: 4,
                                }}
                              />
                            </div>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: prov.rate >= 50 ? '#15803d' : prov.rate > 0 ? '#1d4ed8' : '#64748b', minWidth: 46, textAlign: 'right' }}>
                              {prov.rate.toFixed(2)}%
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Sub-item varieties/interventions dropdown */}
                      {isExpanded &&
                        prov.interventions.map((sub, sIdx) => {
                          return (
                            <tr
                              key={`${prov.province}-${sub.name}-${sIdx}`}
                              style={{ background: '#f8fafc', borderBottom: '1px solid #eef2f6', fontSize: 12 }}
                            >
                              <td style={{ padding: '8px 16px 8px 40px', color: '#475569' }}>
                                <span style={{ color: '#94a3b8', marginRight: 6 }}>↳</span>
                                <strong>{sub.name}</strong> <span style={{ color: '#94a3b8' }}>({sub.unit || 'units'})</span>
                              </td>
                              <td style={{ padding: '8px 16px', textAlign: 'right', color: '#64748b' }}>
                                {sub.deliveredTarget ? `${sub.deliveredTarget.toLocaleString()} ${sub.unit}` : '-'}
                              </td>
                              <td style={{ padding: '8px 16px', textAlign: 'right', color: '#15803d', fontWeight: 600 }}>
                                {sub.distributedArea ? `${sub.distributedArea.toLocaleString()} ha` : sub.distributedQty ? `${sub.distributedQty.toLocaleString()} ${sub.unit}` : '-'}
                              </td>
                              <td style={{ padding: '8px 16px', textAlign: 'right', color: '#94a3b8' }}>
                                {sub.deliveredActual ? `Delivered: ${sub.deliveredActual.toLocaleString()}` : '-'}
                              </td>
                              <td style={{ padding: '8px 16px', textAlign: 'center', color: '#64748b', fontSize: 11 }}>
                                {sub.distributedQty ? `${sub.distributedQty.toLocaleString()} distributed` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                  <td style={{ padding: '14px 16px', color: '#0f172a' }}>{activeCategory.name} TOTAL</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#166534', fontSize: 14 }}>
                    {activeCategory.target.toLocaleString()} ha
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#15803d', fontSize: 14 }}>
                    {activeCategory.accomp.toLocaleString()} ha
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: (activeCategory.target - activeCategory.accomp) < 0 ? '#b91c1c' : '#0369a1', fontSize: 14 }}>
                    {(activeCategory.target - activeCategory.accomp) < 0 ? `-${Math.abs(activeCategory.target - activeCategory.accomp).toLocaleString()}` : (activeCategory.target - activeCategory.accomp).toLocaleString()} ha
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: '#166534', fontSize: 13 }}>
                    {activeCategory.rate.toFixed(2)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 4. PROVINCE INTERVENTION SIDEBAR DRAWER (IMAGE 2 DESIGN WITH SMOOTH ANIMATION) */}
      {(drawerState.isOpen || isDrawerClosing) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          {/* Backdrop with Fade Animation */}
          <div
            onClick={closeDrawer}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
              animation: isDrawerClosing
                ? 'dsBackdropFadeOut 0.22s cubic-bezier(0.4, 0, 1, 1) forwards'
                : 'dsBackdropFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          />

          {/* Drawer Pane with Slide & Shadow Animation */}
          <aside
            style={{
              position: 'relative',
              width: 'min(440px, 92vw)',
              height: '100%',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 10000,
              overflowY: 'auto',
              animation: isDrawerClosing
                ? 'dsDrawerSlideOut 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                : 'dsDrawerSlideIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              willChange: 'transform',
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '24px 28px 18px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.6px',
                    color: '#15803d',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  {drawerKicker}
                </span>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {drawerState.province} — {drawerCategory?.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="ds-drawer-close-btn"
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                aria-label="Close details sidebar"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Intervention Switcher Pills */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                padding: '12px 28px',
                background: '#f8fafc',
                borderBottom: '1px solid #f1f5f9',
                overflowX: 'auto',
              }}
            >
              {[
                { id: 'hybrid-seeds', label: 'Hybrid Seeds' },
                { id: 'fert-hybrid', label: 'Fert (Hybrid)' },
                { id: 'fert-inbred', label: 'Fert (Inbred)' },
                { id: 'biofert-asa', label: 'Biofert ASA' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className="ds-tab-pill-btn"
                  onClick={() => setDrawerState((prev) => ({ ...prev, categoryTab: tab.id as CommodityTabKey }))}
                  style={{
                    border: 'none',
                    background: drawerState.categoryTab === tab.id ? '#166534' : '#ffffff',
                    color: drawerState.categoryTab === tab.id ? '#ffffff' : '#475569',
                    fontWeight: 600,
                    fontSize: 11.5,
                    padding: '5px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    boxShadow:
                      drawerState.categoryTab === tab.id
                        ? '0 1px 3px rgba(0,0,0,0.12)'
                        : '0 1px 2px rgba(0,0,0,0.04)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Drawer Body Content */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Card 1: ACCOMPLISHMENT RATE */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '18px 20px',
                  animation: 'dsCardFadeUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#64748b',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}
                  >
                    ACCOMPLISHMENT RATE
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: drawerRate >= 50 ? '#059669' : drawerRate > 0 ? '#2563eb' : '#64748b',
                      background: drawerRate >= 50 ? '#ecfdf5' : drawerRate > 0 ? '#eff6ff' : '#f1f5f9',
                      padding: '4px 10px',
                      borderRadius: 6,
                    }}
                  >
                    {drawerRate.toFixed(1)}%
                  </span>
                </div>
                <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, drawerRate)}%`,
                      height: '100%',
                      background: drawerRate >= 50 ? '#059669' : drawerRate > 0 ? '#2563eb' : '#cbd5e1',
                      borderRadius: 4,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Card 2: Operational Target Area */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  animation: 'dsCardFadeUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) 0.10s both',
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155' }}>
                    Operational Target Area
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>
                    {drawerTargetShare.toFixed(2)}% of regional {drawerCategory?.name} target
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                  {drawerTarget.toLocaleString()} ha
                </div>
              </div>

              {/* Card 3: Accomplished Area */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  animation: 'dsCardFadeUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both',
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155' }}>
                    Accomplished Area
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>
                    Cumulative equivalent area served
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#2563eb' }}>
                  {drawerAccomp.toLocaleString()} ha
                </div>
              </div>

              {/* Card 4: Remaining Unserved Balance */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  animation: 'dsCardFadeUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) 0.20s both',
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155' }}>
                    {drawerBalance < 0 ? 'Surplus Accomplishment' : 'Remaining Unserved Balance'}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>
                    {drawerBalance < 0 ? 'Accomplished area exceeded target' : 'Target minus accomplished area'}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: drawerBalance < 0 ? '#059669' : '#0f172a',
                  }}
                >
                  {drawerBalance < 0
                    ? `+${Math.abs(drawerBalance).toLocaleString()}`
                    : drawerBalance.toLocaleString()}{' '}
                  ha
                </div>
              </div>

              {/* Section: Regional Contribution */}
              <div style={{ marginTop: 6, animation: 'dsCardFadeUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both' }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#64748b',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    marginBottom: 10,
                  }}
                >
                  REGIONAL CONTRIBUTION ({(drawerCategory?.name || '').toUpperCase()})
                </div>
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '16px 20px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: '#475569' }}>
                      Share of CAR Accomplishment ({drawerRegAccomp.toLocaleString()} ha)
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      {drawerAccompShare.toFixed(2)}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, drawerAccompShare)}%`,
                        height: '100%',
                        background: '#1e293b',
                        borderRadius: 3,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Varieties / Input details if present */}
              {drawerProvinceData?.interventions && drawerProvinceData.interventions.length > 0 && (
                <div style={{ marginTop: 10, animation: 'dsCardFadeUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) 0.30s both' }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#64748b',
                      letterSpacing: '0.6px',
                      textTransform: 'uppercase',
                      marginBottom: 10,
                    }}
                  >
                    INPUT VARIETIES & DELIVERIES
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {drawerProvinceData.interventions.map((item, idx) => (
                      <div
                        key={`${item.name}-${idx}`}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '10px 14px',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                          <span>{item.name}</span>
                          <span style={{ color: '#166534' }}>
                            {item.distributedArea
                              ? `${item.distributedArea.toLocaleString()} ha`
                              : item.distributedQty
                              ? `${item.distributedQty.toLocaleString()} ${item.unit}`
                              : '-'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 11 }}>
                          <span>Target: {item.deliveredTarget ? `${item.deliveredTarget.toLocaleString()} ${item.unit}` : '-'}</span>
                          <span>Delivered: {item.deliveredActual ? `${item.deliveredActual.toLocaleString()} ${item.unit}` : '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Embedded Animation Keyframes for Smooth Drawer Transitions */}
      <style>{`
        @keyframes dsBackdropFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dsBackdropFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes dsDrawerSlideIn {
          0% {
            transform: translateX(100%);
            box-shadow: 0 0 0 rgba(0, 0, 0, 0);
          }
          100% {
            transform: translateX(0);
            box-shadow: -12px 0 40px rgba(15, 23, 42, 0.18);
          }
        }
        @keyframes dsDrawerSlideOut {
          0% {
            transform: translateX(0);
            box-shadow: -12px 0 40px rgba(15, 23, 42, 0.18);
          }
          100% {
            transform: translateX(100%);
            box-shadow: 0 0 0 rgba(0, 0, 0, 0);
          }
        }
        @keyframes dsCardFadeUp {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .ds-drawer-close-btn:hover {
          background-color: #f1f5f9 !important;
          transform: rotate(90deg) scale(1.06);
          color: #0f172a !important;
        }
        .ds-tab-pill-btn {
          transition: all 0.16s ease;
        }
        .ds-tab-pill-btn:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
