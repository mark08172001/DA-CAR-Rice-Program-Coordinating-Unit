import FarmersClient, { FarmerTransaction } from '@/components/FarmersClient';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getAuthoritativeUserAccess } from '@/utils/adminStore';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';

export const metadata = {
  title: 'Beneficiaries & Farmers Directory | DA-CAR | Rice Program Coordinating Unit',
  description:
    'Live beneficiary service records and transactions managed by the Rice Program Coordinating Unit.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RiceFarmersPage() {
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

  if (!activeEmail) {
    return (
      <ModuleAccessGuard
        type="restricted"
        userEmail="Guest / Outsider"
        userName="Guest"
        userRole="visitor"
        moduleInfo={{
          id: 'mod-beneficiary',
          number: 'Module 04',
          title: 'Beneficiaries & Field Services',
          desc: 'RSBSA farmer registry and commodity voucher distributions.',
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
          id: 'mod-beneficiary',
          number: 'Module 04',
          title: 'Beneficiaries & Field Services',
          desc: 'RSBSA farmer registry and commodity voucher distributions.',
        }}
      />
    );
  }

  if (!isSuperAdmin && !allowed.includes('mod-beneficiary')) {
    return (
      <ModuleAccessGuard
        type="restricted"
        userEmail={activeEmail}
        userName={userName}
        userRole={userRole}
        moduleInfo={{
          id: 'mod-beneficiary',
          number: 'Module 04',
          title: 'Beneficiaries & Field Services',
          desc: 'RSBSA farmer registry and commodity voucher distributions.',
        }}
        allowedModules={allowed}
      />
    );
  }

  let initialRecords: FarmerTransaction[] = [];
  let initialCount = 0;
  let initialRffaRecords: any[] = [];
  let initialRffaCount = 0;

  try {

    // Query farmer_serve_transactions (IMC)
    const { data, count, error } = await supabase
      .from('farmer_serve_transactions')
      .select('*', { count: 'exact' })
      .order('Date', { ascending: false, nullsFirst: false })
      .range(0, 24);

    if (error) {
      console.warn('farmer_serve_transactions query note:', error.message);
    } else {
      if (data) initialRecords = data as FarmerTransaction[];
      if (count !== null) initialCount = count;
    }

    // Query rffa_beneficiaries (RFFA)
    const { data: rData, count: rCount, error: rError } = await supabase
      .from('rffa_beneficiaries')
      .select('*', { count: 'exact' })
      .order('DateOfCashout', { ascending: false, nullsFirst: false })
      .range(0, 24);

    if (!rError) {
      if (rData) initialRffaRecords = rData;
      if (rCount !== null) initialRffaCount = rCount;
    }
  } catch (e) {
    console.error('Error fetching farmer transactions on server:', e);
  }

  return (
    <section className="content-section">
      <div className="page-container">
        <FarmersClient
          initialRecords={initialRecords}
          initialCount={initialCount}
          initialRffaRecords={initialRffaRecords}
          initialRffaCount={initialRffaCount}
          initialUserAccount={access}
        />
      </div>
    </section>
  );
}
