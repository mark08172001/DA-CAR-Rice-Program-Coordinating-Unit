import PageHero from '@/components/PageHero';
import { MapPin } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Provinces | DA-CAR',
  description: 'Province directory for the Cordillera Administrative Region.',
};

const fallbackProvinces = [
  { name: 'Abra', description: 'Known as the Natural Dye Capital of the Philippines with rich agricultural river basins.' },
  { name: 'Apayao', description: 'Cordillera’s Last Nature Frontier, producing rice, corn, and root crops.' },
  { name: 'Benguet', description: 'Salad Bowl of the Philippines and major highland vegetable producing province.' },
  { name: 'Ifugao', description: 'Home to the ancient Rice Terraces UNESCO World Heritage site and traditional heirloom rice.' },
  { name: 'Kalinga', description: 'Major rice granary of the Cordillera along the Chico River valleys.' },
  { name: 'Mountain Province', description: 'Famous for coffee, high-value vegetables, and scenic terrace farming.' },
];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProvincesPage() {
  let provinces = fallbackProvinces;

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data } = await supabase.from('provinces').select('*').order('name', { ascending: true });
    if (data && data.length > 0) {
      provinces = data;
    }
  } catch (e) {
    console.error('Error fetching provinces:', e);
  }

  return (
    <>
      <PageHero
        eyebrow="Module 01: General Portal"
        heading="Provinces"
        description="Province directory for the Cordillera Administrative Region."
        parent={{ label: 'Home', href: '/' }}
      />
      <section className="content-section">
        <div className="page-container">
          <div className="directory-grid">
            {provinces.map((province, idx) => (
              <article key={idx} className="directory-card">
                <span className="directory-icon">
                  <MapPin size={20} />
                </span>
                <h2>{province.name}</h2>
                {province.description && <p>{province.description}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
