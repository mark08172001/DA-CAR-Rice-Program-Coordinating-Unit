'use client';

import { useState, useEffect } from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';

const slides = [
  {
    kicker: '— 2026 WET & DRY SEASON',
    title: (
      <>
        Certified seed & <em>fertilizer support</em>
      </>
    ),
    description:
      'Check allocation schedules and municipal distribution points across Abra, Apayao, Benguet, Ifugao, Kalinga, and Mountain Province.',
    ctaText: 'View allocations ↓',
    ctaHref: '#rice-dashboard',
    ctaSubtext: 'RCEF & National Rice Program',
    image: '/hero-support.jpg',
  },
  {
    kicker: '— CORDILLERA RICE INITIATIVES',
    title: (
      <>
        Highland heritage & <em>sustainable food systems</em>
      </>
    ),
    description:
      'Supporting terrace rehabilitation, heirloom rice exports, and localized farmer cooperatives across the Cordillera highlands.',
    ctaText: 'Explore programs ↓',
    ctaHref: '#portal-services',
    ctaSubtext: 'Regional Rice Program Coordination',
    image: '/hero-terraces.jpg',
  },
  {
    kicker: '— FIELD EXTENSION & OPERATIONS',
    title: (
      <>
        Direct farmer support & <em>machinery distribution</em>
      </>
    ),
    description:
      'Live schedules for certified bio-fertilizers, solar irrigation pumps, hauling equipment, and technical agronomy training.',
    ctaText: 'Check calendar ↓',
    ctaHref: '#event-calendar',
    ctaSubtext: 'Agricultural Extension Operations',
    image: '/hero-machinery.jpg',
  },
];

export default function HeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 8500);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[activeSlide];

  return (
    <section className="minimal-hero-container" aria-label="Rice Program Support Portal">
      <div className="minimal-hero-card">
        {/* Right side photography overlay - distinct image per slide with smooth crossfade */}
        {slides.map((s, idx) => (
          <div
            key={idx}
            className="minimal-hero-bg"
            style={{
              backgroundImage: `url('${s.image}')`,
              opacity: idx === activeSlide ? 1 : 0,
              transition: 'opacity 0.75s ease-in-out',
            }}
            aria-hidden="true"
          />
        ))}
        <div className="minimal-hero-gradient" aria-hidden="true" />

        {/* Content */}
        <div className="minimal-hero-content">
          <div className="minimal-hero-kicker">{slide.kicker}</div>
          <h1 className="minimal-hero-title">{slide.title}</h1>
          <p className="minimal-hero-desc">{slide.description}</p>

          <div className="minimal-hero-action-row">
            <a href={slide.ctaHref} className="minimal-hero-cta">
              {slide.ctaText}
            </a>
            <span className="minimal-hero-subtext">| {slide.ctaSubtext}</span>
          </div>
        </div>

        {/* Bottom-right slide indicators */}
        <div className="minimal-hero-dots" role="tablist" aria-label="Hero carousel navigation">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`minimal-hero-dot ${idx === activeSlide ? 'active' : ''}`}
              onClick={() => setActiveSlide(idx)}
              aria-label={`Switch to slide ${idx + 1}`}
              aria-selected={idx === activeSlide}
              role="tab"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
