'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import SubscriberLoginForm from './SubscriberLoginForm';

type PastRow = {
  ticker: string;
  index: string;
  buyingDate: string;
  buyReportSlug: string;
  sellingDate: string;
  sellReportSlug: string;
  buyingPrice: number;
  sellingPrice: number;
  profitLoss: number | null;
};

type CurrentRow = {
  ticker: string;
  index: string;
  buyingDate: string;
  buyReportSlug: string;
  buyingPrice: number;
  currentPrice: number;
  currency: string;
  profitLoss: number | null;
};

type TabKey = 'past' | 'current';
type SortDir = 'asc' | 'desc';

const PER_PAGE = 10;

function formatPrice(value: number) {
  return Number.isFinite(value) && value > 0
    ? value.toLocaleString('en-AU', { maximumFractionDigits: 3 })
    : '-';
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '-';
  return `${value.toFixed(2)}%`;
}

function pageNumbers(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  return Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
}

export default function PastRecommendationsTabs({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [activeTab, setActiveTab] = useState<TabKey>('past');
  const [rows, setRows] = useState<(PastRow | CurrentRow)[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortKey, setSortKey] = useState('buyingDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [loading, setLoading] = useState(false);
  const [currentPriceLabel, setCurrentPriceLabel] = useState('latest update');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const start = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const end = Math.min(page * PER_PAGE, total);

  const fetchData = useCallback(
    async (tab: TabKey, pg: number, s: string, sk: string, sd: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ tab, page: String(pg), search: s, sort: sk, dir: sd });
        const res = await fetch(`/api/past-recommendations?${params}`);
        const data = await res.json();
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
        if (data.currentPriceLabel) setCurrentPriceLabel(data.currentPriceLabel);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData(activeTab, page, debouncedSearch, sortKey, sortDir);
  }, [activeTab, page, debouncedSearch, sortKey, sortDir, fetchData]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const changeTab = (tab: TabKey) => {
    if (tab === 'current' && !isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    setActiveTab(tab);
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
    setSortKey('buyingDate');
    setSortDir('desc');
  };

  const changePage = (next: number) => {
    if (!isLoggedIn && activeTab === 'past' && next > 1) {
      setShowLoginModal(true);
      return;
    }
    setPage(next);
  };

  const SortHeader = ({ label, sk }: { label: string; sk: string }) => (
    <th
      className="pg-rec-sortable"
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={() => toggleSort(sk)}
      aria-sort={sortKey === sk ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      <span className="pg-rec-sort-ind">
        {sortKey === sk ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
      </span>
    </th>
  );

  return (
    <section className="pg-rec-section">
      <div className="pg-rec-tabs" role="tablist" aria-label="Recommendation tables">
        <button
          type="button"
          className={`pg-rec-tab ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => changeTab('past')}
        >
          Past Recommendations
        </button>
        <button
          type="button"
          className={`pg-rec-tab ${activeTab === 'current' ? 'active' : ''} ${!isLoggedIn ? 'locked' : ''}`}
          onClick={() => changeTab('current')}
        >
          Current Market Trends
        </button>
      </div>

      {activeTab === 'past' ? (
        <div className="pg-rec-copy">
          <p>
            The table below presents our historical stock recommendations that have been fully closed. A recommendation is classified as <strong>closed</strong> when a BUY recommendation was followed by a subsequent SELL recommendation, and the stock is no longer actively tracked in our coverage or portfolio framework.
          </p>
          <p>
            For each stock, the table displays the initial BUY price, the SELL price where applicable, and the resulting performance. Brokerage fees, taxes, and other transaction costs are excluded.
          </p>
        </div>
      ) : (
        <div className="pg-rec-copy">
          <p>
            The table below lists stocks that are currently covered or recommended in our research reports. For each stock, we display the <strong>active buy price</strong> at the time of recommendation along with the <strong>current market price</strong> as of the latest update.
          </p>
          <p>
            Price movements, corporate actions, and market developments may impact listed securities. This information is provided for educational and research purposes only and should not be considered personalized financial advice.
          </p>
          <p>
            <strong>Table Update Frequency</strong><br />
            Last Updated on <strong>{currentPriceLabel}</strong>. This table is updated <strong>once per month</strong>, and recent changes or corporate actions may not be immediately reflected.
          </p>
        </div>
      )}

      <div className="pg-rec-tools">
        <label htmlFor="recommendation-search">Search:</label>
        <input
          id="recommendation-search"
          className="form-control"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by ticker or index..."
        />
      </div>

      <div className="pg-rec-table-wrap" style={{ position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <span>Loading…</span>
          </div>
        )}

        {activeTab === 'past' ? (
          <table className="pg-rec-table">
            <thead>
              <tr>
                <SortHeader label="TICKER" sk="ticker" />
                <SortHeader label="INDEX" sk="index" />
                <SortHeader label="Buying Date" sk="buyingDate" />
                <th>Buy Report</th>
                <SortHeader label="Selling Date" sk="sellingDate" />
                <th>Sell Report</th>
                <SortHeader label="Buying Price" sk="buyingPrice" />
                <SortHeader label="Selling Price" sk="sellingPrice" />
                <SortHeader label="P/L%" sk="profitLoss" />
              </tr>
            </thead>
            <tbody>
              {(rows as PastRow[]).map((row, i) => (
                <tr key={`${row.buyReportSlug}-${row.sellReportSlug}-${i}`}>
                  <td>{row.ticker}</td>
                  <td>{row.index}</td>
                  <td>{row.buyingDate}</td>
                  <td><Link href={`/reports/${row.buyReportSlug}`}>View Report</Link></td>
                  <td>{row.sellingDate}</td>
                  <td><Link href={`/reports/${row.sellReportSlug}`}>View Report</Link></td>
                  <td>{formatPrice(row.buyingPrice)}</td>
                  <td>{formatPrice(row.sellingPrice)}</td>
                  <td className={row.profitLoss !== null && row.profitLoss < 0 ? 'loss' : 'gain'}>
                    {formatPercent(row.profitLoss)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="pg-rec-table">
            <thead>
              <tr>
                <SortHeader label="TICKER" sk="ticker" />
                <SortHeader label="INDEX" sk="index" />
                <SortHeader label="Buying Date" sk="buyingDate" />
                <th>Buy Report</th>
                <SortHeader label="Buying Price" sk="buyingPrice" />
                <th>{`Current Price (${currentPriceLabel})`}</th>
                <th>P/L%</th>
              </tr>
            </thead>
            <tbody>
              {(rows as CurrentRow[]).map((row, i) => (
                <tr key={`${row.ticker}-${row.buyingDate}-${i}`}>
                  <td>{row.ticker}</td>
                  <td>{row.index}</td>
                  <td>{row.buyingDate}</td>
                  <td><Link href={`/reports/${row.buyReportSlug}`}>View Report</Link></td>
                  <td>{formatPrice(row.buyingPrice)}</td>
                  <td>{formatPrice(row.currentPrice)} {row.currency}</td>
                  <td className={row.profitLoss !== null && row.profitLoss < 0 ? 'loss' : 'gain'}>
                    {formatPercent(row.profitLoss)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && rows.length === 0 && (
          <div className="pg-rec-empty">No recommendations found.</div>
        )}
      </div>

      <div className="pg-rec-footer">
        <div>Showing {start} to {end} of {total} entries</div>
        <div className="pg-rec-pagination">
          <button type="button" disabled={page === 1} onClick={() => changePage(page - 1)}>
            Previous
          </button>
          {pageNumbers(page, totalPages).map((p, i, arr) => (
            <span key={p} className="pg-rec-page-group">
              {i > 0 && p - arr[i - 1] > 1 && <span className="pg-rec-ellipsis">…</span>}
              <button
                type="button"
                className={p === page ? 'active' : ''}
                onClick={() => changePage(p)}
              >
                {p}
              </button>
            </span>
          ))}
          <button type="button" disabled={page === totalPages} onClick={() => changePage(page + 1)}>
            Next
          </button>
        </div>
      </div>

      <div className="pg-rec-note">
        <strong>Note:</strong> Not every company performs as expected. Past performance is not an indication of future returns. Gain/Loss reflects movement in difference in average buy price and sell price plus dividends as a percentage of average buy price, and does not take into account costs or taxation. The information herein is provided on a read-only basis to give readers a general understanding of investment concepts. It should not be misconstrued as a call to action or specific investment advice. Due diligence is not a luxury, it is a basic need.
      </div>

      <section className="pg-rec-insights">
        <div className="pg-rec-insights-copy">
          <h2>Premium Stocks Research &amp; Sector Insights</h2>
          <p>
            Pristine Gaze Research is a tech-enabled business driven by a digitally powered architecture and comprehensive data science-led research. Our analyses are bolstered by financial and other data, leveraging Pristine Gaze&apos;s proprietary technology to deliver high-quality insights.
          </p>
          <p>
            At Pristine Gaze Research, we utilize innovative methods to deliver general stock recommendations, market news, and sector insights. Through the Pristine Gaze Subscription Platform, we deliver carefully curated content to help users stay informed and better understand market trends.
          </p>
          <div className="pg-rec-stats">
            <div><span>10+</span><strong>Years of Expertise</strong></div>
            <div><span>4+</span><strong>Sectors</strong></div>
            <div><span>70+</span><strong>Research Reports</strong></div>
            <div><span>95%</span><strong>Positive Feedback</strong></div>
          </div>
          <Link href="/subscribe" className="pg-rec-subscribe">Subscribe Now</Link>
        </div>
        <div className="pg-rec-map" aria-hidden="true" />
      </section>

      {showLoginModal && (
        <div className="modal d-block pg-rec-login-modal" role="dialog" aria-modal="true">
          <div className="pg-rec-login-dialog">
            <button
              type="button"
              className="btn-close pg-rec-login-close"
              onClick={() => setShowLoginModal(false)}
              aria-label="Close"
            />
            <SubscriberLoginForm redirectPath="/past-recommendations" />
          </div>
        </div>
      )}
    </section>
  );
}
