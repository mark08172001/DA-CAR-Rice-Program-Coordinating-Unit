import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getAuthoritativeUserAccess } from '@/utils/adminStore';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';
import { Truck } from 'lucide-react';

export const metadata = {
  title: 'Deliveries | DA-CAR | Rice Program Coordinating Unit',
  description:
    'Official tracking of regional seed deliveries, input logistics, and drop-off point distribution for DA-CAR Regional Rice Program Coordinating Unit.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DeliveriesPage() {
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
          number: 'Module 01',
          title: 'Physical & Programs',
          desc: 'Official physical targets, program operations, and monitoring.',
        }}
      />
    );
  }

  return (
    <section className="content-section" style={{ padding: '24px 0 60px', minHeight: '60vh' }}>
      <div className="page-container" style={{ width: 'min(1560px, calc(100% - 36px))' }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Truck size={28} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
            Deliveries
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', maxWidth: 480, margin: '0 auto' }}>
            Deliveries tracking module and drop-off logistics management.
          </p>
        </div>
      </div>
    </section>
  );
}
