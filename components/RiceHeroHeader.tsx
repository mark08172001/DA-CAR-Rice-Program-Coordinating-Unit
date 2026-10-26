'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';

export default function RiceHeroHeader() {
  const pathname = usePathname();

  // Dynamic contextual details based on the exact rice subpage
  let eyebrow = 'Module 02: Rice Program Operations';
  let heading = 'Rice Program Operations';
  let description =
    'Official monitoring of current rice program activities, fund releases, farmer services, and reports across the Cordilleras.';
  let parent = { label: 'Rice Operations', href: '/rice/physical' };

  if (pathname.includes('/rice/physical/ds-2026-2027')) {
    eyebrow = 'Module 02: Rice Program Operations';
    heading = 'DS 2026-2027 Distribution Status';
    description =
      'Official Dry Season (DS) 2026-2027 live monitoring of regional seed consignments, provincial allocations, drop-off deliveries, and farmer drop-offs across the Cordillera Administrative Region.';
    parent = { label: 'Physical Targets', href: '/rice/physical' };
  } else if (pathname.startsWith('/rice/physical')) {
    eyebrow = 'Module 02: Rice Program Operations';
    heading = 'Physical Targets & Accomplishments';
    description =
      'FY 2026 Wet Season (WS) and Dry Season (DS) Operations Register — tracking regional seed allocations, inorganic fertilizers, provincial area coverage, and commodity procurement across the Cordilleras.';
    parent = { label: 'Rice Operations', href: '/rice/physical' };
  } else if (pathname.startsWith('/rice/programs')) {
    eyebrow = 'Module 02: Rice Program Operations';
    heading = 'Rice Programs Register';
    description =
      'Official banner program interventions under PSS, ESETS, RD, and INS managed by the Regional Rice Program Coordinating Unit.';
    parent = { label: 'Rice Operations', href: '/rice/programs' };
  } else if (pathname.startsWith('/rice/farmers')) {
    eyebrow = 'Module 04: Beneficiaries & Field Services';
    heading = 'Beneficiaries & Farmers Directory';
    description =
      'Live beneficiary service records, RSBSA-verified farmer listings, PanaloKard assistance, and agricultural subsidy disbursements.';
    parent = { label: 'Field Services', href: '/rice/farmers' };
  } else if (pathname.startsWith('/rice/commodity-claims')) {
    eyebrow = 'Module 04: Beneficiaries & Field Services';
    heading = 'Commodity Claims Dashboard';
    description =
      'Certified RSBSA farmer beneficiary transactions, subsidy redemptions, and regional distribution totals for hybrid palay seeds and fertilizers.';
    parent = { label: 'Field Services', href: '/commodity-claims' };
  } else if (pathname.startsWith('/rice/balances')) {
    eyebrow = 'Module 03: Financial Management';
    heading = 'Fund Balances & Obligation Budget';
    description =
      'Registry of Allotments and Obligations (RAO) tracking, utilization rates, category disbursements, and provincial fund allocations.';
    parent = { label: 'Financials', href: '/rice/balances' };
  } else if (pathname.startsWith('/rice/disbursement')) {
    eyebrow = 'Module 03: Financial Management';
    heading = 'Disbursement Records';
    description =
      'Official fund disbursement tracking, voucher settlements, and regional check releases for rice programs.';
    parent = { label: 'Financials', href: '/rice/disbursement' };
  } else if (pathname.startsWith('/rice/reports')) {
    eyebrow = 'Module 03: Financial Management';
    heading = 'Official Regional Reports';
    description =
      'Official monitoring summaries, quarterly physical and financial accomplishments, and validated field inspection records.';
    parent = { label: 'Financials', href: '/rice/reports' };
  }

  return (
    <div className="minimal-hero-container">
      <section className="minimal-page-hero-card" aria-label={heading}>
        <div className="minimal-page-hero-pattern" aria-hidden="true" />
        <div className="minimal-page-hero-content">
          <div className="minimal-hero-kicker-badge">
            <span className="kicker-pulse-dot" />
            <span>{eyebrow}</span>
          </div>
          <h1 className="minimal-page-hero-title">{heading}</h1>
          <p className="minimal-page-hero-desc">{description}</p>
          <nav className="minimal-hero-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/" className="minimal-hero-bc-link" title="Portal Home">
              <Home size={12} />
              <span>Home</span>
            </Link>
            <ChevronRight size={13} className="minimal-hero-bc-sep" />
            <Link href={parent.href} className="minimal-hero-bc-link">
              {parent.label}
            </Link>
            <ChevronRight size={13} className="minimal-hero-bc-sep" />
            <span className="minimal-hero-bc-current">{heading}</span>
          </nav>
        </div>
      </section>
    </div>
  );
}
