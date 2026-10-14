import PageHero from '@/components/PageHero';
import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | DA-CAR',
  description: 'Information about how this portal handles personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero
        eyebrow="Module 01: General Portal"
        heading="Privacy Policy"
        description="Information about how this portal handles personal information and public data."
        parent={{ label: 'Home', href: '/' }}
      />
      <section className="content-section">
        <div className="page-container">
          <div className="surface surface-pad about-copy">
            <span className="section-kicker">Data Protection & Privacy</span>
            <h2 className="content-heading" style={{ marginTop: 8 }}>
              Department of Agriculture Privacy Notice
            </h2>
            <p style={{ marginTop: 16, lineHeight: 1.8 }}>
              The Department of Agriculture – Cordillera Administrative Region (DA-CAR) is committed to protecting the privacy and personal data of farmers, stakeholders, and visitors in compliance with the Republic Act No. 10173 (Data Privacy Act of 2012).
            </p>
            <p style={{ lineHeight: 1.8 }}>
              Any personal details collected through inquiry forms or beneficiary registries are stored securely in accordance with government data protection guidelines and are used solely for official agricultural program coordination.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
