'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  BarChart2,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  Lock,
} from 'lucide-react';

export interface ObligationCategoryItem {
  id: string;
  name: string;
  // Allotment: Current, Continuing, Total
  allocation?: number | null;
  continuingAlloc?: number | null;
  totalAlloc?: number | null;
  // Obligation: Current, Continuing, Total
  obligated?: number | null;
  continuingOblig?: number | null;
  totalOblig?: number | null;
  // Unobligated: Current, Continuing, Total
  unobligated?: number | null;
  unobligatedCurrent?: number | null;
  unobligatedContinuing?: number | null;
  unobligatedTotal?: number | null;
  // Rates: Current, Continuing, Total
  rate?: number | null;
  rateContinuing?: number | null;
  rateTotal?: number | null;
}

interface ObligationBudgetClientProps {
  obligationCategories?: ObligationCategoryItem[];
  disbursementCategories?: ObligationCategoryItem[];
  totalBannerRice?: ObligationCategoryItem;
  isLiveLoading?: boolean;
  canEditBudget?: boolean;
}

const DEFAULT_TOTAL_BANNER_RICE: ObligationCategoryItem = {
  id: 'total_rice',
  name: 'TOTAL BANNER RICE',
  // Allotment: Current (H61), Continuing (I61), Total (J61)
  allocation: 645448159.0,
  continuingAlloc: 66896760.38,
  totalAlloc: 712344919.38,
  // Obligation: Current (K61), Continuing (L61), Total (M61)
  obligated: 577014414.38,
  continuingOblig: 18039864.38,
  totalOblig: 595054278.76,
  // Unobligated: Current (N61), Continuing (O61), Total (P61)
  unobligated: 68433744.62,
  unobligatedCurrent: 68433744.62,
  unobligatedContinuing: 48856896.0,
  unobligatedTotal: 117290640.62,
  // Rates (%): Current (Q61), Continuing (R61), Total (S61)
  rate: 89.40,
  rateContinuing: 26.97,
  rateTotal: 83.53,
};

const DEFAULT_BLANK_CATEGORIES: ObligationCategoryItem[] = [
  { id: 'pss', name: 'PSS RICE' },
  { id: 'esets', name: 'ESETS RICE' },
  { id: 'rd', name: 'RD RICE' },
  { id: 'ins', name: 'INS RICE' },
];

const GOOGLE_SHEET_REF_URL =
  'https://docs.google.com/spreadsheets/d/1lQW1zRdcR4hS2-VNqv0HVN-aQojcix2Nrc-bpeuMIAk/edit?gid=262455718#gid=262455718';

