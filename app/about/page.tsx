import PageHero from '@/components/PageHero';

export const metadata = {
  title: 'About Rice Program Coordinating Unit | DA-CAR',
  description:
    'Learn about the Rice Program Coordinating Unit’s work coordinating rice programs, farmer services, and regional monitoring across the Cordillera Administrative Region.',
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Module 01: General Portal"
        heading="About Rice Program Coordinating Unit"
        description="Learn about the Rice Program Coordinating Unit’s work coordinating rice programs, farmer services, and regional monitoring across the Cordillera Administrative Region."
        parent={{ label: 'Home', href: '/' }}
      />
      <section className="content-section">
        <div className="page-container">
          <div className="about-copy surface surface-pad">
            <span className="section-kicker">Rice Program Coordinating Unit</span>
            <h2 className="content-heading" style={{ marginTop: 8 }}>
              Supporting rice-farming communities across the Cordillera
            </h2>
            <p style={{ marginTop: 16, lineHeight: 1.8 }}>
              The Rice Program Coordinating Unit coordinates rice-sector programs across the Cordillera Administrative Region, supporting farmers and strengthening local food security.
            </p>
            <p style={{ lineHeight: 1.8 }}>
              The unit works with regional and provincial partners to monitor program activities, track fund releases, and share services and reports for rice-farming communities.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
