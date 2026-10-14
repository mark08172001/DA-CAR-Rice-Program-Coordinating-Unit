import ProgramsClient from '@/components/ProgramsClient';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getAuthoritativeUserAccess } from '@/utils/adminStore';
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
  const canDeletePrograms = isSuperAdmin || access.permissions.can_delete_programs !== false;
  const canEditPrograms = isSuperAdmin || access.permissions.can_edit_programs !== false;

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


