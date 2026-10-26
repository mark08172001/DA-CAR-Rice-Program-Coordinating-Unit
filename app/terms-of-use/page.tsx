import PageHero from '@/components/PageHero';
import { FileText, ShieldCheck, CheckCircle2, AlertCircle, Info, Landmark } from 'lucide-react';

export const metadata = {
  title: 'Terms of Use | DA-CAR | Rice Program Coordinating Unit',
  description: 'Terms and guidelines for accessing and utilizing the official DA-CAR Rice Program Information Portal.',
};

export default function TermsOfUsePage() {
  const sections = [
    {
      num: '01',
      title: 'Portal Purpose & Public Transparency',
      desc: 'This digital portal is maintained by the Department of Agriculture – Cordillera Administrative Region (DA-CAR) to ensure transparent public disclosure of rice banner programs, physical accomplishments, farmer directory services, and financial obligations under Republic of the Philippines laws.',
    },
    {
      num: '02',
      title: 'Intellectual Property & Content Attribution',
      desc: 'All official registries, publications, cartographic graphics, and administrative datasets remain the property of the Department of Agriculture. Citizens, researchers, and academic institutions may cite, analyze, or quote materials for non-commercial educational purposes with proper institutional attribution.',
    },
    {
      num: '03',
      title: 'Authorized Personnel Access (Modules 04–05)',
      desc: 'Internal modules governing RSBSA farmer registry modifications, voucher releases, financial ledger alterations, and administrative security controls require valid government credentials. Unauthorized access attempts, credential sharing, or automated scraping are strictly prohibited and subject to legal prosecution under RA 10175 (Cybercrime Prevention Act of 2012).',
    },
    {
      num: '04',
      title: 'Data Accuracy & Periodic Updates',
      desc: 'While the Coordinating Unit exerts diligent efforts to keep all market prices, weather station bulletins, and beneficiary counts updated in real-time, published figures reflect official field submissions and may undergo administrative post-audit adjustments.',
    },
  ];

  return (
    <div className="terms-portal-page">
      <PageHero
        eyebrow="Module 01: Public Information Portal"
        heading="Terms of Use & Portal Guidelines"
        description="Official terms of access, acceptable use policy, and public transparency governance for the DA-CAR Rice Program Coordinating Unit portal."
        parent={{ label: 'Home', href: '/' }}
      />

      <section className="section" style={{ paddingTop: 28, paddingBottom: 50 }}>
        <div className="page-container">
          <div className="legal-editorial-container">
            {/* Header Badge */}
            <div className="legal-header-card">
              <div className="legal-header-badge">
                <Landmark size={14} />
                <span>Republic of the Philippines · Official Digital Portal</span>
              </div>
              <h2 className="legal-doc-title">Portal Usage & Transparency Guidelines</h2>
              <p className="legal-doc-meta">
                Effective Date: Calendar Year 2026 · Department of Agriculture – Cordillera Administrative Region
              </p>
            </div>

            {/* Sections */}
            <div className="legal-sections-grid">
              {sections.map((sec) => (
                <article key={sec.num} className="legal-section-card">
                  <div className="legal-sec-top">
                    <span className="legal-sec-num">{sec.num}</span>
                    <h3 className="legal-sec-title">{sec.title}</h3>
                  </div>
                  <p className="legal-sec-body">{sec.desc}</p>
                </article>
              ))}
            </div>

            {/* Bottom Contact Desk Notice */}
            <div className="legal-footer-notice">
              <div className="legal-footer-icon">
                <ShieldCheck size={18} />
              </div>
              <div className="legal-footer-text">
                <strong>Legal & Administrative Secretariat Desk</strong>
                <p>
                  For inquiries regarding data permissions, formal citations, or institutional research partnerships, contact the Office of the Regional Executive Director at <strong>car@da.gov.ph</strong> or call (074) 443-4921.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
