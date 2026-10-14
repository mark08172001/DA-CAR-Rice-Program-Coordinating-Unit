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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?error=Access%20Denied:%20Please%20log%20in%20to%20continue.&next=/admin/users');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  const localAccount = getAccountByEmail(user.email || '');
  const userRole = localAccount?.role || profile?.role || 'staff';

  const isAuthorized = ['super_admin', 'admin'].includes(userRole);

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
            currentUserEmail={user.email || ''}
            currentUserRole={userRole}
          />
        </div>
      </section>
    </>
  );
}
