'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  PackageCheck,
  MapPin,
  Search,
  Landmark,
  ArrowUpDown,
  RotateCcw,
  Truck,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type {
  ProvinceName,
  FundSourceName,
  SeasonName,
  InputCategoryName,
  SummaryOfSuppliesResult,
} from '@/utils/fetchSummaryOfSuppliesSheet';

const CATEGORY_COLORS: Record<Exclude<InputCategoryName, 'All Categories'>, string> = {
  'Inorganic Fertilizer': '#14532d',
  'Hybrid Rice Seeds': '#d97706',
  Biofertilizer: '#16a34a',
  'Liquid / Foliar Fertilizer': '#0d9488',
  'Wettable Powder / Protection': '#0284c7',
  'Soil Ameliorant': '#eab308',
  'Inbred / Seed Reserve': '#64748b',
};

const DONUT_COLORS = [
  '#fbbc04', // Golden Yellow
  '#ea4335', // Coral Red
  '#ff6d01', // Vivid Orange
  '#7baaf7', // Soft Periwinkle Blue
  '#46bdc6', // Teal Cyan
  '#34a853', // Fresh Green
  '#9334e6', // Violet
  '#64748b', // Slate
];

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

const formatNumber = (num: number): string =>
  new Intl.NumberFormat('en-PH', {
    maximumFractionDigits: 0,
  }).format(num);

const formatCurrency = (num: number): string =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

