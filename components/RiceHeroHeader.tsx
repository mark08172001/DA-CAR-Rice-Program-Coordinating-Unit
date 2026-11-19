'use client';

import { usePathname } from 'next/navigation';

export default function RiceHeroHeader() {
  const pathname = usePathname();

  // Dynamic contextual details based on the exact rice subpage
  let heading = 'Physical & Programs';
  let description =
    'Official monitoring of current rice program activities, physical targets, farmer services, and banner registers across the Cordilleras.';

  if (pathname.includes('/rice/physical/ds-2026-2027')) {
    heading = 'Dry Season';
    description = '';
  } else if (pathname.includes('/rice/physical/deliveries')) {
    heading = 'Deliveries';
    description =
      'Official monitoring of agricultural deliveries, seed dispatches, and provincial distribution records across the Cordilleras.';
  } else if (pathname.startsWith('/rice/physical')) {
    heading = 'Physical';
    description =
      'Physical targets, program operations, and monitoring across the Cordilleras.';
  } else if (pathname.startsWith('/rice/programs')) {
    heading = 'Rice Programs Register';
    description =
      'Official banner program interventions under PSS, ESETS, RD, and INS managed by the Regional Rice Program Coordinating Unit.';
  } else if (pathname.startsWith('/rice/farmers')) {
    heading = 'Beneficiaries & Farmers Directory';
    description =
      'Live beneficiary service records, RSBSA-verified farmer listings, PanaloKard assistance, and agricultural subsidy disbursements.';
  } else if (pathname.startsWith('/rice/commodity-claims')) {
    heading = 'Commodity Claims Dashboard';
    description =
      'Certified RSBSA farmer beneficiary transactions, subsidy redemptions, and regional distribution totals for hybrid palay seeds and fertilizers.';
  } else if (pathname.startsWith('/rice/balances')) {
    heading = 'Fund Balances & Obligation Budget';
    description =
      'Registry of Allotments and Obligations (RAO) tracking, utilization rates, category disbursements, and provincial fund allocations.';
  } else if (pathname.startsWith('/rice/disbursement')) {
    heading = 'Disbursement Records';
    description =
      'Official fund disbursement tracking, voucher settlements, and regional check releases for rice programs.';
  } else if (pathname.startsWith('/rice/reports') || pathname === '/') {
    heading = 'Official Financial Report';
    description =
      'Official monitoring summaries, quarterly physical and financial accomplishments, and validated field inspection records.';
  }

  const isCompact = !description;

  return (
    <div
      className="minimal-hero-container"
      style={isCompact ? { padding: '14px 0 0' } : undefined}
    >
      <section
        className="minimal-page-hero-card"
        aria-label={heading}
        style={
          isCompact
            ? {
                minHeight: 'unset',
                borderRadius: 12,
              }
            : undefined
        }
      >
        <div className="minimal-page-hero-pattern" aria-hidden="true" />
        <div
          className="minimal-page-hero-content"
          style={
            isCompact
              ? {
                  padding: '14px 24px',
                  maxWidth: '100%',
                }
              : undefined
          }
        >
          <h1
            className="minimal-page-hero-title"
            style={
              isCompact
                ? {
                    margin: 0,
                    fontSize: 'clamp(20px, 2.4vw, 24px)',
                  }
                : undefined
            }
          >
            {heading}
          </h1>
          {description ? <p className="minimal-page-hero-desc">{description}</p> : null}
        </div>
      </section>
    </div>
  );
}
