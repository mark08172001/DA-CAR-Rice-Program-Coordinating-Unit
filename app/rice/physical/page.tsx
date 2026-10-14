import PhysicalAccomplishmentClient from '@/components/PhysicalAccomplishmentClient';
import { fetchPhysicalAccomplishmentData } from '@/utils/fetchPhysicalAccomplishmentSheet';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getAccountByEmail } from '@/utils/adminStore';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';

export const metadata = {
  title: 'Physical Targets & Accomplishments | Module 02: Rice Program Operations | DA-CAR',
  description:
    'Monthly and MFO physical target vs accomplishment monitoring for DA-CAR Regional Rice Program Coordinating Unit.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RicePhysicalPage() {
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
          id: 'mod-rice',
          number: 'Module 02',
          title: 'Rice Program Operations',
          desc: 'Official physical targets, program operations, and monitoring.',
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
          id: 'mod-rice',
          number: 'Module 02',
          title: 'Rice Program Operations',
          desc: 'Official physical targets, program operations, and monitoring.',
        }}
      />
    );
  }

  if (!isSuperAdmin && !allowed.includes('mod-rice')) {
    return (
      <ModuleAccessGuard
        type="restricted"
        userEmail={activeEmail}
        userName={account?.full_name || activeEmail}
        userRole={userRole}
        moduleInfo={{
          id: 'mod-rice',
          number: 'Module 02',
          title: 'Rice Program Operations',
          desc: 'Official physical targets, program operations, and monitoring.',
        }}
        allowedModules={allowed}
      />
    );
  }

  const physicalData = await fetchPhysicalAccomplishmentData();

  return (
    <section className="content-section" style={{ padding: '24px 0 60px' }}>
      <div className="page-container" style={{ width: 'min(1560px, calc(100% - 36px))' }}>
        <PhysicalAccomplishmentClient initialData={physicalData} />
      </div>
    </section>
  );
}
