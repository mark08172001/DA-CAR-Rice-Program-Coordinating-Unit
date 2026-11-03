import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-main">
          <div>
            <Link href="/" className="footer-brand">
              <span className="brand-seal" style={{ width: 48, height: 48 }}>
                <img
                  src="/da-logo.png"
                  alt="Department of Agriculture Seal"
                  width={48}
                  height={48}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%', filter: 'none' }}
                />
              </span>
              <span>
                <strong>DA-CAR</strong>
                <span>Rice Program Coordinating Unit</span>
              </span>
            </Link>
            <p className="footer-about">
              Serving the agricultural communities of the Cordillera Administrative Region.
            </p>
          </div>
          <div>
            <h3>Quick Links</h3>
            <nav className="footer-links" aria-label="Footer navigation">
              <Link href="/about">About Coordinating Unit</Link>
              <Link href="/#event-calendar">Field Activities Calendar</Link>
              <Link href="/login">Staff Portal Sign In</Link>
            </nav>
          </div>
          <div>
            <h3>Information</h3>
            <nav className="footer-links" aria-label="Policies">
              <Link href="/privacy-policy">Privacy Policy</Link>
              <Link href="/terms-of-use">Terms of Use</Link>
            </nav>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Copyright © 2026 DA-CAR | Rice Program Coordinating Unit</span>
          <span>Official government information portal</span>
        </div>
      </div>
    </footer>
  );
}
