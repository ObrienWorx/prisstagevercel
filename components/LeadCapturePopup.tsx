'use client';

import { useState, useEffect, useRef } from 'react';
import LeadCaptureForm from './LeadCaptureForm';

interface Props {
  source?: string;
  title?: string;
  buttonText?: string;
  successText?: string;
}

export default function LeadCapturePopup({ source = 'unlock-ticker', title, buttonText, successText }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [cfg, setCfg] = useState({
    title: title || 'Please fill the details to Unlock the Exclusive ASX Stock Report',
    buttonText: buttonText || 'Unlock the Ticker',
    successText: successText || 'You will receive the detailed Stock Report on your submitted email.',
  });
  const autoShown = useRef(false);

  useEffect(() => {
    if (!title) {
      fetch('/api/public/blog-settings')
        .then(r => r.json())
        .then(d => setCfg(prev => ({
          title: d.blogPopupTitle || prev.title,
          buttonText: d.blogPopupButtonText || prev.buttonText,
          successText: d.blogPopupSuccessText || prev.successText,
        })))
        .catch(() => {});
    }
  }, [title]);

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
          title={cfg.title}
          buttonText={cfg.buttonText}
          successText={cfg.successText}
        />
      </div>
    </div>
  );
}
