import ObligationBudgetClient from '@/components/ObligationBudgetClient';
import { fetchRiceObligationsFromGoogleSheet } from '@/utils/fetchRiceObligationsSheet';

export const metadata = {
  title: 'Obligation Budget | DA-CAR Rice Coordinating Unit',
  description:
    'Obligation Budget and Utilization Rate monitoring for the DA-CAR Regional Rice Coordinating Unit.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RiceBalancesPage() {
  const result = await fetchRiceObligationsFromGoogleSheet();

  return (
    <section className="content-section" style={{ padding: '24px 0 60px' }}>
      <div className="page-container" style={{ width: 'min(1480px, calc(100% - 36px))' }}>
        <ObligationBudgetClient
          obligationCategories={result.categories}
          totalBannerRice={result.totalBannerRice}
        />
      </div>
    </section>
  );
}
