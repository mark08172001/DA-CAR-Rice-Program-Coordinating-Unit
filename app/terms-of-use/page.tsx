import PageHero from '@/components/PageHero';

export const metadata = {
  title: 'Terms of Use | DA-CAR',
  description: 'Terms for accessing and using this information portal.',
};

export default function TermsOfUsePage() {
  return (
    <>
      <PageHero
        eyebrow="Terms"
        heading="Terms of Use"
        description="Terms for accessing and using this official information portal."
        parent={{ label: 'Home', href: '/' }}
      />
      <section className="content-section">
        <div className="page-container">
          <div className="surface surface-pad about-copy">
            <span className="section-kicker">Terms and Conditions</span>
            <h2 className="content-heading" style={{ marginTop: 8 }}>
              Portal Usage Guidelines
            </h2>
            <p style={{ marginTop: 16, lineHeight: 1.8 }}>
              This portal is an official digital service of the Department of Agriculture – Cordillera Administrative Region. Information presented here regarding rice programs, allocations, market prices, and regional directories is published for public transparency and farmer assistance.
            </p>
            <p style={{ lineHeight: 1.8 }}>
              All contents are property of the Republic of the Philippines and may be cited or referenced for non-commercial educational, informational, or agricultural research purposes with proper attribution.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
