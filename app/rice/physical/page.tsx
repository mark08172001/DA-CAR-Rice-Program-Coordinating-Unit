import PhysicalAccomplishmentClient from '@/components/PhysicalAccomplishmentClient';
import { fetchPhysicalAccomplishmentData } from '@/utils/fetchPhysicalAccomplishmentSheet';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getAuthoritativeUserAccess } from '@/utils/adminStore';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';

export const metadata = {
  title: 'Physical Targets & Accomplishments | Module 02 | DA-CAR | Rice Program Coordinating Unit',
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

  if (access.status === 'suspended') {
    return (
      <ModuleAccessGuard
        type="suspended"
        userEmail={activeEmail || ''}
        userName={userName}
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

  const physicalData = await fetchPhysicalAccomplishmentData();

  return (
    <section className="content-section" style={{ padding: '24px 0 60px' }}>
      <div className="page-container" style={{ width: 'min(1560px, calc(100% - 36px))' }}>
        <PhysicalAccomplishmentClient initialData={physicalData} />
      </div>
    </section>
  );
}
