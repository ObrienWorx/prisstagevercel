'use client';

import { useState } from 'react';

type Faq = { q: string; a: string };

const FAQS: Faq[] = [
  {
    q: 'How do I start investing in the stock market?',
    a: 'Start by learning the basics, setting a budget and understanding the risks involved. You can explore educational resources, company reports and reliable financial websites. Pristine Gaze also provides stock market research and educational content to help beginners build their knowledge.',
  },
  {
    q: 'How do I know which ASX stocks to buy?',
    a: 'Choosing stocks requires more than following market trends or tips. Investors should examine a company\'s business model, revenue, profitability, debt, valuation, growth prospects and potential risks. Comparing information from multiple reliable sources can help you develop a more informed view. Pristine Gaze provides equity research and company analysis to support your independent investment decisions.',
  },
  {
    q: 'Is it better to invest in growth stocks or dividend stocks?',
    a: 'It depends on your financial goals, investment horizon and tolerance for risk. Growth stocks may appeal to investors seeking potential capital appreciation, while dividend stocks may suit those interested in income. Neither approach guarantees returns. Pristine Gaze offers Emerging Growth Opportunities research and a Dividend Yield Report to help investors explore both strategies.',
  },
  {
    q: 'What are the best ASX stocks to invest in?',
    a: 'There is no single best stock for every investor. Consider company performance, valuation, industry trends and your investment goals before making a decision. Pristine Gaze researches selected ASX-listed companies to help investors understand their business performance and potential opportunities.',
  },
  {
    q: 'Is it a good time to invest in stocks?',
    a: 'It depends on your financial goals, investment timeframe and risk tolerance. Before investing, understand the market conditions and research the company you are considering. Pristine Gaze provides stock research and market insights to help investors evaluate opportunities and make informed decisions.',
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
