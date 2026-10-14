'use client';

import { useState } from 'react';

interface Props {
  slides: string[];
}

export default function LeChapterSlider({ slides }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const cleanSlides = (slides && slides.length > 0 ? slides : ['']).filter(
    (s) => typeof s === 'string' && s.trim().length > 0
  );
  const activeSlides = cleanSlides.length > 0 ? cleanSlides : ['<p class="text-muted">No content available for this chapter.</p>'];
  const total = activeSlides.length;

  const goToSlide = (idx: number) => {
    if (idx >= 0 && idx < total) {
      setCurrentSlide(idx);
    }
  };

  return (
    <div className="le-slider-container">
      {/* Top Header with Pointers */}
      <div className="le-slider-header">
        <div className="le-slider-info">
          <span className="le-slider-step-badge">
            Part {currentSlide + 1} of {total}
          </span>
        </div>

        {total > 1 && (
          <div className="le-slider-pointers-wrapper">
            <div className="le-slider-pointers">
              {activeSlides.map((_, idx) => {
                const isActive = idx === currentSlide;
                const isPassed = idx < currentSlide;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`le-slider-pointer${isActive ? ' active' : ''}${isPassed ? ' passed' : ''}`}
                    onClick={() => goToSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    title={`Slide ${idx + 1}`}
                  >
                    <span className="le-pointer-num">{idx + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Slide Content Card */}
      <div className="le-slide-card">
        <div
          className="tiptap-prose le-content"
          dangerouslySetInnerHTML={{ __html: activeSlides[currentSlide] }}
        />
      </div>

      {/* Bottom Navigation Controls */}
      {total > 1 && (
        <div className="le-slider-footer">
          <button
            type="button"
            className="btn btn-outline-secondary d-flex align-items-center gap-1"
            disabled={currentSlide === 0}
            onClick={() => goToSlide(currentSlide - 1)}
          >
            <span>←</span> Previous Slide
          </button>

          <div className="le-slider-mini-dots">
            {activeSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`le-mini-dot${idx === currentSlide ? ' active' : ''}`}
                onClick={() => goToSlide(idx)}
                aria-label={`Jump to slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-1"
            disabled={currentSlide === total - 1}
            onClick={() => goToSlide(currentSlide + 1)}
          >
            Next Slide <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}

