import ProgramsClient from '@/components/ProgramsClient';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getAccountByEmail, getEffectivePermissions } from '@/utils/adminStore';
import { getAuthoritativePrograms } from '@/utils/programsStore';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';

export const metadata = {
  title: 'Rice Programs Register | Module 02: Rice Program Operations | DA-CAR',
  description: 'Official banner program interventions under PSS, ESETS, RD, and INS managed by the Rice Coordinating Unit.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RiceProgramsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  let activeEmail = user?.email;
  if (!activeEmail) {
    const adminCookie = cookieStore.get('da_admin_session')?.value;
    if (adminCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(adminCookie));
        if (parsed?.email) activeEmail = parsed.email;
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
          desc: 'Official rice coordinating unit operations, programs, and monitoring reports.',
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
        userName={account?.full_name || activeEmail}
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
  let canDeletePrograms = isSuperAdmin;
  let canEditPrograms = isSuperAdmin;

  if (account) {
    const perms = getEffectivePermissions(account);
    canDeletePrograms = isSuperAdmin || perms.can_delete_programs !== false;
    canEditPrograms = isSuperAdmin || perms.can_edit_programs !== false;
  }

  try {
    const { data } = await supabase
      .from('programs')
      .select('*')
      .order('display_order', { ascending: true });

    programs = getAuthoritativePrograms(data);
  } catch (e) {
    console.error('Error fetching programs, using default seed:', e);
    programs = getAuthoritativePrograms();
  }

  return (
    <section className="content-section" style={{ padding: '24px 0 60px' }}>
      <div className="page-container" style={{ width: 'min(1480px, calc(100% - 36px))' }}>
        <ProgramsClient
          initialPrograms={programs}
          initialCanDelete={canDeletePrograms}
          initialCanEdit={canEditPrograms}
        />
      </div>
    </section>
  );
}


