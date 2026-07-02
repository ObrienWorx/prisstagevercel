'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export type HeroSlide = { image: string; title: string; link: string };

export default function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [i, setI] = useState(0);
  const n = slides.length;

  useEffect(() => {
    if (n <= 1) return;
    const id = setInterval(() => setI((p) => (p + 1) % n), 5000);
    return () => clearInterval(id);
  }, [n]);

  if (n === 0) return null;

  return (
    <div className="hero-slider">
      {slides.map((s, idx) => {
        const inner = (
          <>
            <img src={s.image} alt={s.title || 'Homepage hero'} />
            {s.title && <div className="hero-slide-title">{s.title}</div>}
          </>
        );
        return (
          <div key={idx} className={`hero-slide${idx === i ? ' active' : ''}`} aria-hidden={idx !== i}>
            {s.link ? (
              <Link href={s.link} className="hero-slide-link">{inner}</Link>
            ) : inner}
          </div>
        );
      })}

    </div>
  );
}
