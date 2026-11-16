'use client';

import { useState, useEffect } from 'react';
import LeadCaptureForm from './LeadCaptureForm';

interface PromoSettings {
  blogPromoHeading: string;
  blogPromoLead: string;
  blogPromoSubtitle: string;
  blogPromoItems: string[];
  blogPromoButtonText: string;
  blogPromoPopupTitle: string;
  blogPromoPopupButtonText: string;
  blogPromoPopupSuccessText: string;
}

const DEFAULTS: PromoSettings = {
  blogPromoHeading: 'Some ASX Opportunities Are Still Flying Under the Radar.',
  blogPromoLead: 'Download our Complimentary Research Report featuring 5 ASX-listed companies poised to grow this year.',
  blogPromoSubtitle: "What's in the Complimentary Report?",
  blogPromoItems: [
    '5 high-potential ASX stocks selected by our experts',
    'Technical and fundamental analysis explained in a simple format',
    'General research opinions and market outlook on each company',
    'Key business highlights, sector trends, and growth drivers',
    'Insights designed to help investors make more informed decisions',
  ],
  blogPromoButtonText: 'Claim your Free Copy',
  blogPromoPopupTitle: 'Please fill the details to Unlock the Exclusive ASX Stock Report',
  blogPromoPopupButtonText: 'Unlock the Report',
  blogPromoPopupSuccessText: 'You will receive the detailed Stock Report on your submitted email.',
};

export default function BlogSidebarPromo({ source = 'editorial' }: { source?: string }) {
  const [showModal, setShowModal] = useState(false);
  const [cfg, setCfg] = useState<PromoSettings>(DEFAULTS);

  useEffect(() => {
    fetch('/api/public/blog-settings')
      .then(r => r.json())
      .then(d => setCfg({
        blogPromoHeading: d.blogPromoHeading || DEFAULTS.blogPromoHeading,
        blogPromoLead: d.blogPromoLead || DEFAULTS.blogPromoLead,
        blogPromoSubtitle: d.blogPromoSubtitle || DEFAULTS.blogPromoSubtitle,
        blogPromoItems: d.blogPromoItems?.length ? d.blogPromoItems : DEFAULTS.blogPromoItems,
        blogPromoButtonText: d.blogPromoButtonText || DEFAULTS.blogPromoButtonText,
        blogPromoPopupTitle: d.blogPromoPopupTitle || DEFAULTS.blogPromoPopupTitle,
        blogPromoPopupButtonText: d.blogPromoPopupButtonText || DEFAULTS.blogPromoPopupButtonText,
        blogPromoPopupSuccessText: d.blogPromoPopupSuccessText || DEFAULTS.blogPromoPopupSuccessText,
      }))
      .catch(() => {});
  }, []);

  return (
    <>
      <aside className="blog-report-promo">
        <h2>{cfg.blogPromoHeading}</h2>
        <p className="blog-report-promo-lead">{cfg.blogPromoLead}</p>
        <div className="blog-report-promo-subtitle">{cfg.blogPromoSubtitle}</div>
        <ul>
          {cfg.blogPromoItems.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
        <button type="button" className="blog-report-promo-btn" onClick={() => setShowModal(true)}>
          {cfg.blogPromoButtonText}
        </button>
      </aside>

      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(10,15,30,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute', top: -12, right: -12, zIndex: 1,
                background: '#fff', border: 'none', borderRadius: '50%',
                width: 32, height: 32, cursor: 'pointer',
                fontSize: 18, lineHeight: '32px', textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
              aria-label="Close"
            >×</button>
            <LeadCaptureForm
              source={source}
              badge=""
              title={cfg.blogPromoPopupTitle}
              buttonText={cfg.blogPromoPopupButtonText}
              successText={cfg.blogPromoPopupSuccessText}
            />
          </div>
        </div>
      )}
    </>
  );
}
