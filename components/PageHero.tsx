interface PageHeroProps {
  eyebrow?: string;
  heading: string;
  description: string;
  parent?: {
    label: string;
    href: string;
  };
}

export default function PageHero({ eyebrow, heading, description }: PageHeroProps) {
  return (
    <div className="minimal-hero-container">
      <section className="minimal-page-hero-card" aria-label={heading}>
        <div className="minimal-page-hero-pattern" aria-hidden="true" />
        <div className="minimal-page-hero-content">
          <h1 className="minimal-page-hero-title">{heading}</h1>
          <p className="minimal-page-hero-desc">{description}</p>
        </div>
      </section>
    </div>
  );
}