const formatCompactCurrency = (num: number): string => {
  if (num >= 1_000_000_000) return `₱${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `₱${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `₱${(num / 1_000).toFixed(1)}K`;
  return formatCurrency(num);
};

interface Props {
  initialData: SummaryOfSuppliesResult;
}

export default function SummaryOfSuppliesClient({ initialData }: Props) {
  const [data, setData] = useState<SummaryOfSuppliesResult>(initialData);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Background polling (every 20s and on window focus) for live Google Sheet updates
  useEffect(() => {
    let isMounted = true;
    const fetchLatest = async () => {
      try {
        const res = await fetch('/api/rice/summary-of-supplies');
        if (!res.ok) return;
        const fresh = await res.json();
        if (fresh && Array.isArray(fresh.contracts) && Array.isArray(fresh.deliveries) && isMounted) {
          setData(fresh);
        }
      } catch {
        // Silently ignore background polling errors
      }
    };

    const interval = setInterval(fetchLatest, 20000);
    const handleFocus = () => fetchLatest();
    window.addEventListener('focus', handleFocus);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const contracts = data.contracts;
  const deliveries = data.deliveries;

  // Simple, clear filters
  const [selectedProvince, setSelectedProvince] = useState<ProvinceName>('All Provinces');
  const [selectedFundSource, setSelectedFundSource] = useState<FundSourceName>('All Fund Sources');
  const [selectedSeason, setSelectedSeason] = useState<SeasonName>('All Seasons');
  const [selectedCategory, setSelectedCategory] = useState<InputCategoryName>('All Categories');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Clean 2-view table toggle: Delivery Sites vs Contracts
  const [tableView, setTableView] = useState<'deliveries' | 'contracts'>('deliveries');

  // Sorting & Pagination
  const [deliverySortField, setDeliverySortField] = useState<'province' | 'municipality' | 'product' | 'quantity'>('quantity');
  const [deliverySortAsc, setDeliverySortAsc] = useState(false);
  const [contractSortField, setContractSortField] = useState<'fundSource' | 'supplier' | 'product' | 'ntpQty' | 'amount'>('amount');
  const [contractSortAsc, setContractSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;

  const allFundSources = useMemo(() => {
    const unique = Array.from(
      new Set([...contracts.map((c) => c.fundSource), ...deliveries.map((d) => d.fundSource)])
    ).filter(Boolean);
    return unique.sort((a, b) => a.localeCompare(b));
  }, [contracts, deliveries]);

  const hasActiveFilters =
    selectedProvince !== 'All Provinces' ||
    selectedFundSource !== 'All Fund Sources' ||
    selectedSeason !== 'All Seasons' ||
    selectedCategory !== 'All Categories' ||
    searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedProvince('All Provinces');
    setSelectedFundSource('All Fund Sources');
    setSelectedSeason('All Seasons');
    setSelectedCategory('All Categories');
    setSearchQuery('');
    setPage(1);
  };

  // Filtered Deliveries
  const filteredDeliveries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return deliveries.filter((d) => {
      if (selectedProvince !== 'All Provinces' && d.province !== selectedProvince) return false;
      if (selectedFundSource !== 'All Fund Sources' && d.fundSource !== selectedFundSource) return false;
      if (selectedSeason !== 'All Seasons' && d.season !== selectedSeason) return false;
      if (selectedCategory !== 'All Categories' && d.category !== selectedCategory) return false;
      if (q) {
        const hit =
          d.product.toLowerCase().includes(q) ||
          d.municipality.toLowerCase().includes(q) ||
          d.province.toLowerCase().includes(q) ||
          d.supplier.toLowerCase().includes(q) ||
          d.ibNo.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [deliveries, selectedProvince, selectedFundSource, selectedSeason, selectedCategory, searchQuery]);

  // Filtered Contracts
  const filteredContracts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matchingKeys = new Set(
      filteredDeliveries.map((d) => `${d.fundSource}||${d.ibNo}||${d.supplier}||${d.category}`)
    );

    return contracts.filter((c) => {
      if (selectedFundSource !== 'All Fund Sources' && c.fundSource !== selectedFundSource) return false;
      if (selectedCategory !== 'All Categories' && c.category !== selectedCategory) return false;
      if (selectedProvince !== 'All Provinces') {
        const key = `${c.fundSource}||${c.ibNo}||${c.supplier}||${c.category}`;
        if (!matchingKeys.has(key)) return false;
      }
      if (q) {
        const key = `${c.fundSource}||${c.ibNo}||${c.supplier}||${c.category}`;
        const directHit =
          c.product.toLowerCase().includes(q) ||
          c.supplier.toLowerCase().includes(q) ||
          c.ibNo.toLowerCase().includes(q) ||
          c.fundSource.toLowerCase().includes(q);
        if (!directHit && !matchingKeys.has(key)) return false;
      }
      return true;
    });
  }, [contracts, filteredDeliveries, selectedProvince, selectedFundSource, selectedCategory, searchQuery]);

  // Totals
  const totals = useMemo(() => {
    const contractAmount = filteredContracts.reduce((s, c) => s + c.amount, 0);
    const ntpQty = filteredContracts.reduce((s, c) => s + c.ntpQty, 0);
    const siteUnits = filteredDeliveries.reduce((s, d) => s + d.quantity, 0);
    const suppliers = new Set(filteredContracts.map((c) => c.supplier)).size;
    const provinces = new Set(filteredDeliveries.map((d) => d.province)).size;
    return { contractAmount, ntpQty, siteUnits, suppliers, provinces };
  }, [filteredContracts, filteredDeliveries]);

  // Chart: Units Delivered by Province
  const provinceChartData = useMemo(() => {
    return PROVINCE_LIST.map((prov) => {
      const rows = filteredDeliveries.filter((d) => d.province === prov);
      const cats: Record<Exclude<InputCategoryName, 'All Categories'>, number> = {
        'Inorganic Fertilizer': 0,
        'Hybrid Rice Seeds': 0,
        Biofertilizer: 0,
        'Liquid / Foliar Fertilizer': 0,
        'Wettable Powder / Protection': 0,
        'Soil Ameliorant': 0,
        'Inbred / Seed Reserve': 0,
      };
      rows.forEach((r) => {
        cats[r.category] = (cats[r.category] || 0) + r.quantity;
      });
      return {
        province: prov,
        total: rows.reduce((s, r) => s + r.quantity, 0),
        ...cats,
      };
    });
  }, [filteredDeliveries]);

  // Fund Source Breakdown
  const fundSourceBreakdown = useMemo(() => {
    const map: Record<string, { fundSource: string; amount: number; count: number }> = {};
    filteredContracts.forEach((c) => {
      if (!map[c.fundSource]) map[c.fundSource] = { fundSource: c.fundSource, amount: 0, count: 0 };
      map[c.fundSource].amount += c.amount;
      map[c.fundSource].count += 1;
    });
    const list = Object.values(map).sort((a, b) => b.amount - a.amount);
    const maxAmt = list[0]?.amount || 1;
    return list.map((item) => ({
      ...item,
      barPct: Math.max(4, Math.round((item.amount / maxAmt) * 100)),
      sharePct: totals.contractAmount > 0 ? (item.amount / totals.contractAmount) * 100 : 0,
    }));
  }, [filteredContracts, totals.contractAmount]);

  // Sorted Table Rows
  const sortedDeliveries = useMemo(() => {
    return [...filteredDeliveries].sort((a, b) => {
      const vA = a[deliverySortField];
      const vB = b[deliverySortField];
      if (typeof vA === 'string' && typeof vB === 'string') {
        return deliverySortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return deliverySortAsc ? Number(vA) - Number(vB) : Number(vB) - Number(vA);
    });
  }, [filteredDeliveries, deliverySortField, deliverySortAsc]);

  const sortedContracts = useMemo(() => {
    return [...filteredContracts].sort((a, b) => {
      const vA = a[contractSortField];
      const vB = b[contractSortField];
      if (typeof vA === 'string' && typeof vB === 'string') {
        return contractSortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return contractSortAsc ? Number(vA) - Number(vB) : Number(vB) - Number(vA);
    });
  }, [filteredContracts, contractSortField, contractSortAsc]);

  const totalPages = Math.max(1, Math.ceil(sortedDeliveries.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedDeliveries = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return sortedDeliveries.slice(start, start + itemsPerPage);
  }, [sortedDeliveries, safePage]);

  const toggleDeliverySort = (field: typeof deliverySortField) => {
    if (deliverySortField === field) setDeliverySortAsc(!deliverySortAsc);
    else {
      setDeliverySortField(field);
      setDeliverySortAsc(false);
    }
    setPage(1);
  };

  const toggleContractSort = (field: typeof contractSortField) => {
    if (contractSortField === field) setContractSortAsc(!contractSortAsc);
    else {
      setContractSortField(field);
      setContractSortAsc(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .sos-clean-kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .sos-clean-charts-grid {
          display: grid;
          grid-template-columns: 7fr 5fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 1024px) {
          .sos-clean-kpi-grid { grid-template-columns: 1fr; }
          .sos-clean-charts-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* 1. TOP KPI CARDS (Matches Obligation Dashboard Style) */}
      <div className="sos-clean-kpi-grid">
        {/* Card 1: Total Contract Amount */}
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
            <Landmark size={20} style={{ color: '#166534' }} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
              Total Contracted Amount ({filteredContracts.length} Contracts):
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
              {formatCurrency(totals.contractAmount)}
            </div>
          </div>
        </div>

        {/* Card 2: Total Site Units Delivered */}
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
              Total Units Distributed ({filteredDeliveries.length} Site Drops):
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
              {formatNumber(totals.siteUnits)}{' '}
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>units</span>
            </div>
          </div>
        </div>

        {/* Card 3: Coverage & Suppliers */}
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
            <MapPin size={20} style={{ color: '#b45309' }} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
              Regional Coverage &amp; Vendors:
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
              {totals.provinces} Provinces • {totals.suppliers} Suppliers
            </div>
          </div>
        </div>
      </div>

      {/* 2. VISUAL OVERVIEW SECTION */}
      <div className="sos-clean-charts-grid">
        {/* Left: Units Delivered by Province */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Units Delivered by Province
              </h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                Click any province bar to filter the table below
              </p>
            </div>
            {selectedProvince !== 'All Provinces' && (
              <button
                onClick={() => {
                  setSelectedProvince('All Provinces');
                  setPage(1);
                }}
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#166534',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 6,
                  padding: '4px 10px',
                  cursor: 'pointer',
                }}
              >
                Showing: {selectedProvince} ×
              </button>
            )}
          </div>

          <div style={{ height: 340, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={provinceChartData}
                margin={{ top: 10, right: 6, left: -12, bottom: 5 }}
                onClick={(state: any) => {
                  if (state && state.activeLabel) {
                    const clicked = state.activeLabel as Exclude<ProvinceName, 'All Provinces'>;
                    setSelectedProvince((prev) => (prev === clicked ? 'All Provinces' : clicked));
                    setPage(1);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="province"
                  tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  formatter={(value: any, name: any) => [formatNumber(Number(value || 0)) + ' units', String(name)]}
                />
                <Legend
                  layout="vertical"
                  verticalAlign="top"
                  align="right"
                  iconType="square"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: 10,
                    lineHeight: '17px',
                    paddingLeft: 8,
                  }}
                />
                {(Object.keys(CATEGORY_COLORS) as Exclude<InputCategoryName, 'All Categories'>[]).map(
                  (cat) => (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      stackId="a"
                      fill={CATEGORY_COLORS[cat]}
                      stroke="#ffffff"
                      strokeWidth={1}
                      barSize={52}
                      style={{ cursor: 'pointer' }}
                    />
                  )
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Contract Amount by Fund Source (Seamless Donut Chart) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Allocation by Fund Source
              </h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                Click a slice or item to filter contracts and deliveries
              </p>
            </div>
            {selectedFundSource !== 'All Fund Sources' && (
              <button
                onClick={() => {
                  setSelectedFundSource('All Fund Sources');
                  setPage(1);
                }}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#166534',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 6,
                  padding: '4px 9px',
                  cursor: 'pointer',
                }}
              >
                Clear ×
              </button>
            )}
          </div>

          <div style={{ height: 220, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fundSourceBreakdown}
                  dataKey="amount"
                  nameKey="fundSource"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={98}
                  paddingAngle={0}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  onClick={(entry: any) => {
                    if (entry && entry.fundSource) {
                      setSelectedFundSource((prev) =>
                        prev === entry.fundSource ? 'All Fund Sources' : (entry.fundSource as FundSourceName)
                      );
                      setPage(1);
                    }
                  }}
                  style={{ cursor: 'pointer', outline: 'none' }}
                >
                  {fundSourceBreakdown.map((entry, idx) => (
                    <Cell
                      key={entry.fundSource}
                      fill={DONUT_COLORS[idx % DONUT_COLORS.length]}
                      opacity={
                        selectedFundSource === 'All Fund Sources' ||
                        selectedFundSource === entry.fundSource
                          ? 1
                          : 0.35
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value || 0))}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '6px 12px',
              marginTop: 8,
              paddingTop: 10,
              borderTop: '1px solid #f1f5f9',
            }}
          >
            {fundSourceBreakdown.map((fs, idx) => {
              const isSelected = selectedFundSource === fs.fundSource;
              const sliceColor = DONUT_COLORS[idx % DONUT_COLORS.length];
              return (
                <div
                  key={fs.fundSource}
                  onClick={() => {
                    setSelectedFundSource(isSelected ? 'All Fund Sources' : (fs.fundSource as FundSourceName));
                    setPage(1);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6,
                    fontSize: 11,
                    padding: '4px 6px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: isSelected ? '#f0fdf4' : 'transparent',
                    border: isSelected ? '1px solid #bbf7d0' : '1px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        flexShrink: 0,
                        backgroundColor: sliceColor,
                      }}
                    />
                    <span
                      style={{
                        fontWeight: isSelected ? 700 : 500,
                        color: '#334155',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={fs.fundSource}
                    >
                      {fs.fundSource}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#0f172a', flexShrink: 0 }}>
                    {fs.sharePct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. DETAILS TABLE CARD (Matches Obligation Dashboard Table Style) */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Table Header & Inline Filters */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: '#f8fafc',
          }}
        >
          {/* Left: Clean View Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setTableView('deliveries')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                borderRadius: 8,
                border: '1px solid',
                borderColor: tableView === 'deliveries' ? '#166534' : '#cbd5e1',
                background: tableView === 'deliveries' ? '#166534' : '#ffffff',
                color: tableView === 'deliveries' ? '#ffffff' : '#334155',
                cursor: 'pointer',
              }}
            >
              <Truck size={14} />
              Delivery Sites ({filteredDeliveries.length})
            </button>
            <button
              type="button"
              onClick={() => setTableView('contracts')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                borderRadius: 8,
                border: '1px solid',
                borderColor: tableView === 'contracts' ? '#166534' : '#cbd5e1',
                background: tableView === 'contracts' ? '#166534' : '#ffffff',
                color: tableView === 'contracts' ? '#ffffff' : '#334155',
                cursor: 'pointer',
              }}
            >
              <FileText size={14} />
              Procurement Contracts ({filteredContracts.length})
            </button>
          </div>

          {/* Right: Compact Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search product, supplier, site..."
                style={{
                  padding: '6px 10px 6px 30px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  outline: 'none',
                  width: 200,
                }}
              />
            </div>

            <select
              value={selectedProvince}
              onChange={(e) => {
                setSelectedProvince(e.target.value as ProvinceName);
                setPage(1);
              }}
              style={{
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
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
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value as InputCategoryName);
                setPage(1);
              }}
              style={{
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              <option value="All Categories">All Categories</option>
              {(Object.keys(CATEGORY_COLORS) as Exclude<InputCategoryName, 'All Categories'>[]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={selectedFundSource}
              onChange={(e) => {
                setSelectedFundSource(e.target.value as FundSourceName);
                setPage(1);
              }}
              style={{
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
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
                setPage(1);
              }}
              style={{
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              <option value="All Seasons">All Seasons</option>
              {SEASON_LIST.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Table Body */}
        {tableView === 'deliveries' ? (
          <div style={{ overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th
                    onClick={() => toggleDeliverySort('province')}
                    style={{ padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Province <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleDeliverySort('municipality')}
                    style={{ padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Municipality / Drop-off <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleDeliverySort('product')}
                    style={{ padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Product &amp; Category <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Supplier &amp; Fund Source</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Season</th>
                  <th
                    onClick={() => toggleDeliverySort('quantity')}
                    style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Quantity <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Unit</th>
                </tr>
              </thead>
              <tbody>
                {sortedDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>
                      No delivery sites match your selected filters.
                    </td>
                  </tr>
                ) : (
                  sortedDeliveries.map((d, idx) => (
                    <tr
                      key={`${d.row}-${d.province}-${d.municipality}-${d.product}-${idx}`}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {d.province}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                        {d.municipality}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#166534' }}>{d.product}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{d.category}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>{d.supplier}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {d.fundSource} {d.ibNo ? `• IB ${d.ibNo}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            background: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0',
                          }}
                        >
                          {d.season}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {formatNumber(d.quantity)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>{d.unit}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
                  <td colSpan={5} style={{ padding: '12px 14px', color: '#0f172a' }}>
                    Total ({sortedDeliveries.length} Delivery Drops):
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#166534', fontSize: 13 }}>
                    {formatNumber(totals.siteUnits)}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>units</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th
                    onClick={() => toggleContractSort('fundSource')}
                    style={{ padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Fund Source <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>IB / NTP No.</th>
                  <th
                    onClick={() => toggleContractSort('supplier')}
                    style={{ padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Supplier <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleContractSort('product')}
                    style={{ padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Product &amp; Category <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleContractSort('ntpQty')}
                    style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      NTP Qty <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleContractSort('amount')}
                    style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Contract Amount <ArrowUpDown size={12} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedContracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>
                      No contracts match your selected filters.
                    </td>
                  </tr>
                ) : (
                  sortedContracts.map((c, idx) => (
                    <tr
                      key={`${c.row}-${c.product}-${c.ibNo}`}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                        {c.fundSource}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>
                        <div>{c.ibNo || '—'}</div>
                        {c.ntpNo && (
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#b45309' }}>{c.ntpNo}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                        {c.supplier}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#166534' }}>{c.product}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{c.category}</div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                        {formatNumber(c.ntpQty)} <span style={{ fontSize: 11, color: '#94a3b8' }}>{c.unit}</span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {c.amount > 0 ? formatCurrency(c.amount) : 'Bundled / ₱0.00'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
                  <td colSpan={4} style={{ padding: '12px 14px', color: '#0f172a' }}>
                    Total ({sortedContracts.length} Contracts):
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#334155' }}>
                    {formatNumber(totals.ntpQty)} units
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#166534', fontSize: 13 }}>
                    {formatCurrency(totals.contractAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
