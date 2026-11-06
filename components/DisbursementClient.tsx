'use client';

import { useState, useMemo } from 'react';
import { CreditCard, Filter, Search, ArrowUpDown, FileSpreadsheet } from 'lucide-react';
import {
  DisbursementItem,
  FetchDisbursementResult,
  CONTINUING_RICE_PAP_CODES,
  UNPAID_PRIOR_YEARS_RICE_PAP_CODES,
  RICE_PROGRAM_PAP_CODES,
} from '@/utils/fetchContinuingDisbursements';

export type DisbursementView = 'current' | 'continuing' | 'unpaid-prior-years';

interface DisbursementClientProps {
  initialContinuingData?: FetchDisbursementResult;
  initialCurrentData?: FetchDisbursementResult;
  initialUnpaidPriorYearsData?: FetchDisbursementResult;
}

export default function DisbursementClient({
  initialContinuingData,
  initialCurrentData,
  initialUnpaidPriorYearsData,
}: DisbursementClientProps) {
  const [selectedView, setSelectedView] = useState<DisbursementView>('current');
  const [papFilter, setPapFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'payee' | 'totalObligation' | 'grossAmount' | 'unpaidObligation' | 'rate'>('totalObligation');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const activePapCodes = useMemo(() => {
    if (selectedView === 'unpaid-prior-years') {
      return UNPAID_PRIOR_YEARS_RICE_PAP_CODES;
    }
    if (selectedView === 'continuing') {
      return CONTINUING_RICE_PAP_CODES;
    }
    return RICE_PROGRAM_PAP_CODES;
  }, [selectedView]);

  // Select active records & totals based on the dropdown
  const activeData = useMemo(() => {
    if (selectedView === 'current') {
      return (
        initialCurrentData || {
          records: [],
          totals: { totalObligation: 0, grossAmount: 0, unpaidObligation: 0, count: 0 },
          fetchedAt: '',
        }
      );
    }
    if (selectedView === 'continuing') {
      return (
        initialContinuingData || {
          records: [],
          totals: { totalObligation: 0, grossAmount: 0, unpaidObligation: 0, count: 0 },
          fetchedAt: '',
        }
      );
    }
    if (selectedView === 'unpaid-prior-years') {
      return (
        initialUnpaidPriorYearsData || {
          records: [],
          totals: { totalObligation: 0, grossAmount: 0, unpaidObligation: 0, count: 0 },
          fetchedAt: '',
        }
      );
    }
    return {
      records: [],
      totals: { totalObligation: 0, grossAmount: 0, unpaidObligation: 0, count: 0 },
      fetchedAt: '',
    };
  }, [selectedView, initialCurrentData, initialContinuingData, initialUnpaidPriorYearsData]);

  const records = activeData.records;
  const totals = activeData.totals;

  const filteredRecords = useMemo(() => {
    let list = records;
    if (papFilter !== 'all') {
      list = list.filter((r) => r.ppaCode === papFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.payee.toLowerCase().includes(q) ||
          (r.particulars && r.particulars.toLowerCase().includes(q)) ||
          (r.orsNumber && r.orsNumber.toLowerCase().includes(q)) ||
          (r.ppaCode && r.ppaCode.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      if (sortField === 'rate') {
        const rateA = a.totalObligation > 0 ? a.grossAmount / a.totalObligation : 0;
        const rateB = b.totalObligation > 0 ? b.grossAmount / b.totalObligation : 0;
        return sortDirection === 'asc' ? rateA - rateB : rateB - rateA;
      }

      let valA: string | number = a[sortField];
      let valB: string | number = b[sortField];

      if (typeof valA === 'string') {
        const comp = valA.localeCompare(valB as string);
        return sortDirection === 'asc' ? comp : -comp;
      }
      return sortDirection === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [records, papFilter, searchQuery, sortField, sortDirection]);

  const displayTotals = useMemo(() => {
    if (papFilter === 'all' && !searchQuery.trim()) {
      return totals;
    }
    return {
      totalObligation: filteredRecords.reduce((sum, r) => sum + r.totalObligation, 0),
      grossAmount: filteredRecords.reduce((sum, r) => sum + r.grossAmount, 0),
      unpaidObligation: filteredRecords.reduce((sum, r) => sum + r.unpaidObligation, 0),
      count: filteredRecords.length,
    };
  }, [papFilter, searchQuery, totals, filteredRecords]);

  const toggleSort = (field: 'payee' | 'totalObligation' | 'grossAmount' | 'unpaidObligation' | 'rate') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatCurrency = (val: number) => {
    if (val === 0) return '-';
    return `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const viewTitle =
    selectedView === 'current'
      ? 'Current Disbursements'
      : selectedView === 'continuing'
        ? 'Continuing Disbursements'
        : 'Unpaid Prior Years Disbursements';

  return (
    <div className="disbursement-page-wrapper" style={{ width: '100%', maxWidth: 1480, margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* Top Header Card with View Dropdown */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#f0fdf4',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CreditCard size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                Disbursement
              </h1>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              Registry of Allotments, Obligations and Disbursements
            </p>
          </div>
        </div>

        {/* Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Fund Category */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <label htmlFor="disbursement-category" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              <Filter size={14} style={{ color: '#166534' }} />
              <span>Fund Category:</span>
            </label>
            <select
              id="disbursement-category"
              value={selectedView}
              onChange={(e) => {
                setSelectedView(e.target.value as DisbursementView);
                setPapFilter('all');
                setSearchQuery('');
              }}
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                outline: 'none',
                minWidth: 180,
              }}
            >
              <option value="current">Current</option>
              <option value="continuing">Continuing</option>
              <option value="unpaid-prior-years">Unpaid Prior Years</option>
            </select>
          </div>

          {/* PAP Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <label htmlFor="disbursement-pap-filter" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              <span>PAP Code:</span>
            </label>
            <select
              id="disbursement-pap-filter"
              value={papFilter}
              onChange={(e) => setPapFilter(e.target.value)}
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                outline: 'none',
                minWidth: 220,
              }}
            >
              <option value="all">All ({records.length})</option>
              {activePapCodes.map((code) => {
                const count = records.filter((r) => r.ppaCode === code).length;
                const nameOnly = code.replace(/^\d+\s*/, '');
                return (
                  <option key={code} value={code}>
                    {nameOnly} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Main Ledger View (Captures Payee, TOTAL OBLIGATION, PAID, UNPAID OBLIGATION) */}
      <div id={`disbursement-${selectedView}-view`}>
        {/* Summary KPI stat cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginBottom: 20,
          }}
        >
          {/* Card 1: Total Obligation */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              borderTop: '3px solid #166534',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Obligation ({selectedView === 'current' ? 'Current' : selectedView === 'continuing' ? 'Continuing' : 'Unpaid Prior Years'})
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
              {formatCurrency(displayTotals.totalObligation)}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              {filteredRecords.length === records.length
                ? `${records.length} Payee records captured`
                : `${filteredRecords.length} of ${records.length} Payees filtered`}
            </div>
          </div>

          {/* Card 2: Paid */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              borderTop: '3px solid #2563eb',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Paid
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
              {formatCurrency(displayTotals.grossAmount)}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Regional disbursement vouchers
            </div>
          </div>

          {/* Card 3: Unpaid Obligation */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              borderTop: '3px solid #d97706',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Unpaid Obligation
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#b45309', marginTop: 4 }}>
              {formatCurrency(displayTotals.unpaidObligation)}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Outstanding balance payable
            </div>
          </div>

          {/* Card 4: Disbursement Rate (%) */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              borderTop: '3px solid #059669',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Disbursement Rate (%)
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#059669', marginTop: 4 }}>
              {displayTotals.totalObligation > 0
                ? `${((displayTotals.grossAmount / displayTotals.totalObligation) * 100).toFixed(2)}%`
                : '0.00%'}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Paid vs. Total Obligation
            </div>
          </div>
        </div>

        {/* Table Container Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Table Header Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              padding: '14px 20px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileSpreadsheet size={16} style={{ color: '#166534' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                {viewTitle}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  background: '#e2e8f0',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: 10,
                }}
              >
                {filteredRecords.length} of {records.length}
              </span>
            </div>

            {/* Search Bar */}
            <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
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
                placeholder="Search by Payee, Particulars..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 12px 6px 32px',
                  fontSize: 12,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            </div>
          </div>

          {/* Data Table with Scroll & Sticky Header/Footer */}
          <div style={{ maxHeight: '650px', overflowY: 'auto', overflowX: 'auto', width: '100%', position: 'relative' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <th style={{ padding: '8px 10px', width: '38px', color: '#475569', fontWeight: 700, fontSize: 11, background: '#f1f5f9', whiteSpace: 'nowrap' }}>#</th>
                  <th
                    onClick={() => toggleSort('payee')}
                    style={{ padding: '8px 10px', color: '#1e293b', fontWeight: 700, fontSize: 11, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9', whiteSpace: 'nowrap' }}
                    title="Sort by Payee"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>Payee</span>
                      <ArrowUpDown size={11} style={{ color: '#94a3b8' }} />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('totalObligation')}
                    style={{ padding: '8px 10px', textAlign: 'right', color: '#1e293b', fontWeight: 700, fontSize: 11, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9', whiteSpace: 'nowrap' }}
                    title="Sort by Total Obligation"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                      <span>TOTAL OBLIGATION</span>
                      <ArrowUpDown size={11} style={{ color: '#94a3b8' }} />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('grossAmount')}
                    style={{ padding: '8px 10px', textAlign: 'right', color: '#1e293b', fontWeight: 700, fontSize: 11, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9', whiteSpace: 'nowrap' }}
                    title="Sort by Paid"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                      <span>PAID</span>
                      <ArrowUpDown size={11} style={{ color: '#94a3b8' }} />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('unpaidObligation')}
                    style={{ padding: '8px 10px', textAlign: 'right', color: '#1e293b', fontWeight: 700, fontSize: 11, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9', whiteSpace: 'nowrap' }}
                    title="Sort by Unpaid Obligation"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                      <span>UNPAID OBLIGATION</span>
                      <ArrowUpDown size={11} style={{ color: '#94a3b8' }} />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('rate')}
                    style={{ padding: '8px 10px', textAlign: 'right', color: '#1e293b', fontWeight: 700, fontSize: 11, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9', whiteSpace: 'nowrap' }}
                    title="Sort by % Disbursed"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                      <span>% DISBURSED</span>
                      <ArrowUpDown size={11} style={{ color: '#94a3b8' }} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
                      {records.length === 0
                        ? `No ${selectedView} disbursement records found for this category.`
                        : 'No matching payee records found for your search query.'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((item, idx) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '8px 10px', color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px', color: '#0f172a', fontWeight: 600, fontSize: 12 }}>
                        <span>{item.payee}</span>
                        {item.particulars && (
                          <div style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b', marginTop: 1, maxWidth: 450, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.particulars}>
                            {item.particulars}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {item.totalObligationFormatted}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: item.grossAmount > 0 ? '#15803d' : '#94a3b8', fontVariantNumeric: 'tabular-nums', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {item.grossAmountFormatted}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: item.unpaidObligation > 0 ? '#b45309' : '#94a3b8', fontVariantNumeric: 'tabular-nums', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {item.unpaidObligationFormatted}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const rate = item.totalObligation > 0 ? (item.grossAmount / item.totalObligation) * 100 : 0;
                          return (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '1px 6px',
                                borderRadius: 5,
                                fontSize: 11,
                                fontWeight: 700,
                                background: rate >= 100 ? '#dcfce7' : rate > 0 ? '#eff6ff' : '#f1f5f9',
                                color: rate >= 100 ? '#15803d' : rate > 0 ? '#1d4ed8' : '#64748b',
                              }}
                            >
                              {rate.toFixed(2)}%
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Table Footer with Summary Column Totals */}
              {filteredRecords.length > 0 && (
                <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 9 }}>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', boxShadow: '0 -1px 3px rgba(0,0,0,0.06)', fontWeight: 700 }}>
                    <td colSpan={2} style={{ padding: '10px 10px', color: '#0f172a', background: '#f8fafc', fontSize: 11.5, whiteSpace: 'nowrap' }}>
                      SUMMARY TOTAL ({filteredRecords.length} items)
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#0f172a', fontVariantNumeric: 'tabular-nums', background: '#f8fafc', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatCurrency(filteredRecords.reduce((sum, r) => sum + r.totalObligation, 0))}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#15803d', fontVariantNumeric: 'tabular-nums', background: '#f8fafc', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatCurrency(filteredRecords.reduce((sum, r) => sum + r.grossAmount, 0))}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#b45309', fontVariantNumeric: 'tabular-nums', background: '#f8fafc', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatCurrency(filteredRecords.reduce((sum, r) => sum + r.unpaidObligation, 0))}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#059669', fontVariantNumeric: 'tabular-nums', background: '#f8fafc', fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {(() => {
                        const sumTot = filteredRecords.reduce((sum, r) => sum + r.totalObligation, 0);
                        const sumPaid = filteredRecords.reduce((sum, r) => sum + r.grossAmount, 0);
                        return sumTot > 0 ? `${((sumPaid / sumTot) * 100).toFixed(2)}%` : '0.00%';
                      })()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
