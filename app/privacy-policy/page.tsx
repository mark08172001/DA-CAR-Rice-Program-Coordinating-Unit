import PageHero from '@/components/PageHero';
import { ShieldCheck, Lock, Eye, FileCheck2, UserCheck, AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | DA-CAR | Rice Program Coordinating Unit',
  description: 'Data protection standards, farmer privacy safeguards, and RA 10173 compliance policy of the DA-CAR Rice Program Coordinating Unit.',
};

export default function PrivacyPolicyPage() {
  const commitments = [
    {
      icon: <Lock size={18} />,
      title: 'Republic Act No. 10173 Compliance',
      desc: 'The Department of Agriculture – Cordillera Administrative Region strictly adheres to the Philippine Data Privacy Act of 2012 (RA 10173). Personal identifying information collected through inquiries or farmer registrations is handled with strict confidentiality.',
    },
    {
      icon: <UserCheck size={18} />,
      title: 'RSBSA Beneficiary Data Security',
      desc: 'Farmer profiles, National IDs, PanaloKard credentials, and land parcel coordinates under the Registry System for Basic Sectors in Agriculture (RSBSA) are stored in encrypted databases accessible solely to authorized agricultural extension officers.',
    },
    {
      icon: <Eye size={18} />,
      title: 'Public Transparency vs Personal Privacy',
      desc: 'Public portal dashboards report aggregated provincial counts, financial obligation rates, and commodity volume statistics. Individual personal phone numbers and private addresses are redacted from all public screens to prevent unauthorized solicitation.',
    },
    {
      icon: <FileCheck2 size={18} />,
      title: 'Data Subject Rights & Inquiries',
      desc: 'Registered farmers and portal users retain the right to inspect, verify, or request correction of their recorded agricultural beneficiary records by coordinating with their respective Municipal Agriculture Office (MAO) or our Data Protection Officer.',
    },
  ];

  return (
    <div className="privacy-portal-page">
      <PageHero
        eyebrow="Module 01: Public Information Portal"
        heading="Privacy Policy & Data Protection"
        description="Official privacy notice, data protection governance, and RSBSA beneficiary confidentiality protocols of the DA-CAR Rice Program Coordinating Unit."
        parent={{ label: 'Home', href: '/' }}
      />

      <section className="section" style={{ paddingTop: 28, paddingBottom: 50 }}>
        <div className="page-container">
          <div className="legal-editorial-container">
            {/* Header Compliance Card */}
            <div className="legal-header-card">
              <div className="legal-header-badge green-badge">
                <ShieldCheck size={14} />
                <span>National Privacy Commission (NPC) · RA 10173 Registered</span>
              </div>
              <h2 className="legal-doc-title">Farmer Beneficiary & Public Data Notice</h2>
              <p className="legal-doc-meta">
                Official Agency Notice · Department of Agriculture – Cordillera Administrative Region
              </p>
            </div>

            {/* Core Commitments Grid */}
            <div className="legal-sections-grid">
              {commitments.map((c, i) => (
                <article key={i} className="legal-section-card">
                  <div className="legal-sec-top">
                    <div className="legal-sec-icon-wrap">{c.icon}</div>
                    <h3 className="legal-sec-title">{c.title}</h3>
                  </div>
                  <p className="legal-sec-body">{c.desc}</p>
                </article>
              ))}
            </div>

            {/* Bottom DPO Desk Notice */}
            <div className="legal-footer-notice">
              <div className="legal-footer-icon">
                <Lock size={18} />
              </div>
              <div className="legal-footer-text">
                <strong>Data Protection Officer (DPO) Contact Desk</strong>
                <p>
                  To exercise your rights under the Data Privacy Act or request assistance regarding your RSBSA profile, contact the DA-CAR Regional Data Protection Officer at <strong>dpo@car.da.gov.ph</strong> or visit the BPI Compound, Guisad Road, Baguio City.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
