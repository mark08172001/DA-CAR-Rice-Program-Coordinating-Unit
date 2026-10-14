import Link from 'next/link';

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
    <section className="page-hero">
      <div className="page-container">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{heading}</h1>
        <p>{description}</p>
        {parent && (
          <div className="breadcrumbs">
            <Link href={parent.href}>{parent.label}</Link>
            <span>/</span>
            <span>{heading}</span>
          </div>
        )}
      </div>
    </section>
  );
}
