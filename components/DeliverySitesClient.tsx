'use client';

import React, { useState, useMemo, useEffect, useDeferredValue, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin,
  PackageCheck,
  Search,
  RotateCcw,
  ArrowUpDown,
} from 'lucide-react';
import type {
  ProvinceName,
  FundSourceName,
  SeasonName,
  InputCategoryName,
  SummaryOfSuppliesResult,
} from '@/utils/fetchSummaryOfSuppliesSheet';
import type { MappedDeliverySite } from '@/components/CarDeliveryMap';

const CarDeliveryMap = dynamic(() => import('@/components/CarDeliveryMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        color: '#64748b',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      Loading Cordillera Administrative Region Map...
    </div>
  ),
});

// Exact coordinates within the Cordillera Administrative Region (CAR)
const CAR_SITE_COORDS: Record<string, [number, number]> = {
  'Abra|Bangued': [17.5956, 120.6186],
  'Abra|AVSECO': [17.6035, 120.6285],
  'Abra|Lagangilang': [17.6147, 120.7336],
  'Abra|Manabo': [17.4333, 120.7000],
  'Abra|Pidigan': [17.5681, 120.5789],
  'Abra|OPAG': [17.5920, 120.6150],
  'Abra|Provincial / OPAG Drop-off': [17.5880, 120.6120],
  'Apayao|Luna': [18.3333, 121.3833],
  'Apayao|Luna (DS)': [18.3420, 121.3920],
  'Apayao|Sta. Marcela': [18.2833, 121.4500],
  'Apayao|Sta. Marcela (Model Farm)': [18.2750, 121.4600],
  'Apayao|Provincial / OPAG Drop-off': [18.3200, 121.3700],
  'Benguet|Baguio': [16.4023, 120.5960],
  'Benguet|La Trinidad': [16.4550, 120.5875],
  'Benguet|Wangal': [16.4530, 120.5670],
  'Benguet|OPAG': [16.4580, 120.5910],
  'Benguet|Provincial / OPAG Drop-off': [16.4510, 120.5840],
  'Benguet|Mankayan': [16.8667, 120.7833],
  'Benguet|Sablan': [16.4950, 120.4833],
  'Benguet|Tuba': [16.3867, 120.5617],
  'Ifugao|Alfonso Lista': [16.9250, 121.4583],
  'Ifugao|Lagawe': [16.8000, 121.1167],
  'Ifugao|Lamut': [16.6500, 121.2167],
  'Ifugao|OPAG': [16.8040, 121.1220],
  'Ifugao|Provincial / OPAG Drop-off': [16.7960, 121.1120],
  'Kalinga|Tabuk': [17.4500, 121.4500],
  'Kalinga|Rizal': [17.4950, 121.5850],
  'Kalinga|Rizal (DS)': [17.5030, 121.5920],
  'Kalinga|Kalinga': [17.4450, 121.4420],
  'Kalinga|Provincial / OPAG Drop-off': [17.4550, 121.4580],
  'Mountain Province|Bauko': [16.9789, 120.8692],
  'Mountain Province|Besao': [17.0833, 120.8500],
  'Mountain Province|Paracelis': [17.1667, 121.5000],
  'Mountain Province|OPAG': [17.0886, 120.9772],
  'Mountain Province|Provincial / OPAG Drop-off': [17.0840, 120.9720],
};

const PROVINCE_FALLBACK_COORDS: Record<string, [number, number]> = {
  Abra: [17.5956, 120.6186],
  Apayao: [18.3333, 121.3833],
  Benguet: [16.4550, 120.5875],
  Ifugao: [16.8000, 121.1167],
  Kalinga: [17.4500, 121.4500],
  'Mountain Province': [17.0886, 120.9772],
};

const PROVINCE_LIST: Exclude<ProvinceName, 'All Provinces'>[] = [
  'Abra',
  'Apayao',
  'Benguet',
  'Ifugao',
  'Kalinga',
  'Mountain Province',
];

const SEASON_LIST: Exclude<SeasonName, 'All Seasons'>[] = [
  'Wet Season (WS 2026)',
  'Dry Season (DS 2026-2027)',
  'Model Farm',
  'Seed Reserve',
  'General / Regular & Carryover',
];

