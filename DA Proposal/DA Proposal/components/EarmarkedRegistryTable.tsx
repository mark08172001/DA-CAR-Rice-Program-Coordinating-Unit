'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { ObligationBalanceRow } from '@/utils/obligationsTypes';
import { EarmarkedActiveRow } from '@/app/api/obligations/earmarked-sheet/route';

interface EarmarkedRegistryTableProps {
  budgetRows?: ObligationBalanceRow[];
  activeCategory?: string;
  selectedRc?: string;
  onClearRcFilter?: () => void;
  categoryChangeKey?: number;
}



function formatMoney(amount: number | null | undefined): string {
  const n = Number(amount) || 0;
  if (n === 0) return '-';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function cleanRcName(fullRc: string) {
  if (!fullRc) return 'General';
  const parts = fullRc.split(/\s+/);
  if (parts.length > 1 && parts[0].includes('-')) {
    return parts.slice(1).join(' ');
  }
  return fullRc;
}

// Helper to determine if a PAP matches the active category
function isPapMatchingCategory(pap: string, category?: string): boolean {
  const p = (pap || '').toUpperCase();
  if (
    !category ||
    category === 'ALL RICE (GRAND TOTAL)' ||
    category.toUpperCase().includes('ALL') ||
    category.toUpperCase().includes('GRAND TOTAL')
  ) {
    return (
      p.includes('310101100001000') ||
      p.includes('310103100001000') ||
      p.includes('310104100001000') ||
      p.includes('310202100001000') ||
      p.includes('PSS') ||
      p.includes('ESETS') ||
      p.includes('RD') ||
      p.includes('INS')
    );
  }

  const catUp = category.toUpperCase();
  if (catUp.includes('INS')) {
    return p.includes('310202100001000') || p.includes('INS');
  }
  if (catUp.includes('PSS')) {
    return p.includes('310101100001000') || p.includes('PSS');
  }
  if (catUp.includes('ESETS')) {
    return p.includes('310103100001000') || p.includes('ESETS');
  }
  if (catUp.includes('RD')) {
    return p.includes('310104100001000') || p.includes('RD');
  }

  return true;
}

export default function EarmarkedRegistryTable({
  budgetRows = [],
  activeCategory = 'ALL RICE (GRAND TOTAL)',
  selectedRc = '',
  onClearRcFilter,
  categoryChangeKey,
}: EarmarkedRegistryTableProps) {
  const [earmarkRows, setEarmarkRows] = useState<EarmarkedActiveRow[]>([]);
  const [selectedObjectCode, setSelectedObjectCode] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'financial' | 'prLog'>('financial');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedRc, setExpandedRc] = useState<string | null>(null);

  const isSpecificCategory = useMemo(() => {
    if (!activeCategory) return false;
    const upper = activeCategory.toUpperCase();
    return !upper.includes('GRAND TOTAL') && !upper.includes('ALL RICE');
  }, [activeCategory]);

  // Fetch live active earmark records automatically from Google Sheets link
  const fetchEarmarkData = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);

    try {
      const res = await fetch(`/api/obligations/earmarked-sheet?_t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.rows)) {
        setEarmarkRows(data.rows);
      }
    } catch (err) {
      console.warn('Error auto-syncing active earmarked sheet:', err);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount
    fetchEarmarkData(true);

    // Automatically sync in background every 30 seconds
    const interval = setInterval(() => {
      fetchEarmarkData(false);
    }, 30000);

    // Auto-sync when returning to the tab
    const handleFocus = () => {
      fetchEarmarkData(false);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchEarmarkData]);

  // 1. FILTER ACTIVE EARMARK ROWS BY ACTIVE CATEGORY (INS, PSS, ESETS, RD, ALL)
  const categoryEarmarkRows = useMemo(() => {
    return earmarkRows.filter((r) => isPapMatchingCategory(r.pap, activeCategory));
  }, [earmarkRows, activeCategory]);

  // 2. FILTER SAAODB BUDGET ROWS BY ACTIVE CATEGORY
  const categoryBudgetRows = useMemo(() => {
    return budgetRows.filter((r) => isPapMatchingCategory(r.pap || '', activeCategory));
  }, [budgetRows, activeCategory]);

  // 3. COMPUTE AVAILABLE OBJECT CODES FOR THE ACTIVE CATEGORY ONLY
  const categoryObjectCodes = useMemo(() => {
    const set = new Set<string>();

    categoryEarmarkRows.forEach((r) => {
      const desc = (r.description || '').trim();
      if (desc) set.add(desc);
    });

    categoryBudgetRows.forEach((r) => {
      const desc = (r.description || '').trim();
      if (desc && !desc.toLowerCase().includes('total')) {
        set.add(desc);
      }
    });

    return Array.from(set).sort();
  }, [categoryEarmarkRows, categoryBudgetRows]);

  const prevCategoryRef = useRef<string>(activeCategory);
  const prevKeyRef = useRef<number | undefined>(categoryChangeKey);

  // 4. SYNCHRONIZE SELECTED OBJECT CODE WHEN ACTIVE CATEGORY CHANGES
  useEffect(() => {
    const isCategoryChanged = prevCategoryRef.current !== activeCategory;
    const isKeyChanged = categoryChangeKey !== undefined && prevKeyRef.current !== categoryChangeKey;

    if (isCategoryChanged || isKeyChanged) {
      prevCategoryRef.current = activeCategory;
      prevKeyRef.current = categoryChangeKey;

      const catUp = (activeCategory || '').toUpperCase();
      const isAllRice = !catUp || catUp.includes('ALL') || catUp.includes('GRAND TOTAL');

      if (isAllRice) {
        // When clicking ALL RICE, always sync the filter to 'ALL' (All Object Codes)
        setSelectedObjectCode('ALL');
        setExpandedRc(null);
        return;
      }

      if (catUp.includes('INS')) {
        const insMatch = categoryObjectCodes.find((c) =>
          c.toLowerCase().includes('water supply')
        );
        setSelectedObjectCode(insMatch || (categoryObjectCodes.length > 1 ? 'ALL' : categoryObjectCodes[0] || 'ALL'));
      } else if (catUp.includes('PSS')) {
        const pssPreferred = categoryObjectCodes.find((c) =>
          c.toLowerCase().includes('agricultural and marine')
        );
        setSelectedObjectCode(pssPreferred || (categoryObjectCodes.length > 1 ? 'ALL' : categoryObjectCodes[0] || 'ALL'));
      } else if (catUp.includes('ESETS')) {
        const esetsPreferred = categoryObjectCodes.find((c) =>
          c.toLowerCase().includes('training')
        );
        setSelectedObjectCode(esetsPreferred || (categoryObjectCodes.length > 1 ? 'ALL' : categoryObjectCodes[0] || 'ALL'));
      } else {
        setSelectedObjectCode(categoryObjectCodes.length > 1 ? 'ALL' : categoryObjectCodes[0] || 'ALL');
      }
      setExpandedRc(null);
    }
  }, [activeCategory, categoryChangeKey, categoryObjectCodes]);

  // Fallback: Validate current selection against available codes when codes list loads or changes
  useEffect(() => {
    if (categoryObjectCodes.length === 0) return;

    const catUp = (activeCategory || '').toUpperCase();
    const isAllRice = !catUp || catUp.includes('ALL') || catUp.includes('GRAND TOTAL');

    if (isAllRice) {
      if (selectedObjectCode !== 'ALL' && !categoryObjectCodes.includes(selectedObjectCode)) {
        setSelectedObjectCode('ALL');
        setExpandedRc(null);
      }
      return;
    }

    const isCurrentValid =
      (selectedObjectCode === 'ALL' && categoryObjectCodes.length > 1) ||
      categoryObjectCodes.includes(selectedObjectCode);

    if (!isCurrentValid) {
      if (catUp.includes('INS')) {
        const insMatch = categoryObjectCodes.find((c) =>
          c.toLowerCase().includes('water supply')
        );
        setSelectedObjectCode(insMatch || (categoryObjectCodes.length > 1 ? 'ALL' : categoryObjectCodes[0] || 'ALL'));
      } else if (categoryObjectCodes.length > 1) {
        setSelectedObjectCode('ALL');
      } else {
        setSelectedObjectCode(categoryObjectCodes[0] || 'ALL');
      }
      setExpandedRc(null);
    }
  }, [activeCategory, categoryObjectCodes, selectedObjectCode]);

  // 5. FURTHER FILTER BUDGET & SHEET ROWS IF SELECTED RC IS ACTIVE
  const targetBudgetRows = useMemo(() => {
    if (!selectedRc) return categoryBudgetRows;
    return categoryBudgetRows.filter((r) => (r.rc || '').trim() === selectedRc.trim());
  }, [categoryBudgetRows, selectedRc]);

  const targetEarmarkRows = useMemo(() => {
    if (!selectedRc) return categoryEarmarkRows;
    const cleanSel = cleanRcName(selectedRc).toLowerCase();
    return categoryEarmarkRows.filter((r) => {
      const rc = (r.rc || '').toLowerCase();
      return (
        rc === selectedRc.toLowerCase() ||
        rc.includes(cleanSel) ||
        cleanRcName(r.rc).toLowerCase().includes(cleanSel)
      );
    });
  }, [categoryEarmarkRows, selectedRc]);

  // 6. COMPUTED FINANCIAL TABLE ROWS
  const financialRows = useMemo(() => {
    if (selectedObjectCode === 'ALL') {
      // Group by Object Code for the current category
      const objMap = new Map<string, {
        objectCodeName: string;
        allocation: number;
        obligation: number;
        unobligated: number;
        earmark: number;
        unallocated: number;
        disbursement: number;
        unpaid: number;
        prCount: number;
        prs: EarmarkedActiveRow[];
      }>();

      categoryObjectCodes.forEach((objName) => {
        objMap.set(objName, {
          objectCodeName: objName,
          allocation: 0,
          obligation: 0,
          unobligated: 0,
          earmark: 0,
          unallocated: 0,
          disbursement: 0,
          unpaid: 0,
          prCount: 0,
          prs: [],
        });
      });

      targetBudgetRows.forEach((r) => {
        const objName = (r.description || '').trim();
        if (!objName) return;
        if (!objMap.has(objName)) {
          objMap.set(objName, {
            objectCodeName: objName,
            allocation: 0,
            obligation: 0,
            unobligated: 0,
            earmark: 0,
            unallocated: 0,
            disbursement: 0,
            unpaid: 0,
            prCount: 0,
            prs: [],
          });
        }
        const entry = objMap.get(objName)!;
        entry.allocation += r.adjusted_allotment || 0;
        entry.obligation += r.total_obligation || 0;
        entry.unobligated += r.unobligated_allotment || 0;
        entry.disbursement += r.disbursement || 0;
        entry.unpaid += r.unpaid || 0;
      });

      // Overlay active PR earmarks from Google Sheet
      targetEarmarkRows.forEach((em) => {
        const objName = (em.description || '').trim();
        if (objMap.has(objName)) {
          const entry = objMap.get(objName)!;
          entry.earmark += em.amount || 0;
          entry.prCount += 1;
          entry.prs.push(em);
        }
      });

      const list = Array.from(objMap.values()).map((entry) => {
        const unalloc = Math.max(0, entry.unobligated - entry.earmark);
        return {
          id: entry.objectCodeName,
          title: entry.objectCodeName,
          subTitle: `${entry.prCount} Active Earmark PR${entry.prCount === 1 ? '' : 's'} in Sheet`,
          pap: activeCategory,
          allocation: entry.allocation,
          totalObligation: entry.obligation,
          unobligated: entry.unobligated,
          earmark: entry.earmark,
          unallocated: unalloc,
          disbursement: entry.disbursement,
          unpaid: entry.unpaid,
          prCount: entry.prCount,
          prs: entry.prs,
        };
      });

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return list.filter((item) => item.title.toLowerCase().includes(q));
      }
      return list;
    }

    // Specific Object Code selected (e.g. "Water Supply Systems" or "Training Expenses")
    // Break down by Responsibility Center!
    const filteredBudget = targetBudgetRows.filter((r) => {
      const desc = (r.description || '').trim().toLowerCase();
      const sel = selectedObjectCode.trim().toLowerCase();
      return desc === sel || desc.includes(sel);
    });

    const rcMap = new Map<string, {
      rc: string;
      pap: string;
      allocation: number;
      obligation: number;
      unobligated: number;
      earmark: number;
      unallocated: number;
      disbursement: number;
      unpaid: number;
      prs: EarmarkedActiveRow[];
    }>();

    filteredBudget.forEach((r) => {
      const rc = (r.rc || 'Regional Rice Program').trim();
      if (!rcMap.has(rc)) {
        rcMap.set(rc, {
          rc,
          pap: r.pap || '',
          allocation: 0,
          obligation: 0,
          unobligated: 0,
          earmark: 0,
          unallocated: 0,
          disbursement: 0,
          unpaid: 0,
          prs: [],
        });
      }
      const entry = rcMap.get(rc)!;
      entry.allocation += r.adjusted_allotment || 0;
      entry.obligation += r.total_obligation || 0;
      entry.unobligated += r.unobligated_allotment || 0;
      entry.disbursement += r.disbursement || 0;
      entry.unpaid += r.unpaid || 0;
    });

    // Link active PR earmarks for this Object Code
    const activePrsForObj = targetEarmarkRows.filter(
      (em) => (em.description || '').trim().toLowerCase() === selectedObjectCode.trim().toLowerCase()
    );

    activePrsForObj.forEach((em) => {
      const emRc = (em.rc || '').trim();
      let matchedEntry = rcMap.get(emRc);

      if (!matchedEntry) {
        for (const [key, val] of rcMap.entries()) {
          if (
            key.toLowerCase().includes(emRc.toLowerCase()) ||
            emRc.toLowerCase().includes(key.toLowerCase()) ||
            cleanRcName(key).toLowerCase() === cleanRcName(emRc).toLowerCase()
          ) {
            matchedEntry = val;
            break;
          }
        }
      }

      if (matchedEntry) {
        matchedEntry.earmark += em.amount || 0;
        matchedEntry.prs.push(em);
      } else {
        rcMap.set(emRc, {
          rc: emRc,
          pap: em.pap || '',
          allocation: 0,
          obligation: 0,
          unobligated: 0,
          earmark: em.amount || 0,
          unallocated: 0,
          disbursement: 0,
          unpaid: 0,
          prs: [em],
        });
      }
    });

    let result = Array.from(rcMap.values()).map((entry) => {
      const unalloc = Math.max(0, entry.unobligated - entry.earmark);
      return {
        id: entry.rc,
        title: cleanRcName(entry.rc),
        subTitle: entry.rc,
        pap: entry.pap,
        allocation: entry.allocation,
        totalObligation: entry.obligation,
        unobligated: entry.unobligated,
        earmark: entry.earmark,
        unallocated: unalloc,
        disbursement: entry.disbursement,
        unpaid: entry.unpaid,
        prCount: entry.prs.length,
        prs: entry.prs,
      };
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subTitle.toLowerCase().includes(q) ||
          item.pap.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => b.allocation - a.allocation || b.earmark - a.earmark);
  }, [
    selectedObjectCode,
    targetBudgetRows,
    categoryObjectCodes,
    targetEarmarkRows,
    searchQuery,
    activeCategory,
  ]);

  // Grand totals
  const grandTotals = useMemo(() => {
    return financialRows.reduce(
      (acc, r) => ({
        allocation: acc.allocation + r.allocation,
        totalObligation: acc.totalObligation + r.totalObligation,
        unobligated: acc.unobligated + r.unobligated,
        earmark: acc.earmark + r.earmark,
        unallocated: acc.unallocated + r.unallocated,
        disbursement: acc.disbursement + r.disbursement,
        unpaid: acc.unpaid + r.unpaid,
      }),
      {
        allocation: 0,
        totalObligation: 0,
        unobligated: 0,
        earmark: 0,
        unallocated: 0,
        disbursement: 0,
        unpaid: 0,
      }
    );
  }, [financialRows]);

  // Filtered PR list for PR Log View
  const filteredPrList = useMemo(() => {
    return targetEarmarkRows.filter((r) => {
      if (selectedObjectCode !== 'ALL') {
        if ((r.description || '').trim().toLowerCase() !== selectedObjectCode.trim().toLowerCase()) {
          return false;
        }
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.prNo.toLowerCase().includes(q) ||
          r.earmarkNo.toLowerCase().includes(q) ||
          r.particular.toLowerCase().includes(q) ||
          r.rc.toLowerCase().includes(q) ||
          r.pap.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [targetEarmarkRows, selectedObjectCode, searchQuery]);

  return (
    <div style={{ marginTop: 24, width: '100%' }}>
      {/* FILTER & VIEW SWITCHER BAR - IDENTICAL TO TOP TABLE */}
      <div
        className="report-filter-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label className="rc-filter-label" htmlFor="filter-by-object-code">
            Filter by Object Code:
          </label>
          <select
            id="filter-by-object-code"
            value={selectedObjectCode}
            onChange={(e) => {
              setSelectedObjectCode(e.target.value);
              setExpandedRc(null);
            }}
            className="rc-filter-select"
          >
            {categoryObjectCodes.length > 1 && (
              <option value="ALL">All Object Codes ({categoryObjectCodes.length})</option>
            )}
            {categoryObjectCodes.map((code) => {
              const count = categoryEarmarkRows.filter(
                (r) => (r.description || '').trim().toLowerCase() === code.toLowerCase()
              ).length;
              return (
                <option key={code} value={code}>
                  {code} {count > 0 ? `(${count} PR${count === 1 ? '' : 's'})` : ''}
                </option>
              );
            })}
          </select>

          {selectedObjectCode !== 'ALL' && (
            <button
              onClick={() => {
                setSelectedObjectCode('ALL');
                setExpandedRc(null);
              }}
              className="clear-rc-btn"
              title="Reset to All Object Codes"
            >
              Reset to All
            </button>
          )}

          {/* Quick search input */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: 9,
                color: '#64748b',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 10px 6px 28px',
                fontSize: 12.5,
                border: '1px solid #7c9484',
                borderRadius: 6,
                outline: 'none',
                width: 170,
                background: '#ffffff',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 6,
                  border: 'none',
                  background: 'transparent',
                  color: '#64748b',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* VIEW SWITCHER - IDENTICAL TO TOP TABLE */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#0f291e' }}>View:</span>
          <button
            type="button"
            onClick={() => setViewMode('financial')}
            className={`view-mode-tab-btn ${viewMode === 'financial' ? 'active' : ''}`}
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            Financial Summary
          </button>
          <button
            type="button"
            onClick={() => setViewMode('prLog')}
            className={`view-mode-tab-btn ${viewMode === 'prLog' ? 'active' : ''}`}
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            Active PR Log ({categoryEarmarkRows.length})
          </button>
        </div>
      </div>

      {/* TABLE CONTENT AREA */}
      {viewMode === 'financial' ? (
        /* MODE A: FINANCIAL TABLE - IDENTICAL TO TOP TABLE */
        <div className="report-table-wrapper">
          <table className="report-data-table">
            <thead>
              <tr>
                <th className="col-title">TITLE / PARTICULARS</th>
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
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    Loading active earmarked records...
                  </td>
                </tr>
              ) : financialRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    No financial records found for &ldquo;{selectedObjectCode}&rdquo;.
                  </td>
                </tr>
              ) : (
                financialRows.map((row, idx) => {
                  const isExpanded = expandedRc === row.id;
                  const hasPrs = row.prs && row.prs.length > 0;

                  return (
                    <React.Fragment key={row.id || idx}>
                      <tr
                        className="data-row"
                        style={{ cursor: hasPrs ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (hasPrs) {
                            setExpandedRc(isExpanded ? null : row.id);
                          }
                        }}
                        title={hasPrs ? 'Click to view individual active PRs from Google Sheet' : undefined}
                      >
                        {/* TITLE COLUMN */}
                        <td className="col-title">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {hasPrs && (
                              <span style={{ color: '#047857', display: 'flex' }}>
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </span>
                            )}
                            <div>
                              <span className="title-text">{row.title}</span>
                              {row.subTitle && row.subTitle !== row.title && (
                                <span className="title-rc-sub">{row.subTitle}</span>
                              )}
                              {hasPrs && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    color: '#047857',
                                    backgroundColor: '#ecfdf5',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    marginTop: 2,
                                  }}
                                >
                                  {row.prCount} Active PR{row.prCount > 1 ? 's' : ''} &rarr;
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* NUMERIC COLUMNS */}
                        <td className="col-num">{formatMoney(row.allocation)}</td>
                        <td className="col-num">{formatMoney(row.totalObligation)}</td>
                        <td className="col-num">{formatMoney(row.unobligated)}</td>
                        <td className="col-num">{formatMoney(row.earmark)}</td>
                        <td className="col-num">{formatMoney(row.unallocated)}</td>
                        <td className="col-num">{formatMoney(row.disbursement)}</td>
                        <td className="col-num">{formatMoney(row.unpaid)}</td>
                      </tr>

                      {/* EXPANDABLE ACCORDION: ACTIVE PR LINE ITEMS FROM GOOGLE SHEET */}
                      {isExpanded && hasPrs && (
                        <tr>
                          <td
                            colSpan={8}
                            style={{
                              backgroundColor: '#f0fdf4',
                              padding: '12px 18px',
                              borderBottom: '2px solid #bbf7d0',
                            }}
                          >
                            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: '#065f46' }}>
                                Active Procurement Requisitions for {row.title} ({row.prs.length} items):
                              </span>
                              <span style={{ fontSize: 11, color: '#047857', fontWeight: 600 }}>
                                EARMARKED
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {row.prs.map((pr) => (
                                <div
                                  key={pr.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 12,
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #d1fae5',
                                    borderRadius: 6,
                                    padding: '8px 12px',
                                    fontSize: 12,
                                  }}
                                >
                                  <div style={{ flex: '1 1 300px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                      <span style={{ fontWeight: 800, color: '#0f291e' }}>
                                        PR: {pr.prNo}
                                      </span>
                                      {pr.earmarkNo && (
                                        <span style={{ color: '#047857', fontWeight: 700, backgroundColor: '#ecfdf5', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>
                                          EM: {pr.earmarkNo}
                                        </span>
                                      )}
                                      <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 10.5 }}>
                                        ACTIVE
                                      </span>
                                    </div>
                                    <div style={{ color: '#334155', fontSize: 11.5, lineHeight: 1.4 }}>
                                      {pr.particular}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    {pr.dueDate && (
                                      <span style={{ fontSize: 11, color: '#64748b' }}>
                                        Due: {pr.dueDate}
                                      </span>
                                    )}
                                    <span style={{ fontWeight: 800, color: '#047857', fontSize: 13 }}>
                                      {formatMoney(pr.amount)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* TABLE FOOTER SUMMARY ROW */}
            <tfoot>
              <tr className="total-row">
                <td className="col-title">
                  Total: {selectedObjectCode === 'ALL' ? 'All Object Codes' : selectedObjectCode}
                </td>
                <td className="col-num">{formatMoney(grandTotals.allocation)}</td>
                <td className="col-num">{formatMoney(grandTotals.totalObligation)}</td>
                <td className="col-num">{formatMoney(grandTotals.unobligated)}</td>
                <td className="col-num">{formatMoney(grandTotals.earmark)}</td>
                <td className="col-num">{formatMoney(grandTotals.unallocated)}</td>
                <td className="col-num">{formatMoney(grandTotals.disbursement)}</td>
                <td className="col-num">{formatMoney(grandTotals.unpaid)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        /* MODE B: ACTIVE PR LOG FROM GOOGLE SHEET - IDENTICAL TO TOP TABLE */
        <div className="report-table-wrapper">
          <table className="report-data-table">
            <thead>
              <tr>
                <th className="col-title">PR NO. / SERIES</th>
                <th>EARMARK NO.</th>
                <th style={{ width: '30%' }}>PARTICULAR / PURPOSE</th>
                <th>PROGRAM (PAP)</th>
                <th>RESPONSIBILITY CENTER</th>
                <th>OBJECT CODE & DESCRIPTION</th>
                <th className="col-num">AMOUNT</th>
                <th style={{ textAlign: 'center' }}>STATUS</th>
              </tr>
            </thead>

            <tbody>
              {filteredPrList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    No active PR records found matching your selection.
                  </td>
                </tr>
              ) : (
                filteredPrList.map((pr) => (
                  <tr key={pr.id} className="data-row">
                    <td className="col-title">
                      <span className="title-text">{pr.prNo}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#047857' }}>
                      {pr.earmarkNo || '-'}
                    </td>
                    <td style={{ color: '#334155' }}>
                      {pr.particular}
                    </td>
                    <td style={{ fontSize: 11.5, color: '#475569' }}>
                      {pr.pap}
                    </td>
                    <td style={{ fontSize: 11.5, fontWeight: 600 }}>
                      {cleanRcName(pr.rc)}
                    </td>
                    <td style={{ fontSize: 11.5 }}>
                      <span className="title-text">{pr.description}</span>
                      {pr.objectCode && (
                        <span className="title-rc-sub">{pr.objectCode}</span>
                      )}
                    </td>
                    <td className="col-num" style={{ fontWeight: 700 }}>
                      {formatMoney(pr.amount)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          backgroundColor: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                          padding: '2px 8px',
                          borderRadius: 9999,
                          fontSize: 10.5,
                          fontWeight: 800,
                        }}
                      >
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            <tfoot>
              <tr className="total-row">
                <td colSpan={6} className="col-title">
                  Total Active Requisitions ({filteredPrList.length} items)
                </td>
                <td className="col-num">
                  {formatMoney(filteredPrList.reduce((sum, p) => sum + p.amount, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
