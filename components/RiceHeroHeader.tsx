'use client';

import { usePathname } from 'next/navigation';

export default function RiceHeroHeader() {
  const pathname = usePathname();

  // Dynamic contextual details based on the exact rice subpage
  let heading = 'Physical & Programs';
  let description =
    'Official monitoring of current rice program activities, physical targets, farmer services, and banner registers across the Cordilleras.';

  if (pathname.includes('/rice/physical/ds-2026-2027')) {
    heading = 'DS 2026-2027 Distribution Status';
    description =
      'Official Dry Season (DS) 2026-2027 live monitoring of regional seed consignments, provincial allocations, drop-off deliveries, and farmer drop-offs across the Cordillera Administrative Region.';
  } else if (pathname.startsWith('/rice/physical')) {
    heading = 'Physical Targets & Accomplishments';
    description =
      'FY 2026 Wet Season (WS) and Dry Season (DS) Operations Register — tracking regional seed allocations, inorganic fertilizers, provincial area coverage, and commodity procurement across the Cordilleras.';
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
  } else if (pathname.startsWith('/rice/reports')) {
    heading = 'Official Regional Reports';
    description =
      'Official monitoring summaries, quarterly physical and financial accomplishments, and validated field inspection records.';
  }

  return (
    <div className="minimal-hero-container">
      <section className="minimal-page-hero-card" aria-label={heading}>
        <div className="minimal-page-hero-pattern" aria-hidden="true" />
        <div className="minimal-page-hero-content">
          <h1 className="minimal-page-hero-title">{heading}</h1>
          <p className="minimal-page-hero-desc">{description}</p>
        </div>
      </section>
    </div>
  );
}
