'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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
  buyingPrice: number;
  currentPrice: number;
  currency: string;
  profitLoss: number | null;
};

type TabKey = 'past' | 'current';
type SortDir = 'asc' | 'desc';
type SortState = { key: string; dir: SortDir };

const PER_PAGE = 10;

const COLUMN_TYPES: Record<string, 'string' | 'number' | 'date'> = {
  ticker: 'string',
  index: 'string',
  buyingDate: 'date',
  sellingDate: 'date',
  buyingPrice: 'number',
  sellingPrice: 'number',
  currentPrice: 'number',
  profitLoss: 'number',
};

function formatPrice(value: number) {
  return Number.isFinite(value) ? value.toLocaleString('en-AU', { maximumFractionDigits: 3 }) : '-';
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

export default function PastRecommendationsTabs({
  pastRows,
  currentRows,
  currentPriceLabel,
  isLoggedIn,
}: {
  pastRows: PastRow[];
  currentRows: CurrentRow[];
  currentPriceLabel: string;
  isLoggedIn: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('past');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: 'buyingDate', dir: 'desc' });
  const [showLoginModal, setShowLoginModal] = useState(false);

  const sourceRows = activeTab === 'past' ? pastRows : currentRows;

  const sortedSourceRows = useMemo(() => {
    const type = COLUMN_TYPES[sort.key] ?? 'string';
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...sourceRows].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sort.key];
      const bv = (b as Record<string, unknown>)[sort.key];
      const aMissing = av === null || av === undefined || av === '';
      const bMissing = bv === null || bv === undefined || bv === '';
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;
      let cmp: number;
      if (type === 'number') cmp = Number(av) - Number(bv);
      else if (type === 'date') cmp = new Date(av as string).getTime() - new Date(bv as string).getTime();
      else cmp = String(av).localeCompare(String(bv));
      return cmp * dir;
    });
  }, [sourceRows, sort]);

  const filteredRows = useMemo(() => {
    const visibleRows = !isLoggedIn && activeTab === 'past' ? sortedSourceRows.slice(0, PER_PAGE) : sortedSourceRows;
    const q = search.trim().toLowerCase();
    if (!q) return visibleRows;
    return visibleRows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(q)));
  }, [sortedSourceRows, isLoggedIn, activeTab, search]);

  const sortedRows = filteredRows;

  const toggleSort = (key: string) => {
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    setPage(1);
  };

  const totalPages = !isLoggedIn && activeTab === 'past' && !search.trim()
    ? Math.max(1, Math.ceil(sourceRows.length / PER_PAGE))
    : Math.max(1, Math.ceil(filteredRows.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = sortedRows.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const start = filteredRows.length === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
  const totalEntries = !isLoggedIn && activeTab === 'past' && !search.trim() ? sourceRows.length : filteredRows.length;
  const end = Math.min(currentPage * PER_PAGE, totalEntries);

  const changeTab = (tab: TabKey) => {
    if (tab === 'current' && !isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    setActiveTab(tab);
    setSearch('');
    setPage(1);
    setSort({ key: 'buyingDate', dir: 'desc' });
  };

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: string }) => (
    <th
      className="pg-rec-sortable"
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={() => toggleSort(sortKey)}
      aria-sort={sort?.key === sortKey ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      <span className="pg-rec-sort-ind">{sort?.key === sortKey ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}</span>
    </th>
  );

  const changePage = (nextPage: number) => {
    if (!isLoggedIn && activeTab === 'past' && nextPage > 1) {
      setShowLoginModal(true);
      return;
    }
    setPage(nextPage);
  };

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
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search table..."
        />
      </div>

      <div className="pg-rec-table-wrap">
        {activeTab === 'past' ? (
          <table className="pg-rec-table">
            <thead>
              <tr>
                <SortHeader label="TICKER" sortKey="ticker" />
                <SortHeader label="INDEX" sortKey="index" />
                <SortHeader label="Buying Date" sortKey="buyingDate" />
                <th>Buy Report</th>
                <SortHeader label="Selling Date" sortKey="sellingDate" />
                <th>Sell Report</th>
                <SortHeader label="Buying Price" sortKey="buyingPrice" />
                <SortHeader label="Selling Price" sortKey="sellingPrice" />
                <SortHeader label="P/L%" sortKey="profitLoss" />
              </tr>
            </thead>
            <tbody>
              {(pagedRows as PastRow[]).map((row, index) => (
                <tr key={`${row.buyReportSlug}-${row.sellReportSlug}-${index}`}>
                  <td>{row.ticker}</td>
                  <td>{row.index}</td>
                  <td>{row.buyingDate}</td>
                  <td><Link href={`/reports/${row.buyReportSlug}`}>View Report</Link></td>
                  <td>{row.sellingDate}</td>
                  <td><Link href={`/reports/${row.sellReportSlug}`}>View Report</Link></td>
                  <td>{formatPrice(row.buyingPrice)}</td>
                  <td>{formatPrice(row.sellingPrice)}</td>
                  <td className={row.profitLoss !== null && row.profitLoss < 0 ? 'loss' : 'gain'}>{formatPercent(row.profitLoss)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="pg-rec-table">
            <thead>
              <tr>
                <SortHeader label="TICKER" sortKey="ticker" />
                <SortHeader label="INDEX" sortKey="index" />
                <SortHeader label="Buying Date" sortKey="buyingDate" />
                <SortHeader label="Buying Price" sortKey="buyingPrice" />
                <SortHeader label={`Current Price (${currentPriceLabel})`} sortKey="currentPrice" />
                <SortHeader label="P/L%" sortKey="profitLoss" />
              </tr>
            </thead>
            <tbody>
              {(pagedRows as CurrentRow[]).map((row, index) => (
                <tr key={`${row.ticker}-${row.buyingDate}-${index}`}>
                  <td>{row.ticker}</td>
                  <td>{row.index}</td>
                  <td>{row.buyingDate}</td>
                  <td>{formatPrice(row.buyingPrice)}</td>
                  <td>{formatPrice(row.currentPrice)} {row.currency}</td>
                  <td className={row.profitLoss !== null && row.profitLoss < 0 ? 'loss' : 'gain'}>{formatPercent(row.profitLoss)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {filteredRows.length === 0 && (
          <div className="pg-rec-empty">No recommendations found.</div>
        )}
      </div>

      <div className="pg-rec-footer">
        <div>Showing {start} to {end} of {totalEntries} entries</div>
        <div className="pg-rec-pagination">
          <button type="button" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>Previous</button>
          {pageNumbers(currentPage, totalPages).map((p, i, arr) => (
            <span key={p} className="pg-rec-page-group">
              {i > 0 && p - arr[i - 1] > 1 && <span className="pg-rec-ellipsis">...</span>}
              <button type="button" className={p === currentPage ? 'active' : ''} onClick={() => changePage(p)}>{p}</button>
            </span>
          ))}
          <button type="button" disabled={isLoggedIn && currentPage === totalPages} onClick={() => changePage(currentPage + 1)}>Next</button>
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
            <button type="button" className="btn-close pg-rec-login-close" onClick={() => setShowLoginModal(false)} aria-label="Close" />
            <SubscriberLoginForm redirectPath="/past-recommendations" />
          </div>
        </div>
      )}
    </section>
  );
}
