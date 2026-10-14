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
} from 'lucide-react';
import HeroCarousel from '@/components/HeroCarousel';
import InterventionCategories from '@/components/InterventionCategories';
import ActivityCalendar, { RegionalActivity } from '@/components/ActivityCalendar';
import { computeActivityStatus } from '@/utils/activityStatus';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getAccountByEmail } from '@/utils/adminStore';
import { getAuthoritativePrograms, programToRegionalActivity } from '@/utils/programsStore';

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
    if (actRes.data) {
      activities = (actRes.data as RegionalActivity[]).map((act) => ({
        ...act,
        status: computeActivityStatus(act.start_date, act.end_date),
      }));
    }
  } catch (e) {
    console.error('Error fetching data for home page:', e);
  }

  // Convert rice banner programs to calendar activities
  const programActivities = programs.map(programToRegionalActivity);
  const combinedActivities = [...programActivities, ...activities];

  const totalOngoingActivities = combinedActivities.filter((a) => a.status === 'ongoing').length;

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
    <>
      <HeroCarousel />

      <section className="intro-strip" id="priorities" aria-label="Department priorities">
        <div className="page-container intro-grid">
          <div className="intro-item">
            <span className="intro-icon">
              <Sprout size={18} />
            </span>
            <div>
              <strong>Sustainable agriculture</strong>
              <span>Supporting resilient local food systems</span>
            </div>
          </div>
          <div className="intro-item">
            <span className="intro-icon">
              <Wheat size={18} />
            </span>
            <div>
              <strong>Farmer-centered programs</strong>
              <span>Services for Cordillera communities</span>
            </div>
          </div>
          <div className="intro-item">
            <span className="intro-icon">
              <Building2 size={18} />
            </span>
            <div>
              <strong>Regional coordination</strong>
              <span>Working across the six provinces</span>
            </div>
          </div>
        </div>
      </section>

      {/* Rice Program Operations Overview (Live RCU Dashboard) */}
      <section className="content-section" style={{ paddingTop: 36, paddingBottom: 10 }} id="rice-dashboard">
        <div className="page-container">
          {/* Summary Grid */}
          <div className="summary-grid summary-grid-3">
            <article className="summary-card">
              <div className="summary-top">
                <span>Beneficiaries Served</span>
                <Users className="summary-icon" size={20} />
              </div>
              <div className="summary-value">
                {farmerCount > 0 ? farmerCount.toLocaleString('en-PH') : '0'}
              </div>
              <span className="allocation-card-note">Live served transactions</span>
            </article>
            <article className="summary-card">
              <div className="summary-top">
                <span>Registered programs</span>
                <Sprout className="summary-icon" size={20} />
              </div>
              <div className="summary-value">{programs.length}</div>
              <span className="allocation-card-note">Live records from data service</span>
            </article>
            <a
              href="#event-calendar"
              className="summary-card"
              style={{ textDecoration: 'none', color: 'inherit', transition: 'border-color .18s, transform .18s' }}
              title="View ongoing field activities in calendar"
            >
              <div className="summary-top">
                <span>Ongoing activities</span>
                <Activity className="summary-icon" size={20} />
              </div>
              <div className="summary-value">{totalOngoingActivities}</div>
              <span className="allocation-card-note">Live from activities calendar</span>
            </a>
          </div>

          {/* Rice Intro & Quick Links */}
          <div className="rice-intro" style={{ marginTop: 24 }}>
            <div className="rice-overview-panel">
              <div>
                <span className="eyebrow">Current operations</span>
                <h2>Rice program activity at a glance</h2>
                <p>Use this dashboard to monitor active programs, fund movement, farmer services, and official reports.</p>
              </div>
              <Link className="button button-primary" href="/rice/balances">
                Monitor balances <ArrowRight size={15} />
              </Link>
            </div>

            <div className="rice-quick-links">
              <Link className="rice-quick-link" href="/rice/balances">
                <span>
                  <ChartNoAxesColumnIncreasing size={16} /> Fund balances
                </span>
                <ArrowRight size={16} />
              </Link>
              <Link className="rice-quick-link" href="/rice/farmers">
                <span>
                  <Users size={16} /> Farmer directory
                </span>
                <ArrowRight size={16} />
              </Link>
              <Link className="rice-quick-link" href="/rice/programs">
                <span>
                  <Wheat size={16} /> Rice programs
                </span>
                <ArrowRight size={16} />
              </Link>
              <Link className="rice-quick-link" href="/rice/reports">
                <span>
                  <FileText size={16} /> Reports
                </span>
                <ArrowRight size={16} />
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

      {/* Feature Navigation Cards (Operations Dashboard & Department Inquiries) */}
      <section className="section" style={{ paddingTop: 0, paddingBottom: 60 }}>
        <div className="page-container">
          <div className="feature-grid">
            <article className="feature-panel">
              <div>
                <Wheat className="feature-panel-icon" size={24} />
                <h3>Rice Program Coordinating Unit</h3>
                <p>
                  Monitoring rice programs, food security initiatives, and farmer extension services to support Cordillera communities.
                </p>
              </div>
              {canAccessRice ? (
                <Link href="/rice" className="section-link">
                  Visit Operations Dashboard <ArrowRight size={15} />
                </Link>
              ) : (
                <Link href="/about" className="section-link">
                  Learn About the Unit <ArrowRight size={15} />
                </Link>
              )}
            </article>

            <article className="feature-panel secondary">
              <div>
                <Sprout className="feature-panel-icon" size={24} />
                <h3>Coordinating Unit Mandate</h3>
                <p>
                  Learn about the regional framework, agricultural targets, and operational objectives of the DA-CAR.
                </p>
              </div>
              <Link href="/about" className="section-link">
                Learn More <ArrowRight size={15} />
              </Link>
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
    </>
  );
}

