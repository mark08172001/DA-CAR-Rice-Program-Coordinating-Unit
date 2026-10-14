import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import PageHero from '@/components/PageHero';
import UsersManagementClient from '@/components/UsersManagementClient';
import { getAccounts, getAccountByEmail, syncProfilesFromSupabase, getDeletedEmails } from '@/utils/adminStore';
import { createAdminClient } from '@/utils/supabase/admin';

export const metadata = {
  title: 'Staff Access Control & Accounts | Super Admin Suite',
  description: 'Super Admin management portal to limit staff permissions, control module access, and monitor user logins.',
};

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  let activeEmail: string | undefined = undefined;
  let activeRole: string = 'staff';

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      activeEmail = user.email;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.role) activeRole = profile.role;
    }
  } catch {}

  if (!activeEmail) {
    const adminSessionCookie = cookieStore.get('da_admin_session')?.value;
    if (adminSessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(adminSessionCookie));
        if (parsed?.email) {
          activeEmail = parsed.email;
          activeRole = parsed.role || 'super_admin';
        }
      } catch {}
    }
  }

  if (!activeEmail) {
    redirect('/login?error=Access%20Denied:%20Please%20log%20in%20to%20continue.&next=/admin/users');
  }

  const localAccount = getAccountByEmail(activeEmail);
  const userRole = (localAccount?.role || activeRole).toLowerCase();
  const isAuthorized = ['super_admin', 'admin'].includes(userRole) || activeEmail === 'super.admin@car.da.gov.ph';

  if (!isAuthorized) {
    redirect('/admin');
  }

  try {
    const db = createAdminClient() ?? supabase;
    const { data: dbProfiles } = await db.from('profiles').select('*').order('created_at', { ascending: false });
    if (dbProfiles && dbProfiles.length > 0) {
      syncProfilesFromSupabase(dbProfiles);
    }
  } catch {}

  const deleted = getDeletedEmails().map((e) => e.toLowerCase());
  const accounts = getAccounts().filter((a) => !deleted.includes(a.email.toLowerCase()));

  return (
    <>
      <PageHero
        eyebrow="Module 05: Super Admin Suite"
        heading="User Accounts & Staff Access Control"
        description="Monitor registered accounts, inspect user login history, and exercise administrative powers to limit, grant, or suspend staff access to specific modules."
        parent={{ label: 'Admin Portal', href: '/admin' }}
      />

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="page-container">
          <UsersManagementClient
            initialAccounts={accounts}
            currentUserEmail={activeEmail || ''}
            currentUserRole={userRole}
          />
        </div>
      </section>
    </>
  );
}