const CATEGORIES: Exclude<InputCategoryName, 'All Categories'>[] = [
  'Inorganic Fertilizer',
  'Hybrid Rice Seeds',
  'Biofertilizer',
  'Liquid / Foliar Fertilizer',
  'Wettable Powder / Protection',
  'Soil Ameliorant',
  'Inbred / Seed Reserve',
];

const formatNumber = (num: number) =>
  new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(num);

interface Props {
  initialData: SummaryOfSuppliesResult;
}

export default function DeliverySitesClient({ initialData }: Props) {
  const [data, setData] = useState<SummaryOfSuppliesResult>(initialData);
  const [selectedProvince, setSelectedProvince] = useState<ProvinceName>('All Provinces');
  const [selectedFundSource, setSelectedFundSource] = useState<FundSourceName>('All Fund Sources');
  const [selectedSeason, setSelectedSeason] = useState<SeasonName>('All Seasons');
  const [selectedCategory, setSelectedCategory] = useState<InputCategoryName>('All Categories');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [selectedSiteKey, setSelectedSiteKey] = useState<string | null>(null);
  const handleSelectSite = useCallback((key: string | null) => {
    setSelectedSiteKey(key);
  }, []);
  const [sortField, setSortField] = useState<'totalUnits' | 'dropCount' | 'province' | 'municipality'>('totalUnits');
  const [sortAsc, setSortAsc] = useState(false);

  const [breakdownTab, setBreakdownTab] = useState<'fundSource' | 'season' | 'drops'>('fundSource');

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Background polling (every 15s when tab is visible) for live sheet updates
  useEffect(() => {
    let isMounted = true;
    const fetchLatest = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const res = await fetch('/api/rice/summary-of-supplies?refresh=false');
        if (!res.ok) return;
        const fresh = await res.json();
        if (fresh && Array.isArray(fresh.deliveries) && isMounted) {
          setData((prev) => {
            if (
              prev.deliveries.length === fresh.deliveries.length &&
              prev.fetchedAt === fresh.fetchedAt
            ) {
              return prev;
            }
            return fresh;
          });
        }
      } catch {
        // Ignore background errors
      }
    };
    const interval = setInterval(fetchLatest, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const allFundSources = useMemo(() => {
    const unique = Array.from(new Set(data.deliveries.map((d) => d.fundSource))).filter(Boolean);
    return unique.sort((a, b) => a.localeCompare(b));
  }, [data.deliveries]);

  const filteredDeliveries = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return data.deliveries.filter((d) => {
      if (selectedProvince !== 'All Provinces' && d.province !== selectedProvince) return false;
      if (selectedFundSource !== 'All Fund Sources' && d.fundSource !== selectedFundSource) return false;
      if (selectedSeason !== 'All Seasons' && d.season !== selectedSeason) return false;
      if (selectedCategory !== 'All Categories' && d.category !== selectedCategory) return false;
      if (q) {
        const hit =
          d.municipality.toLowerCase().includes(q) ||
          d.province.toLowerCase().includes(q) ||
          d.product.toLowerCase().includes(q) ||
          d.supplier.toLowerCase().includes(q) ||
          d.fundSource.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [data.deliveries, selectedProvince, selectedFundSource, selectedSeason, selectedCategory, deferredSearch]);

  // Aggregate into unique mapped CAR delivery sites
  const mappedSites = useMemo<MappedDeliverySite[]>(() => {
    const siteMap = new Map<
      string,
      {
        key: string;
        municipality: string;
        province: string;
        totalUnits: number;
        dropCount: number;
        fundSources: Set<string>;
        seasons: Set<string>;
        products: Map<string, { product: string; qty: number; unit: string }>;
      }
    >();

    filteredDeliveries.forEach((d) => {
      const key = `${d.province}|${d.municipality}`;
      if (!siteMap.has(key)) {
        siteMap.set(key, {
          key,
          municipality: d.municipality,
          province: d.province,
          totalUnits: 0,
          dropCount: 0,
          fundSources: new Set(),
          seasons: new Set(),
          products: new Map(),
        });
      }
      const entry = siteMap.get(key)!;
      entry.totalUnits += d.quantity;
      entry.dropCount += 1;
      entry.fundSources.add(d.fundSource);
      entry.seasons.add(d.season);
      const pKey = `${d.product}|${d.unit}`;
      const existingP = entry.products.get(pKey);
      if (existingP) {
        existingP.qty += d.quantity;
      } else {
        entry.products.set(pKey, { product: d.product, qty: d.quantity, unit: d.unit });
      }
    });

    const result: MappedDeliverySite[] = Array.from(siteMap.values()).map((s) => {
      const coords =
        CAR_SITE_COORDS[s.key] ||
        PROVINCE_FALLBACK_COORDS[s.province] ||
        [17.32, 121.02];

      return {
        key: s.key,
        municipality: s.municipality,
        province: s.province,
        lat: coords[0],
        lng: coords[1],
        totalUnits: s.totalUnits,
        dropCount: s.dropCount,
        fundSources: Array.from(s.fundSources),
        seasons: Array.from(s.seasons),
        topProducts: Array.from(s.products.values()).sort((a, b) => b.qty - a.qty),
      };
    });

    return result.sort((a, b) => {
      const vA = a[sortField];
      const vB = b[sortField];
      if (typeof vA === 'string' && typeof vB === 'string') {
        return sortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return sortAsc ? Number(vA) - Number(vB) : Number(vB) - Number(vA);
    });
  }, [filteredDeliveries, sortField, sortAsc]);

  // Matrix: Province x Fund Source
  const fundSourceMatrix = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    filteredDeliveries.forEach((d) => {
      if (!map.has(d.fundSource)) {
        map.set(d.fundSource, { total: 0 });
      }
      const row = map.get(d.fundSource)!;
      row[d.province] = (row[d.province] || 0) + d.quantity;
      row.total += d.quantity;
    });
    return Array.from(map.entries())
      .map(([fundSource, counts]) => ({ fundSource, counts }))
      .sort((a, b) => b.counts.total - a.counts.total);
  }, [filteredDeliveries]);

  // Matrix: Province x Season
  const seasonMatrix = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    filteredDeliveries.forEach((d) => {
      if (!map.has(d.season)) {
        map.set(d.season, { total: 0 });
      }
      const row = map.get(d.season)!;
      row[d.province] = (row[d.province] || 0) + d.quantity;
      row.total += d.quantity;
    });
    return Array.from(map.entries())
      .map(([season, counts]) => ({ season, counts }))
      .sort((a, b) => b.counts.total - a.counts.total);
  }, [filteredDeliveries]);

  const provinceColumnTotals = useMemo(() => {
    const totals: Record<string, number> = { total: 0 };
    filteredDeliveries.forEach((d) => {
      totals[d.province] = (totals[d.province] || 0) + d.quantity;
      totals.total += d.quantity;
    });
    return totals;
  }, [filteredDeliveries]);

  const totalUnits = provinceColumnTotals.total;

  const hasFilters =
    selectedProvince !== 'All Provinces' ||
    selectedFundSource !== 'All Fund Sources' ||
    selectedSeason !== 'All Seasons' ||
    selectedCategory !== 'All Categories' ||
    searchQuery.trim() !== '' ||
    selectedSiteKey !== null;

  const handleReset = () => {
    setSelectedProvince('All Provinces');
    setSelectedFundSource('All Fund Sources');
    setSelectedSeason('All Seasons');
    setSelectedCategory('All Categories');
    setSearchQuery('');
    setSelectedSiteKey(null);
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .ds-kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .ds-main-grid {
          display: grid;
          grid-template-columns: 7fr 5fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 1024px) {
          .ds-kpi-grid { grid-template-columns: 1fr; }
          .ds-main-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .ds-kpi-grid { gap: 10px; margin-bottom: 16px; }
          .ds-main-grid { gap: 14px; margin-bottom: 16px; }
        }
      `}</style>

      {/* 1. TOP KPI CARDS */}
      <div className="ds-kpi-grid">
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
            <PackageCheck size={20} style={{ color: '#166534' }} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
              Total Delivered Units ({filteredDeliveries.length} Drops):
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
              {formatNumber(totalUnits)}{' '}
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>units</span>
            </div>
          </div>
        </div>

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
            <MapPin size={20} style={{ color: '#166534' }} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
              Mapped Delivery Sites (CAR):
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
              {mappedSites.length}{' '}
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>drop-off hubs</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CAR MAP + DELIVERY SITES LIST */}
      <div className="ds-main-grid">
        {/* Left: CAR Locked Leaflet Map */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 18,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Cordillera Administrative Region (CAR) Delivery Map
            </h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
              Circle size shows total units delivered; click any marker for fund source, season &amp; product details
            </p>
          </div>

          <CarDeliveryMap
            sites={mappedSites}
            selectedSiteKey={selectedSiteKey}
            onSelectSite={handleSelectSite}
          />
        </div>

        {/* Right: Delivery Sites Directory + Filters */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Delivery Sites ({mappedSites.length})
              </h3>
              {hasFilters && (
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: '#475569',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '4px 9px',
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </div>

            {/* Compact Filter Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
              <div style={{ position: 'relative', gridColumn: 'span 2' }}>
                <Search
                  size={13}
                  style={{
                    position: 'absolute',
                    left: 9,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search site, product, or supplier..."
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 28px',
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>

              <select
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value as ProvinceName);
                  setSelectedSiteKey(null);
                }}
                style={{
                  padding: '6px 8px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                }}
              >
                <option value="All Provinces">All Provinces</option>
                {PROVINCE_LIST.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <select
                value={selectedFundSource}
                onChange={(e) => {
                  setSelectedFundSource(e.target.value as FundSourceName);
                  setSelectedSiteKey(null);
                }}
                style={{
                  padding: '6px 8px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                }}
              >
                <option value="All Fund Sources">All Fund Sources</option>
                {allFundSources.map((fs) => (
                  <option key={fs} value={fs}>
                    {fs}
                  </option>
                ))}
              </select>

              <select
                value={selectedSeason}
                onChange={(e) => {
                  setSelectedSeason(e.target.value as SeasonName);
                  setSelectedSiteKey(null);
                }}
                style={{
                  padding: '6px 8px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                }}
              >
                <option value="All Seasons">All Seasons</option>
                {SEASON_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as InputCategoryName)}
                style={{
                  padding: '6px 8px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                }}
              >
                <option value="All Categories">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 410 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th
                    onClick={() => toggleSort('municipality')}
                    style={{ padding: '9px 12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Site <ArrowUpDown size={11} />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleSort('province')}
                    style={{ padding: '9px 10px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Province <ArrowUpDown size={11} />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleSort('dropCount')}
                    style={{ padding: '9px 10px', fontWeight: 700, textAlign: 'right', cursor: 'pointer' }}
                  >
                    Drops
                  </th>
                  <th
                    onClick={() => toggleSort('totalUnits')}
                    style={{ padding: '9px 12px', fontWeight: 700, textAlign: 'right', cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Units <ArrowUpDown size={11} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {mappedSites.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>
                      No delivery sites match your filters.
                    </td>
                  </tr>
                ) : (
                  mappedSites.map((s) => {
                    const isSelected = selectedSiteKey === s.key;
                    return (
                      <tr
                        key={s.key}
                        onClick={() => setSelectedSiteKey(isSelected ? null : s.key)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isSelected ? '#f0fdf4' : '#ffffff',
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>
                          {s.municipality}
                        </td>
                        <td style={{ padding: '9px 10px', color: '#475569' }}>{s.province}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#64748b' }}>
                          {s.dropCount}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                          {formatNumber(s.totalUnits)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. DISTRIBUTION BREAKDOWN: PER PROVINCE, PER FUND SOURCE & PER SEASON */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Supply Distribution Breakdown (Per Province, Fund Source &amp; Season)
            </h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
              Cross-tabulated summary of units delivered across all 6 CAR provinces
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[
              { id: 'fundSource', label: 'By Province & Fund Source' },
              { id: 'season', label: 'By Province & Season' },
              { id: 'drops', label: `All Delivery Drops (${filteredDeliveries.length})` },
            ].map((tab) => {
              const active = breakdownTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBreakdownTab(tab.id as typeof breakdownTab)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: active ? '#166534' : '#cbd5e1',
                    background: active ? '#166534' : '#ffffff',
                    color: active ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
          {breakdownTab === 'fundSource' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Fund Source</th>
                  {PROVINCE_LIST.map((p) => (
                    <th key={p} style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>
                      {p}
                    </th>
                  ))}
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', color: '#166534' }}>
                    Total Units
                  </th>
                </tr>
              </thead>
              <tbody>
                {fundSourceMatrix.map((row, idx) => (
                  <tr
                    key={row.fundSource}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {row.fundSource}
                    </td>
                    {PROVINCE_LIST.map((p) => (
                      <td
                        key={p}
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          color: row.counts[p] ? '#1e293b' : '#cbd5e1',
                          fontWeight: row.counts[p] ? 600 : 400,
                        }}
                      >
                        {row.counts[p] ? formatNumber(row.counts[p]) : '—'}
                      </td>
                    ))}
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#166534' }}>
                      {formatNumber(row.counts.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 5 }}>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                  <td style={{ padding: '11px 14px', color: '#0f172a' }}>Total Across All Funds</td>
                  {PROVINCE_LIST.map((p) => (
                    <td key={p} style={{ padding: '11px 12px', textAlign: 'right', color: '#0f172a' }}>
                      {formatNumber(provinceColumnTotals[p] || 0)}
                    </td>
                  ))}
                  <td style={{ padding: '11px 14px', textAlign: 'right', color: '#166534', fontSize: 13 }}>
                    {formatNumber(provinceColumnTotals.total || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {breakdownTab === 'season' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Season / P/A/P Classification</th>
                  {PROVINCE_LIST.map((p) => (
                    <th key={p} style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>
                      {p}
                    </th>
                  ))}
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', color: '#166534' }}>
                    Total Units
                  </th>
                </tr>
              </thead>
              <tbody>
                {seasonMatrix.map((row, idx) => (
                  <tr
                    key={row.season}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {row.season}
                    </td>
                    {PROVINCE_LIST.map((p) => (
                      <td
                        key={p}
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          color: row.counts[p] ? '#1e293b' : '#cbd5e1',
                          fontWeight: row.counts[p] ? 600 : 400,
                        }}
                      >
                        {row.counts[p] ? formatNumber(row.counts[p]) : '—'}
                      </td>
                    ))}
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#166534' }}>
                      {formatNumber(row.counts.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 5 }}>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                  <td style={{ padding: '11px 14px', color: '#0f172a' }}>Total Across All Seasons</td>
                  {PROVINCE_LIST.map((p) => (
                    <td key={p} style={{ padding: '11px 12px', textAlign: 'right', color: '#0f172a' }}>
                      {formatNumber(provinceColumnTotals[p] || 0)}
                    </td>
                  ))}
                  <td style={{ padding: '11px 14px', textAlign: 'right', color: '#166534', fontSize: 13 }}>
                    {formatNumber(provinceColumnTotals.total || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {breakdownTab === 'drops' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Province</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Municipality / Site</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Fund Source</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Season</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Product</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((d, idx) => (
                  <tr
                    key={`${d.row}-${d.province}-${d.municipality}-${d.product}-${idx}`}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                    }}
                  >
                    <td style={{ padding: '9px 14px', fontWeight: 700, color: '#0f172a' }}>{d.province}</td>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: '#334155' }}>{d.municipality}</td>
                    <td style={{ padding: '9px 14px', color: '#475569' }}>{d.fundSource}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          background: '#f0fdf4',
                          color: '#166534',
                          border: '1px solid #bbf7d0',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {d.season}
                      </span>
                    </td>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: '#166534' }}>{d.product}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {formatNumber(d.quantity)} <span style={{ color: '#64748b', fontWeight: 400 }}>{d.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
