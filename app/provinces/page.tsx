import PageHero from '@/components/PageHero';
import { MapPin, Sprout, ArrowRight, Wheat, Mountain, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'CAR Provinces Directory | DA-CAR | Rice Program Coordinating Unit',
  description: 'Agricultural profiles and provincial coverage across the Cordillera Administrative Region.',
};

interface ProvinceDetail {
  name: string;
  capital: string;
  tag: string;
  description: string;
  majorCrops: string[];
  keyHighlight: string;
}

const detailedProvinces: ProvinceDetail[] = [
  {
    name: 'Kalinga',
    capital: 'Tabuk City',
    tag: 'Rice Granary of the Cordilleras',
    description: 'The premier rice-producing province of CAR, featuring extensive irrigated lowland river basins along the fertile Chico River valley.',
    majorCrops: ['Hybrid Rice', 'Certified Inbred Palay', 'Yellow Corn'],
    keyHighlight: 'Highest regional palay yield & major commercial milling hub.',
  },
  {
    name: 'Apayao',
    capital: 'Kabugao / Luna',
    tag: 'Cordillera’s Agricultural Frontier',
    description: 'Rich alluvial plains and expanding agricultural river valleys producing substantial palay surpluses and diversified grain crops.',
    majorCrops: ['Inbred Palay', 'White & Yellow Corn', 'High-Value Crops'],
    keyHighlight: 'Rapidly expanding irrigated acreage and seed production centers.',
  },
  {
    name: 'Abra',
    capital: 'Bangued',
    tag: 'Abra River Agricultural Basin',
    description: 'Vast agricultural lowlands bordered by rugged mountains, supported by the extensive Abra River basin for grain and seed farming.',
    majorCrops: ['Irrigated Palay', 'Corn', 'Organic Muscovado'],
    keyHighlight: 'Primary hub for certified inbred seed multiplication and distribution.',
  },
  {
    name: 'Ifugao',
    capital: 'Lagawe',
    tag: 'UNESCO Heirloom Rice Terraces',
    description: 'Ancient hand-carved stone and mud rice terraces recognized globally as a UNESCO World Heritage cultural landscape and FAO GIAHS site.',
    majorCrops: ['Tinawon Heirloom Rice', 'Upland Rice', 'Highland Vegetables'],
    keyHighlight: 'Custodian of centuries-old heirloom rice varieties and terrace culture.',
  },
  {
    name: 'Mountain Province',
    capital: 'Bontoc',
    tag: 'Highland Heritage & Terraces',
    description: 'Steep mountains, stone-walled terrace farming, and cool microclimates fostering specialized upland rice and heirloom cultivars.',
    majorCrops: ['Traditional Rice', 'Arabica Coffee', 'Highland Vegetables'],
    keyHighlight: 'Key conservation zone for indigenous traditional rice cultivars.',
  },
  {
    name: 'Benguet',
    capital: 'La Trinidad',
    tag: 'Salad Bowl of the Philippines',
    description: 'Elevated highland valleys renowned for cold-tolerant agricultural varieties, intensive terrace systems, and high-value agri-enterprise.',
    majorCrops: ['Cold-Tolerant Rice', 'Highland Vegetables', 'Cutflowers'],
    keyHighlight: 'Center for highland agricultural trade, research, and cold-climate trials.',
  },
];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProvincesPage() {
  return (
    <div className="provinces-portal-page">
      <PageHero
        eyebrow="Module 01: Public Information Portal"
        heading="Cordillera Administrative Region Provinces"
        description="Agricultural profiles, palay production centers, and regional coverage across the 6 provinces of the Cordillera Administrative Region."
        parent={{ label: 'Home', href: '/' }}
      />

      <section className="section" style={{ paddingTop: 28, paddingBottom: 50 }}>
        <div className="page-container">
          {/* Top Quick Facts Row */}
          <div className="provinces-stats-bar">
            <div className="pstat-item">
              <span className="pstat-label">REGIONAL JURISDICTION</span>
              <strong className="pstat-val">6 Provinces</strong>
            </div>
            <div className="pstat-divider" />
            <div className="pstat-item">
              <span className="pstat-label">LOCAL GOVERNMENT UNITS</span>
              <strong className="pstat-val">77 Municipalities & 2 Cities</strong>
            </div>
            <div className="pstat-divider" />
            <div className="pstat-item">
              <span className="pstat-label">BARANGAY REACH</span>
              <strong className="pstat-val">1,176 Rural Barangays</strong>
            </div>
            <div className="pstat-divider" />
            <div className="pstat-item">
              <span className="pstat-label">CORE MANDATE</span>
              <strong className="pstat-val" style={{ color: '#059669' }}>Food Security & Self-Sufficiency</strong>
            </div>
          </div>

          {/* 6 Clean Province Cards */}
          <div className="provinces-card-grid">
            {detailedProvinces.map((prov) => (
              <article key={prov.name} className="province-editorial-card">
                <div className="prov-card-header">
                  <div className="prov-icon-wrap">
                    <MapPin size={18} />
                  </div>
                  <div className="prov-meta-wrap">
                    <span className="prov-tag-pill">{prov.tag}</span>
                    <h2 className="prov-title-serif">{prov.name}</h2>
                    <span className="prov-capital-sub">Capital: {prov.capital}</span>
                  </div>
                </div>

                <p className="prov-desc-body">{prov.description}</p>

                <div className="prov-crops-row">
                  <span className="prov-crops-kicker">Key Commodities:</span>
                  <div className="prov-crops-pills">
                    {prov.majorCrops.map((crop) => (
                      <span key={crop} className="prov-crop-pill">
                        {crop}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="prov-foot-highlight">
                  <div className="prov-highlight-text">
                    <Wheat size={14} className="prov-wheat-icon" />
                    <span>{prov.keyHighlight}</span>
                  </div>
                  <Link href="/rice/physical" className="prov-explore-link">
                    <span>Operations data</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