function formatMoney(amount: number): string {
  return amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatShortMoney(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `₱${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `₱${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `₱${(amount / 1_000).toFixed(1)}K`;
  }
  return `₱${amount.toFixed(2)}`;
}

export function getRiceReportCategory(catNameOrId?: string): string {
  if (!catNameOrId) return 'ALL RICE (GRAND TOTAL)';
  const s = catNameOrId.toUpperCase();
  if (s.includes('INS')) return 'INS RICE';
  if (s.includes('FPMA') || s.includes('STO')) return 'ALL RICE (GRAND TOTAL)';
  if (s.includes('PSS')) return 'PSS RICE';
  if (s.includes('ESETS')) return 'ESETS RICE';
  if (s.includes('RD') || s.includes('RESEARCH')) return 'RD RICE';
  return 'ALL RICE (GRAND TOTAL)';
}

export type PillarType = 'ALLOTMENT_OBLIGATION' | 'ALLOTMENT' | 'OBLIGATION' | 'UNOBLIGATED';
export type ScopeType = 'TOTAL' | 'CURRENT' | 'CONTINUING' | 'ALL';

// -------------------------------------------------------------
// 1. PILLAR CARD COMPONENT (Donut Gauges with Executive Styling)
// -------------------------------------------------------------
interface PillarCardProps {
  id: string;
  pillar: PillarType;
  title: string;
  subtitle: string;
  categories: ObligationCategoryItem[];
  scope: ScopeType;
  onScopeChange: (scope: ScopeType) => void;
  showSyncBadge?: boolean;
  isSyncing?: boolean;
  lastSyncedText?: string;
  onManualSync?: () => void;
}

function PillarBudgetCard({
  id,
  pillar,
  title,
  subtitle,
  categories,
  scope,
  onScopeChange,
}: PillarCardProps) {
  const size = 76;
  const strokeWidth = 8;
  const radius = 31;
  const circumference = 2 * Math.PI * radius; // ~194.78

  const pillarTheme = {
    ALLOTMENT_OBLIGATION: {
      primaryColor: '#1c2821',
      lightBg: '#f6faf7',
      borderColor: '#d7e4d8',
      headerBorder: '#005a2b',
      badgeBg: '#eaf4ec',
      badgeText: '#005a2b',
      ringBase: '#005a2b',
      ringFill: '#f9b217',
      badgeLabel: 'Allotment Ceiling vs Committed Obligations',
    },
    ALLOTMENT: {
      primaryColor: '#136c38',
      lightBg: '#f6faf7',
      borderColor: '#d7e4d8',
      headerBorder: '#136c38',
      badgeBg: '#eaf4ec',
      badgeText: '#136c38',
      ringBase: '#e2ece4',
      ringFill: '#136c38',
      badgeLabel: 'Approved Allotment Ceiling',
    },
    OBLIGATION: {
      primaryColor: '#b45309',
      lightBg: '#fffdfa',
      borderColor: '#f0e3cc',
      headerBorder: '#d97706',
      badgeBg: '#fef3c7',
      badgeText: '#92400e',
      ringBase: '#faebd7',
      ringFill: '#d97706',
      badgeLabel: 'Committed Funds Utilization',
    },
    UNOBLIGATED: {
      primaryColor: '#1d4ed8',
      lightBg: '#f8faff',
      borderColor: '#d5e2f7',
      headerBorder: '#2563eb',
      badgeBg: '#e0edff',
      badgeText: '#1e40af',
      ringBase: '#e3edfc',
      ringFill: '#2563eb',
      badgeLabel: 'Remaining Uncommitted Balance',
    },
  }[pillar];

  const bannerCategories = useMemo(() => {
    return categories.filter(
      (c) =>
        !c.name.toUpperCase().includes('FPMA') &&
        !c.name.toUpperCase().includes('STO') &&
        c.id !== 'sto'
    );
  }, [categories]);

  const totalAllocCurrent = bannerCategories.reduce((sum, c) => sum + (c.allocation || 0), 0);
  const totalAllocContinuing = bannerCategories.reduce((sum, c) => sum + (c.continuingAlloc || 0), 0);
  const totalAllocAll = bannerCategories.reduce((sum, c) => sum + (c.totalAlloc || (c.allocation || 0) + (c.continuingAlloc || 0)), 0);

  const totalObligCurrent = bannerCategories.reduce((sum, c) => sum + (c.obligated || 0), 0);
  const totalObligContinuing = bannerCategories.reduce((sum, c) => sum + (c.continuingOblig || 0), 0);
  const totalObligAll = bannerCategories.reduce((sum, c) => sum + (c.totalOblig || (c.obligated || 0) + (c.continuingOblig || 0)), 0);

  const totalUnobligCurrent = bannerCategories.reduce((sum, c) => sum + (c.unobligatedCurrent ?? c.unobligated ?? Math.max(0, (c.allocation || 0) - (c.obligated || 0))), 0);
  const totalUnobligContinuing = bannerCategories.reduce((sum, c) => sum + (c.unobligatedContinuing ?? Math.max(0, (c.continuingAlloc || 0) - (c.continuingOblig || 0))), 0);
  const totalUnobligAll = bannerCategories.reduce((sum, c) => sum + (c.unobligatedTotal ?? Math.max(0, (c.totalAlloc || 0) - (c.totalOblig || 0))), 0);

  const overallRateCurrent = totalAllocCurrent > 0 ? (totalObligCurrent / totalAllocCurrent) * 100 : 0;
  const overallRateContinuing = totalAllocContinuing > 0 ? (totalObligContinuing / totalAllocContinuing) * 100 : 0;
  const overallRateAll = totalAllocAll > 0 ? (totalObligAll / totalAllocAll) * 100 : 0;

  return (
    <div
      id={id}
      style={{
        backgroundColor: '#ffffff',
        border: `1px solid ${pillarTheme.borderColor}`,
        borderRadius: 12,
        padding: '24px 28px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: pillarTheme.headerBorder,
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 16,
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: 14,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#0f291e',
                margin: 0,
                letterSpacing: '0.2px',
                textTransform: 'uppercase',
              }}
            >
              {title}
            </h2>

            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: pillarTheme.badgeText,
                backgroundColor: pillarTheme.badgeBg,
                padding: '2px 8px',
                borderRadius: 6,
                letterSpacing: '0.2px',
              }}
            >
              {pillarTheme.badgeLabel}
            </span>
          </div>

          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{subtitle}</p>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}
        >
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', padding: '0 8px' }}>
            SCOPE:
          </span>
          {[
            { id: 'TOTAL', label: 'Total' },
            { id: 'CURRENT', label: 'Current' },
            { id: 'CONTINUING', label: 'Continuing' },
          ].map((item) => {
            const isSelected = scope === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onScopeChange(item.id as ScopeType)}
                style={{
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: isSelected ? 700 : 500,
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? pillarTheme.primaryColor : 'transparent',
                  color: isSelected ? '#ffffff' : '#475569',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          backgroundColor: pillarTheme.lightBg,
          border: `1px solid ${pillarTheme.borderColor}`,
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 20,
          fontSize: 12.5,
        }}
      >
        <span style={{ fontWeight: 800, color: pillarTheme.primaryColor, letterSpacing: '0.2px' }}>
          PROGRAM TOTAL SUMMARY:
        </span>

        {pillar === 'ALLOTMENT_OBLIGATION' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontWeight: 600 }}>
            {scope === 'CURRENT' ? (
              <>
                <span>
                  Current Allotment: <strong style={{ color: '#005a2b' }}>{formatShortMoney(totalAllocCurrent)}</strong>
                </span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span>
                  Current Obligated: <strong style={{ color: '#b45309' }}>{formatShortMoney(totalObligCurrent)}</strong> ({overallRateCurrent.toFixed(2)}%)
                </span>
              </>
            ) : scope === 'CONTINUING' ? (
              <>
                <span>
                  Continuing Allotment: <strong style={{ color: '#005a2b' }}>{formatShortMoney(totalAllocContinuing)}</strong>
                </span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span>
                  Continuing Obligated: <strong style={{ color: '#b45309' }}>{formatShortMoney(totalObligContinuing)}</strong> ({overallRateContinuing.toFixed(2)}%)
                </span>
              </>
            ) : (
              <>
                <span>
                  Total Allotment: <strong style={{ color: '#005a2b' }}>{formatShortMoney(totalAllocAll)}</strong>
                </span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span>
                  Obligated: <strong style={{ color: '#b45309' }}>{formatShortMoney(totalObligAll)}</strong> ({overallRateAll.toFixed(2)}%)
                </span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span>
                  Unobligated: <strong style={{ color: '#1d4ed8' }}>{formatShortMoney(totalUnobligAll)}</strong>
                </span>
              </>
            )}
          </div>
        )}

        {pillar === 'ALLOTMENT' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontWeight: 600 }}>
            <span>
              Current: <strong style={{ color: '#136c38' }}>{formatShortMoney(totalAllocCurrent)}</strong>
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span>
              Continuing: <strong style={{ color: '#b45309' }}>{formatShortMoney(totalAllocContinuing)}</strong>
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span>
              Total Allotment: <strong style={{ color: '#0f172a' }}>{formatShortMoney(totalAllocAll)}</strong>
            </span>
          </div>
        )}

        {pillar === 'OBLIGATION' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontWeight: 600 }}>
            <span>
              Current: <strong style={{ color: '#136c38' }}>{formatShortMoney(totalObligCurrent)}</strong> ({overallRateCurrent.toFixed(1)}%)
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span>
              Continuing: <strong style={{ color: '#b45309' }}>{formatShortMoney(totalObligContinuing)}</strong> ({overallRateContinuing.toFixed(1)}%)
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span>
              Total Obligated: <strong style={{ color: '#0f172a' }}>{formatShortMoney(totalObligAll)}</strong> ({overallRateAll.toFixed(1)}%)
            </span>
          </div>
        )}

        {pillar === 'UNOBLIGATED' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontWeight: 600 }}>
            <span>
              Current Balance: <strong style={{ color: '#1d4ed8' }}>{formatShortMoney(totalUnobligCurrent)}</strong>
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span>
              Continuing Balance: <strong style={{ color: '#b45309' }}>{formatShortMoney(totalUnobligContinuing)}</strong>
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span>
              Total Balance: <strong style={{ color: '#0f172a' }}>{formatShortMoney(totalUnobligAll)}</strong>
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 12,
        }}
        className="obligation-budget-grid"
      >
        {bannerCategories.map((cat) => {
          const allocCurrent = cat.allocation || 0;
          const allocContinuing = cat.continuingAlloc || 0;
          const allocTotal = cat.totalAlloc || (allocCurrent + allocContinuing);

          const obligCurrent = cat.obligated || 0;
          const obligContinuing = cat.continuingOblig || 0;
          const obligTotal = cat.totalOblig || (obligCurrent + obligContinuing);

          const unobligCurrent = cat.unobligatedCurrent ?? cat.unobligated ?? Math.max(0, allocCurrent - obligCurrent);
          const unobligContinuing = cat.unobligatedContinuing ?? Math.max(0, allocContinuing - obligContinuing);
          const unobligTotal = cat.unobligatedTotal ?? Math.max(0, allocTotal - obligTotal);

          const rateCurrent = cat.rate ?? (allocCurrent > 0 ? (obligCurrent / allocCurrent) * 100 : 0);
          const rateContinuing = cat.rateContinuing ?? (allocContinuing > 0 ? (obligContinuing / allocContinuing) * 100 : 0);
          const rateTotal = cat.rateTotal ?? (allocTotal > 0 ? (obligTotal / allocTotal) * 100 : 0);

          let gaugePercent = 0;
          let mainText = '';
          let subText = '';
          const ringColor = pillarTheme.ringFill;

          if (pillar === 'ALLOTMENT_OBLIGATION') {
            if (scope === 'CURRENT') {
              gaugePercent = Math.min(100, Math.max(0, rateCurrent));
              mainText = `${rateCurrent.toFixed(2)}%`;
              subText = 'Utilization';
            } else if (scope === 'CONTINUING') {
              gaugePercent = Math.min(100, Math.max(0, rateContinuing));
              mainText = `${rateContinuing.toFixed(2)}%`;
              subText = 'Utilization';
            } else {
              gaugePercent = Math.min(100, Math.max(0, rateTotal));
              mainText = `${rateTotal.toFixed(2)}%`;
              subText = 'Utilization';
            }
          } else if (pillar === 'ALLOTMENT') {
            if (scope === 'CURRENT') {
              const share = totalAllocCurrent > 0 ? (allocCurrent / totalAllocCurrent) * 100 : 0;
              gaugePercent = Math.min(100, Math.max(0, share));
              mainText = formatShortMoney(allocCurrent);
              subText = 'Current Alloc';
            } else if (scope === 'CONTINUING') {
              const share = totalAllocContinuing > 0 ? (allocContinuing / totalAllocContinuing) * 100 : 0;
              gaugePercent = Math.min(100, Math.max(0, share));
              mainText = formatShortMoney(allocContinuing);
              subText = 'Cont. Alloc';
            } else {
              const contShare = allocTotal > 0 ? (allocContinuing / allocTotal) * 100 : 0;
              gaugePercent = Math.min(100, Math.max(0, contShare));
              mainText = formatShortMoney(allocTotal);
              subText = 'Total Allotment';
            }
          } else if (pillar === 'OBLIGATION') {
            if (scope === 'CURRENT') {
              gaugePercent = Math.min(100, Math.max(0, rateCurrent));
              mainText = `${rateCurrent.toFixed(2)}%`;
              subText = 'Utilization';
            } else if (scope === 'CONTINUING') {
              gaugePercent = Math.min(100, Math.max(0, rateContinuing));
              mainText = `${rateContinuing.toFixed(2)}%`;
              subText = 'Utilization';
            } else {
              gaugePercent = Math.min(100, Math.max(0, rateTotal));
              mainText = `${rateTotal.toFixed(2)}%`;
              subText = 'Utilization';
            }
          } else if (pillar === 'UNOBLIGATED') {
            if (scope === 'CURRENT') {
              const unobRate = allocCurrent > 0 ? (unobligCurrent / allocCurrent) * 100 : 0;
              gaugePercent = Math.min(100, Math.max(0, unobRate));
              mainText = formatShortMoney(unobligCurrent);
              subText = `${unobRate.toFixed(1)}% Current`;
            } else if (scope === 'CONTINUING') {
              const unobRate = allocContinuing > 0 ? (unobligContinuing / allocContinuing) * 100 : 0;
              gaugePercent = Math.min(100, Math.max(0, unobRate));
              mainText = formatShortMoney(unobligContinuing);
              subText = `${unobRate.toFixed(1)}% Cont.`;
            } else {
              const unobRate = allocTotal > 0 ? (unobligTotal / allocTotal) * 100 : 0;
              gaugePercent = Math.min(100, Math.max(0, unobRate));
              mainText = formatShortMoney(unobligTotal);
              subText = 'Total Balance';
            }
          }

          const yellowArc = (gaugePercent / 100) * circumference;
          const targetReportCategory = getRiceReportCategory(cat.name || cat.id);
          const targetHref = `/rice/reports?category=${encodeURIComponent(targetReportCategory)}`;

          return (
            <Link
              key={cat.id}
              href={targetHref}
              title={`View ${cat.name} details in Rice Reports`}
              className="executive-gauge-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textDecoration: 'none',
                color: 'inherit',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '10px 12px',
                minWidth: 0,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: size,
                  height: size,
                  flexShrink: 0,
                }}
              >
                <svg
                  width={size}
                  height={size}
                  viewBox={`0 0 ${size} ${size}`}
                  style={{ transform: 'rotate(-90deg)', display: 'block' }}
                >
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={pillarTheme.ringBase}
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={ringColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={`${yellowArc} ${circumference}`}
                    strokeLinecap={pillar === 'ALLOTMENT_OBLIGATION' ? 'butt' : 'round'}
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                </svg>

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    textAlign: 'center',
                    padding: '0 2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: pillar === 'ALLOTMENT_OBLIGATION' ? 14 : 13,
                      fontWeight: 800,
                      color: pillar === 'ALLOTMENT_OBLIGATION' ? '#1c2821' : pillarTheme.primaryColor,
                      lineHeight: 1.1,
                      letterSpacing: '-0.3px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {mainText}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: pillar === 'ALLOTMENT_OBLIGATION' ? '#475569' : '#64748b',
                      marginTop: 2,
                      letterSpacing: '0.1px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {subText}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 3.5,
                  minWidth: 0,
                  flexGrow: 1,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4,
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: '#0f172a',
                      letterSpacing: '0.1px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {cat.name}
                  </span>
                  <ChevronRight size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
                </div>

                {pillar === 'ALLOTMENT_OBLIGATION' ? (
                  scope === 'CURRENT' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3.5, width: '100%', marginTop: 2 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 4,
                          fontSize: 10.5,
                          lineHeight: 1.35,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#005a2b', whiteSpace: 'nowrap' }}>Allotment:</span>
                        <span
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 800,
                            color: '#005a2b',
                            textAlign: 'right',
                            letterSpacing: '-0.2px',
                            whiteSpace: 'nowrap',
                          }}
                          title={`Current Allotment (Col H): ₱${formatMoney(allocCurrent)}`}
                        >
                          ₱{formatMoney(allocCurrent)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 4,
                          fontSize: 10.5,
                          lineHeight: 1.35,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>Obligated:</span>
                        <span
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 800,
                            color: '#b45309',
                            textAlign: 'right',
                            letterSpacing: '-0.2px',
                            whiteSpace: 'nowrap',
                          }}
                          title={`Current Obligation (Col K): ₱${formatMoney(obligCurrent)}`}
                        >
                          ₱{formatMoney(obligCurrent)}
                        </span>
                      </div>
                    </div>
                  ) : scope === 'CONTINUING' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3.5, width: '100%', marginTop: 2 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 4,
                          fontSize: 10.5,
                          lineHeight: 1.35,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#005a2b', whiteSpace: 'nowrap' }}>Allotment:</span>
                        <span
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 800,
                            color: '#005a2b',
                            textAlign: 'right',
                            letterSpacing: '-0.2px',
                            whiteSpace: 'nowrap',
                          }}
                          title={`Continuing Allotment (Col I): ₱${formatMoney(allocContinuing)}`}
                        >
                          ₱{formatMoney(allocContinuing)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 4,
                          fontSize: 10.5,
                          lineHeight: 1.35,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>Obligated:</span>
                        <span
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 800,
                            color: '#b45309',
                            textAlign: 'right',
                            letterSpacing: '-0.2px',
                            whiteSpace: 'nowrap',
                          }}
                          title={`Continuing Obligation (Col L): ₱${formatMoney(obligContinuing)}`}
                        >
                          ₱{formatMoney(obligContinuing)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3.5, width: '100%', marginTop: 2 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 4,
                          fontSize: 10.5,
                          lineHeight: 1.35,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#005a2b', whiteSpace: 'nowrap' }}>Allotment:</span>
                        <span
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 800,
                            color: '#005a2b',
                            textAlign: 'right',
                            letterSpacing: '-0.2px',
                            whiteSpace: 'nowrap',
                          }}
                          title={`Total Allotment (Col J): ₱${formatMoney(allocTotal)}`}
                        >
                          ₱{formatMoney(allocTotal)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 4,
                          fontSize: 10.5,
                          lineHeight: 1.35,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>Obligated:</span>
                        <span
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 800,
                            color: '#b45309',
                            textAlign: 'right',
                            letterSpacing: '-0.2px',
                            whiteSpace: 'nowrap',
                          }}
                          title={`Total Obligated (Col M): ₱${formatMoney(obligTotal)}`}
                        >
                          ₱{formatMoney(obligTotal)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 4,
                          fontSize: 10,
                          color: '#0f172a',
                          fontWeight: 700,
                          lineHeight: 1.35,
                          borderTop: '1px dashed #e2e8f0',
                          paddingTop: 3,
                          marginTop: 1,
                        }}
                      >
                        <span style={{ color: '#334155', flexShrink: 0, whiteSpace: 'nowrap' }}>Unobligated:</span>
                        <span
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 700,
                            color: '#1d4ed8',
                            whiteSpace: 'nowrap',
                            textAlign: 'right',
                            letterSpacing: '-0.3px',
                          }}
                          title={`Total Unobligated (Col P): ₱${formatMoney(unobligTotal)}`}
                        >
                          ₱{formatMoney(unobligTotal)}
                        </span>
                      </div>
                    </div>
                  )) : (
                  <>
                    {(scope === 'ALL' || scope === 'TOTAL' || scope === 'CURRENT') && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 4,
                          fontSize: 10.5,
                          color: '#0f172a',
                          fontWeight: 600,
                          lineHeight: 1.35,
                          minWidth: 0,
                        }}
                      >
                        <span style={{ color: '#64748b', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {scope === 'CURRENT' ? 'Balance:' : 'Current:'}
                        </span>
                        <span
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 700,
                            color: pillar === 'UNOBLIGATED' ? '#1e40af' : '#136c38',
                            whiteSpace: 'nowrap',
                            textAlign: 'right',
                            letterSpacing: '-0.3px',
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={`₱${formatMoney(
                            pillar === 'ALLOTMENT'
                              ? allocCurrent
                              : pillar === 'OBLIGATION'
                              ? obligCurrent
                              : unobligCurrent
                          )}`}
                        >
                          ₱
                          {formatMoney(
                            pillar === 'ALLOTMENT'
                              ? allocCurrent
                              : pillar === 'OBLIGATION'
                              ? obligCurrent
                              : unobligCurrent
                          )}
                        </span>
                      </div>
                    )}

                    {(scope === 'ALL' || scope === 'TOTAL' || scope === 'CONTINUING') && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 4,
                          fontSize: 10.5,
                          color: '#0f172a',
                          fontWeight: 600,
                          lineHeight: 1.35,
                          minWidth: 0,
                        }}
                      >
                        <span style={{ color: '#64748b', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {scope === 'CONTINUING' ? 'Balance:' : 'Continuing:'}
                        </span>
                        <span
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 700,
                            color: '#b45309',
                            whiteSpace: 'nowrap',
                            textAlign: 'right',
                            letterSpacing: '-0.3px',
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={`₱${formatMoney(
                            pillar === 'ALLOTMENT'
                              ? allocContinuing
                              : pillar === 'OBLIGATION'
                              ? obligContinuing
                              : unobligContinuing
                          )}`}
                        >
                          ₱
                          {formatMoney(
                            pillar === 'ALLOTMENT'
                              ? allocContinuing
                              : pillar === 'OBLIGATION'
                              ? obligContinuing
                              : unobligContinuing
                          )}
                        </span>
                      </div>
                    )}

                    {(scope === 'ALL' || scope === 'TOTAL') && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 4,
                          fontSize: 10.5,
                          color: '#0f172a',
                          fontWeight: 700,
                          lineHeight: 1.35,
                          minWidth: 0,
                          borderTop: '1px dashed #e2e8f0',
                          paddingTop: 3,
                          marginTop: 2,
                        }}
                      >
                        <span style={{ color: '#334155', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
                          Total:
                        </span>
                        <span
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 700,
                            color: pillar === 'UNOBLIGATED' ? '#1d4ed8' : '#0f172a',
                            whiteSpace: 'nowrap',
                            textAlign: 'right',
                            letterSpacing: '-0.3px',
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={`₱${formatMoney(
                            pillar === 'ALLOTMENT'
                              ? allocTotal
                              : pillar === 'OBLIGATION'
                              ? obligTotal
                              : unobligTotal
                          )}`}
                        >
                          ₱
                          {formatMoney(
                            pillar === 'ALLOTMENT'
                              ? allocTotal
                              : pillar === 'OBLIGATION'
                              ? obligTotal
                              : unobligTotal
                          )}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. % OBLIGATION VERSUS ALLOTMENT (BENCHMARK ANALYSIS GRAPH)
// Mapping SAAODB Google Sheet cells Q61:S66
// Programs: PSS, ESETS, RD, and INS Rice (plus Banner Rice Benchmark)
// -------------------------------------------------------------
function ObligationRateAllotmentGraph({
  categories,
  totalBannerRice,
  initialScope = 'COMPARE',
}: {
  categories: ObligationCategoryItem[];
  totalBannerRice?: ObligationCategoryItem;
  initialScope?: 'COMPARE' | 'CURRENT' | 'CONTINUING' | 'TOTAL';
}) {
  const [scopeFilter, setScopeFilter] = useState<'COMPARE' | 'CURRENT' | 'CONTINUING' | 'TOTAL'>(initialScope);
  const [includeTotalBenchmark, setIncludeTotalBenchmark] = useState(true);

  const targetPrograms = useMemo(() => {
    const list = categories.filter((c) => {
      const up = (c.name || c.id).toUpperCase();
      return (
        up.includes('PSS') ||
        up.includes('ESETS') ||
        up.includes('RD') ||
        up.includes('INS')
      );
    });

    if (includeTotalBenchmark && totalBannerRice) {
      return [...list, totalBannerRice];
    }
    return list;
  }, [categories, totalBannerRice, includeTotalBenchmark]);

  const DBM_BENCHMARK = 85.0; // 85% DBM standard target
  const chartHeight = 240;
  const maxScale = 100;

  const getColumnHeight = (rateVal: number) => {
    const clamped = Math.min(100, Math.max(0, rateVal));
    return Math.max(6, (clamped / maxScale) * (chartHeight - 40));
  };

  const benchmarkBottom = (DBM_BENCHMARK / maxScale) * (chartHeight - 40);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '24px 28px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Top Header & Executive Controls */}
      <div
        className="obligation-benchmark-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: 16,
        }}
      >
        <div style={{ flex: '1 1 360px', minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                backgroundColor: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.2px',
              }}
            >
              <BarChart2 size={12} />
            </span>

            <span style={{ fontSize: 11.5, color: '#64748b' }}>
              Registry of Allotments & Obligations (SAAODB Q61:S66)
            </span>
          </div>

          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#0f291e',
              margin: '4px 0',
              letterSpacing: '-0.2px',
            }}
          >
            % Obligation versus Allotment
          </h2>

          <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            Comparative fund utilization performance from SAAODB Q61:S66 across Current, Continuing Appropriations, and Total Obligations.
          </p>
        </div>

        {/* Right Action Controls: Scope Filter, Include Benchmark */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 10,
            flexShrink: 0,
            marginLeft: 'auto',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 3,
              gap: 2,
            }}
          >
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', padding: '0 8px' }}>
              SCOPE:
            </span>
            {[
              { id: 'COMPARE', label: 'Current vs Continuing' },
              { id: 'CURRENT', label: 'Current' },
              { id: 'CONTINUING', label: 'Continuing' },
              { id: 'TOTAL', label: 'Total Utilized' },
            ].map((tab) => {
              const isSel = scopeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScopeFilter(tab.id as any)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11.5,
                    fontWeight: isSel ? 700 : 500,
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: isSel ? '#136c38' : 'transparent',
                    color: isSel ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                    boxShadow: isSel ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
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
                style={{ cursor: 'pointer', accentColor: '#136c38' }}
              />
              <span>Include Banner Total Benchmark</span>
            </label>
          </div>
        </div>
      </div>

      {/* DEDICATED COLUMN CHART */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12,
            fontWeight: 600,
            paddingBottom: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {(scopeFilter === 'COMPARE' || scopeFilter === 'CURRENT') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    backgroundColor: '#136c38',
                    border: '1px solid #0f522a',
                  }}
                />
                <span style={{ color: '#14532d', fontWeight: 700 }}>Current Appropriations (Col Q)</span>
              </div>
            )}
            {(scopeFilter === 'COMPARE' || scopeFilter === 'CONTINUING') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    backgroundColor: '#eab308',
                    border: '1px solid #ca8a04',
                  }}
                />
                <span style={{ color: '#854d0e', fontWeight: 700 }}>Continuing Appropriations (Col R)</span>
              </div>
            )}
            {scopeFilter === 'TOTAL' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    backgroundColor: '#0284c7',
                    border: '1px solid #0369a1',
                  }}
                />
                <span style={{ color: '#075985', fontWeight: 700 }}>Total Utilization Rate (Col S)</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: 11.5, fontWeight: 700 }}>
            <span style={{ borderBottom: '2px dashed #dc2626', width: 20, height: 0 }} />
            <span>85.0% DBM National Target</span>
          </div>
        </div>

        {/* Chart Canvas with Y-Axis and Columns */}
        <div
          style={{
            position: 'relative',
            height: chartHeight,
            paddingLeft: 44,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          {/* Y-Axis Labels & Horizontal Gridlines */}
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
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: '#94a3b8',
                      textAlign: 'right',
                      paddingRight: 6,
                    }}
                  >
                    {pct}%
                  </span>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: pct === 0 ? '1px solid #cbd5e1' : '1px dashed #f1f5f9',
                    }}
                  />
                </div>
              );
            })}

            {/* DBM 85% Benchmark Horizontal Line */}
            <div
              style={{
                position: 'absolute',
                left: 44,
                right: 0,
                bottom: `${benchmarkBottom}px`,
                borderBottom: '2px dashed #dc2626',
                zIndex: 4,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  right: 4,
                  bottom: 3,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: 4,
                }}
              >
                85% Target
              </span>
            </div>
          </div>

          {/* Grid of Vertical Column Groups */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${targetPrograms.length}, 1fr)`,
              gap: 16,
              alignItems: 'end',
              height: '100%',
              position: 'relative',
              zIndex: 2,
              paddingBottom: 2,
            }}
          >
            {targetPrograms.map((cat) => {
              const currentRate = cat.rate || 0;
              const continuingRate = cat.rateContinuing || 0;
              const totalRate = cat.rateTotal || 0;

              return (
                <div
                  key={cat.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    padding: '0 4px',
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
                    {/* Bar 1 (Green): CURRENT (Col Q) */}
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
                            color: '#136c38',
                            marginBottom: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {currentRate.toFixed(1)}%
                        </span>
                        <div
                          style={{
                            width: '100%',
                            height: getColumnHeight(currentRate),
                            backgroundColor: '#136c38',
                            border: '1px solid #0f522a',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.6s ease',
                            cursor: 'pointer',
                          }}
                          title={`${cat.name} Current (Col Q): ${currentRate.toFixed(2)}%`}
                        />
                      </div>
                    )}

                    {/* Bar 2 (Yellow): CONTINUING (Col R) */}
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
                            color: '#a16207',
                            marginBottom: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {continuingRate.toFixed(1)}%
                        </span>
                        <div
                          style={{
                            width: '100%',
                            height: getColumnHeight(continuingRate),
                            backgroundColor: '#eab308',
                            border: '1px solid #ca8a04',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.6s ease',
                            cursor: 'pointer',
                          }}
                          title={`${cat.name} Continuing (Col R): ${continuingRate.toFixed(2)}%`}
                        />
                      </div>
                    )}

                    {/* Bar 3 (Blue): TOTAL (Col S) */}
                    {scopeFilter === 'TOTAL' && (
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
                            color: '#0284c7',
                            marginBottom: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {totalRate.toFixed(1)}%
                        </span>
                        <div
                          style={{
                            width: '100%',
                            height: getColumnHeight(totalRate),
                            backgroundColor: '#0284c7',
                            border: '1px solid #0369a1',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.6s ease',
                            cursor: 'pointer',
                          }}
                          title={`${cat.name} Total Rate (Col S): ${totalRate.toFixed(2)}%`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* X-Axis Program Labels */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${targetPrograms.length}, 1fr)`,
            gap: 16,
            textAlign: 'center',
            paddingLeft: 44,
            marginTop: 4,
          }}
        >
          {targetPrograms.map((cat) => {
            const isTotal = cat.id === 'total_rice';
            const totalRate = cat.rateTotal || 0;

            return (
              <div
                key={cat.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  backgroundColor: isTotal ? '#f0fdf4' : 'transparent',
                  padding: isTotal ? '6px 4px' : '4px',
                  borderRadius: 6,
                  border: isTotal ? '1px solid #bbf7d0' : 'none',
                }}
              >
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: isTotal ? '#14532d' : '#0f172a',
                    letterSpacing: '-0.1px',
                  }}
                >
                  {cat.name}
                </span>

                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: totalRate >= 85 ? '#065f46' : '#92400e',
                    backgroundColor: totalRate >= 85 ? '#ecfdf5' : '#fffbeb',
                    padding: '1px 8px',
                    borderRadius: 6,
                    border: totalRate >= 85 ? '1px solid #a7f3d0' : '1px solid #fde68a',
                  }}
                >
                  {totalRate.toFixed(2)}% Total
                </span>

                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Allot: {formatShortMoney(cat.totalAlloc || cat.allocation || 0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN COMPONENT EXPORT
// -------------------------------------------------------------
export default function ObligationBudgetClient({
  obligationCategories = DEFAULT_BLANK_CATEGORIES,
  disbursementCategories = DEFAULT_BLANK_CATEGORIES,
  totalBannerRice = DEFAULT_TOTAL_BANNER_RICE,
  isLiveLoading = false,
  canEditBudget = true,
}: ObligationBudgetClientProps) {
  const [canEdit, setCanEdit] = useState<boolean>(canEditBudget);
  const [obligationCats, setObligationCats] = useState<ObligationCategoryItem[]>(obligationCategories);
  const [bannerTotal, setBannerTotal] = useState<ObligationCategoryItem>(totalBannerRice);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Synchronize live permissions from /api/auth/me and events
  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const json = await res.json();
          if (json?.account?.permissions) {
            setCanEdit(json.account.permissions.can_edit_budget !== false);
          } else if (json?.account) {
            setCanEdit(['super_admin', 'admin'].includes(json.account.role));
          }
        }
      } catch {}
    };
    fetchAuth();

    const handlePermUpdated = () => {
      fetchAuth();
    };
    window.addEventListener('da_permissions_updated', handlePermUpdated);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'da_permissions_ts') {
        fetchAuth();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('da_permissions_updated', handlePermUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Separated Pillars state
  const [activePillarTab, setActivePillarTab] = useState<'ALL' | PillarType>('ALL');
  const [allotmentScope, setAllotmentScope] = useState<ScopeType>('CURRENT');
  const [obligationScope, setObligationScope] = useState<ScopeType>('CURRENT');
  const [unobligatedScope, setUnobligatedScope] = useState<ScopeType>('CURRENT');

  const setGlobalScope = (s: ScopeType) => {
    setAllotmentScope(s);
    setObligationScope(s);
    setUnobligatedScope(s);
  };

  useEffect(() => {
    setMounted(true);
    setLastSynced(new Date());
  }, []);

  const syncLatestData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/obligations/rice-sheet?_t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setObligationCats(data.categories);
        if (data.totalBannerRice) {
          setBannerTotal(data.totalBannerRice);
        }
        setLastSynced(new Date());
      }
    } catch (err) {
      console.warn('Auto-sync fetch error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const intervalTimer = setInterval(() => {
      syncLatestData();
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncLatestData();
      }
    };

    const handleWindowFocus = () => {
      syncLatestData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      clearInterval(intervalTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [syncLatestData]);

  const formattedTime =
    mounted && lastSynced
      ? lastSynced.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
      : '';

  const bannerCats = useMemo(() => {
    return obligationCats.filter(
      (c) =>
        !c.name.toUpperCase().includes('FPMA') &&
        !c.name.toUpperCase().includes('STO') &&
        c.id !== 'sto'
    );
  }, [obligationCats]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* FINANCIAL LEDGER ALTERATION RESTRICTION NOTICE */}
      {!canEdit && (
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#991b1b',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <Lock size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
          <div>
            <strong>Financial Ledger Alterations Restricted:</strong> The Super Administrator has revoked editing and modification powers on financial ledger balances for your account (Module 03). All budget utilization records remain accessible in read-only audit mode.
          </div>
        </div>
      )}

      {/* EXECUTIVE TOP HEADER CARD */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '20px 24px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.8px',
                color: '#136c38',
                textTransform: 'uppercase',
              }}
            >
              DA-CAR Rice Program Coordinating Unit
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.3px',
              color: '#0f291e',
              textTransform: 'uppercase',
            }}
          >
            Obligation Budget & Balances
          </h1>

          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Official financial monitoring of Allotment, Committed Obligations, and Unobligated Balances for FY 2026.
          </p>
        </div>

        {/* Right Info: Live Sync Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            flexShrink: 0,
            marginLeft: 'auto',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
              color: '#1e293b',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: isSyncing ? '#eab308' : '#16a34a',
                boxShadow: isSyncing
                  ? '0 0 0 3px rgba(234, 179, 8, 0.25)'
                  : '0 0 0 3px rgba(22, 163, 74, 0.25)',
              }}
            />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0f291e' }}>
              {isSyncing ? 'Fetching...' : 'Live'}
            </span>

            <button
              type="button"
              onClick={syncLatestData}
              disabled={isSyncing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'transparent',
                border: 'none',
                color: '#136c38',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: 11.5,
                marginLeft: 4,
                padding: '2px 4px',
              }}
              title="Pull latest live figures directly from Google Sheets"
            >
              <RefreshCw
                size={12}
                style={{
                  animation: isSyncing ? 'spin 0.9s linear infinite' : 'none',
                }}
              />
              <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* 3 Pillars Separator Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '10px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Pillar Filter:
            </span>

            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select
                id="pillar-filter-dropdown"
                value={activePillarTab}
                onChange={(e) => setActivePillarTab(e.target.value as any)}
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  backgroundColor:
                    activePillarTab === 'ALLOTMENT_OBLIGATION'
                      ? '#136c38'
                      : activePillarTab === 'UNOBLIGATED'
                        ? '#1d4ed8'
                        : '#0f291e',
                  color: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: 8,
                  padding: '7px 34px 7px 14px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
                  transition: 'all 0.15s ease',
                }}
              >
                <option value="ALL" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                  All
                </option>
                <option value="ALLOTMENT_OBLIGATION" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                  Allotment & Obligation
                </option>
                <option value="UNOBLIGATED" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                  Unobligated
                </option>
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: 'absolute',
                  right: 12,
                  pointerEvents: 'none',
                  color: '#ffffff',
                }}
              />
            </div>
          </div>

          {/* Quick Global Scope Controller */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
            <span style={{ fontWeight: 700, color: '#64748b' }}>QUICK SCOPE:</span>
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: '#f1f5f9',
                borderRadius: 6,
                padding: 2,
                gap: 2,
              }}
            >
              {[
                { id: 'TOTAL', label: 'Total' },
                { id: 'CURRENT', label: 'Current' },
                { id: 'CONTINUING', label: 'Continuing' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setGlobalScope(s.id as ScopeType)}
                  style={{
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: 'none',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                  title={`Set all pillars to ${s.label}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Combined Pillar 1 & 2: ALLOTMENT & OBLIGATION */}
        {(activePillarTab === 'ALL' || activePillarTab === 'ALLOTMENT_OBLIGATION') && (
          <PillarBudgetCard
            id="allotment-obligation-budget"
            pillar="ALLOTMENT_OBLIGATION"
            title="Allotment & Obligation"
            subtitle="Committed obligations and utilization progress against approved allotment ceiling"
            categories={bannerCats}
            scope={allotmentScope}
            onScopeChange={setAllotmentScope}
          />
        )}

        {/* Pillar 3: UNOBLIGATED ALLOTMENT */}
        {(activePillarTab === 'ALL' || activePillarTab === 'UNOBLIGATED') && (
          <PillarBudgetCard
            id="unobligated-budget"
            pillar="UNOBLIGATED"
            title="Unobligated Balances"
            subtitle="Remaining uncommitted budget balance (Current vs Continuing vs Total)"
            categories={bannerCats}
            scope={unobligatedScope}
            onScopeChange={setUnobligatedScope}
          />
        )}
      </div>

      {/* 2. % Obligation versus Allotment (SAAODB Q61:S66 Benchmark Graph) */}
      <ObligationRateAllotmentGraph
        categories={bannerCats}
        totalBannerRice={bannerTotal}
        initialScope="COMPARE"
      />

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .executive-gauge-card:hover {
          border-color: #cbd5e1 !important;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06) !important;
          transform: translateY(-2px);
        }
        .hover-card:hover {
          border-color: #cbd5e1 !important;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06) !important;
          transform: translateY(-2px);
        }
        .obligation-budget-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }
        @media (min-width: 900px) {
          .obligation-benchmark-header {
            flex-wrap: nowrap !important;
          }
        }
        @media (max-width: 1260px) {
          .obligation-budget-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 640px) {
          .obligation-budget-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
