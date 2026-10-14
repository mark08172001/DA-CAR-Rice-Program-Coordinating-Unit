import { getObligations, ObligationBalanceRow } from '@/utils/obligationsStore';
import RiceReportsClient from '@/components/RiceReportsClient';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getAuthoritativeUserAccess } from '@/utils/adminStore';
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
          id: 'mod-finance',
          number: 'Module 04',
          title: 'Financial Management',
          desc: 'Official financial category reports, obligation budget, and fund monitoring.',
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
        userName={userName}
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

