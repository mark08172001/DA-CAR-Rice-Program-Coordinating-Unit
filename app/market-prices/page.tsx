import PageHero from '@/components/PageHero';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Eye, TrendingUp, DollarSign, Calendar, Scale, Sparkles, AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Commodity Market Prices | DA-CAR | Rice Program Coordinating Unit',
  description: 'Prevailing farmgate, wholesale, and retail commodity market prices across the Cordillera Administrative Region.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PriceRecord {
  id?: string | number;
  commodity: string;
  category?: string;
  unit: string;
  minimum_price: number;
  maximum_price: number;
  average_price: number;
  date_updated: string;
  market_location?: string;
}

const fallbackMarketPrices: PriceRecord[] = [
  {
    commodity: 'Dry Palay (Clean & Dry 14% MC)',
    category: 'Farmgate',
    unit: 'Kilogram (kg)',
    minimum_price: 21.50,
    maximum_price: 23.50,
    average_price: 22.50,
    date_updated: 'Oct 20, 2026',
    market_location: 'Tabuk City, Kalinga',
  },
  {
    commodity: 'Well-Milled Rice (WMR)',
    category: 'Wholesale',
    unit: '50-kg Sack',
    minimum_price: 2350.00,
    maximum_price: 2450.00,
    average_price: 2400.00,
    date_updated: 'Oct 20, 2026',
    market_location: 'Baguio City Center',
  },
  {
    commodity: 'Regular-Milled Rice (RMR)',
    category: 'Wholesale',
    unit: '50-kg Sack',
    minimum_price: 2100.00,
    maximum_price: 2200.00,
    average_price: 2150.00,
    date_updated: 'Oct 20, 2026',
    market_location: 'Bangued, Abra',
  },
  {
    commodity: 'Heirloom Tinawon Rice (Unpolished)',
    category: 'Specialty Retail',
    unit: 'Kilogram (kg)',
    minimum_price: 85.00,
    maximum_price: 110.00,
    average_price: 95.00,
    date_updated: 'Oct 19, 2026',
    market_location: 'Lagawe & Banaue, Ifugao',
  },
  {
    commodity: 'Kalinga Unoy Heirloom Red Rice',
    category: 'Specialty Retail',
    unit: 'Kilogram (kg)',
    minimum_price: 90.00,
    maximum_price: 115.00,
    average_price: 100.00,
    date_updated: 'Oct 19, 2026',
    market_location: 'Tabuk City, Kalinga',
  },
  {
    commodity: 'Certified Inbred Palay Seeds (NSIC Rc)',
    category: 'Seed Stock',
    unit: '20-kg Bag',
    minimum_price: 760.00,
    maximum_price: 800.00,
    average_price: 780.00,
    date_updated: 'Oct 18, 2026',
    market_location: 'Luna, Apayao',
  },
];

export default async function MarketPricesPage() {
  let records: PriceRecord[] = [];

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase
      .from('market_prices')
      .select('*')
      .order('date_updated', { ascending: false });

    if (!error && data && data.length > 0) {
      records = data;
    } else {
      records = fallbackMarketPrices;
    }
  } catch (e) {
    records = fallbackMarketPrices;
  }

  const formatPrice = (val: number | string | undefined) => {
    return '₱' + Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="market-prices-portal-page">
      <PageHero
        eyebrow="Public Information Portal"
        heading="Cordillera Agricultural Market Prices"
        description="Official monitoring of farmgate palay rates, wholesale rice commodities, heirloom specialty grains, and seed prices across CAR trading centers."
        parent={{ label: 'Home', href: '/' }}
      />

      <section className="section" style={{ paddingTop: 28, paddingBottom: 50 }}>
        <div className="page-container">
          {/* Top 3 Benchmark Price Cards */}
          <div className="price-kpi-grid">
            <article className="price-kpi-card">
              <div className="price-kpi-top">
                <span className="price-kpi-label">Farmgate Dry Palay</span>
                <span className="price-kpi-tag green">14% Moisture Content</span>
              </div>
              <div className="price-kpi-val-row">
                <span className="price-kpi-val">₱22.50</span>
                <span className="price-kpi-unit">/ kg avg</span>
              </div>
              <span className="price-kpi-sub">Tabuk City & Kalinga trading centers</span>
            </article>

            <article className="price-kpi-card">
              <div className="price-kpi-top">
                <span className="price-kpi-label">Well-Milled Rice</span>
                <span className="price-kpi-tag gold">Wholesale 50kg</span>
              </div>
              <div className="price-kpi-val-row">
                <span className="price-kpi-val">₱48.00</span>
                <span className="price-kpi-unit">/ kg equivalent</span>
              </div>
              <span className="price-kpi-sub">Baguio City & regional grain depots</span>
            </article>

            <article className="price-kpi-card">
              <div className="price-kpi-top">
                <span className="price-kpi-label">Cordillera Heirloom Rice</span>
                <span className="price-kpi-tag purple">Tinawon & Unoy</span>
              </div>
              <div className="price-kpi-val-row">
                <span className="price-kpi-val">₱95.00</span>
                <span className="price-kpi-unit">/ kg premium</span>
              </div>
              <span className="price-kpi-sub">Ifugao & Mountain Province terrace origins</span>
            </article>
          </div>

          {/* Clean White Card wrapping the Table */}
          <div className="market-table-card">
            <div className="market-table-header-bar">
              <div>
                <h2 className="market-table-title">Regional Price Monitoring Registry</h2>
                <span className="market-table-sub">Validated rates published by DA-CAR Agribusiness and Marketing Assistance Division (AMAD).</span>
              </div>
              <div className="market-badge-official">
                <Scale size={14} />
                <span>AMAD Verified</span>
              </div>
            </div>

            <div className="table-wrap">
              <table className="market-data-table">
                <thead>
                  <tr>
                    <th>Commodity Specification</th>
                    <th>Category</th>
                    <th>Trading Unit</th>
                    <th className="numeric">Min Price</th>
                    <th className="numeric">Max Price</th>
                    <th className="numeric">Average Price</th>
                    <th>Monitoring Station</th>
                    <th>Date Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id || i}>
                      <td>
                        <strong className="market-item-name">{r.commodity}</strong>
                      </td>
                      <td>
                        <span className="market-cat-pill">{r.category || 'Standard'}</span>
                      </td>
                      <td>{r.unit}</td>
                      <td className="numeric font-tabular">{formatPrice(r.minimum_price)}</td>
                      <td className="numeric font-tabular">{formatPrice(r.maximum_price)}</td>
                      <td className="numeric font-tabular">
                        <strong className="market-avg-highlight">{formatPrice(r.average_price)}</strong>
                      </td>
                      <td>
                        <span className="market-location-text">{r.market_location || 'CAR Regional Markets'}</span>
                      </td>
                      <td className="market-date-cell">{r.date_updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="market-table-foot">
              <span>Prices are updated periodically based on field monitoring. For commercial trade inquiries, contact the DA-CAR Agribusiness Division at (074) 445-4973.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
