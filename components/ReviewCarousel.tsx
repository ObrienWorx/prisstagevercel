'use client';

import { useEffect, useState } from 'react';

type Review = { name: string; rating: number; text: string };

function Stars({ rating }: { rating: number }) {
  return (
    <div className="review-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? 'on' : 'off'}>★</span>
      ))}
    </div>
  );
}

export default function ReviewCarousel() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Reviews are sourced from /public/reviews.json — edit that file to manage them.
    fetch('/reviews.json')
      .then((r) => r.json())
      .then((data: Review[]) => { if (!cancelled && Array.isArray(data)) setReviews(data.filter(r => r && r.text)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const n = reviews.length;

  useEffect(() => {
    if (n <= 1) return;
    const id = setInterval(() => setI((p) => (p + 1) % n), 6000);
    return () => clearInterval(id);
  }, [n]);

  if (n === 0) return null;
  const go = (idx: number) => setI(((idx % n) + n) % n);
  const r = reviews[i];

  return (
    <div className="review-carousel">
      <div className="review-carousel-card">
        <div className="review-quote">“</div>
        <Stars rating={r.rating} />
        <p className="review-text">{r.text}</p>
        <div className="review-name">{r.name}</div>
      </div>

      {n > 1 && (
        <div className="review-carousel-nav">
          <button type="button" className="review-arrow" onClick={() => go(i - 1)} aria-label="Previous review">‹</button>
          <div className="review-dots">
            {reviews.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`review-dot${idx === i ? ' active' : ''}`}
                onClick={() => go(idx)}
                aria-label={`Go to review ${idx + 1}`}
              />
            ))}
          </div>
          <button type="button" className="review-arrow" onClick={() => go(i + 1)} aria-label="Next review">›</button>
        </div>
      )}
    </div>
  );
}
