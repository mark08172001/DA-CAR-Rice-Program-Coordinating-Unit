import { Metadata } from 'next';
import CommodityDashboard from '@/components/CommodityDashboard';
import PageHero from '@/components/PageHero';
import { createClient as createDirectClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getAccountByEmail } from '@/utils/adminStore';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';
import { fetchCommodityClaimsFromGoogleSheet } from '@/utils/fetchCommodityClaimsSheet';

export const metadata: Metadata = {
  title: 'Commodity Claims Dashboard | Module 03: Beneficiaries & Field Services',
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
        if (parsed?.email === 'super.admin@car.da.gov.ph' || parsed?.email === 'admin@car.da.gov.ph') {
          activeEmail = parsed.email;
        }
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
          id: 'mod-beneficiary',
          number: 'Module 03',
          title: 'Beneficiaries & Field Services',
          desc: 'RSBSA farmer registry and commodity voucher distributions.',
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
          id: 'mod-beneficiary',
          number: 'Module 03',
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
        userName={account?.full_name || activeEmail}
        userRole={userRole}
        moduleInfo={{
          id: 'mod-beneficiary',
          number: 'Module 03',
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
        eyebrow="Module 03: Beneficiaries & Field Services"
        heading="Commodity Claims & Allocations Dashboard"
        description="Certified RSBSA farmer beneficiary transactions, subsidy redemptions, and regional distribution totals for hybrid palay seeds, organic fertilizers, and mechanization."
      />

      <section className="section" style={{ paddingTop: 10 }}>
        <div className="page-container">
          <CommodityDashboard
            initialAllocations={allocations}
            totalTransactions={totalTransactions}
          />
        </div>
      </section>
    </>
  );
}
