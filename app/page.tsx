import Link from 'next/link';
import {
  Sprout,
  Wheat,
  Building2,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Info,
  Lock,
  LogIn,
  Users,
  Activity,
  FileText,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  Wallet,
  MapPin,
  Phone,
} from 'lucide-react';
import HeroCarousel from '@/components/HeroCarousel';
import InterventionCategories from '@/components/InterventionCategories';
import ActivityCalendar, { RegionalActivity } from '@/components/ActivityCalendar';
import { computeActivityStatus } from '@/utils/activityStatus';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getAccountByEmail } from '@/utils/adminStore';
import { getAuthoritativePrograms, programToRegionalActivity } from '@/utils/programsStore';
import { getAuthoritativeActivities } from '@/utils/activitiesStore';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let programs: any[] = [];
  let activities: RegionalActivity[] = [];
  let balances: any[] = [];
  let reports: any[] = [];
  let farmerCount = 0;
  let user: any = null;

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const [userRes, progRes, actRes, balRes, repRes, farmerRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('programs').select('*').order('name', { ascending: true }),
      supabase.from('regional_activities').select('*').order('start_date', { ascending: true }),
      supabase.from('balances').select('*').order('date_received', { ascending: false }),
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('farmer_serve_transactions').select('*', { count: 'exact', head: true }),
    ]);

    if (userRes.data?.user) {
      user = userRes.data.user;
    }
    // Load authoritative programs (including local updates to status)
    programs = getAuthoritativePrograms(progRes.data);

    if (balRes.data) balances = balRes.data;
    if (repRes.data) reports = repRes.data;
    if (farmerRes.count !== null && farmerRes.count !== undefined) {
      farmerCount = farmerRes.count;
    }
    const authoritativeActs = getAuthoritativeActivities(actRes.data as any);
    activities = authoritativeActs.map((act) => ({
      ...act,
      status: computeActivityStatus(act.start_date, act.end_date),
    }));
  } catch (e) {
    console.error('Error fetching data for home page:', e);
  }

  // Convert rice banner programs to calendar activities
  const programActivities = programs.map(programToRegionalActivity);
  const combinedActivities = [...programActivities, ...activities];

  const totalOngoingActivities = combinedActivities.filter((a) => a.status === 'ongoing').length;
  const firstOngoing = combinedActivities.find((a) => a.status === 'ongoing');

  let activeEmail = user?.email;
  if (!activeEmail) {
    try {
      const cookieStore = await cookies();
      const adminCookie = cookieStore.get('da_admin_session')?.value;
      if (adminCookie) {
        const parsed = JSON.parse(decodeURIComponent(adminCookie));
        if (parsed?.email === 'super.admin@car.da.gov.ph' || parsed?.email === 'admin@car.da.gov.ph') {
          activeEmail = parsed.email;
        }
      }
    } catch { }
  }

  const userAccount = activeEmail ? getAccountByEmail(activeEmail) : null;
  const userRole = (userAccount?.role || user?.user_metadata?.role || (activeEmail === 'super.admin@car.da.gov.ph' ? 'super_admin' : 'staff')).toLowerCase();
  const isSuperAdmin = userRole === 'super_admin' || activeEmail === 'super.admin@car.da.gov.ph';
  const allowedModules: string[] = isSuperAdmin
    ? ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance', 'mod-admin']
    : (userAccount?.allowed_modules || ['mod-general']);

  const canAccessRice = allowedModules.includes('mod-rice');

  return (
    <div className="minimal-portal-page">
      <HeroCarousel />

      {/* 3 Minimal KPI Stat Cards */}
      <section className="minimal-kpi-section" id="rice-dashboard" aria-label="Regional rice program KPIs">
        <div className="page-container">
          <div className="minimal-kpi-grid">
            {/* Card 1: Beneficiaries */}
            <article className="minimal-kpi-card">
              <div className="minimal-kpi-top">
                <span className="minimal-kpi-label">Beneficiaries Served</span>
                <div className="minimal-kpi-icon-wrap">
                  <Users size={16} />
                </div>
              </div>
              <div className="minimal-kpi-val-row">
                <span className="minimal-kpi-value">
                  {farmerCount > 0 ? farmerCount.toLocaleString('en-PH') : '41,792'}
                </span>
              </div>
              <Link href="/rice/farmers" className="minimal-kpi-foot">
                <span>Live served transactions across 6 provinces</span>
                <ChevronRight size={14} />
              </Link>
            </article>

            {/* Card 2: Registered Programs */}
            <article className="minimal-kpi-card">
              <div className="minimal-kpi-top">
                <span className="minimal-kpi-label">Registered Programs</span>
                <div className="minimal-kpi-icon-wrap">
                  <Sprout size={16} />
                </div>
              </div>
              <div className="minimal-kpi-val-row">
                <span className="minimal-kpi-value">
                  {programs.length > 0 ? programs.length : 2}
                </span>
              </div>
              <Link href="/rice/programs" className="minimal-kpi-foot">
                <span>National Rice & Highland Heritage Programs</span>
                <ChevronRight size={14} />
              </Link>
            </article>

            {/* Card 3: Ongoing Activities */}
            <a href="#event-calendar" className="minimal-kpi-card">
              <div className="minimal-kpi-top">
                <span className="minimal-kpi-label">Ongoing Activities</span>
                <div className="minimal-kpi-icon-wrap">
                  <Activity size={16} />
                </div>
              </div>
              <div className="minimal-kpi-val-row">
                <span className="minimal-kpi-value">
                  {totalOngoingActivities}
                </span>
                {totalOngoingActivities > 0 ? (
                  <span className="minimal-kpi-pill green">
                    {firstOngoing?.province || 'Active in Field'}
                  </span>
                ) : (
                  <span className="minimal-kpi-pill" style={{ background: '#f1f5f9', color: '#64748b' }}>
                    No Active Events
                  </span>
                )}
              </div>
              <div className="minimal-kpi-foot">
                <span>Live from field event calendar</span>
                <ChevronRight size={14} />
              </div>
            </a>
          </div>

          {/* Minimal Operations Section (Two-column layout from screenshot) */}
          <div className="minimal-ops-layout">
            {/* Left Column: Large Dark Green Card */}
            <div className="minimal-ops-card">
              <div className="minimal-ops-kicker">— CURRENT OPERATIONS</div>
              <h2 className="minimal-ops-title">Rice program activity at a glance</h2>
              <p className="minimal-ops-desc">
                Use this public dashboard to monitor active regional programs, provincial fund movement, farmer services, and official field reports across the Cordillera provinces.
              </p>
              <div className="minimal-province-pills">
                {['Kalinga', 'Apayao', 'Abra', 'Ifugao', 'Mountain Province', 'Benguet'].map((province) => (
                  <Link
                    key={province}
                    href={`/provinces`}
                    className="minimal-province-pill"
                    title={`View ${province} regional agricultural data`}
                  >
                    {province}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Column: Two Stacked Clean White Cards */}
            <div className="minimal-quick-stack">
              <Link href="/rice/balances" className="minimal-quick-card">
                <div className="minimal-quick-icon-wrap">
                  <Wallet size={18} />
                </div>
                <div className="minimal-quick-body">
                  <strong>Fund balances</strong>
                </div>
                <ChevronRight size={16} className="minimal-quick-chevron" />
              </Link>

              <Link href="/rice/farmers" className="minimal-quick-card">
                <div className="minimal-quick-icon-wrap">
                  <Users size={18} />
                </div>
                <div className="minimal-quick-body">
                  <strong>Farmer directory</strong>
                </div>
                <ChevronRight size={16} className="minimal-quick-chevron" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Regional Agricultural Event & Activities Calendar (Module 01 Live Public Calendar) */}
      <ActivityCalendar
        key={combinedActivities.length}
        initialActivities={combinedActivities}
        initialUserAccount={userAccount}
      />

      {/* Programs and Services */}
      <section className="section" id="portal-services">
        <div className="page-container">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Rice Program Coordinating Unit</span>
              <h2>Programs and services</h2>
              <p>Find department services, regional information, and public data in one place.</p>
            </div>
            {user ? (
              <Link href="/rice/programs" className="button button-outline">
                All programs register <ArrowRight size={15} />
              </Link>
            ) : (
              <Link href="/about" className="button button-outline">
                About the unit <ArrowRight size={15} />
              </Link>
            )}
          </div>

          <InterventionCategories />
        </div>
      </section>

      {/* Public Information & Personnel Gateway (shown only to unauthenticated visitors) */}
      {!activeEmail && (
        <section className="section" style={{ paddingTop: 0, paddingBottom: 40 }} aria-label="Module 01 Welcome & Personnel Sign-In">
          <div className="page-container">
            <div className="public-welcome-card">
              <div className="public-welcome-badge">
                <ShieldCheck size={14} />
                <span>Module 01: Public Information Portal</span>
              </div>
              <div className="public-welcome-grid">
                <div className="public-welcome-content">
                  <h2>Official Public Portal · Rice Program Coordinating Unit</h2>
                  <p>
                    Open public directory of regional agricultural events, ongoing extension schedules,
                    agency mandates, and citizen assistance desks across the 6 Cordillera provinces.
                  </p>
                  <div className="public-welcome-points">
                    <div className="public-point">
                      <span className="point-dot"></span>
                      <Calendar size={14} />
                      <span>Live Agricultural Activity Calendar</span>
                    </div>
                    <div className="public-point">
                      <span className="point-dot"></span>
                      <Info size={14} />
                      <span>Coordinating Unit Mandate</span>
                    </div>
                    <div className="public-point">
                      <span className="point-dot"></span>
                      <Sprout size={14} />
                      <span>Cordillera Farming Initiatives</span>
                    </div>
                  </div>
                </div>
                <div className="public-welcome-gate">
                  <div className="personnel-gate-box">
                    <div className="gate-header">
                      <Lock size={15} />
                      <span>DA Personnel Gateway</span>
                    </div>
                    <p>
                      Modules 02–04 (Rice Operations, RSBSA Beneficiaries, and Financials) require authorized sign-in.
                    </p>
                    <Link href="/login" className="button button-primary gate-login-btn">
                      <LogIn size={14} />
                      <span>Personnel Sign In</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Two Highlight Cards: Operations Center & Coordinating Unit Mandate (Matching Screenshot) */}
      <section className="section" style={{ paddingTop: 0, paddingBottom: 50 }}>
        <div className="page-container">
          <div className="mandate-ops-grid-clean">
            {/* Left Card: Dark Forest Green Operations Center Card */}
            <article className="ops-center-card-dark">
              <div>
                <div className="ops-kicker-badge-gold">
                  <Wheat size={13} />
                  <span>DA-CAR Operations Center</span>
                </div>
                <h3 className="ops-card-title-serif">Rice Program Coordinating Unit</h3>
                <p className="ops-card-desc-muted">
                  Monitoring rice programs, food security initiatives, and farmer extension services to support Cordillera communities across Abra, Apayao, Benguet, Ifugao, Kalinga, and Mountain Province.
                </p>
              </div>

              <div className="ops-card-bottom-row">
                <div className="ops-contact-items">
                  <span className="ops-contact-item">
                    <MapPin size={13} className="contact-icon" />
                    <span>BPI Compound, Guisad Rd, Baguio City</span>
                  </span>
                  <span className="ops-contact-item">
                    <Phone size={13} className="contact-icon" />
                    <span>(074) 443-4921</span>
                  </span>
                </div>
                {canAccessRice ? (
                  <Link href="/rice/physical" className="ops-btn-action-gold">
                    <span>Visit Physical Operations</span>
                    <span>→</span>
                  </Link>
                ) : (
                  <Link href="/about" className="ops-btn-action-gold">
                    <span>Learn About the Unit</span>
                    <span>→</span>
                  </Link>
                )}
              </div>
            </article>

            {/* Right Card: Light Mint Coordinating Unit Mandate Card */}
            <article className="mandate-card-light">
              <div>
                <div className="mandate-kicker-badge-green">
                  <Sprout size={13} />
                  <span>Regional Charter & Framework</span>
                </div>
                <h3 className="mandate-card-title-serif">Coordinating Unit Mandate</h3>
                <p className="mandate-card-desc-muted">
                  Learn about the regional framework, agricultural targets, and operational objectives of the DA-CAR Rice Program under live Registry of Allotments and Obligations (RAO) governance.
                </p>
              </div>

              <div className="mandate-stats-triple-row">
                <div className="mandate-stat-mini-card">
                  <span className="mini-card-kicker">CORE TARGET</span>
                  <strong className="mini-card-val">Yield & Sufficiency</strong>
                </div>
                <div className="mandate-stat-mini-card">
                  <span className="mini-card-kicker">RSBSA REACH</span>
                  <strong className="mini-card-val">{farmerCount > 0 ? farmerCount.toLocaleString('en-PH') : '41,792'} Farmers</strong>
                </div>
                <div className="mandate-stat-mini-card">
                  <span className="mini-card-kicker">FUND TRACKING</span>
                  <strong className="mini-card-val mini-card-green">Live RAO Sheet</strong>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section section-muted">
        <div
          className="page-container"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 26, flexWrap: 'wrap' }}
        >
          <div>
            <span className="section-kicker">Public Information · Module 01</span>
            <h2 className="content-heading" style={{ margin: '8px 0 0', fontSize: 26 }}>
              Agriculture information for the Cordillera
            </h2>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)', lineHeight: 1.7 }}>
              Explore regional ongoing field schedules, agricultural operations, and department mandates.
            </p>
          </div>
          <Link href="/about" className="button button-primary">
            About Coordinating Unit
          </Link>
        </div>
      </section>
    </div>
  );
}

