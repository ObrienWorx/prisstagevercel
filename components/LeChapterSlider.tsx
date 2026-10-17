'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  slides: string[];
  nextChapterHref?: string;
  nextChapterTitle?: string;
  onNextChapterLocked?: () => void;
  isLocked?: boolean;
}

export default function LeChapterSlider({ slides, nextChapterHref, nextChapterTitle, onNextChapterLocked, isLocked }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const cleanSlides = (slides && slides.length > 0 ? slides : ['']).filter(
    (s) => typeof s === 'string' && s.trim().length > 0
  );
  const activeSlides = cleanSlides.length > 0 ? cleanSlides : ['<p>No content available for this chapter.</p>'];
  const total = activeSlides.length;

  const isLastSlide = currentSlide === total - 1;
  const goToSlide = (idx: number) => {
    if (idx >= 0 && idx < total) setCurrentSlide(idx);
  };

  return (
    <div className="le-slider-wrap">
      {/* Left Arrow */}
      <button
        type="button"
        className="le-nav-arrow le-nav-prev"
        onClick={() => goToSlide(currentSlide - 1)}
        disabled={currentSlide === 0}
        aria-label="Previous slide"
      >
        &#8249;
      </button>

      {/* Card */}
      <div className="le-slide-card">
        <div
          key={currentSlide}
          className="tiptap-prose le-content"
          dangerouslySetInnerHTML={{ __html: activeSlides[currentSlide] }}
        />

        {total > 1 && (
          <div className="le-card-footer">
            <div className="le-mini-dots">
              {activeSlides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`le-mini-dot${idx === currentSlide ? ' active' : ''}`}
                  onClick={() => goToSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {isLastSlide && nextChapterHref ? (
              isLocked ? (
                <button type="button" className="le-next-btn le-next-chapter-btn" onClick={onNextChapterLocked}>
                  Next Chapter &raquo;
                </button>
              ) : (
                <Link href={nextChapterHref} className="le-next-btn le-next-chapter-btn">
                  Next Chapter &raquo;
                </Link>
              )
            ) : (
              <button
                type="button"
                className="le-next-btn"
                disabled={isLastSlide}
                onClick={() => goToSlide(currentSlide + 1)}
              >
                Next &raquo;
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right Arrow */}
      <button
        type="button"
        className="le-nav-arrow le-nav-next"
        onClick={() => goToSlide(currentSlide + 1)}
        disabled={isLastSlide}
        aria-label="Next slide"
      >
        &#8250;
      </button>
    </div>
  );
}
