'use client';

import { useEffect, useState } from 'react';

interface Props {
  endDate: string;
  onExpired?: () => void;
  compact?: boolean;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function SaleCountdownBanner({ endDate, onExpired, compact = false }: Props) {
  const [ms, setMs] = useState(() => Math.max(0, new Date(endDate).getTime() - Date.now()));

  useEffect(() => {
    if (ms <= 0) { onExpired?.(); return; }
    const id = setInterval(() => {
      setMs(prev => {
        const next = Math.max(0, new Date(endDate).getTime() - Date.now());
        if (next === 0) { onExpired?.(); clearInterval(id); }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  if (ms <= 0) return null;

  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);

  if (compact) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
        borderRadius: 10, padding: '10px 14px', marginBottom: '1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>🔥 Sale ends in</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {days > 0 && <Chip label="d" value={days} />}
          <Chip label="h" value={hours} />
          <Chip label="m" value={mins} />
          <Chip label="s" value={secs} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      color: '#fff', padding: '.5rem 0',
    }}>
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.3px' }}>
            🔥 Limited-Time Sale — Offer ends in:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {days > 0 && <BigChip label="Days" value={days} />}
            <BigChip label="Hours" value={hours} />
            <BigChip label="Mins" value={mins} />
            <BigChip label="Secs" value={secs} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ value, label }: { value: number; label: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '2px 7px',
      fontSize: 13, fontWeight: 800, color: '#fff', minWidth: 32, textAlign: 'center',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {pad(value)}<span style={{ fontSize: 9, fontWeight: 500, marginLeft: 1, opacity: 0.8 }}>{label}</span>
    </div>
  );
}

function BigChip({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '6px 14px',
        fontSize: 24, fontWeight: 900, color: '#fff', minWidth: 56,
        fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      }}>
        {pad(value)}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 3, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}
