import { Metadata } from 'next';
import CommodityDashboard from '@/components/CommodityDashboard';
import PageHero from '@/components/PageHero';
import { createClient as createDirectClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getAuthoritativeUserAccess } from '@/utils/adminStore';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';
import { fetchCommodityClaimsFromGoogleSheet } from '@/utils/fetchCommodityClaimsSheet';

export const metadata: Metadata = {
  title: 'Commodity Claims Dashboard | DA-CAR | Rice Program Coordinating Unit',
  description:
    'Official monitoring of beneficiary claims, hybrid seeds, fertilizers, and agricultural input distributions across Cordillera provinces.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CommodityClaimsPage() {
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
  const canManageClaims = isSuperAdmin || access.permissions.can_manage_claims !== false;

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

  // Fetch live table A2:H8 data from Google Sheets (PSS- IMC FARMERS SERVE TERMINAL)
  const sheetResult = await fetchCommodityClaimsFromGoogleSheet();
  const allocations = sheetResult.allocations;

  let totalTransactions = 0;
  try {
    const { count } = await supabase
      .from('farmer_serve_transactions')
      .select('*', { count: 'exact', head: true });
    if (count) totalTransactions = count;
  } catch (e) {
    console.warn('Failed to get transactions count:', e);
  }

  return (
    <>
      <PageHero
        eyebrow="Module 04: Beneficiaries & Field Services"
        heading="Commodity Claims & Allocations Dashboard"
        description="Certified RSBSA farmer beneficiary transactions, subsidy redemptions, and regional distribution totals for hybrid palay seeds, organic fertilizers, and mechanization."
        parent={{ label: 'Field Services', href: '/rice/farmers' }}
      />

      <section className="section" style={{ paddingTop: 10 }}>
        <div className="page-container">
          <CommodityDashboard
            initialAllocations={allocations}
            totalTransactions={totalTransactions}
            canManageClaims={canManageClaims}
          />
        </div>
      </section>
    </>
  );
}
