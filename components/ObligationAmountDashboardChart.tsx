'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check } from 'lucide-react';

export type WeekKey =
  | 'Nov 4th Week'
  | 'Dec Week 1'
  | 'Dec W2'
  | 'Dec W3'
  | 'Dec W4';

export type ScopeMode = 'COMPARE' | 'CURRENT' | 'CONTINUING';
export type ViewMode = 'BAR_BREAKDOWN' | 'WEEKLY_PROGRESSION';

export interface PapObligationDatum {
  code: 'PSS' | 'ESETS' | 'RD' | 'INS' | 'TOTAL';
  name: string;
  currentRate: number; // e.g. 39.1
  continuingRate: number; // e.g. 60.9
  sharePercent: number; // e.g. 32.55
  currentAmount: number; // in PHP
  continuingAmount: number; // in PHP
  totalAllotment: number; // in PHP
  allotFormatted: string; // e.g. '₱9.55M'
}

export type WeeklyObligationDataset = Record<WeekKey, PapObligationDatum[]>;

const createBlankWeekData = (): PapObligationDatum[] => [
  {
    code: 'PSS',
    name: 'PSS RICE',
    currentRate: 0.0,
    continuingRate: 0.0,
    sharePercent: 0.0,
    currentAmount: 0.0,
    continuingAmount: 0.0,
    totalAllotment: 0.0,
    allotFormatted: '₱0.00',
  },
  {
    code: 'ESETS',
    name: 'ESETS RICE',
    currentRate: 0.0,
    continuingRate: 0.0,
    sharePercent: 0.0,
    currentAmount: 0.0,
    continuingAmount: 0.0,
    totalAllotment: 0.0,
    allotFormatted: '₱0.00',
  },
  {
    code: 'RD',
    name: 'RD RICE',
    currentRate: 0.0,
    continuingRate: 0.0,
    sharePercent: 0.0,
    currentAmount: 0.0,
    continuingAmount: 0.0,
    totalAllotment: 0.0,
    allotFormatted: '₱0.00',
  },
  {
    code: 'INS',
    name: 'INS RICE',
    currentRate: 0.0,
    continuingRate: 0.0,
    sharePercent: 0.0,
    currentAmount: 0.0,
    continuingAmount: 0.0,
    totalAllotment: 0.0,
    allotFormatted: '₱0.00',
  },
  {
    code: 'TOTAL',
    name: 'TOTAL',
    currentRate: 0.0,
    continuingRate: 0.0,
    sharePercent: 0.0,
    currentAmount: 0.0,
    continuingAmount: 0.0,
    totalAllotment: 0.0,
    allotFormatted: '₱0.00',
  },
];

// Baseline verified data dictionary for all 5 reporting periods
export const DEFAULT_WEEKLY_OBLIGATION_DATA: WeeklyObligationDataset = {
  'Nov 4th Week': [
    {
      code: 'PSS',
      name: 'PSS RICE',
      currentRate: 39.1,
      continuingRate: 60.9,
      sharePercent: 32.55,
      currentAmount: 3736800.0,
      continuingAmount: 5815000.0,
      totalAllotment: 9551800.0,
      allotFormatted: '₱9.55M',
    },
    {
      code: 'ESETS',
      name: 'ESETS RICE',
      currentRate: 97.1,
      continuingRate: 2.9,
      sharePercent: 46.33,
      currentAmount: 13202735.38,
      continuingAmount: 394495.0,
      totalAllotment: 13597230.38,
      allotFormatted: '₱13.60M',
    },
    {
      code: 'RD',
      name: 'RD RICE',
      currentRate: 0.0,
      continuingRate: 0.0,
      sharePercent: 0.0,
      currentAmount: 0.0,
      continuingAmount: 0.0,
      totalAllotment: 0.0,
      allotFormatted: '₱0.00',
    },
    {
      code: 'INS',
      name: 'INS RICE',
      currentRate: 100.0,
      continuingRate: 0.0,
      sharePercent: 21.13,
      currentAmount: 6200000.0,
      continuingAmount: 0.0,
      totalAllotment: 6200000.0,
      allotFormatted: '₱6.20M',
    },
    {
      code: 'TOTAL',
      name: 'TOTAL',
      currentRate: 78.8,
      continuingRate: 21.2,
      sharePercent: 100.0,
      currentAmount: 23139535.38,
      continuingAmount: 6209495.0,
      totalAllotment: 29349030.38,
      allotFormatted: '₱29.35M',
    },
  ],
  'Dec Week 1': createBlankWeekData(),
  'Dec W2': createBlankWeekData(),
  'Dec W3': createBlankWeekData(),
  'Dec W4': createBlankWeekData(),
};

