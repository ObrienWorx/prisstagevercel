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

const REVIEW_URL = 'https://www.productreview.com.au/listings/pristine-gaze';

function Card({ review }: { review: Review }) {
  return (
    <div className="rc3-card rc3-marquee-card">
      <div className="rc3-card-inner">
        <div className="rc3-card-quote">&ldquo;</div>
        <Stars rating={review.rating} />
        <p className="rc3-card-text">{review.text}</p>
        <a href={REVIEW_URL} target="_blank" rel="noopener noreferrer" className="rc3-read-more">
          Read more →
        </a>
        {review.name && <div className="rc3-card-name">— {review.name}</div>}
      </div>
    </div>
  );
}

export default function ReviewCarousel() {
  const [reviews, setReviews] = useState<Review[]>([]);

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

  if (reviews.length === 0) return null;

  // Duplicate so the track loops seamlessly (scroll exactly 50% then reset)
  const doubled = [...reviews, ...reviews];

  return (
    <div className="rc3-marquee-wrap">
      <div className="rc3-marquee-track">
        {doubled.map((review, idx) => (
          <Card key={idx} review={review} />
        ))}
      </div>
    </div>
  );
}
