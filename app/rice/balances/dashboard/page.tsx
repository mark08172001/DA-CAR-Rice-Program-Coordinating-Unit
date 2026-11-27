import ObligationDashboardClient from '@/components/ObligationDashboardClient';
import { fetchObligationListSheet } from '@/utils/fetchObligationListSheet';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getAuthoritativeUserAccess } from '@/utils/adminStore';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';

export const metadata = {
  title: 'Obligation Dashboard | DA-CAR | Rice Program Coordinating Unit',
  description:
    '2026 List for Obligation Dashboard and line item register for the DA-CAR Regional Rice Program Coordinating Unit.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RiceBalancesDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const forceRefresh = resolvedSearchParams.refresh === 'true' || resolvedSearchParams.force === 'true';

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith('sb-') || c.name === 'da_admin_session'
  );

  let activeEmail: string | undefined;
  let supabase: any = null;

  if (hasAuthCookie) {
    supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    activeEmail = user?.email;

    if (!activeEmail) {
      const adminSessionCookie = cookieStore.get('da_admin_session')?.value;
      if (adminSessionCookie) {
        try {
          const parsed = JSON.parse(decodeURIComponent(adminSessionCookie));
          if (parsed?.email) activeEmail = parsed.email;
        } catch {}
      }
    }
  }

  const access = await getAuthoritativeUserAccess(activeEmail, supabase);
  const userRole = access.role;
  const userName = access.fullName;

  if (access.status === 'suspended') {
    return (
      <ModuleAccessGuard
        type="suspended"
        userEmail={activeEmail || ''}
        userName={userName}
        userRole={userRole}
        moduleInfo={{
          id: 'mod-finance',
          number: 'Module 02',
          title: 'Financial Management',
          desc: 'Government obligation budget, financial category reports, and fund monitoring.',
        }}
      />
    );
  }

  // Instant stale-while-revalidate Google Sheet fetch (refreshes in background when stale)
  const result = await fetchObligationListSheet(forceRefresh);

  return (
    <section className="content-section" style={{ padding: '16px 0 60px' }}>
      <ObligationDashboardClient initialData={result} />
    </section>
  );
}
