import PageHero from '@/components/PageHero';
import {
  CloudSun,
  Droplets,
  Wind,
  Thermometer,
  Sun,
  CloudRain,
  Cloud,
  Compass,
  AlertTriangle,
  Info,
  Calendar,
} from 'lucide-react';

export const metadata = {
  title: 'Agricultural Weather | DA-CAR | Rice Program Coordinating Unit',
  description: 'Agriculture-focused weather monitoring and field advisories across the Cordillera Administrative Region.',
};

interface StationWeather {
  location: string;
  province: string;
  temp: string;
  condition: string;
  humidity: string;
  wind: string;
  advisory: string;
  advisoryType: 'optimal' | 'caution' | 'normal';
}

const stations: StationWeather[] = [
  {
    location: 'Tabuk City Agro-Station',
    province: 'Kalinga',
    temp: '29°C',
    condition: 'Scattered Showers',
    humidity: '82%',
    wind: '11 km/h NE',
    advisory: 'Adequate soil moisture for land prep; secure unthreshed grain in covered dryers.',
    advisoryType: 'caution',
  },
  {
    location: 'Bangued River Valley',
    province: 'Abra',
    temp: '31°C',
    condition: 'Sunny',
    humidity: '65%',
    wind: '9 km/h W',
    advisory: 'Optimal weather for open-air solar drying and mechanical field tilling.',
    advisoryType: 'optimal',
  },
  {
    location: 'Luna Lowland Station',
    province: 'Apayao',
    temp: '28°C',
    condition: 'Cloudy',
    humidity: '80%',
    wind: '12 km/h ENE',
    advisory: 'Monitor communal canal water gates; favorable conditions for transplanting.',
    advisoryType: 'normal',
  },
  {
    location: 'Lagawe Terrace Outpost',
    province: 'Ifugao',
    temp: '25°C',
    condition: 'Mostly Sunny',
    humidity: '74%',
    wind: '6 km/h SE',
    advisory: 'Favorable terrace water impounding; ideal for highland heirloom maintenance.',
    advisoryType: 'optimal',
  },
  {
    location: 'Bontoc Mountain Basin',
    province: 'Mountain Province',
    temp: '22°C',
    condition: 'Fair',
    humidity: '71%',
    wind: '7 km/h N',
    advisory: 'Cool highland temperatures; steady conditions for vegetative growth.',
    advisoryType: 'normal',
  },
  {
    location: 'Baguio City & Benguet Highlands',
    province: 'Benguet',
    temp: '19°C',
    condition: 'Partly Cloudy',
    humidity: '78%',
    wind: '8 km/h NW',
    advisory: 'Mild mountain breeze; low risk of frost in high-elevation pockets.',
    advisoryType: 'optimal',
  },
];

function getWeatherIcon(cond: string) {
  const lower = cond.toLowerCase();
  if (lower.includes('rain') || lower.includes('shower')) {
    return <CloudRain size={22} className="weather-icon-rain" />;
  }
  if (lower.includes('partly') || lower.includes('fair')) {
    return <CloudSun size={22} className="weather-icon-partly" />;
  }
  if (lower.includes('cloud')) {
    return <Cloud size={22} className="weather-icon-cloud" />;
  }
  return <Sun size={22} className="weather-icon-sun" />;
}

export default function WeatherPage() {
  return (
    <div className="weather-portal-page">
      <PageHero
        eyebrow="Public Information Portal"
        heading="Agricultural Weather & Field Bulletins"
        description="Cordillera microclimate monitoring, provincial station telemetry, humidity levels, and seasonal agricultural farm advisories."
        parent={{ label: 'Home', href: '/' }}
      />

      <section className="section" style={{ paddingTop: 28, paddingBottom: 50 }}>
        <div className="page-container">
          {/* Top Regional Weather Advisory Banner */}
          <div className="weather-advisory-banner">
            <div className="weather-advisory-icon-wrap">
              <Info size={18} />
            </div>
            <div className="weather-advisory-body">
              <strong>DA-CAR Regional Agro-Climatic Advisory</strong>
              <p>
                Dry Season (DS) cropping cycles are underway across low-lying valleys of Kalinga and Abra. Farmers are encouraged to coordinate with Local Municipal Agriculture Offices (MAO) regarding rotational irrigation releases and communal canal cleaning.
              </p>
            </div>
            <div className="weather-advisory-tag">
              <Calendar size={13} />
              <span>FY 2026 Season</span>
            </div>
          </div>

          {/* 6 Clean Weather Station Cards */}
          <div className="weather-station-grid">
            {stations.map((st) => (
              <article key={st.location} className="weather-station-card">
                <div className="station-card-top">
                  <div>
                    <span className="station-province-kicker">{st.province}</span>
                    <h2 className="station-title">{st.location}</h2>
                  </div>
                  <div className="station-icon-badge">
                    {getWeatherIcon(st.condition)}
                  </div>
                </div>

                <div className="station-temp-row">
                  <span className="station-temp-val">{st.temp}</span>
                  <span className="station-condition-pill">{st.condition}</span>
                </div>

                <div className="station-metrics-row">
                  <div className="station-metric-chip">
                    <Droplets size={13} className="metric-chip-icon" />
                    <span>{st.humidity} Humidity</span>
                  </div>
                  <div className="station-metric-chip">
                    <Wind size={13} className="metric-chip-icon" />
                    <span>{st.wind}</span>
                  </div>
                </div>

                <div className={`station-advisory-box advisory-${st.advisoryType}`}>
                  <span className="station-advisory-kicker">Field Advisory:</span>
                  <p className="station-advisory-text">{st.advisory}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
