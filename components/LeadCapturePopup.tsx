'use client';

import { useState, useEffect, useRef } from 'react';
import LeadCaptureForm from './LeadCaptureForm';

interface Props {
  source?: string;   // source tag stored on the captured lead (e.g. category slug)
}

// Auto-opening lead-capture modal: fires after 10s or once the reader scrolls
// a little, whichever comes first. Stays closed for visitors who already
// submitted (tracked via the `pg_lead_submitted` flag set by LeadCaptureForm).
export default function LeadCapturePopup({ source = 'unlock-ticker' }: Props) {
  const [showModal, setShowModal] = useState(false);
  const autoShown = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('pg_lead_submitted') === '1') return;
    const open = () => {
      if (autoShown.current) return;
      autoShown.current = true;
      setShowModal(true);
      cleanup();
    };
    const onScroll = () => { if (window.scrollY > 300) open(); };
    const timer = setTimeout(open, 10000);
    window.addEventListener('scroll', onScroll, { passive: true });
    function cleanup() { clearTimeout(timer); window.removeEventListener('scroll', onScroll); }
    return cleanup;
  }, []);

  if (!showModal) return null;

  return (
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
          buttonText="Unlock the Ticker"
          successText="You will receive the detailed Stock Report on your submitted email."
        />
      </div>
    </div>
  );
}
