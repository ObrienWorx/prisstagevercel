'use client';

import { useEffect, useState } from 'react';
import LeadCaptureForm from './LeadCaptureForm';

interface Pick {
  _id: string;
  convictionLevel: 'High' | 'Medium' | 'Low';
  potentialReturn: number;
  capType: string;
  ticker: string;
  entryPrice: number;
}

const CONVICTION_COLOR: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#22c55e',
};

function GaugeIcon({ level }: { level: string }) {
  const angle = level === 'High' ? 130 : level === 'Medium' ? 90 : 50;
  const rad = (angle * Math.PI) / 180;
  const nx = 9 + 7 * Math.cos(Math.PI - rad);
  const ny = 9 - 7 * Math.sin(Math.PI - rad);
  const color = CONVICTION_COLOR[level] ?? '#6b7280';
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" className="gauge-icon">
      <path d="M2 13 A7 7 0 0 1 16 13" fill="none" stroke="#e5e7eb" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M2 13 A7 7 0 0 1 16 13" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray="22" strokeDashoffset={level === 'High' ? 0 : level === 'Medium' ? 11 : 18} />
      <line x1="9" y1="9" x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="9" r="1.4" fill={color} />
    </svg>
  );
}

const PLACEHOLDER: Pick[] = Array(4).fill(null).map((_, i) => ({
  _id: `ph-${i}`,
  convictionLevel: 'High',
  potentialReturn: 6.0,
  capType: 'Small-Cap',
  ticker: 'XXX',
  entryPrice: 0,
}));

const LS_REGISTERED = 'pg_ticker_registered';
const LS_UNLOCKED_IDS = 'pg_ticker_unlocked_ids';

export default function HomePicks() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [pendingPickId, setPendingPickId] = useState<string | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(LS_REGISTERED) === '1') setRegistered(true);
    const saved = localStorage.getItem(LS_UNLOCKED_IDS);
    if (saved) setUnlockedIds(new Set(saved.split(',').filter(Boolean)));

    fetch('/api/public/picks')
      .then(r => r.json())
      .then(d => { if (d.success && d.data.length > 0) setPicks(d.data); })
      .catch(() => {});
  }, []);

  const handleUnlockClick = (pickId: string) => {
    if (registered) {
      // Already registered — unlock this card directly, no form
      const next = new Set(unlockedIds);
      next.add(pickId);
      setUnlockedIds(next);
      localStorage.setItem(LS_UNLOCKED_IDS, Array.from(next).join(','));
    } else {
      setPendingPickId(pickId);
      setShowModal(true);
    }
  };

  const handleFormSuccess = () => {
    localStorage.setItem(LS_REGISTERED, '1');
    setRegistered(true);
    if (pendingPickId) {
      const next = new Set(unlockedIds);
      next.add(pendingPickId);
      setUnlockedIds(next);
      localStorage.setItem(LS_UNLOCKED_IDS, Array.from(next).join(','));
    }
    setShowModal(false);
    setPendingPickId(null);
  };

  const display = picks.length > 0 ? picks : PLACEHOLDER;

  return (
    <>
      <div className="home-picks-panel">
        {display.map((pick) => {
          const isUnlocked = unlockedIds.has(pick._id);
          return (
            <div className="home-pick-card" key={pick._id}>
              <div className="home-pick-conviction">
                <GaugeIcon level={pick.convictionLevel} />
                <span style={{ color: CONVICTION_COLOR[pick.convictionLevel] }}>{pick.convictionLevel}</span>
              </div>

              <div className="home-pick-body">
                {isUnlocked ? (
                  <div className="home-pick-ticker">{pick.ticker}</div>
                ) : (
                  <button className="home-pick-unlock-btn" onClick={() => handleUnlockClick(pick._id)}>
                    🔒 Unlock Ticker
                  </button>
                )}

                <div className="home-pick-return-box">
                  <span className="home-pick-value">{pick.potentialReturn.toFixed(2)}%</span>
                  <span className="home-pick-label">Potential Left</span>
                </div>

                <div className="home-pick-cap">{pick.capType}</div>
              </div>

              <div className="home-pick-bottom">
                {isUnlocked ? (
                  <>Entry Price :&nbsp;&nbsp;<strong>A${pick.entryPrice.toFixed(2)}</strong></>
                ) : (
                  <>Entry Price :&nbsp;&nbsp;🔒</>
                )}
              </div>
            </div>
          );
        })}
        <p className="home-picks-note">Performance visuals shown as a preview. Data source can be connected later.</p>
      </div>

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
              source="unlock-ticker"
              badge=""
              title="Please fill the details to Unlock the Exclusive ASX Stock Report"
              buttonText="Unlock the Ticker"
              successText="You will receive the detailed Stock Report on your submitted email."
              onSuccess={handleFormSuccess}
            />
          </div>
        </div>
      )}
    </>
  );
}
