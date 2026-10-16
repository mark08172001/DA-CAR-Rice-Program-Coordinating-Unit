import PageHero from '@/components/PageHero';
import { CloudSun, Droplets, Wind, Thermometer } from 'lucide-react';

export const metadata = {
  title: 'Agricultural Weather | DA-CAR | Rice Program Coordinating Unit',
  description: 'Agriculture-focused weather information for the Cordillera Administrative Region.',
};

const stations = [
  { location: 'Baguio City & Benguet Highlands', temp: '19°C', condition: 'Partly Cloudy', humidity: '78%', wind: '8 km/h' },
  { location: 'Tabuk City, Kalinga', temp: '29°C', condition: 'Scattered Showers', humidity: '82%', wind: '11 km/h' },
  { location: 'Lagawe, Ifugao', temp: '25°C', condition: 'Mostly Sunny', humidity: '74%', wind: '6 km/h' },
  { location: 'Bangued, Abra', temp: '31°C', condition: 'Sunny', humidity: '65%', wind: '9 km/h' },
  { location: 'Luna, Apayao', temp: '28°C', condition: 'Cloudy', humidity: '80%', wind: '12 km/h' },
  { location: 'Bontoc, Mountain Province', temp: '22°C', condition: 'Fair', humidity: '71%', wind: '7 km/h' },
];

export default function WeatherPage() {
  return (
    <>
      <PageHero
        eyebrow="Module 01: General Portal"
        heading="Weather"
        description="Agriculture-focused weather information for the Cordillera Administrative Region."
        parent={{ label: 'Home', href: '/' }}
      />
      <section className="content-section">
        <div className="page-container">
          <div className="directory-grid">
            {stations.map((st, i) => (
              <article key={i} className="directory-card">
                <span className="directory-icon">
                  <CloudSun size={20} />
                </span>
                <h2>{st.location}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0 8px' }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--green-900)' }}>{st.temp}</span>
                  <span className="status-pill">{st.condition}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Droplets size={13} /> {st.humidity}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Wind size={13} /> {st.wind}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
