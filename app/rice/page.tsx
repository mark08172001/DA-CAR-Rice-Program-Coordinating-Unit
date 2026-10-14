import Link from 'next/link';
import {
  Sprout,
  Activity,
  Clock3,
  FileText,
  ChartNoAxesColumnIncreasing,
  Users,
  Wheat,
  ArrowRight,
  CircleAlert,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getAuthoritativeUserAccess } from '@/utils/adminStore';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';

export const metadata = {
  title: 'Rice Coordinating Unit Dashboard | DA-CAR',
  description: 'Official operations dashboard for the Rice Program Coordinating Unit.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RiceDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  let activeEmail = user?.email;
  if (!activeEmail) {
    const adminSessionCookie = cookieStore.get('da_admin_session')?.value;
    if (adminSessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(adminSessionCookie));
        if (parsed?.email) {
          activeEmail = parsed.email;
        }
      } catch {}
    }
  }

  const access = await getAuthoritativeUserAccess(activeEmail, supabase);
  const isSuperAdmin = access.isSuperAdmin;
  const allowed = access.allowed_modules;
  const userRole = access.role;
  const userName = access.fullName;

  if (!activeEmail) {
    return (
      <ModuleAccessGuard
        type="restricted"
        userEmail="Guest / Outsider"
        userName="Guest"
        userRole="visitor"
        moduleInfo={{
          id: 'mod-rice',
          number: 'Module 02',
          title: 'Rice Program Operations',
          desc: 'Official rice coordinating unit operations, programs, and monitoring reports.',
        }}
        allowedModules={['mod-general']}
      />
    );
  }

  if (access.status === 'suspended') {
    return (
      <ModuleAccessGuard
        type="suspended"
        userEmail={activeEmail}
        userName={userName}
        userRole={userRole}
        moduleInfo={{
          id: 'mod-rice',
          number: 'Module 02',
          title: 'Rice Program Operations',
          desc: 'Official rice coordinating unit operations, programs, and monitoring reports.',
        }}
      />
    );
  }

  if (!isSuperAdmin && !allowed.includes('mod-rice')) {
    return (
      <ModuleAccessGuard
        type="restricted"
        userEmail={activeEmail}
        userName={userName}
        userRole={userRole}
        moduleInfo={{
          id: 'mod-rice',
          number: 'Module 02',
          title: 'Rice Program Operations',
          desc: 'Official rice coordinating unit operations, programs, and monitoring reports.',
        }}
        allowedModules={allowed}
      />
    );
  }

  let programs: any[] = [];
  let balances: any[] = [];
  let reports: any[] = [];
  let farmerCount = 0;

  try {

    const [progRes, balRes, repRes, farmerRes] = await Promise.all([
      supabase.from('programs').select('*').order('name', { ascending: true }),
      supabase.from('balances').select('*').order('date_received', { ascending: false }),
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('farmer_serve_transactions').select('*', { count: 'exact', head: true }),
    ]);

    if (progRes.data) programs = progRes.data;
    if (balRes.data) balances = balRes.data;
    if (repRes.data) reports = repRes.data;
    if (farmerRes.count !== null && farmerRes.count !== undefined) farmerCount = farmerRes.count;
  } catch (e) {
    console.error('Error fetching dashboard records:', e);
  }

  const activePrograms = programs.filter((p) =>
    ['active', 'ongoing', 'in progress', 'in-progress', 'current'].includes((p.status || '').toLowerCase())
  );
  const pendingReleases = balances.filter((b) =>
    ['pending', 'for release'].includes((b.status || '').toLowerCase())
  );

  return (
    <section className="content-section">
      <div className="page-container">
        {/* Summary Grid */}
        <div className="summary-grid">
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
          <article className="summary-card">
            <div className="summary-top">
              <span>Ongoing activities</span>
              <Activity className="summary-icon" size={20} />
            </div>
            <div className="summary-value">{activePrograms.length}</div>
            <span className="allocation-card-note">Currently in progress</span>
          </article>
          <article className="summary-card">
            <div className="summary-top">
              <span>Pending releases</span>
              <Clock3 className="summary-icon" size={20} />
            </div>
            <div className="summary-value">{pendingReleases.length}</div>
            <span className="allocation-card-note">Awaiting fund release</span>
          </article>
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

        {/* Dashboard Columns */}
        <div className="dashboard-columns" style={{ marginTop: 24 }}>
          <section className="surface surface-pad">
            <div className="section-heading compact-heading">
              <div>
                <span className="section-kicker">Live program register</span>
                <h2>Current activities</h2>
                <p>Programs marked active or ongoing by the Rice Coordinating Unit.</p>
              </div>
              <Link className="section-link" href="/rice/programs">
                Full register <ArrowRight size={15} />
              </Link>
            </div>

            {programs.length === 0 ? (
              <p className="muted-copy">No program activities have been published yet.</p>
            ) : (
              <div className="activity-list">
                {programs.slice(0, 5).map((prog) => (
                  <article key={prog.id} className="activity-item">
                    <span className="directory-icon">
                      <Sprout size={18} />
                    </span>
                    <div>
                      <h3>{prog.name || 'Unnamed program'}</h3>
                      <p>{prog.description || 'No activity description has been published.'}</p>
                    </div>
                    {prog.status && <span className="status-pill">{prog.status}</span>}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="surface surface-pad">
            <div className="section-heading compact-heading">
              <div>
                <span className="section-kicker">Official publications</span>
                <h2>Recent reports</h2>
              </div>
              <Link className="section-link" href="/rice/reports">
                View all <ArrowRight size={15} />
              </Link>
            </div>

            {reports.length === 0 ? (
              <p className="muted-copy">No reports have been published yet.</p>
            ) : (
              <div className="report-list">
                {reports.slice(0, 5).map((rep) => (
                  <a
                    key={rep.id}
                    className="report-item"
                    href={rep.file_url || '#'}
                    target={rep.file_url ? '_blank' : undefined}
                    rel="noreferrer"
                  >
                    <FileText size={18} />
                    <span>
                      <strong>{rep.title || rep.name || 'Rice program report'}</strong>
                      <small>{rep.created_at?.slice(0, 10) || 'Recent publication'}</small>
                    </span>
                    <ArrowRight size={15} />
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
