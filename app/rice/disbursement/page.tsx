import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getAuthoritativeUserAccess } from '@/utils/adminStore';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';

export const metadata = {
  title: 'Disbursement | DA-CAR | Rice Program Coordinating Unit',
  description: 'Disbursement tracking and records for the DA-CAR Regional Rice Coordinating Unit.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import DisbursementClient from '@/components/DisbursementClient';
import {
  fetchContinuingDisbursements,
  fetchCurrentDisbursements,
  fetchUnpaidPriorYearsDisbursements,
} from '@/utils/fetchContinuingDisbursements';
import { protectDisbursementRecords } from '@/utils/disbursementPrivacy';

export default async function RiceDisbursementPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const forceRefresh = resolvedSearchParams.refresh === 'true' || resolvedSearchParams.force === 'true';

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith('sb-') || c.name === 'da_admin_session'
  );

  let activeEmail: string | undefined;
  let supabase: any = null;

  if (hasAuthCookie) {
    supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    activeEmail = user?.email;

    if (!activeEmail) {
      const adminSessionCookie = cookieStore.get('da_admin_session')?.value;
      if (adminSessionCookie) {
        try {
          const parsed = JSON.parse(decodeURIComponent(adminSessionCookie));
          if (parsed?.email) activeEmail = parsed.email;
        } catch {}
      }
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
          id: 'mod-finance',
          number: 'Module 02',
          title: 'Financial Management',
          desc: 'Official financial category reports, obligation budget, and fund monitoring.',
        }}
      />
    );
  }

  const isAuthenticated = Boolean(activeEmail && access && access.status !== 'suspended');

  const [continuingData, currentData, unpaidData] = await Promise.all([
    fetchContinuingDisbursements(forceRefresh),
    fetchCurrentDisbursements(forceRefresh),
    fetchUnpaidPriorYearsDisbursements(forceRefresh),
  ]);

  const protectedContinuing = {
    ...continuingData,
    records: protectDisbursementRecords(continuingData.records, isAuthenticated),
  };
  const protectedCurrent = {
    ...currentData,
    records: protectDisbursementRecords(currentData.records, isAuthenticated),
  };
  const protectedUnpaid = {
    ...unpaidData,
    records: protectDisbursementRecords(unpaidData.records, isAuthenticated),
  };

  return (
    <DisbursementClient
      initialContinuingData={protectedContinuing}
      initialCurrentData={protectedCurrent}
      initialUnpaidPriorYearsData={protectedUnpaid}
      initialIsAuthenticated={isAuthenticated}
      currentUserEmail={activeEmail}
    />
  );
}
