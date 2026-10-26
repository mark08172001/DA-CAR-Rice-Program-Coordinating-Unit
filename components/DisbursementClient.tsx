'use client';

import { useState } from 'react';
import { CreditCard, Filter } from 'lucide-react';

export type DisbursementView = 'current' | 'continuing' | 'unpaid-prior-years';

export default function DisbursementClient() {
  const [selectedView, setSelectedView] = useState<DisbursementView>('current');

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#f0fdf4',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CreditCard size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              Disbursement Register
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              Module 03: Financial Management &bull; Cordillera Administrative Region
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

      {/* Content Area - Clean blank container for each selected view */}
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

      {selectedView === 'continuing' && (
        <div
          id="disbursement-continuing-view"
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
          {/* Blank view for Continuing */}
        </div>
      )}

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
    </div>
  );
}
