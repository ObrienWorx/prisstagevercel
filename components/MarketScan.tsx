'use client';

import { useEffect, useState } from 'react';

type Tab = 'gainers' | 'losers' | '52h' | '52l';

type StockRow = {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
};

const TABS: { key: Tab; label: string }[] = [
  { key: 'gainers', label: 'Top Gainers' },
  { key: 'losers', label: 'Top Losers' },
  { key: '52h', label: '52 Week High' },
  { key: '52l', label: '52 Week Low' },
];

const TAB_DESC: Record<Tab, string> = {
  gainers: 'AU listed companies with highest percentage gain (with market capitalization >= AUD 500million and daily price change % excluding ±300%)',
  losers: 'AU listed companies with highest percentage loss (with market capitalization >= AUD 500million and daily price change % excluding ±300%)',
  '52h': 'AU listed companies currently trading near their 52-week high (with market capitalization >= AUD 500million)',
  '52l': 'AU listed companies currently trading near their 52-week low (with market capitalization >= AUD 500million)',
};

function fmt(n: number, dp = 3) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: dp });
}

export default function MarketScan() {
  const [activeTab, setActiveTab] = useState<Tab>('gainers');
  const [rows, setRows] = useState<StockRow[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/market-scan?tab=${activeTab}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) { setError(true); setRows([]); }
        else { setRows(json.data ?? []); setUpdatedAt(json.updatedAt ?? null); }
      })
      .catch(() => { setError(true); setRows([]); })
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="home-scan-widget">
      <h2 className="home-scan-title"><span>Market</span> Scan</h2>

      <nav className="home-scan-tabs" aria-label="Market scan tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            className={`home-scan-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="home-scan-desc-row">
        <p className="home-scan-desc">{TAB_DESC[activeTab]}</p>
      </div>

      <div className="home-scan-table-wrap">
        {loading ? (
          <div className="home-scan-state">Loading…</div>
        ) : error ? (
          <div className="home-scan-state">Market data unavailable.</div>
        ) : rows.length === 0 ? (
          <div className="home-scan-state">No data available.</div>
        ) : (
          <table className="home-scan-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Price (AUD)</th>
                <th>Change (AUD)</th>
                <th>%Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.ticker}>
                  <td>
                    <div className="home-scan-ticker-code">{row.ticker}</div>
                    <div className="home-scan-ticker-name">{row.name}</div>
                  </td>
                  <td>{fmt(row.price)}</td>
                  <td>
                    <span className={row.change < 0 ? 'scan-loss' : 'scan-gain'}>
                      {fmt(Math.abs(row.change))} {row.change < 0 ? '↓' : '↑'}
                    </span>
                  </td>
                  <td className={row.changePct < 0 ? 'scan-loss' : 'scan-gain'}>
                    {row.changePct.toFixed(3)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {updatedAt && (
        <div className="home-scan-powered">
          Data Powered by Yahoo Finance as on <strong>{updatedAt} AEST</strong>
        </div>
      )}
    </div>
  );
}
