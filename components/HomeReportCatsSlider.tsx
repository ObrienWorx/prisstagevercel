'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface ReportCat { _id: string; name: string; slug: string; icon: string; metaImage: string; }

const GAP = 24; // 1.5rem in px
const VISIBLE = 3;

export default function HomeReportCatsSlider({ cats }: { cats: ReportCat[] }) {
  const [index, setIndex] = useState(0);
  const [cardW, setCardW] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      if (!viewportRef.current) return;
      setCardW((viewportRef.current.offsetWidth - GAP * (VISIBLE - 1)) / VISIBLE);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (viewportRef.current) ro.observe(viewportRef.current);
    return () => ro.disconnect();
  }, []);

  const maxIndex = Math.max(0, cats.length - VISIBLE);
  const canPrev = index > 0;
  const canNext = index < maxIndex;
  const go = (dir: number) => setIndex(i => Math.max(0, Math.min(maxIndex, i + dir)));

  return (
    <div className="hrc-slider">
      <button
        className="hrc-arrow hrc-arrow-prev"
        onClick={() => go(-1)}
        disabled={!canPrev}
        aria-label="Previous"
      >&#8249;</button>

      <div className="hrc-viewport" ref={viewportRef}>
        <div
          className="hrc-track"
          style={{ transform: cardW ? `translateX(${-(index * (cardW + GAP))}px)` : undefined }}
        >
          {cats.map(cat => {
            const img = cat.icon || cat.metaImage || '';
            return (
              <Link
                key={cat._id}
                href={`/category/${cat.slug}`}
                className="hrc-card"
                style={cardW ? { width: cardW } : undefined}
              >
                {img
                  ? <img src={img} alt={cat.name} className="hrc-img" />
                  : <div className="hrc-img hrc-placeholder" />
                }
                <div className="hrc-overlay" />
                <div className="hrc-name">{cat.name}</div>
              </Link>
            );
          })}
        </div>
      </div>

      <button
        className="hrc-arrow hrc-arrow-next"
        onClick={() => go(1)}
        disabled={!canNext}
        aria-label="Next"
      >&#8250;</button>
    </div>
  );
}
