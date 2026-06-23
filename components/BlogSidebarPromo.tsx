'use client';

import { useState } from 'react';
import LeadCaptureForm from './LeadCaptureForm';

export default function BlogSidebarPromo({ source = 'editorial' }: { source?: string }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <aside className="blog-report-promo">
        <h2>Some ASX Opportunities Are Still Flying Under the Radar.</h2>
        <p className="blog-report-promo-lead">
          Download our Complimentary Research Report featuring 5 ASX-listed companies poised to grow this year.
        </p>
        <div className="blog-report-promo-subtitle">What&apos;s in the Complimentary Report?</div>
        <ul>
          <li>5 high-potential ASX stocks selected by our experts</li>
          <li>Technical and fundamental analysis explained in a simple format</li>
          <li>General research opinions and market outlook on each company</li>
          <li>Key business highlights, sector trends, and growth drivers</li>
          <li>Insights designed to help investors make more informed decisions</li>
        </ul>
        <button type="button" className="blog-report-promo-btn" onClick={() => setShowModal(true)}>
          Claim your Free Copy
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
              title="Please fill the details to Unlock the Exclusive ASX Stock Report"
              buttonText="Unlock the Report"
              successText="You will receive the detailed Stock Report on your submitted email."
            />
          </div>
        </div>
      )}
    </>
  );
}
