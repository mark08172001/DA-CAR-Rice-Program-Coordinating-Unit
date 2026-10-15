'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Wheat,
  MapPin,
  Search,
  BarChart3,
  Inbox
} from 'lucide-react';
import {
  DSDistributionData,
  DSDistributionRow
} from '@/utils/fetchDSDistributionSheet';

interface Props {
  initialData: DSDistributionData;
}

export default function DSDistributionClient({ initialData }: Props) {
  const [data] = useState<DSDistributionData>(initialData);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtered provincial rows
  const filteredProvinces = useMemo(() => {
    return (data.provinces || []).filter((p) => {
      const matchSearch = p.province.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [data.provinces, searchTerm]);

  return (
    <div className="ds-distribution-container" style={{ paddingBottom: 60 }}>
      {/* 1. INSTITUTIONAL HERO HEADER */}
      <section className="page-hero" style={{ padding: '36px 0 30px' }}>
        <div className="page-container">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div className="eyebrow" style={{ color: '#e5c45c', marginBottom: 8 }}>
                Republic of the Philippines · Department of Agriculture · CAR
              </div>
              <h1 style={{ margin: '0 0 8px', fontSize: '32px', fontFamily: 'Georgia, serif', fontWeight: 400, color: '#ffffff' }}>
                DS 2026-2027 Distribution Status
              </h1>
              <p style={{ margin: 0, color: '#d2dfd6', fontSize: '13.5px', maxWidth: 720, lineHeight: 1.6 }}>
                Official Dry Season (DS) 2026-2027 monitoring of regional seed consignments, provincial allocations, and farmer cluster dropoffs across the Cordilleras.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Link
                href="/rice/physical"
                className="button"
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  fontSize: 12,
                  padding: '8px 14px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  textDecoration: 'none'
                }}
              >
                <BarChart3 size={15} />
                <span>Physical (WS Accomplishment)</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="page-container" style={{ marginTop: 28 }}>
        {/* 2. EXECUTIVE METRIC KPI CARDS */}
        <div className="summary-grid" style={{ marginBottom: 26 }}>
          <article className="summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px' }}>
            <div className="summary-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total DS Target Area
              </span>
              <MapPin size={17} style={{ color: '#166534' }} />
            </div>
            <div className="summary-value" style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>
              {data.totalAreaHa.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>ha</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
              Cordillera DS Production Zone 2026-2027
            </span>
          </article>

          <article className="summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px' }}>
            <div className="summary-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Hybrid Seed Allocation
              </span>
              <Wheat size={17} style={{ color: '#d97706' }} />
            </div>
            <div className="summary-value" style={{ fontSize: 26, fontWeight: 700, color: '#b45309' }}>
              {data.totalHybridSeeds.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>bags</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
              Dry Season Seed Program Allocation
            </span>
          </article>
        </div>

        {/* 3. SEARCH & FILTER CONTROLS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            padding: '12px 18px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={16} style={{ color: '#166534' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
              Provincial Distribution Register
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search province..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '6px 12px 6px 30px',
                  fontSize: 12.5,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  outline: 'none',
                  width: 220,
                  color: '#1e293b',
                }}
              />
            </div>
          </div>
        </div>

        {/* 4. PROVINCIAL DISTRIBUTION TABLE */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Cordillera Dry Season 2026-2027 Provincial Targets vs Deliveries
              </h3>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Target area coverage, monthly releases, and current provincial progress rates.
              </span>
            </div>
            <span style={{ fontSize: 11, background: '#f8fafc', padding: '4px 8px', borderRadius: 4, color: '#64748b', border: '1px solid #e2e8f0' }}>
              {filteredProvinces.length} Records
            </span>
          </div>

          {filteredProvinces.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
              <Inbox size={40} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: '#334155' }}>
                No Distribution Records Available
              </h4>
              <p style={{ margin: 0, fontSize: 13, maxWidth: 460, marginInline: 'auto' }}>
                Data has been cleared and is awaiting the official DS 2026-2027 distribution logs and provincial allotments.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 16px' }}>Province</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Target Area (ha)</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Hybrid Quota (bags)</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Distributed</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Balance</th>
                    <th style={{ padding: '12px 16px', minWidth: 160 }}>Progress</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Latest Dispatch</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProvinces.map((prov) => (
                    <tr key={prov.province} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 650, color: '#1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={14} style={{ color: '#166534' }} />
                          {prov.province}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#334155' }}>
                        {prov.targetAreaHa.toLocaleString()} ha
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#b45309' }}>
                        {prov.hybridSeedsTarget.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 650, color: '#15803d' }}>
                        {prov.distributedBags.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#64748b' }}>
                        {prov.balanceBags.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(prov.progressPercent, 100)}%`,
                                height: '100%',
                                background: '#166534',
                                borderRadius: 99
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', minWidth: 42, textAlign: 'right' }}>
                            {prov.progressPercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {prov.status}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#64748b' }}>
                        {prov.lastShipmentDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
