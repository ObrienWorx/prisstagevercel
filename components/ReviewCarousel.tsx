'use client';

import { useEffect, useState } from 'react';

type Review = { name: string; rating: number; text: string };

function Stars({ rating }: { rating: number }) {
  return (
    <div className="rc3-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? 'on' : 'off'}>★</span>
      ))}
    </div>
  );
}

function Card({ review, side }: { review: Review; side: 'left' | 'center' | 'right' }) {
  return (
    <div className={`rc3-card rc3-${side}`}>
      {side !== 'center' && <div className="rc3-overlay" />}
      <div className="rc3-card-inner">
        <div className="rc3-card-quote">&ldquo;</div>
        <Stars rating={review.rating} />
        <p className="rc3-card-text">{review.text}</p>
        {review.name && <div className="rc3-card-name">— {review.name}</div>}
      </div>
    </div>
  );
}

export default function ReviewCarousel() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/reviews.json')
      .then(r => r.json())
      .then((data: Review[]) => {
        if (!cancelled && Array.isArray(data)) setReviews(data.filter(r => r && r.text));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const n = reviews.length;

  useEffect(() => {
    if (n <= 1) return;
    const id = setInterval(() => setCurrent(p => (p + 1) % n), 6000);
    return () => clearInterval(id);
  }, [n]);

  if (n === 0) return null;

  const go = (idx: number) => setCurrent(((idx % n) + n) % n);
  const prev = ((current - 1) + n) % n;
  const next = (current + 1) % n;
  const showSides = n >= 3;

  return (
    <div className="rc3-stage">
      <div className="rc3-track">
        {showSides && <Card review={reviews[prev]} side="left" />}
        <Card review={reviews[current]} side="center" />
        {showSides && <Card review={reviews[next]} side="right" />}
      </div>

      {n > 1 && (
        <div className="rc3-nav">
          <button type="button" className="rc3-arrow" onClick={() => go(current - 1)} aria-label="Previous review">&#8249;</button>
          <div className="rc3-dots">
            {reviews.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`rc3-dot${idx === current ? ' active' : ''}`}
                onClick={() => go(idx)}
                aria-label={`Review ${idx + 1}`}
              />
            ))}
          </div>
          <button type="button" className="rc3-arrow" onClick={() => go(current + 1)} aria-label="Next review">&#8250;</button>
        </div>
      )}
    </div>
  );
}
