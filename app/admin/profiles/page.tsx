import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import PageHero from '@/components/PageHero';
import ProfileDatabaseClient from '@/components/ProfileDatabaseClient';
import { getAccounts, getAccountByEmail, syncProfilesFromSupabase, getDeletedEmails } from '@/utils/adminStore';
import { createAdminClient } from '@/utils/supabase/admin';

export const metadata = {
  title: 'Profile Database & Registered Users | Super Admin Suite',
  description: 'Access the PostgreSQL profiles table, inspect registered personnel accounts, manage clearance roles, and view user records.',
};

export const dynamic = 'force-dynamic';

export default async function AdminProfilesPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?error=Access%20Denied:%20Please%20log%20in%20to%20continue.&next=/admin/profiles');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const localAccount = getAccountByEmail(user.email || '');
  const userRole = localAccount?.role || profile?.role || 'staff';

  const isAuthorized = ['super_admin', 'admin'].includes(userRole) || user.email?.includes('admin');

  if (!isAuthorized) {
    redirect('/admin');
  }

  // Load registered profiles
  let profiles: any[] = [];
  try {
    const db = createAdminClient() ?? supabase;
    const { data: dbProfiles } = await db.from('profiles').select('*').order('created_at', { ascending: false });
    if (dbProfiles && dbProfiles.length > 0) {
      syncProfilesFromSupabase(dbProfiles);
    }
    const localAccounts = getAccounts();

    const map = new Map<string, any>();
    const deletedEmails = getDeletedEmails().map((e) => e.toLowerCase());
    localAccounts.forEach((a) => {
      if (deletedEmails.includes(a.email.toLowerCase())) return;
      map.set(a.email.toLowerCase(), {
        id: a.id,
        email: a.email,
        full_name: a.full_name,
        department: a.department,
        role: a.role,
        status: a.status,
        allowed_modules: a.allowed_modules,
        created_at: a.created_at,
        updated_at: a.updated_at,
        last_sign_in_at: a.last_sign_in_at,
        login_count: a.login_count || 0,
      });
    });

    if (dbProfiles) {
      dbProfiles.forEach((p) => {
        if (deletedEmails.includes(p.email.toLowerCase())) return;
        const existing = map.get(p.email.toLowerCase());
        map.set(p.email.toLowerCase(), {
          id: p.id || existing?.id,
          full_name: p.full_name || existing?.full_name,
          email: p.email,
          department: p.department || existing?.department || 'Rice Program Coordinating Unit',
          role: p.role || existing?.role || 'staff',
          status:
            existing?.status === 'suspended'
              ? 'suspended'
              : existing?.status === 'restricted'
              ? 'restricted'
              : (p.is_approved === false ? 'pending_approval' : (existing?.status || 'active')),
          allowed_modules: existing?.allowed_modules || ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance'],
          created_at: p.created_at || existing?.created_at,
          updated_at: p.updated_at || existing?.updated_at,
          last_sign_in_at: existing?.last_sign_in_at || null,
          login_count: existing?.login_count || 0,
        });
      });
    }

    profiles = Array.from(map.values());
  } catch {
    profiles = getAccounts();
  }

  return (
    <>
      <PageHero
        eyebrow="Module 05: Super Admin Suite"
        heading="User Profile Database & Registered Personnel"
        description="Direct administrative access to the PostgreSQL public.profiles table, registered accounts directory, clearance approval status, and database UUID records."
        parent={{ label: 'Admin Portal', href: '/admin' }}
      />

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="page-container">
          <ProfileDatabaseClient
            initialProfiles={profiles}
            currentUserEmail={user.email || ''}
            currentUserRole={userRole}
          />
        </div>
      </section>
    </>
  );
}
