'use client';

import { useEffect, useState } from 'react';

const fmt = (tz: string) =>
  new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: tz });

export default function AdminClock() {
  const [, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Avoid SSR/client hydration mismatch — only render the live time after mount.
  if (!mounted) return null;

  const zones: { flag: string; label: string; tz: string }[] = [
    { flag: '🇦🇺', label: 'Sydney', tz: 'Australia/Sydney' },
    { flag: '🇮🇳', label: 'India', tz: 'Asia/Kolkata' },
  ];

  return (
    <div style={{ display: 'flex', gap: '0.75rem', whiteSpace: 'nowrap' }}>
      {zones.map((z) => (
        <span
          key={z.tz}
          title={`${z.label} time`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569', fontVariantNumeric: 'tabular-nums' }}
        >
          <span>{z.flag}</span>
          <span style={{ color: '#94a3b8' }}>{z.label}</span>
          <strong style={{ color: '#1e293b' }}>{fmt(z.tz)}</strong>
        </span>
      ))}
    </div>
  );
}
