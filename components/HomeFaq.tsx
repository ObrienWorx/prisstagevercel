'use client';

import { useState } from 'react';

type Faq = { q: string; a: string };

const FAQS: Faq[] = [
  {
    q: 'Is Pristine Gaze a financial advisor?',
    a: 'Pristine Gaze provides independent investment research, market insights, and educational content. Our reports are designed to help investors make more informed decisions, but they should not be considered personal financial advice.',
  },
  {
    q: 'What do I receive with my membership?',
    a: 'Depending on your membership plan, you\'ll receive access to expertly researched reports, market updates, sector analysis, stock opportunities, educational resources, and exclusive member-only content. Each plan is designed to cater to different investing needs.',
  },
  {
    q: 'How often are your reports updated?',
    a: 'Our research is published on a regular schedule. Many reports are released weekly or daily, while others are updated as significant market developments or investment opportunities arise.',
  },
  {
    q: 'Who are your research reports suitable for?',
    a: 'Whether you\'re a new investor looking to build confidence or an experienced investor seeking deeper market insights, our research is designed to support informed investment decisions across a range of experience levels.',
  },
  {
    q: 'Be honest… can your reports guarantee I\'ll become a millionaire? 😄',
    a: 'We wish investing worked that way! While our research aims to uncover quality opportunities backed by thorough analysis, all investments involve risk. We focus on providing disciplined research and actionable insights—not unrealistic promises.',
  },
];

export default function HomeFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="home-faq">
      <div className="container">
        <div className="home-tools-head">
          <span className="home-tools-eyebrow">— FAQ</span>
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know before getting started.</p>
        </div>
        <div className="home-faq-list">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div className={`faq-item${isOpen ? ' open' : ''}`} key={i}>
                <button
                  type="button"
                  className="faq-q"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span>{f.q}</span>
                  <span className="faq-icon">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && <div className="faq-a">{f.a}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
