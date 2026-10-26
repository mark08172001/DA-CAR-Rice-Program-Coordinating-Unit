import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getAuthoritativeUserAccess } from '@/utils/adminStore';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';

export const metadata = {
  title: 'Disbursement | Module 03 | DA-CAR | Rice Program Coordinating Unit',
  description: 'Disbursement tracking and records for the DA-CAR Regional Rice Coordinating Unit.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RiceDisbursementPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  let activeEmail = user?.email;
  if (!activeEmail) {
    const adminSessionCookie = cookieStore.get('da_admin_session')?.value;
    if (adminSessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(adminSessionCookie));
        if (parsed?.email) activeEmail = parsed.email;
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
          id: 'mod-finance',
          number: 'Module 03',
          title: 'Financial Management',
          desc: 'Official financial category reports, obligation budget, and fund monitoring.',
        }}
      />
    );
  }

  return (
    <div className="page-container" style={{ minHeight: '60vh', padding: '32px 16px' }}>
      {/* Blank page placeholder for future disbursement data */}
    </div>
  );
}
