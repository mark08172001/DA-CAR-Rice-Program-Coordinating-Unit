import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  ArrowRight,
  UserCheck,
  Activity,
  Users
} from 'lucide-react';
import PageHero from '@/components/PageHero';

export const metadata = {
  title: 'Restricted Administration Portal | DA-CAR',
  description: 'Authorized personnel management dashboard for DA-CAR user accounts and profile database.',
};

export const dynamic = 'force-dynamic';

export default async function AdminManagementPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  // Strict Server-Side Access Control Guard
  if (!user) {
    redirect('/login?error=Access%20Denied:%20Please%20log%20in%20to%20continue.&next=/admin');
  }

  // Fetch Role Authorization
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || user.user_metadata?.role || (user.email?.includes('admin') ? 'super_admin' : 'staff');
  const isAuthorized = ['super_admin', 'admin', 'officer'].includes(userRole) || user.email?.includes('admin');

  if (!isAuthorized) {
    return (
      <section className="section">
        <div className="page-container" style={{ maxWidth: 700, margin: '40px auto' }}>
          <div className="auth-alert auth-alert-error" style={{ padding: 24, borderRadius: 10 }}>
            <ShieldAlert size={32} style={{ color: '#b91c1c', flexShrink: 0 }} />
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: 18, color: '#991b1b' }}>
                Access Denied: Insufficient Role Privileges
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: '#7f1d1d', lineHeight: 1.5 }}>
                Your account (<strong>{user.email}</strong>) is registered under <strong>{profile?.role || 'staff'}</strong> access. Administrative management tools require verified <strong>Technical Officer</strong> or <strong>Administrator</strong> credentials.
              </p>
              <div style={{ marginTop: 16 }}>
                <Link href="/" className="button button-outline" style={{ background: '#ffffff' }}>
                  Return to Public Portal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Authorized Personnel Only"
        heading="Department Administrative Management"
        description="Restricted executive tools for staff access control, profile database, COA audit logs, and database records."
      />

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="page-container">
          <div className="admin-status-banner">
            <div className="admin-status-left">
              <ShieldCheck size={20} className="text-green-800" />
              <div>
                <strong>Authenticated Administrator Session</strong>
                <span>Signed in as {profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0]} ({(userRole).toUpperCase().replace('_', ' ')}) · {profile?.department || 'Executive Office'}</span>
              </div>
            </div>
            <span className="admin-security-tag">{userRole === 'super_admin' ? 'Level 4 Super Admin' : 'Level 3 Clearance'}</span>
          </div>

          <div className="admin-tools-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {/* Tool 1: Staff Access Control & Accounts */}
            <article className="admin-tool-card">
              <div className="tool-icon-wrap blue" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                <Users size={22} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span className="sidebar-role-tag role-super_admin" style={{ fontSize: 10 }}>SUPER ADMIN</span>
              </div>
              <h3>User Accounts & Staff Access Control</h3>
              <p>
                Manage registered personnel accounts, inspect authenticated users, and limit or grant staff access to specific modules.
              </p>
              <Link href="/admin/users" className="section-link">
                <span>Manage Staff Access</span>
                <ArrowRight size={14} />
              </Link>
            </article>

            {/* Tool 2: Profile Database & Registered Users */}
            <article className="admin-tool-card">
              <div className="tool-icon-wrap green" style={{ background: '#dcfce7', color: '#15803d' }}>
                <UserCheck size={22} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span className="sidebar-role-tag role-super_admin" style={{ fontSize: 10 }}>PUBLIC.PROFILES</span>
              </div>
              <h3>Profile Database & Registered Users</h3>
              <p>
                Access the PostgreSQL profiles table, inspect registered personnel, toggle approval status, and manage clearances.
              </p>
              <Link href="/admin/profiles" className="section-link">
                <span>Access Profile Database</span>
                <ArrowRight size={14} />
              </Link>
            </article>

          </div>
        </div>
      </section>
    </>
  );
}
