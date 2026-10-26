'use client';

import React, { useState, useEffect } from 'react';
import { CircleDollarSign, HandCoins, Wallet, TrendingUp, Eye, Users, FileCheck2, Layers, Lock, ShieldCheck } from 'lucide-react';

export interface CommodityAllocation {
  id?: string | number;
  commodity?: string;
  category?: string;
  fund?: number | null;
  total_amount?: number | null;
  ws_2024?: number | null;
  ds_2024_25?: number | null;
  ws_2025?: number | null;
  ds_2025_26?: number | null;
  claimed?: number | null;
  unutilized?: number | null;
  transactions_count?: number | null;
}

interface CommodityDashboardProps {
  initialAllocations?: CommodityAllocation[];
  totalBeneficiaries?: number;
  totalTransactions?: number;
  canManageClaims?: boolean;
}

export default function CommodityDashboard({
  initialAllocations = [],
  totalBeneficiaries,
  totalTransactions,
  canManageClaims = true,
}: CommodityDashboardProps) {
  const [canClaim, setCanClaim] = useState<boolean>(canManageClaims);

  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const json = await res.json();
          if (json?.account?.permissions) {
            setCanClaim(json.account.permissions.can_manage_claims !== false);
          } else if (json?.account) {
            setCanClaim(['super_admin', 'admin', 'officer'].includes(json.account.role));
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
  // Combine drone_0001 and drone_0002 into a single consolidated record
  const combinedSource: CommodityAllocation[] = [];
  let droneCombined: CommodityAllocation | null = null;

  for (const item of initialAllocations) {
    const rawName = (item.commodity || item.category || '').trim();
    if (/^drone_000[12]$/i.test(rawName)) {
      if (!droneCombined) {
        droneCombined = {
          ...item,
          commodity: 'DRONE',
          category: 'DRONE',
          fund: item.fund !== null && item.fund !== undefined ? Number(item.fund) : null,
          ws_2024: item.ws_2024 !== null && item.ws_2024 !== undefined ? Number(item.ws_2024) : null,
          ds_2024_25: item.ds_2024_25 !== null && item.ds_2024_25 !== undefined ? Number(item.ds_2024_25) : null,
          ws_2025: item.ws_2025 !== null && item.ws_2025 !== undefined ? Number(item.ws_2025) : (item.total_amount !== null && item.total_amount !== undefined ? Number(item.total_amount) : null),
          ds_2025_26: item.ds_2025_26 !== null && item.ds_2025_26 !== undefined ? Number(item.ds_2025_26) : null,
          total_amount: item.total_amount !== null && item.total_amount !== undefined ? Number(item.total_amount) : (item.ws_2025 !== null && item.ws_2025 !== undefined ? Number(item.ws_2025) : null),
          claimed: item.claimed !== null && item.claimed !== undefined ? Number(item.claimed) : null,
          unutilized: item.unutilized !== null && item.unutilized !== undefined ? Number(item.unutilized) : null,
        };
      } else {
        const sumVal = (a: any, b: any) => {
          if (a === null && b === null) return null;
          return (Number(a) || 0) + (Number(b) || 0);
        };
        droneCombined.fund = sumVal(droneCombined.fund, item.fund);
        droneCombined.ws_2024 = sumVal(droneCombined.ws_2024, item.ws_2024);
        droneCombined.ds_2024_25 = sumVal(droneCombined.ds_2024_25, item.ds_2024_25);
        droneCombined.ws_2025 = sumVal(droneCombined.ws_2025, item.ws_2025 ?? item.total_amount);
        droneCombined.ds_2025_26 = sumVal(droneCombined.ds_2025_26, item.ds_2025_26);
        droneCombined.total_amount = sumVal(droneCombined.total_amount, item.total_amount ?? item.ws_2025);
        droneCombined.claimed = sumVal(droneCombined.claimed, item.claimed ?? item.total_amount ?? item.ws_2025);
        droneCombined.unutilized = sumVal(droneCombined.unutilized, item.unutilized);
      }
    } else {
      combinedSource.push(item);
    }
  }

  if (droneCombined) {
    combinedSource.push(droneCombined);
  }

  // Map items, supporting both category_totals (category, total_amount) and standard commodity_allocations
  const allocations = combinedSource.map((item) => {
    const rawCommodity = (item.commodity || item.category || 'Unknown').trim();
    let commodity = rawCommodity;
    if (rawCommodity.toUpperCase() === 'DF_00001') {
      commodity = 'IOF';
    } else if (rawCommodity.toUpperCase() === 'DASEEDS_00001') {
      commodity = 'Hybrid Seeds';
    } else if (rawCommodity.toUpperCase() === 'DA-AMLR_0001') {
      commodity = 'SA';
    }
    const ws_2024 = item.ws_2024 !== null && item.ws_2024 !== undefined ? Number(item.ws_2024) : null;
    const ds_2024_25 = item.ds_2024_25 !== null && item.ds_2024_25 !== undefined ? Number(item.ds_2024_25) : null;

    // total_amount is mapped under ws claimed 2025
    const ws_2025Raw = item.ws_2025 ?? item.total_amount ?? null;
    const ws_2025 = ws_2025Raw !== null && ws_2025Raw !== undefined ? Number(ws_2025Raw) : null;
    const ds_2025_26 = item.ds_2025_26 !== null && item.ds_2025_26 !== undefined ? Number(item.ds_2025_26) : null;

    const hasFund = item.fund !== null && item.fund !== undefined && !isNaN(Number(item.fund)) && Number(item.fund) > 0;
    const fund = hasFund ? Number(item.fund) : null;

    const seasonalSum = (ws_2024 || 0) + (ds_2024_25 || 0) + (ws_2025 || 0) + (ds_2025_26 || 0);
    const claimed = item.claimed !== undefined && item.claimed !== null ? Number(item.claimed) : seasonalSum;

    const unutilized = item.unutilized !== undefined && item.unutilized !== null
      ? Number(item.unutilized)
      : (fund !== null ? fund - claimed : null);

    return {
      ...item,
      commodity,
      fund,
      ws_2024,
      ds_2024_25,
      ws_2025,
      ds_2025_26,
      claimed,
      unutilized,
    };
  });

  const hasAnyFund = allocations.some((curr) => curr.fund !== null && curr.fund !== undefined);
  const totalFund = allocations.reduce((acc, curr) => acc + (curr.fund ?? 0), 0);
  const totalClaimed = allocations.reduce((acc, curr) => acc + (curr.claimed ?? 0), 0);
  const totalUnutilized = allocations.reduce((acc, curr) => acc + (curr.unutilized ?? 0), 0);
  const totalWs2024 = allocations.reduce((acc, curr) => acc + (curr.ws_2024 ?? 0), 0);
  const totalDs2024_25 = allocations.reduce((acc, curr) => acc + (curr.ds_2024_25 ?? 0), 0);
  const totalWs2025 = allocations.reduce((acc, curr) => acc + (curr.ws_2025 ?? 0), 0);
  const totalDs2025_26 = allocations.reduce((acc, curr) => acc + (curr.ds_2025_26 ?? 0), 0);
  const claimRate = hasAnyFund && totalFund > 0 ? (totalClaimed / totalFund) * 100 : (totalClaimed > 0 ? 100 : 0);

  const formatPesos = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    const num = Number(val);
    return '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <section className="section section-muted allocation-dashboard-section" id="commodity-dashboard" aria-labelledby="commodity-dashboard-title">
      <div className="page-container">
        <div className="section-heading allocation-heading">
          <div>
            <span className="section-kicker">Rice Program Coordinating Unit</span>
            <h2 id="commodity-dashboard-title">Commodity claims dashboard</h2>
            <p>Live fund allocation and claim status records.</p>
          </div>
        </div>

        {!canClaim && (
          <div
            style={{
              padding: '12px 18px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
              color: '#991b1b',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <Lock size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
            <div>
              <strong>Voucher Claims Certification Restricted:</strong> The Super Administrator has revoked commodity voucher verification and redemption certification powers for your account (Module 03). Fund allocations and distribution statistics remain accessible in read-only audit mode.
            </div>
          </div>
        )}

        <div className="summary-grid allocation-summary-grid">
          {hasAnyFund && totalFund > 0 ? (
            <>
              <article className="summary-card">
                <div className="summary-top">
                  <span>Total allocation</span>
                  <CircleDollarSign className="summary-icon" size={20} />
                </div>
                <div className="summary-value">{formatPesos(totalFund)}</div>
                <span className="allocation-card-note">Total commodity fund</span>
              </article>
              <article className="summary-card">
                <div className="summary-top">
                  <span>Total claimed</span>
                  <HandCoins className="summary-icon" size={20} />
                </div>
                <div className="summary-value">{formatPesos(totalClaimed)}</div>
                <span className="allocation-card-note">Across claim periods</span>
              </article>
              <article className="summary-card">
                <div className="summary-top">
                  <span>Unutilized</span>
                  <Wallet className="summary-icon" size={20} />
                </div>
                <div className="summary-value">{formatPesos(totalUnutilized)}</div>
                <span className="allocation-card-note">Remaining balance</span>
              </article>
              <article className="summary-card">
                <div className="summary-top">
                  <span>Claim utilization</span>
                  <TrendingUp className="summary-icon" size={20} />
                </div>
                <div className="summary-value">{`${claimRate.toFixed(1)}%`}</div>
                <span className="allocation-card-note">Of total allocation claimed</span>
              </article>
            </>
          ) : (
            <>
              <article className="summary-card">
                <div className="summary-top">
                  <span>Total Beneficiary Claims</span>
                  <CircleDollarSign className="summary-icon" size={20} />
                </div>
                <div className="summary-value">{formatPesos(totalClaimed)}</div>
                <span className="allocation-card-note">Total amount under beneficiary</span>
              </article>
              <article className="summary-card">
                <div className="summary-top">
                  <span>Beneficiaries Served</span>
                  <Users className="summary-icon" size={20} />
                </div>
                <div className="summary-value">
                  {totalBeneficiaries !== undefined ? totalBeneficiaries.toLocaleString('en-PH') : '0'}
                </div>
                <span className="allocation-card-note">Unique RSBSA farmers</span>
              </article>
              <article className="summary-card">
                <div className="summary-top">
                  <span>Served Transactions</span>
                  <FileCheck2 className="summary-icon" size={20} />
                </div>
                <div className="summary-value">
                  {totalTransactions !== undefined ? totalTransactions.toLocaleString('en-PH') : '0'}
                </div>
                <span className="allocation-card-note">Live service records</span>
              </article>
              <article className="summary-card">
                <div className="summary-top">
                  <span>Commodities Tracked</span>
                  <Layers className="summary-icon" size={20} />
                </div>
                <div className="summary-value">{allocations.length} Active</div>
                <span className="allocation-card-note">Categorized claim programs</span>
              </article>
            </>
          )}
        </div>

        <div className="allocation-progress" role="group" aria-label="Claims progress">
          <div className="allocation-progress-heading">
            <strong>Beneficiary claims distribution</strong>
            <span>
              {hasAnyFund && totalFund > 0
                ? `${claimRate.toFixed(1)}% claimed`
                : `${(totalTransactions ?? 0).toLocaleString('en-PH')} transactions across ${allocations.length} commodities`}
            </span>
          </div>
          <div
            className="allocation-progress-track"
            role="progressbar"
            aria-label="Percentage of fund claimed"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={parseFloat(claimRate.toFixed(1))}
          >
            <span style={{ width: `${Math.min(100, Math.max(0, claimRate))}%` }}></span>
          </div>
          <div className="allocation-progress-legend">
            <span>
              <i className="allocation-legend-claimed"></i>Total Beneficiary Claims <strong>{formatPesos(totalClaimed)}</strong>
            </span>
            {hasAnyFund && (
              <span>
                <i className="allocation-legend-unutilized"></i>Unutilized <strong>{formatPesos(totalUnutilized)}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="surface allocation-table-surface">
          <div className="allocation-table-heading">
            <div>
              <h3>Allocation by commodity</h3>
              <p>Live data synchronized from PSS-IMC Farmers Serve Terminal</p>
            </div>
          </div>
          <div className="table-wrap allocation-table-wrap">
            <table className="data-table allocation-table" aria-label="Commodity fund allocation and claims">
              <thead>
                <tr>
                  <th>Commodity</th>
                  <th className="numeric">Fund (FY 2024)</th>
                  <th className="numeric">WS Claimed 2024</th>
                  <th className="numeric">DS Claimed 2024–2025</th>
                  <th className="numeric">WS Claimed 2025</th>
                  <th className="numeric">DS Claimed 2025–2026</th>
                  <th className="numeric">Total Claimed</th>
                  <th className="numeric">Unutilized for Return</th>
                </tr>
              </thead>
              <tbody>
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state" style={{ minHeight: 160 }}>
                        <span className="empty-icon">
                          <Eye size={20} />
                        </span>
                        <h3>No commodity allocation records yet.</h3>
                        <p>Records inserted into the database will appear here automatically.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  allocations.map((a, i) => (
                    <tr key={a.id || a.commodity || i}>
                      <td className="commodity-name">{a.commodity}</td>
                      <td className="numeric">{formatPesos(a.fund)}</td>
                      <td className="numeric">{formatPesos(a.ws_2024)}</td>
                      <td className="numeric">{formatPesos(a.ds_2024_25)}</td>
                      <td className="numeric">{formatPesos(a.ws_2025)}</td>
                      <td className="numeric">{formatPesos(a.ds_2025_26)}</td>
                      <td className="numeric">{formatPesos(a.claimed)}</td>
                      <td className="numeric">{formatPesos(a.unutilized)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {allocations.length > 0 && (
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td className="numeric">{hasAnyFund ? formatPesos(totalFund) : '—'}</td>
                    <td className="numeric">{totalWs2024 > 0 ? formatPesos(totalWs2024) : '—'}</td>
                    <td className="numeric">{totalDs2024_25 > 0 ? formatPesos(totalDs2024_25) : '—'}</td>
                    <td className="numeric">{formatPesos(totalWs2025)}</td>
                    <td className="numeric">{totalDs2025_26 > 0 ? formatPesos(totalDs2025_26) : '—'}</td>
                    <td className="numeric">{formatPesos(totalClaimed)}</td>
                    <td className="numeric">{hasAnyFund ? formatPesos(totalUnutilized) : '—'}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