const formatCurrencyFull = (val: number) => {
  return `₱${val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Smooth animated number hook
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

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  type: 'Current' | 'Continuing';
  rate: number;
  amount: number;
}

interface Props {
  items?: PapObligationDatum[];
  weeklyData?: WeeklyObligationDataset;
  activePapFilter?: string;
  onSelectPap?: (pap: string) => void;
  cardStyle?: React.CSSProperties;
}

export default function ObligationAmountDashboardChart({
  items,
  weeklyData = DEFAULT_WEEKLY_OBLIGATION_DATA,
  activePapFilter,
  onSelectPap,
  cardStyle,
}: Props) {
  const [selectedWeek, setSelectedWeek] = useState<WeekKey>('Nov 4th Week');
  const [scopeFilter, setScopeFilter] = useState<ScopeMode>('COMPARE');
  const [includeTotalBenchmark, setIncludeTotalBenchmark] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('BAR_BREAKDOWN');

  // Crisp hover tooltip state
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    type: 'Current',
    rate: 0,
    amount: 0,
  });

  const weekKeys: WeekKey[] = [
    'Nov 4th Week',
    'Dec Week 1',
    'Dec W2',
    'Dec W3',
    'Dec W4',
  ];

  // Active items: if dynamic items are provided from parent, use them; otherwise use selected week
  const baseItems = useMemo(() => {
    if (items && items.length > 0) {
      return items;
    }
    return weeklyData[selectedWeek] || weeklyData['Nov 4th Week'];
  }, [items, weeklyData, selectedWeek]);

  const activeWeekItems = useMemo(() => {
    if (includeTotalBenchmark) {
      return baseItems;
    }
    return baseItems.filter((i) => i.code !== 'TOTAL');
  }, [baseItems, includeTotalBenchmark]);

  const DBM_BENCHMARK = 80.0;
  const chartHeight = 250;
  const maxScale = 100;

  const getColumnHeight = (rateVal: number) => {
    const clamped = Math.min(100, Math.max(0, rateVal));
    return Math.max(6, (clamped / maxScale) * (chartHeight - 40));
  };

  const benchmarkBottom = (DBM_BENCHMARK / maxScale) * (chartHeight - 40);

  const handleBarMouseEnter = (
    e: React.MouseEvent,
    title: string,
    type: 'Current' | 'Continuing',
    rate: number,
    amount: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      title,
      type,
      rate,
      amount,
    });
  };

  const handleBarMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: '24px 28px',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        ...cardStyle,
      }}
    >
      {/* 1. Header & Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: 18,
        }}
      >
        {/* Left: Title */}
        <div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#0F172A',
              margin: 0,
              letterSpacing: '-0.3px',
            }}
          >
            Amount for Obligation
          </h2>
        </div>

        {/* Right: Scope Filter & Benchmark Checkbox */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 10,
          }}
        >
          {/* Scope Segmented Toggle */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: 3,
              gap: 2,
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: '#64748B',
                padding: '0 8px',
                letterSpacing: '0.3px',
              }}
            >
              SCOPE:
            </span>
            {[
              { id: 'COMPARE', label: 'Current vs Continuing' },
              { id: 'CURRENT', label: 'Current' },
              { id: 'CONTINUING', label: 'Continuing' },
            ].map((tab) => {
              const isSel = scopeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScopeFilter(tab.id as ScopeMode)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11.5,
                    fontWeight: isSel ? 700 : 500,
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: isSel ? '#0B6B3A' : 'transparent',
                    color: isSel ? '#FFFFFF' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Benchmark Checkbox */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: '#475569',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={includeTotalBenchmark}
              onChange={(e) => setIncludeTotalBenchmark(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#0B6B3A' }}
            />
            <span>Total</span>
          </label>
        </div>
      </div>

      {viewMode === 'BAR_BREAKDOWN' ? (
        /* 2. & 3. Legend, Benchmark Line & Grouped Column Chart */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Legend */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {(scopeFilter === 'COMPARE' || scopeFilter === 'CURRENT') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: '#0B6B3A',
                  }}
                />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>
                  Current Appropriations (Col Q)
                </span>
              </div>
            )}
            {(scopeFilter === 'COMPARE' || scopeFilter === 'CONTINUING') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: '#D99B00',
                  }}
                />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>
                  Continuing Appropriations (Col R)
                </span>
              </div>
            )}
          </div>

          {/* Chart Canvas Wrap */}
          <div
            style={{
              width: '100%',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: 6,
            }}
          >
            <div style={{ minWidth: 620, position: 'relative' }}>
              {/* Canvas Area with Y-Axis */}
              <div
                style={{
                  position: 'relative',
                  height: chartHeight,
                  paddingLeft: 44,
                  paddingRight: 76,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                {/* Horizontal Gridlines & Y-Axis Labels */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    pointerEvents: 'none',
                  }}
                >
                  {[100, 75, 50, 25, 0].map((pct) => {
                    const btm = (pct / maxScale) * (chartHeight - 40);
                    return (
                      <div
                        key={pct}
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: `${btm}px`,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            width: 38,
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#94A3B8',
                            textAlign: 'right',
                            paddingRight: 6,
                          }}
                        >
                          {pct}%
                        </span>
                        <div
                          style={{
                            flex: 1,
                            borderBottom:
                              pct === 0 ? '1px solid #CBD5E1' : '1px dashed #F1F5F9',
                          }}
                        />
                      </div>
                    );
                  })}

                  {/* 80% Benchmark Reference Line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 44,
                      right: 0,
                      bottom: `${benchmarkBottom}px`,
                      borderBottom: '2px dashed #DC2626',
                      zIndex: 4,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        right: 4,
                        bottom: 3,
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        color: '#DC2626',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      80% Target
                    </span>
                  </div>
                </div>

                {/* Vertical Column Groups */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${activeWeekItems.length}, 1fr)`,
                    gap: 16,
                    alignItems: 'end',
                    height: '100%',
                    position: 'relative',
                    zIndex: 2,
                    paddingBottom: 2,
                  }}
                >
                  {activeWeekItems.map((item) => {
                    const isTotal = item.code === 'TOTAL';
                    const isFilteredOut = Boolean(
                      activePapFilter &&
                        activePapFilter !== 'All' &&
                        item.code !== 'TOTAL' &&
                        item.code.toUpperCase() !== activePapFilter.toUpperCase()
                    );

                    return (
                      <AnimatedColumnBars
                        key={item.code}
                        item={item}
                        scopeFilter={scopeFilter}
                        isFilteredOut={isFilteredOut}
                        getColumnHeight={getColumnHeight}
                        onMouseEnter={handleBarMouseEnter}
                        onMouseLeave={handleBarMouseLeave}
                        onSelect={() => onSelectPap && onSelectPap(item.code === 'TOTAL' ? 'All' : item.code)}
                      />
                    );
                  })}
                </div>
              </div>

              {/* X-Axis Category Footers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${activeWeekItems.length}, 1fr)`,
                  gap: 16,
                  textAlign: 'center',
                  paddingLeft: 44,
                  paddingRight: 76,
                  marginTop: 8,
                }}
              >
                {activeWeekItems.map((item) => {
                  const isTotal = item.code === 'TOTAL';
                  const isFilteredOut = Boolean(
                    activePapFilter &&
                      activePapFilter !== 'All' &&
                      item.code !== 'TOTAL' &&
                      item.code.toUpperCase() !== activePapFilter.toUpperCase()
                  );

                  return (
                    <AnimatedColumnFooter
                      key={item.code}
                      item={item}
                      isTotal={isTotal}
                      isFilteredOut={isFilteredOut}
                      scopeFilter={scopeFilter}
                      onSelect={() => onSelectPap && onSelectPap(item.code === 'TOTAL' ? 'All' : item.code)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Weekly Progression Comparison View */
        <WeeklyProgressionMatrix
          weeklyData={weeklyData}
          weekKeys={weekKeys}
          selectedWeek={selectedWeek}
          onSelectWeek={setSelectedWeek}
          includeTotalBenchmark={includeTotalBenchmark}
        />
      )}

      {/* Floating Hover Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '7px 12px',
            borderRadius: 6,
            fontSize: 11.5,
            pointerEvents: 'none',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 700, color: '#F8FAFC', borderBottom: '1px solid #334155', paddingBottom: 3 }}>
            {tooltip.title} — {tooltip.type}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 2 }}>
            <span style={{ color: '#94A3B8' }}>Rate:</span>
            <span style={{ fontWeight: 700, color: tooltip.type === 'Current' ? '#4ADE80' : '#FACC15' }}>
              {tooltip.rate.toFixed(1)}%
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: '#94A3B8' }}>Amount:</span>
            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>
              {formatCurrencyFull(tooltip.amount)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Column Bars with smooth 60fps heights and percentages
function AnimatedColumnBars({
  item,
  scopeFilter,
  isFilteredOut,
  getColumnHeight,
  onMouseEnter,
  onMouseLeave,
  onSelect,
}: {
  item: PapObligationDatum;
  scopeFilter: ScopeMode;
  isFilteredOut: boolean;
  getColumnHeight: (val: number) => number;
  onMouseEnter: (e: React.MouseEvent, title: string, type: 'Current' | 'Continuing', rate: number, amount: number) => void;
  onMouseLeave: () => void;
  onSelect?: () => void;
}) {
  const animCurrentRate = useAnimatedNumber(item.currentRate, 550);
  const animContinuingRate = useAnimatedNumber(item.continuingRate, 550);

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100%',
        justifyContent: 'flex-end',
        padding: '0 4px',
        opacity: isFilteredOut ? 0.25 : 1,
        transition: 'opacity 0.4s ease',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
          width: '75%',
          maxWidth: 88,
          height: '100%',
          justifyContent: 'center',
        }}
      >
        {/* Bar 1 (Forest Green): CURRENT (Col Q) */}
        {(scopeFilter === 'COMPARE' || scopeFilter === 'CURRENT') && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%',
              justifyContent: 'flex-end',
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#0B6B3A',
                marginBottom: 4,
                whiteSpace: 'nowrap',
              }}
            >
              {animCurrentRate.toFixed(1)}%
            </span>
            <div
              onMouseEnter={(e) => onMouseEnter(e, item.name, 'Current', item.currentRate, item.currentAmount)}
              onMouseLeave={onMouseLeave}
              style={{
                width: '100%',
                height: getColumnHeight(item.currentRate),
                backgroundColor: '#0B6B3A',
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.55s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
              }}
            />
          </div>
        )}

        {/* Bar 2 (Gold): CONTINUING (Col R) */}
        {(scopeFilter === 'COMPARE' || scopeFilter === 'CONTINUING') && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%',
              justifyContent: 'flex-end',
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#D99B00',
                marginBottom: 4,
                whiteSpace: 'nowrap',
              }}
            >
              {animContinuingRate.toFixed(1)}%
            </span>
            <div
              onMouseEnter={(e) => onMouseEnter(e, item.name, 'Continuing', item.continuingRate, item.continuingAmount)}
              onMouseLeave={onMouseLeave}
              style={{
                width: '100%',
                height: getColumnHeight(item.continuingRate),
                backgroundColor: '#D99B00',
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.55s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Subcomponent: Column Footer with Share Badge and Allotment
function AnimatedColumnFooter({
  item,
  isTotal,
  isFilteredOut,
  scopeFilter = 'COMPARE',
  onSelect,
}: {
  item: PapObligationDatum;
  isTotal: boolean;
  isFilteredOut: boolean;
  scopeFilter?: ScopeMode;
  onSelect?: () => void;
}) {
  const animShare = useAnimatedNumber(item.sharePercent, 550);
  const animAllot = useAnimatedNumber(item.totalAllotment, 550);
  const animCurrentRate = useAnimatedNumber(item.currentRate, 550);
  const animContinuingRate = useAnimatedNumber(item.continuingRate, 550);

  const formatShort = (amount: number): string => {
    if (Math.abs(amount) >= 1_000_000_000) {
      return `₱${(amount / 1_000_000_000).toFixed(2)}B`;
    }
    if (Math.abs(amount) >= 1_000_000) {
      return `₱${(amount / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `₱${(amount / 1_000).toFixed(1)}K`;
    }
    return `₱${amount.toFixed(2)}`;
  };

  const totalBadgeLabel = () => {
    if (scopeFilter === 'CURRENT') {
      return `${animCurrentRate.toFixed(1)}% Current`;
    }
    if (scopeFilter === 'CONTINUING') {
      return `${animContinuingRate.toFixed(1)}% Continuing`;
    }
    return `${animCurrentRate.toFixed(1)}% Cur • ${animContinuingRate.toFixed(1)}% Cont`;
  };

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        backgroundColor: isTotal ? '#F0FDF4' : 'transparent',
        border: isTotal ? '1px solid #BBF7D0' : 'none',
        borderRadius: 8,
        padding: isTotal ? '6px 4px' : '4px',
        opacity: isFilteredOut ? 0.25 : 1,
        transition: 'all 0.4s ease',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 800,
          color: isTotal ? '#0B6B3A' : '#0F172A',
          letterSpacing: '-0.1px',
        }}
      >
        {item.name}
      </span>

      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: isTotal ? '#0B6B3A' : '#475569',
          backgroundColor: isTotal ? '#ECFDF5' : '#F1F5F9',
          padding: '1px 8px',
          borderRadius: 6,
          border: isTotal ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
          transition: 'all 0.3s ease',
          whiteSpace: 'nowrap',
        }}
      >
        {isTotal ? totalBadgeLabel() : `${animShare.toFixed(2)}% Total`}
      </span>

      <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
        Allot: {formatShort(animAllot)}
      </span>
    </div>
  );
}

// Subcomponent: Multi-Week Progression Comparison View
function WeeklyProgressionMatrix({
  weeklyData,
  weekKeys,
  selectedWeek,
  onSelectWeek,
  includeTotalBenchmark,
}: {
  weeklyData: WeeklyObligationDataset;
  weekKeys: WeekKey[];
  selectedWeek: WeekKey;
  onSelectWeek: (w: WeekKey) => void;
  includeTotalBenchmark: boolean;
}) {
  const programs = ['PSS RICE', 'ESETS RICE', 'RD RICE', 'INS RICE'];
  if (includeTotalBenchmark) {
    programs.push('TOTAL');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
        Multi-Week Progress Trends (Nov 4th Week through Dec W4):
      </div>

      <div
        style={{
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>Category</th>
              {weekKeys.map((w) => (
                <th
                  key={w}
                  onClick={() => onSelectWeek(w)}
                  style={{
                    padding: '10px 14px',
                    fontWeight: 700,
                    color: selectedWeek === w ? '#0B6B3A' : '#475569',
                    backgroundColor: selectedWeek === w ? '#F0FDF4' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {w} {selectedWeek === w && <Check size={11} style={{ display: 'inline', marginLeft: 2 }} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {programs.map((prog, idx) => {
              const isTotal = prog === 'TOTAL';
              return (
                <tr
                  key={prog}
                  style={{
                    borderBottom: idx === programs.length - 1 ? 'none' : '1px solid #F1F5F9',
                    backgroundColor: isTotal ? '#F0FDF4' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                  }}
                >
                  <td style={{ padding: '10px 14px', fontWeight: isTotal ? 800 : 700, color: isTotal ? '#0B6B3A' : '#0F172A' }}>
                    {prog}
                  </td>
                  {weekKeys.map((w) => {
                    const row = (weeklyData[w] || []).find((p) => p.name === prog);
                    const isColActive = selectedWeek === w;
                    return (
                      <td
                        key={w}
                        style={{
                          padding: '10px 14px',
                          textAlign: 'center',
                          backgroundColor: isColActive ? (isTotal ? '#DCFCE7' : '#F8FAFC') : 'transparent',
                        }}
                      >
                        {row && row.totalAllotment > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <span style={{ fontWeight: 700, color: '#0B6B3A' }}>
                              {row.currentRate.toFixed(1)}% <span style={{ color: '#94A3B8' }}>/</span>{' '}
                              <span style={{ color: '#D99B00' }}>{row.continuingRate.toFixed(1)}%</span>
                            </span>
                            <span style={{ fontSize: 10.5, color: '#64748B' }}>
                              {row.allotFormatted}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontWeight: 500 }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
