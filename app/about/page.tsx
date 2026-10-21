import PageHero from '@/components/PageHero';
import Link from 'next/link';
import {
  Wheat,
  Sprout,
  GraduationCap,
  FlaskConical,
  Tractor,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Users,
  Target,
  Award,
  ArrowRight,
  Landmark,
  FileCheck2,
} from 'lucide-react';

export const metadata = {
  title: 'About the Unit | DA-CAR | Rice Program Coordinating Unit',
  description:
    'Mandate, organizational pillars, and regional agricultural coordination of the Department of Agriculture – Cordillera Administrative Region Rice Program Coordinating Unit.',
};

export default function AboutPage() {
  const pillars = [
    {
      code: 'PSS',
      title: 'Production Support Services',
      desc: 'Quality inbred and hybrid seeds, fertilizer discount vouchers, biocontrol agents, and highland seed buffer stock management.',
      icon: <Wheat size={20} />,
      kicker: 'Pillar 01 · Seed & Nutrients',
    },
    {
      code: 'ESETS',
      title: 'Extension Support & Education',
      desc: 'Season-long Farmers Field Schools (FFS), specialist capacity trainings, digital RSBSA enrollment, and modern agronomy modules.',
      icon: <GraduationCap size={20} />,
      kicker: 'Pillar 02 · Farmer Training',
    },
    {
      code: 'RD',
      title: 'Research & Development',
      desc: 'Climate-resilient varietal trials, traditional heirloom rice characterization, cold-tolerant testing, and soil health mapping.',
      icon: <FlaskConical size={20} />,
      kicker: 'Pillar 03 · Agricultural Science',
    },
    {
      code: 'INS',
      title: 'Infrastructure & Mechanization',
      desc: 'Farm-to-market access corridors, solar and mechanical dryers, warehouse storage facilities, and small-scale communal irrigation.',
      icon: <Tractor size={20} />,
      kicker: 'Pillar 04 · Farm Equipment',
    },
  ];

  return (
    <div className="about-portal-wrapper">
      <PageHero
        eyebrow="Module 01: Public Information Portal"
        heading="About the Rice Coordinating Unit"
        description="Coordinating regional rice productivity, food security initiatives, farmer extension, and financial governance across the Cordillera Administrative Region."
        parent={{ label: 'Home', href: '/' }}
      />

      {/* 1. Core Mandate & Institutional Overview */}
      <section className="section" style={{ paddingTop: 28, paddingBottom: 20 }}>
        <div className="page-container">
          <div className="mandate-ops-grid-clean">
            {/* Left Card: Dark Forest Green Mission Card */}
            <article className="ops-center-card-dark">
              <div>
                <div className="ops-kicker-badge-gold">
                  <ShieldCheck size={13} />
                  <span>Official Regional Mandate</span>
                </div>
                <h2 className="ops-card-title-serif" style={{ fontSize: 24, marginTop: 8 }}>
                  Empowering Cordillera Rice Communities
                </h2>
                <p className="ops-card-desc-muted" style={{ marginTop: 12 }}>
                  The Rice Program Coordinating Unit of DA-CAR serves as the lead administrative, technical, and monitoring body for all national rice banner interventions across Abra, Apayao, Benguet, Ifugao, Kalinga, and Mountain Province.
                </p>
                <p className="ops-card-desc-muted" style={{ marginTop: 8 }}>
                  Our mission is to achieve sustainable regional rice self-sufficiency, preserve UNESCO-recognized terrace ecosystems, elevate farmer incomes, and ensure transparent Registry of Allotments and Obligations (RAO) financial stewardship.
                </p>
              </div>

              <div className="ops-card-bottom-row" style={{ marginTop: 20 }}>
                <div className="ops-contact-items">
                  <span className="ops-contact-item">
                    <MapPin size={13} className="contact-icon" />
                    <span>BPI Compound, Guisad Rd, Baguio City</span>
                  </span>
                  <span className="ops-contact-item">
                    <Phone size={13} className="contact-icon" />
                    <span>(074) 443-4921 / (074) 445-4973</span>
                  </span>
                </div>
                <Link href="/provinces" className="ops-btn-action-gold">
                  <span>View 6 Provinces</span>
                  <span>→</span>
                </Link>
              </div>
            </article>

            {/* Right Card: Light Mint Coordinating Framework Card */}
            <article className="mandate-card-light">
              <div>
                <div className="mandate-kicker-badge-green">
                  <Target size={13} />
                  <span>Operational Targets</span>
                </div>
                <h3 className="mandate-card-title-serif" style={{ fontSize: 22, marginTop: 8 }}>
                  Key Governance Objectives
                </h3>
                <p className="mandate-card-desc-muted" style={{ marginTop: 10 }}>
                  Structured around direct farmer delivery, transparent allocation accounting, and rapid response to climate emergencies.
                </p>
              </div>

              <div className="mandate-stats-triple-row" style={{ marginTop: 16 }}>
                <div className="mandate-stat-mini-card">
                  <span className="mini-card-kicker">BENEFICIARIES</span>
                  <strong className="mini-card-val">41,792+</strong>
                  <span style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>RSBSA Registered</span>
                </div>
                <div className="mandate-stat-mini-card">
                  <span className="mini-card-kicker">COVERAGE</span>
                  <strong className="mini-card-val">6 Provinces</strong>
                  <span style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>77 Municipalities</span>
                </div>
                <div className="mandate-stat-mini-card">
                  <span className="mini-card-kicker">ACCOUNTABILITY</span>
                  <strong className="mini-card-val mini-card-green">100% RAO</strong>
                  <span style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Public Financials</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 2. Four Operational Program Pillars */}
      <section className="section" style={{ paddingTop: 10, paddingBottom: 40 }}>
        <div className="page-container">
          <div className="section-heading" style={{ marginBottom: 20 }}>
            <div>
              <span className="section-kicker">Coordinated Banner Interventions</span>
              <h2 style={{ fontSize: 24 }}>The Four Strategic Pillars</h2>
              <p>Operational frameworks governing all seed releases, machinery distributions, and farmer training.</p>
            </div>
            <Link href="/rice/programs" className="button button-outline" style={{ fontSize: 12.5 }}>
              Browse Program Register <ArrowRight size={14} />
            </Link>
          </div>

          <div className="about-pillars-grid">
            {pillars.map((pillar) => (
              <article key={pillar.code} className="about-pillar-card">
                <div className="about-pillar-top">
                  <div className="about-pillar-icon-wrap">
                    {pillar.icon}
                  </div>
                  <span className="about-pillar-kicker">{pillar.kicker}</span>
                </div>
                <h3 className="about-pillar-title">{pillar.title}</h3>
                <p className="about-pillar-desc">{pillar.desc}</p>
                <div className="about-pillar-foot">
                  <span className="about-pillar-code">{pillar.code}</span>
                  <Link href="/rice/programs" className="about-pillar-link">
                    <span>View register</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Heritage Rice & Highland Conservation */}
      <section className="section section-muted" style={{ padding: '36px 0 44px' }}>
        <div className="page-container">
          <div className="about-heritage-card">
            <div className="about-heritage-content">
              <span className="ops-kicker-badge-gold" style={{ display: 'inline-flex', marginBottom: 12 }}>
                <Award size={13} />
                <span>Cordillera Heritage</span>
              </span>
              <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 24, margin: '0 0 12px', color: '#092319' }}>
                Preserving Ancient Heritage Rice & Terrace Ecosystems
              </h2>
              <p style={{ fontSize: 13.5, lineHeight: 1.7, color: '#475569', margin: 0 }}>
                Beyond high-yielding commercial varieties in the Chico River plains of Kalinga and Apayao, our unit maintains specialized programs protecting indigenous heirloom varieties — including Tinawon, Unoy, and Javanica cultivars — sustaining centuries-old terrace cultures recognized globally as UNESCO World Heritage.
              </p>
            </div>
            <div className="about-heritage-stats">
              <div className="heritage-mini-stat">
                <span className="heritage-stat-num">20+</span>
                <span className="heritage-stat-label">Traditional Heirloom Rice Varieties Monitored</span>
              </div>
              <div className="heritage-mini-stat">
                <span className="heritage-stat-num">2,000+ yrs</span>
                <span className="heritage-stat-label">Continuous Terrace Agricultural Stewardship</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Contact & Regional Office Desk */}
      <section className="section" style={{ paddingTop: 30, paddingBottom: 50 }}>
        <div className="page-container">
          <div className="about-contact-bar">
            <div>
              <span className="section-kicker">Regional Coordinating Desk</span>
              <h3 style={{ margin: '6px 0 0', fontSize: 20 }}>Have an inquiry or program proposal?</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13 }}>
                Connect with our extension officers, field coordinators, or administrative secretariat.
              </p>
            </div>
            <div className="about-contact-actions">
              <a href="mailto:car@da.gov.ph" className="button button-outline">
                <Mail size={14} /> Email Coordinating Unit
              </a>
              <Link href="/weather" className="button button-primary">
                Agricultural Weather Desks
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
