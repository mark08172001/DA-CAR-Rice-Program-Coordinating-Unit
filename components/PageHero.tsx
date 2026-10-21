import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';

interface PageHeroProps {
  eyebrow: string;
  heading: string;
  description: string;
  parent?: {
    label: string;
    href: string;
  };
}

export default function PageHero({ eyebrow, heading, description, parent }: PageHeroProps) {
  return (
    <div className="minimal-hero-container">
      <section className="minimal-page-hero-card" aria-label={heading}>
        <div className="minimal-page-hero-pattern" aria-hidden="true" />
        <div className="minimal-page-hero-content">
          <div className="minimal-hero-kicker-badge">
            <span className="kicker-pulse-dot" />
            <span>{eyebrow}</span>
          </div>
          <h1 className="minimal-page-hero-title">{heading}</h1>
          <p className="minimal-page-hero-desc">{description}</p>
          <nav className="minimal-hero-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/" className="minimal-hero-bc-link" title="Portal Home">
              <Home size={12} />
              <span>Home</span>
            </Link>
            {parent && (
              <>
                <ChevronRight size={13} className="minimal-hero-bc-sep" />
                <Link href={parent.href} className="minimal-hero-bc-link">
                  {parent.label}
                </Link>
              </>
            )}
            <ChevronRight size={13} className="minimal-hero-bc-sep" />
            <span className="minimal-hero-bc-current">{heading}</span>
          </nav>
        </div>
      </section>
    </div>
  );
}
