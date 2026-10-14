import ProgramsClient from '@/components/ProgramsClient';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getAccountByEmail, getEffectivePermissions } from '@/utils/adminStore';
import { getAuthoritativePrograms } from '@/utils/programsStore';

export const metadata = {
  title: 'Rice Programs Register | Rice Coordinating Unit',
  description: 'Official banner program interventions under PSS, ESETS, RD, and INS managed by the Rice Coordinating Unit.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RiceProgramsPage() {
  let programs: any[] = [];
  let canDeletePrograms = true;
  let canEditPrograms = true;

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data } = await supabase
      .from('programs')
      .select('*')
      .order('display_order', { ascending: true });

    programs = getAuthoritativePrograms(data);

    // Determine current user's power to delete and edit programs
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

    if (activeEmail) {
      const account = getAccountByEmail(activeEmail);
      if (account) {
        const perms = getEffectivePermissions(account);
        canDeletePrograms = perms.can_delete_programs !== false;
        canEditPrograms = perms.can_edit_programs !== false;
      } else {
        const isSuper =
          activeEmail === 'super.admin@car.da.gov.ph' ||
          user?.user_metadata?.role === 'super_admin' ||
          user?.user_metadata?.role === 'admin';
        canDeletePrograms = isSuper;
        canEditPrograms = isSuper;
      }
    }
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

