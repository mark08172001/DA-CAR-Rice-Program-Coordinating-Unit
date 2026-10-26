'use client';

import { useState, useMemo } from 'react';
import { CreditCard, Filter, Search, RefreshCw, ArrowUpDown, ChevronDown, Layers, FileSpreadsheet } from 'lucide-react';
import { ContinuingDisbursementItem } from '@/utils/fetchContinuingDisbursements';

export type DisbursementView = 'current' | 'continuing' | 'unpaid-prior-years';

interface DisbursementClientProps {
  initialContinuingData?: {
    records: ContinuingDisbursementItem[];
    totals: {
      totalObligation: number;
      grossAmount: number;
      unpaidObligation: number;
      count: number;
    };
    fetchedAt: string;
    error?: string;
  };
}

export default function DisbursementClient({ initialContinuingData }: DisbursementClientProps) {
  const [selectedView, setSelectedView] = useState<DisbursementView>('continuing');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'payee' | 'totalObligation' | 'grossAmount' | 'unpaidObligation'>('totalObligation');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const records = initialContinuingData?.records || [];
  const totals = initialContinuingData?.totals || {
    totalObligation: 0,
    grossAmount: 0,
    unpaidObligation: 0,
    count: 0,
  };

  const filteredContinuingRecords = useMemo(() => {
    let list = records;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.payee.toLowerCase().includes(q) ||
          (r.particulars && r.particulars.toLowerCase().includes(q)) ||
          (r.orsNumber && r.orsNumber.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      let valA: string | number = a[sortField];
      let valB: string | number = b[sortField];

      if (typeof valA === 'string') {
        const comp = valA.localeCompare(valB as string);
        return sortDirection === 'asc' ? comp : -comp;
      }
      return sortDirection === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [records, searchQuery, sortField, sortDirection]);

  const toggleSort = (field: 'payee' | 'totalObligation' | 'grossAmount' | 'unpaidObligation') => {
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
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '2px 8px',
                  borderRadius: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Module 03
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              Financial Management &bull; Registry of Allotments, Obligations and Disbursements
            </p>
          </div>
        </div>

        {/* Dropdown Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <label htmlFor="disbursement-category" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
            <Filter size={14} style={{ color: '#166534' }} />
            <span>Fund Category:</span>
          </label>
          <select
            id="disbursement-category"
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value as DisbursementView)}
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
              minWidth: 190,
            }}
          >
            <option value="current">Current</option>
            <option value="continuing">Continuing</option>
            <option value="unpaid-prior-years">Unpaid Prior Years</option>
          </select>
        </div>
      </div>

      {/* VIEW: CURRENT (Blank at first as requested) */}
      {selectedView === 'current' && (
        <div
          id="disbursement-current-view"
          style={{
            minHeight: '400px',
            background: '#ffffff',
            border: '1px dashed #cbd5e1',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Blank view for Current */}
        </div>
      )}

      {/* VIEW: UNPAID PRIOR YEARS (Blank at first as requested) */}
      {selectedView === 'unpaid-prior-years' && (
        <div
          id="disbursement-unpaid-view"
          style={{
            minHeight: '400px',
            background: '#ffffff',
            border: '1px dashed #cbd5e1',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Blank view for Unpaid Prior Years */}
        </div>
      )}

      {/* VIEW: CONTINUING (Captures Payee, TOTAL OBLIGATION, GROSS AMOUNT, UNPAID OBLIGATION) */}
      {selectedView === 'continuing' && (
        <div id="disbursement-continuing-view">
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
                Total Obligation
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                {formatCurrency(totals.totalObligation)}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                {records.length} Payee records captured
              </div>
            </div>

            {/* Card 2: Gross Amount (Disbursed) */}
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
                Gross Amount (Disbursed)
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
                {formatCurrency(totals.grossAmount)}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Settled through regional disbursement vouchers
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
                {formatCurrency(totals.unpaidObligation)}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Outstanding balance payable
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
                  Continuing Disbursements Ledger
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
                  {filteredContinuingRecords.length} of {records.length}
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
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <th style={{ padding: '10px 14px', width: '48px', color: '#475569', fontWeight: 700, background: '#f1f5f9' }}>#</th>
                    <th
                      onClick={() => toggleSort('payee')}
                      style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 700, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9' }}
                      title="Sort by Payee"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>Payee</span>
                        <ArrowUpDown size={12} style={{ color: '#94a3b8' }} />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('totalObligation')}
                      style={{ padding: '10px 14px', textAlign: 'right', color: '#1e293b', fontWeight: 700, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9' }}
                      title="Sort by Total Obligation"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <span>TOTAL OBLIGATION</span>
                        <ArrowUpDown size={12} style={{ color: '#94a3b8' }} />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('grossAmount')}
                      style={{ padding: '10px 14px', textAlign: 'right', color: '#1e293b', fontWeight: 700, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9' }}
                      title="Sort by Gross Amount"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <span>GROSS AMOUNT</span>
                        <ArrowUpDown size={12} style={{ color: '#94a3b8' }} />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('unpaidObligation')}
                      style={{ padding: '10px 14px', textAlign: 'right', color: '#1e293b', fontWeight: 700, cursor: 'pointer', userSelect: 'none', background: '#f1f5f9' }}
                      title="Sort by Unpaid Obligation"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <span>UNPAID OBLIGATION</span>
                        <ArrowUpDown size={12} style={{ color: '#94a3b8' }} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContinuingRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
                        {records.length === 0
                          ? 'No continuing disbursement records could be fetched from Google Sheets.'
                          : 'No matching payee records found for your search query.'}
                      </td>
                    </tr>
                  ) : (
                    filteredContinuingRecords.map((item, idx) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        }}
                      >
                        <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                        <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 600 }}>
                          <div>{item.payee}</div>
                          {item.particulars && (
                            <div style={{ fontSize: 11, fontWeight: 400, color: '#64748b', marginTop: 2, maxWidth: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.particulars}>
                              {item.particulars}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {item.totalObligationFormatted}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: item.grossAmount > 0 ? '#15803d' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                          {item.grossAmountFormatted}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: item.unpaidObligation > 0 ? '#b45309' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                          {item.unpaidObligationFormatted}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Table Footer with Summary Column Totals */}
                {filteredContinuingRecords.length > 0 && (
                  <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 9 }}>
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', boxShadow: '0 -1px 3px rgba(0,0,0,0.06)', fontWeight: 700 }}>
                      <td colSpan={2} style={{ padding: '12px 14px', color: '#0f172a', background: '#f8fafc' }}>
                        SUMMARY TOTAL ({filteredContinuingRecords.length} items)
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0f172a', fontVariantNumeric: 'tabular-nums', background: '#f8fafc' }}>
                        {formatCurrency(filteredContinuingRecords.reduce((sum, r) => sum + r.totalObligation, 0))}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#15803d', fontVariantNumeric: 'tabular-nums', background: '#f8fafc' }}>
                        {formatCurrency(filteredContinuingRecords.reduce((sum, r) => sum + r.grossAmount, 0))}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#b45309', fontVariantNumeric: 'tabular-nums', background: '#f8fafc' }}>
                        {formatCurrency(filteredContinuingRecords.reduce((sum, r) => sum + r.unpaidObligation, 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
