'use client';

import { useState } from 'react';
import type { BlogFaq } from '@/lib/blogFaqs';

export default function BlogFaqSection({ faqs }: { faqs: BlogFaq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!faqs || faqs.length === 0) return null;

  return (
    <section className="blog-faq-section mt-5 pt-4" style={{ borderTop: '1px solid #e2e8f0' }}>
      <div className="mb-4">
        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: '#0049AC',
            display: 'inline-block',
            marginBottom: '0.25rem',
          }}
        >
          Frequently Asked Questions
        </span>
        <h2
          style={{
            fontSize: 'clamp(1.4rem, 3vw, 1.85rem)',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0.25rem 0 0.5rem',
            letterSpacing: '-0.3px',
          }}
        >
          Frequently Asked Questions
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
          Common questions about investing and market research to help guide your decisions.
        </p>
      </div>

      <div className="home-faq-list" style={{ maxWidth: '100%' }}>
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              className={`faq-item${isOpen ? ' open' : ''}`}
              key={idx}
              style={{ background: '#fff', marginBottom: '0.75rem' }}
            >
              <button
                type="button"
                className="faq-q"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
                style={{ textAlign: 'left', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
                  {faq.question}
                </span>
                <span className="faq-icon" style={{ flexShrink: 0, marginLeft: 12 }}>
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen && (
                <div
                  className="faq-a"
                  style={{
                    fontSize: '0.93rem',
                    color: '#475569',
                    lineHeight: 1.7,
                    paddingTop: 0,
                  }}
                >
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

