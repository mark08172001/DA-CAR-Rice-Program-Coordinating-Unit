import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getAuthoritativeUserAccess } from '@/utils/adminStore';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';
import DrySeasonClient from '@/components/DrySeasonClient';
import { fetchDrySeasonData } from '@/utils/fetchDrySeasonSheet';

export const metadata = {
  title: 'Dry Season | DA-CAR | Rice Program Coordinating Unit',
  description:
    'Dry Season (DS) 2026-2027 seed and input distribution status, consignment tracking, and provincial targets for DA-CAR Regional Rice Program Coordinating Unit.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DSDistributionPage() {
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

  const dsData = await fetchDrySeasonData();

  return (
    <section className="content-section" style={{ padding: '24px 0 60px', minHeight: '60vh' }}>
      <div className="page-container" style={{ width: 'min(1560px, calc(100% - 36px))' }}>
        <DrySeasonClient initialData={dsData} />
      </div>
    </section>
  );
}
