import { getObligations, ObligationBalanceRow } from '@/utils/obligationsStore';
import RiceReportsClient from '@/components/RiceReportsClient';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getAccountByEmail } from '@/utils/adminStore';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';

export const metadata = {
  title: 'Financial Category Reports | Module 04: Financial Management | DA-CAR',
  description: 'Official financial category reports for DA-CAR Rice Program Coordinating Unit.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RiceReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }> | { category?: string };
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  let activeEmail = user?.email;
  if (!activeEmail) {
    const adminSessionCookie = cookieStore.get('da_admin_session')?.value;
    if (adminSessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(adminSessionCookie));
        if (parsed?.email === 'super.admin@car.da.gov.ph' || parsed?.email === 'admin@car.da.gov.ph') {
          activeEmail = parsed.email;
        }
      } catch {}
    }
  }

  const account = activeEmail ? getAccountByEmail(activeEmail) : null;
  const userRole = (account?.role || user?.user_metadata?.role || 'visitor').toLowerCase();
  const isSuperAdmin = userRole === 'super_admin' || activeEmail === 'super.admin@car.da.gov.ph';
  const allowed = isSuperAdmin
    ? ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance', 'mod-admin']
    : (account?.allowed_modules || ['mod-general']);

  if (!activeEmail) {
    return (
      <ModuleAccessGuard
        type="restricted"
        userEmail="Guest / Outsider"
        userName="Guest"
        userRole="visitor"
        moduleInfo={{
          id: 'mod-finance',
          number: 'Module 04',
          title: 'Financial Management',
          desc: 'Official financial category reports, obligation budget, and fund monitoring.',
        }}
        allowedModules={['mod-general']}
      />
    );
  }

  if (account?.status === 'suspended') {
    return (
      <ModuleAccessGuard
        type="suspended"
        userEmail={activeEmail}
        userName={account?.full_name || activeEmail}
        userRole={userRole}
        moduleInfo={{
          id: 'mod-finance',
          number: 'Module 04',
          title: 'Financial Management',
          desc: 'Official financial category reports, obligation budget, and fund monitoring.',
        }}
      />
    );
  }

  if (!isSuperAdmin && !allowed.includes('mod-finance')) {
    return (
      <ModuleAccessGuard
        type="restricted"
        userEmail={activeEmail}
        userName={account?.full_name || activeEmail}
        userRole={userRole}
        moduleInfo={{
          id: 'mod-finance',
          number: 'Module 04',
          title: 'Financial Management',
          desc: 'Official financial category reports, obligation budget, and fund monitoring.',
        }}
        allowedModules={allowed}
      />
    );
  }
  let records: ObligationBalanceRow[] = [];

  try {
    records = await getObligations('Main Registry');
    if (!records || records.length === 0) {
      records = await getObligations('Google Sheet (Live)');
    }
  } catch (e) {
    console.error('Error fetching obligation records for reports:', e);
  }

  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const initialCategory = resolvedParams?.category;

  return (
    <section className="content-section" style={{ padding: '24px 0 60px' }}>
      <div className="page-container" style={{ width: 'min(1560px, calc(100% - 36px))' }}>
        <RiceReportsClient initialRows={records} initialCategory={initialCategory} />
      </div>
    </section>
  );
}

