'use client';

import { usePathname } from 'next/navigation';

export default function RiceHeroHeader() {
  const pathname = usePathname();

  // Dynamic contextual details based on the exact rice subpage
  let heading = 'Physical & Programs';
  let description =
    'Official monitoring of current rice program activities, physical targets, farmer services, and banner registers across the Cordilleras.';

  if (pathname.includes('/rice/physical/ds-2026-2027')) {
    heading = 'Dry Season - DS 2026-2027 Distribution Status';
    description = '';
  } else if (pathname.includes('/rice/physical/deliveries')) {
    heading = 'Deliveries';
    description =
      'Official monitoring of agricultural deliveries, seed dispatches, and provincial distribution records across the Cordilleras.';
  } else if (pathname.startsWith('/rice/physical')) {
    heading = 'Physical Dashboard';
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
  } else if (pathname.startsWith('/rice/balances/dashboard')) {
    heading = 'Dashboard';
    description = '';
  } else if (pathname.startsWith('/rice/balances')) {
    heading = 'Allotment vs Obligation';
    description = '';
  } else if (pathname.startsWith('/rice/disbursement')) {
    heading = 'Disbursement Records';
    description =
      'Official fund disbursement tracking, voucher settlements, and regional check releases for rice programs.';
  } else if (pathname.startsWith('/rice/reports') || pathname === '/') {
    heading = 'Official Financial Report';
    description =
      'Official monitoring summaries, quarterly physical and financial accomplishments, and validated field inspection records.';
  }

  const isFinancialReport = pathname.startsWith('/rice/reports') || pathname === '/';
  const isObligation = pathname.startsWith('/rice/balances');
  const isDisbursement = pathname.startsWith('/rice/disbursement');
  const isDeliveries = pathname.includes('/rice/physical/deliveries');
  const isDrySeason = pathname.includes('/rice/physical/ds-2026-2027');
  const isPhysicalDashboard =
    pathname.startsWith('/rice/physical') &&
    !isDrySeason &&
    !isDeliveries;
  const isThemedHero =
    isFinancialReport ||
    isObligation ||
    isDisbursement ||
    isPhysicalDashboard ||
    isDeliveries ||
    isDrySeason;
  const isCompact = !description;

  return (
    <div
      className="minimal-hero-container"
      style={isCompact ? { padding: '14px 0 0' } : undefined}
    >
      <section
        className="minimal-page-hero-card"
        aria-label={heading}
        style={{
          background: '#073b2e',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          ...(isDrySeason
            ? { minHeight: 140, borderRadius: 16 }
            : isCompact
            ? { minHeight: 'unset', borderRadius: 12 }
            : { minHeight: 200, borderRadius: 20 }),
        }}
      >
        <div
          className="minimal-page-hero-pattern"
          style={{ display: 'none' }}
          aria-hidden="true"
        />

        {/* Themed Hero Background Visual Layer (Seamless Inset 0 - Zero Seam Cut Lines) */}
        {isThemedHero && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 1,
              overflow: 'hidden',
            }}
            aria-hidden="true"
          >
            {/* 1. Financial Report Banner Image */}
            {isFinancialReport && (
              <img
                src="/seed-delivery-bw.jpg"
                alt="Rice seeds delivery and loading in truck"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 'clamp(460px, 50%, 720px)',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: '74% 72%',
                  opacity: 0.72,
                  filter: 'grayscale(100%) contrast(120%) brightness(95%)',
                  maskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.1) 12%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,1) 75%)',
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.1) 12%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,1) 75%)',
                }}
              />
            )}

            {/* 2. Obligation Banner Image (Speaker briefing crowd with microphone & seed sacks) */}
            {isObligation && (
              <img
                src="/obligation-briefing-bw.jpg"
                alt="Program briefing and seed distribution kick-off ceremony"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 'clamp(460px, 50%, 720px)',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: '50% 38%',
                  opacity: 0.72,
                  filter: 'grayscale(100%) contrast(120%) brightness(95%)',
                  maskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.1) 12%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,1) 75%)',
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.1) 12%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,1) 75%)',
                }}
              />
            )}

            {/* 3. Disbursement Banner Image (River boats transporting seed sacks) */}
            {isDisbursement && (
              <img
                src="/disbursement-river-delivery-bw.jpg"
                alt="River boats transporting seeds and agricultural inputs"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 'clamp(460px, 50%, 720px)',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 65%',
                  opacity: 0.72,
                  filter: 'grayscale(100%) contrast(120%) brightness(95%)',
                  maskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.1) 12%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,1) 75%)',
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.1) 12%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,1) 75%)',
                }}
              />
            )}

            {/* 4. Physical Dashboard Banner Image (Zoomed out to capture the full group & seed sacks) */}
            {isPhysicalDashboard && (
              <img
                src="/physical-dashboard-bw.jpg"
                alt="Farmer beneficiaries sitting with certified seed sacks during program distribution"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 'clamp(440px, 48%, 680px)',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 40%',
                  opacity: 0.72,
                  filter: 'grayscale(100%) contrast(120%) brightness(95%)',
                  maskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.1) 12%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,1) 75%)',
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.1) 12%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,1) 75%)',
                }}
              />
            )}

            {/* 5. Deliveries Banner Image (Waving farmer on motorcycle sidecar with certified seeds) */}
            {isDeliveries && (
              <img
                src="/deliveries-tricycle-bw.jpg"
                alt="Farmer beneficiary waving from motorcycle cart loaded with certified rice seed sacks"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 'clamp(440px, 48%, 680px)',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 20%',
                  opacity: 0.72,
                  filter: 'grayscale(100%) contrast(120%) brightness(95%)',
                  maskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.1) 12%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,1) 75%)',
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.1) 12%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,1) 75%)',
                }}
              />
            )}

            {/* 6. Dry Season Banner Image (Distribution queue and seed sacks in community center) */}
            {isDrySeason && (
              <img
                src="/dry-season-distribution-bw.jpg"
                alt="Farmer beneficiaries queueing for certified seed distribution in community center"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 'clamp(460px, 50%, 720px)',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 70%',
                  opacity: 0.72,
                  filter: 'grayscale(100%) contrast(120%) brightness(95%)',
                  maskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.1) 12%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,1) 75%)',
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.1) 12%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,1) 75%)',
                }}
              />
            )}

            {/* Seamless Full-Card Gradient Overlay: 100% solid #073b2e on left, smoothly vanishing into the photo */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(to right, #073b2e 0%, #073b2e 30%, rgba(7, 59, 46, 0.85) 55%, rgba(7, 59, 46, 0.25) 85%, transparent 100%)',
              }}
            />
          </div>
        )}

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
