import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getAuthoritativeUserAccess } from '@/utils/adminStore';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';
import { fetchSummaryOfSuppliesSheet } from '@/utils/fetchSummaryOfSuppliesSheet';
import SummaryOfSuppliesClient from '@/components/SummaryOfSuppliesClient';

export const metadata = {
  title: 'Summary of Supplies | DA-CAR | Rice Program Coordinating Unit',
  description:
    'DA-CAR Rice Program FY 2026 Summary of Supplies Dashboard — Live NTP Contracts & Provincial Delivery Site Tracking.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SummaryOfSuppliesPage() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith('sb-') || c.name === 'da_admin_session'
  );

  let activeEmail: string | undefined;
  let supabase: any = null;

  if (hasAuthCookie) {
    supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    activeEmail = user?.email;

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
          id: 'mod-rice',
          number: 'Module 01',
          title: 'Physical & Programs',
          desc: 'Official physical targets, program operations, and monitoring.',
        }}
      />
    );
  }

  const result = await fetchSummaryOfSuppliesSheet(true);

  return (
    <section className="content-section" style={{ padding: '16px 0 60px' }}>
      <div className="page-container" style={{ width: 'min(1560px, calc(100% - 36px))' }}>
        <SummaryOfSuppliesClient initialData={result} />
      </div>
    </section>
  );
}
