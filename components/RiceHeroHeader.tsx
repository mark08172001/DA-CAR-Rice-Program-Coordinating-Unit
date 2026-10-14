'use client';

import { usePathname } from 'next/navigation';

export default function RiceHeroHeader() {
  const pathname = usePathname();

  // Determine the active module for the current route under /rice
  let eyebrow = 'Module 02: Rice Program Operations';

  if (
    pathname.startsWith('/rice/farmers') ||
    pathname.startsWith('/rice/commodity-claims')
  ) {
    eyebrow = 'Module 03: Beneficiaries & Field Services';
  } else if (
    pathname.startsWith('/rice/balances') ||
    pathname.startsWith('/rice/reports')
  ) {
    eyebrow = 'Module 04: Financial Management';
  } else if (
    pathname.startsWith('/rice/physical') ||
    pathname.startsWith('/rice/programs') ||
    pathname === '/rice'
  ) {
    eyebrow = 'Module 02: Rice Program Operations';
  }

  return (
    <section className="page-hero">
      <div className="page-container">
        <span className="eyebrow">{eyebrow}</span>
        <h1>Rice Program Coordinating Unit</h1>
        <p>
          Official monitoring of current rice program activities, fund releases, farmer services, and reports.
        </p>
      </div>
    </section>
  );
}
