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
} from 'lucide-react';

interface Props {
  initialData: DrySeasonSheetData;
}

function TargetAccompBalanceCell({
  target,
  accomp,
  isGrandTotal = false,
}: {
  target: number;
  accomp: number;
  isGrandTotal?: boolean;
}) {
  const balance = target - accomp;
  const rate = target > 0 ? ((accomp / target) * 100).toFixed(1) : '0.0';
  const balanceStr =
    balance < 0 ? `-${Math.abs(balance).toLocaleString()}` : balance.toLocaleString();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        gap: 5,
        whiteSpace: 'nowrap',
        lineHeight: 1.25,
      }}
    >
      <span style={{ color: isGrandTotal ? '#0f172a' : '#475569' }}>{target.toLocaleString()}</span>
      <span style={{ color: '#94a3b8' }}>/</span>
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          lineHeight: 1.2,
        }}
      >
        <strong style={{ color: '#0f172a' }}>{accomp.toLocaleString()}</strong>
        <span
          style={{
            fontSize: 10.5,
            color: accomp > 0 ? '#15803d' : '#64748b',
            fontWeight: 600,
            marginTop: 2,
          }}
        >
          {rate}%
        </span>
      </div>
      <span style={{ color: '#94a3b8' }}>/</span>
      <span
        style={{
          fontWeight: isGrandTotal ? 700 : 600,
          color: balance < 0 ? '#b91c1c' : '#0369a1',
        }}
      >
        {balanceStr}
      </span>
      <span style={{ color: '#64748b' }}>ha</span>
    </div>
  );
}

export default function DrySeasonClient({ initialData }: Props) {
  const [data, setData] = useState<DrySeasonSheetData>(initialData);
  const [activeTab, setActiveTab] = useState<'total' | 'hybrid-seeds' | 'fert-hybrid' | 'fert-inbred' | 'biofert-asa'>('total');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedProvinces, setExpandedProvinces] = useState<Record<string, boolean>>({});

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
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 700, color: '#334155' }}>PROVINCE</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: '#334155' }}>
                    HYBRID SEEDS<br />
                    <span style={{ fontSize: 10.5, fontWeight: 500, color: '#64748b' }}>Target / Accomp / Balance</span>
                  </th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: '#334155' }}>
                    FERT (HYBRID)<br />
                    <span style={{ fontSize: 10.5, fontWeight: 500, color: '#64748b' }}>Target / Accomp / Balance</span>
                  </th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: '#334155' }}>
                    FERT (INBRED)<br />
                    <span style={{ fontSize: 10.5, fontWeight: 500, color: '#64748b' }}>Target / Accomp / Balance</span>
                  </th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: '#334155' }}>
                    BIOFERT ASA<br />
                    <span style={{ fontSize: 10.5, fontWeight: 500, color: '#64748b' }}>Target / Accomp / Balance</span>
                  </th>
                  <th style={{ textAlign: 'center', padding: '10px 16px', fontWeight: 700, color: '#334155', width: 140 }}>
                    % ACCOMPLISHED
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProvinceTotals.map((row) => {
                  return (
                    <tr key={row.province} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.rate > 0 ? '#16a34a' : '#94a3b8' }} />
                          {row.province}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#475569' }}>
                        <TargetAccompBalanceCell target={row.targetSeeds} accomp={row.accompSeeds} />
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#475569' }}>
                        <TargetAccompBalanceCell target={row.targetFertH} accomp={row.accompFertH} />
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#475569' }}>
                        <TargetAccompBalanceCell target={row.targetFertI} accomp={row.accompFertI} />
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#475569' }}>
                        <TargetAccompBalanceCell target={row.targetBiofert} accomp={row.accompBiofert} />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                          <div style={{ flex: 1, height: 7, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', maxWidth: 60 }}>
                            <div
                              style={{
                                width: `${Math.min(100, row.rate)}%`,
                                height: '100%',
                                background: row.rate >= 50 ? '#16a34a' : row.rate > 0 ? '#3b82f6' : '#cbd5e1',
                                borderRadius: 4,
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: row.rate >= 50 ? '#15803d' : row.rate > 0 ? '#1d4ed8' : '#64748b',
                              minWidth: 46,
                              textAlign: 'right',
                            }}
                          >
                            {row.rate.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                  <td style={{ padding: '14px 16px', color: '#0f172a' }}>REGIONAL GRAND TOTAL</td>
                  <td style={{ padding: '14px 14px', textAlign: 'right', color: '#0f172a' }}>
                    <TargetAccompBalanceCell
                      target={data.grandTotal.targetSeeds}
                      accomp={data.grandTotal.accompSeeds}
                      isGrandTotal
                    />
                  </td>
                  <td style={{ padding: '14px 14px', textAlign: 'right', color: '#0f172a' }}>
                    <TargetAccompBalanceCell
                      target={data.grandTotal.targetFertH}
                      accomp={data.grandTotal.accompFertH}
                      isGrandTotal
                    />
                  </td>
                  <td style={{ padding: '14px 14px', textAlign: 'right', color: '#0f172a' }}>
                    <TargetAccompBalanceCell
                      target={data.grandTotal.targetFertI}
                      accomp={data.grandTotal.accompFertI}
                      isGrandTotal
                    />
                  </td>
                  <td style={{ padding: '14px 14px', textAlign: 'right', color: '#0f172a' }}>
                    <TargetAccompBalanceCell
                      target={data.grandTotal.targetBiofert}
                      accomp={data.grandTotal.accompBiofert}
                      isGrandTotal
                    />
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', background: '#ecfdf5', color: '#166534', fontSize: 13 }}>
                    {data.grandTotal.rate.toFixed(2)}%
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
    </div>
  );
}
