'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Pause, Play } from 'lucide-react';

const slides = [
  {
    eyebrow: 'Module 01: General Portal',
    title: (
      <>
        Rice Program Coordinating Unit<span>Portal</span>
      </>
    ),
    description:
      'Access agricultural programs, regional services, rice coordination information, and public data for the Cordillera Administrative Region.',
    caption: 'DA-CAR | Rice Program Coordinating Unit',
    actions: (
      <>
        <a href="#portal-services" className="button button-primary">
          Browse portal services <ArrowDown size={15} />
        </a>
        <Link href="/rice" className="button button-light">
          Open rice coordination
        </Link>
      </>
    ),
  },
  {
    eyebrow: 'Module 02: Rice Program Operations',
    title: (
      <>
        Track rice program<span>operations</span>
      </>
    ),
    description:
      'Review ongoing activities, fund releases, farmer services, and official reports from the regional coordinating unit.',
    caption: 'Rice Program Coordinating Unit',
    actions: (
      <Link href="/rice" className="button button-primary">
        View operations dashboard <ArrowRight size={15} />
      </Link>
    ),
  },
  {
    eyebrow: 'Module 01: General Portal',
    title: (
      <>
        Services for<span>Cordillera communities</span>
      </>
    ),
    description:
      'Find regional programs, province information, public data, and department contact channels through one official portal.',
    caption: 'Public agricultural information',
    actions: (
      <a href="#portal-services" className="button button-primary">
        Explore services <ArrowDown size={15} />
      </a>
    ),
  },
];

export default function HeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <section
      className="hero hero-carousel"
      aria-roledescription="carousel"
      aria-label="DA-CAR portal highlights"
    >
      <div className="hero-slides">
        {slides.map((slide, index) => {
          const isActive = index === activeSlide;
          return (
            <article
              key={index}
              className={`hero-slide ${isActive ? 'is-active' : ''}`}
              data-slide={index}
              aria-hidden={!isActive}
              style={{ display: isActive ? 'block' : 'none' }}
            >
              <div className="hero-content">
                <span className="eyebrow">{slide.eyebrow}</span>
                <h1 id={index === 0 ? 'home-title' : undefined}>{slide.title}</h1>
                <p className="hero-description">{slide.description}</p>
                <div className="hero-actions">{slide.actions}</div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hero-caption">
        <span id="hero-caption-text">{slides[activeSlide].caption}</span>
        <div className="hero-controls">
          <button
            className="hero-pause"
            type="button"
            aria-label={paused ? 'Play carousel' : 'Pause carousel'}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={13} /> : <Pause size={13} />}
          </button>
          <div className="hero-dots" role="tablist" aria-label="Carousel slides">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`hero-dot ${index === activeSlide ? 'is-active' : ''}`}
                type="button"
                role="tab"
                aria-label={`Show slide ${index + 1}`}
                aria-selected={index === activeSlide}
                onClick={() => setActiveSlide(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
