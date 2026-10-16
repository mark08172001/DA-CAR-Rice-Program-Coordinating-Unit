import PageHero from '@/components/PageHero';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Eye } from 'lucide-react';

export const metadata = {
  title: 'Market Prices | DA-CAR | Rice Program Coordinating Unit',
  description: 'View commodity prices reported through the Department of Agriculture – Cordillera Administrative Region.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MarketPricesPage() {
  let records: any[] = [];
  let isConfigured = true;

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase
      .from('market_prices')
      .select('*')
      .order('date_updated', { ascending: false });

    if (error) {
      console.warn('Market prices error:', error.message);
    } else if (data) {
      records = data;
    }
  } catch (e) {
    console.error('Error fetching market prices:', e);
  }

  const formatPrice = (val: number | string | undefined) => {
    return '₱' + Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <>
      <PageHero
        eyebrow="Module 01: General Portal"
        heading="Market Prices"
        description="View commodity prices reported through the Department of Agriculture – Cordillera Administrative Region."
        parent={{ label: 'Home', href: '/' }}
      />
      <section className="content-section">
        <div className="page-container">
          {records.length > 0 ? (
            <div className="surface">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Commodity</th>
                      <th>Unit</th>
                      <th className="numeric">Minimum Price</th>
                      <th className="numeric">Maximum Price</th>
                      <th className="numeric">Average Price</th>
                      <th>Date Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={r.id || i}>
                        <td>{r.commodity}</td>
                        <td>{r.unit}</td>
                        <td className="numeric">{formatPrice(r.minimum_price)}</td>
                        <td className="numeric">{formatPrice(r.maximum_price)}</td>
                        <td className="numeric">{formatPrice(r.average_price)}</td>
                        <td>{r.date_updated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="surface surface-pad">
              <div className="empty-state">
                <span className="empty-icon">
                  <Eye size={20} />
                </span>
                <h3>No market price records available.</h3>
                <p>Market price records will appear here once they are published from the regional monitoring service.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
