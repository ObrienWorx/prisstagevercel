'use client';

import { useEffect, useState } from 'react';

type Row = { ticker: string; name: string; price: number; change: number; changePct: number };

export default function TickerTape() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // Live ASX movers from the Yahoo-backed market-scan endpoint (no static list).
        const [gainers, losers] = await Promise.all([
          fetch('/api/market-scan?tab=gainers').then(r => r.json()).catch(() => null),
          fetch('/api/market-scan?tab=losers').then(r => r.json()).catch(() => null),
        ]);
        const merged: Row[] = [...(gainers?.data ?? []), ...(losers?.data ?? [])]
          .filter((r: Row) => r && r.ticker && typeof r.price === 'number');
        if (!cancelled) setRows(merged);
      } catch {
        /* leave the tape empty on failure */
      }
    };

    load();
    const id = setInterval(load, 5 * 60 * 1000); // refresh every 5 minutes
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (rows.length === 0) return null;

  // Duplicate the set so the marquee can loop seamlessly.
  const items = [...rows, ...rows];

  return (
    <div className="header-ticker">
      <div className="ticker-tape">
        <div className="ticker-track">
          {items.map((r, i) => {
            const up = r.changePct >= 0;
            return (
              <span className="ticker-item" key={`${r.ticker}-${i}`}>
                <span className="ticker-sym">{r.ticker}</span>
                <span className="ticker-price">{r.price.toFixed(2)}</span>
                <span className={up ? 'ticker-up' : 'ticker-down'}>
                  {up ? '▲' : '▼'} {Math.abs(r.changePct).toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
